"use client";

import { useEffect, useMemo, useState } from "react";
import { Access } from "@/components/auth/Access";
import { billingService } from "@/services/billing.service";
import { tableService } from "@/services/table.service";
import { castService } from "@/services/cast.service";
import { NominationTypeService } from "@/services/nomination-type.service";
import { VisitSessionService } from "@/services/visit-session.service";
import type { Table } from "@/types/reservation.types";
import type { Product, PaymentMethod } from "@/types/billing.types";
import { toast } from "react-hot-toast";

export default function ManualEntryPage() {
  const [visitDate, setVisitDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [visitTime, setVisitTime] = useState(
    new Date().toISOString().slice(11, 16)
  );
  const [tableId, setTableId] = useState<string>("");
  const [numGuests, setNumGuests] = useState<number>(1);
  const [customerId, setCustomerId] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [externalSlipId, setExternalSlipId] = useState<string>("");
  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [casts, setCasts] = useState<Array<{ id: string; stageName: string }>>(
    []
  );
  const [nominationTypes, setNominationTypes] = useState<
    Array<{ id: string; display_name: string }>
  >([]);
  const [items, setItems] = useState<
    Array<{ productId: number | ""; quantity: number; unitPrice?: number }>
  >([{ productId: "", quantity: 1 }]);
  const [engagements, setEngagements] = useState<
    Array<{
      castId: string;
      role: "primary" | "inhouse" | "help" | "douhan" | "after";
      nominationTypeId?: string;
    }>
  >([{ castId: "", role: "inhouse" }]);
  const [submitting, setSubmitting] = useState(false);
  const [markCompleted, setMarkCompleted] = useState<boolean>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return visitDate < today; // 過去日はデフォルトで精算
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  useEffect(() => {
    // 日付変更時に自動で既定の精算フラグを更新（ユーザー操作後は手動で切替可）
    const today = new Date().toISOString().slice(0, 10);
    setMarkCompleted((prev) =>
      prev === true || prev === false ? visitDate < today : visitDate < today
    );
  }, [visitDate]);

  useEffect(() => {
    (async () => {
      try {
        const [ts, ps, cs, nts] = await Promise.all([
          tableService.searchTables({ isActive: true }),
          billingService.searchProducts({ isActive: true, limit: 200 }),
          castService.getAllCasts(1, 200),
          NominationTypeService.getAllNominationTypes(),
        ]);
        setTables(ts);
        setProducts(ps);
        setCasts(cs.data.map((c) => ({ id: c.id, stageName: c.stageName })));
        setNominationTypes(
          nts.map((t) => ({ id: t.id as string, display_name: t.display_name }))
        );
      } catch (e) {
        if (process.env.NODE_ENV === "development") console.error(e);
        toast.error("初期データの取得に失敗しました");
      }
    })();
  }, []);

  const productMap = useMemo(() => {
    const m = new Map<number, Product>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const addRow = () =>
    setItems((prev) => [...prev, { productId: "", quantity: 1 }]);
  const removeRow = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const addEngagementRow = () =>
    setEngagements((prev) => [...prev, { castId: "", role: "inhouse" }]);
  const removeEngagementRow = (idx: number) =>
    setEngagements((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    try {
      if (!tableId) {
        toast.error("テーブルを選択してください");
        return;
      }
      if (
        items.length === 0 ||
        items.some((r) => !r.productId || r.quantity <= 0)
      ) {
        toast.error("商品と数量を入力してください");
        return;
      }

      setSubmitting(true);

      // 1) 来店作成（指定日時でチェックイン）
      const checkInIso = new Date(`${visitDate}T${visitTime}:00`).toISOString();
      const payload: any = {
        tableId: parseInt(tableId, 10),
        numGuests,
        checkInAt: checkInIso,
        notes:
          (externalSlipId ? `[ext:${externalSlipId}] ` : "") + (note || ""),
      };
      if (customerId) payload.customerId = customerId;
      const visit = await billingService.createVisit(payload);

      // 2) 注文追加
      for (const row of items) {
        const pid = Number(row.productId);
        if (!pid) continue;
        await billingService.addOrderItem({
          visitId: visit.id,
          productId: pid,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
        });
      }

      // 3) キャスト割り当て（任意）
      for (const e of engagements) {
        if (!e.castId) continue;
        await VisitSessionService.addCastEngagement(
          visit.id,
          e.castId,
          e.role,
          e.nominationTypeId || undefined
        );
      }

      // 4)（任意）即時精算（チェックアウト）
      if (markCompleted) {
        try {
          await billingService.processPayment(visit.id, {
            method: paymentMethod,
            amount: 0,
            notes: note || undefined,
          });
        } catch (e) {
          if (process.env.NODE_ENV === "development") console.error(e);
          toast.error("精算に失敗しました");
          return; // ここで終了（再試行可能）
        }
      }

      toast.success("手入力の登録が完了しました");
      // フォーム初期化
      setItems([{ productId: "", quantity: 1 }]);
      setEngagements([{ castId: "", role: "inhouse" }]);
      setNote("");
      setExternalSlipId("");
    } catch (e) {
      if (process.env.NODE_ENV === "development") console.error(e);
      toast.error("登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Access roles={["admin", "manager", "cashier"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            バックオフィス手入力
          </h1>
          <p className="text-gray-600 text-sm">
            紙伝票の後入力用フォーム（即時反映）
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                日付
              </label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                時刻
              </label>
              <input
                type="time"
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                テーブル
              </label>
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">選択してください</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tableName}（定員{t.capacity}）
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                人数
              </label>
              <input
                type="number"
                min={1}
                value={numGuests}
                onChange={(e) =>
                  setNumGuests(parseInt(e.target.value || "1", 10))
                }
                className="mt-1 w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                顧客ID（任意）
              </label>
              <input
                type="text"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2 text-sm"
                placeholder="既存顧客IDを入力"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                メモ（任意）
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">注文明細</h2>
            <button
              onClick={addRow}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              行を追加
            </button>
          </div>
          <div className="space-y-2">
            {items.map((row, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6 md:col-span-6">
                  <select
                    value={row.productId}
                    onChange={(e) => {
                      const val = e.target.value
                        ? Number(e.target.value)
                        : ("" as const);
                      setItems((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, productId: val } : r
                        )
                      );
                    }}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">商品を選択</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}（¥{p.price.toLocaleString()}）
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3 md:col-span-2">
                  <input
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((r, i) =>
                          i === idx
                            ? {
                                ...r,
                                quantity: parseInt(e.target.value || "1", 10),
                              }
                            : r
                        )
                      )
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-3 md:col-span-2">
                  <input
                    type="number"
                    placeholder="単価（任意）"
                    value={row.unitPrice ?? ""}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((r, i) =>
                          i === idx
                            ? {
                                ...r,
                                unitPrice: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              }
                            : r
                        )
                      )
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-12 md:col-span-2 flex justify-end">
                  <button
                    onClick={() => removeRow(idx)}
                    className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              指名の追加（任意）
            </h2>
            <button
              onClick={addEngagementRow}
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
            >
              行を追加
            </button>
          </div>
          <div className="space-y-2">
            {engagements.map((row, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5 md:col-span-5">
                  <select
                    value={row.castId}
                    onChange={(e) =>
                      setEngagements((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, castId: e.target.value } : r
                        )
                      )
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">キャストを選択</option>
                    {casts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.stageName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3 md:col-span-3">
                  <select
                    value={row.role}
                    onChange={(e) =>
                      setEngagements((prev) =>
                        prev.map((r, i) =>
                          i === idx
                            ? {
                                ...r,
                                role: e.target.value as typeof row.role,
                              }
                            : r
                        )
                      )
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="primary">本指名</option>
                    <option value="inhouse">場内指名</option>
                    <option value="help">ヘルプ</option>
                    <option value="douhan">同伴</option>
                    <option value="after">アフター</option>
                  </select>
                </div>
                <div className="col-span-3 md:col-span-3">
                  <select
                    value={row.nominationTypeId || ""}
                    onChange={(e) =>
                      setEngagements((prev) =>
                        prev.map((r, i) =>
                          i === idx
                            ? {
                                ...r,
                                nominationTypeId: e.target.value || undefined,
                              }
                            : r
                        )
                      )
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">指名種別（自動）</option>
                    {nominationTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.display_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1 md:col-span-1 flex justify-end">
                  <button
                    onClick={() => removeEngagementRow(idx)}
                    className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-5 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">精算（任意）</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={markCompleted}
                onChange={(e) => setMarkCompleted(e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                登録と同時に精算する
              </span>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                支払い方法
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
                className="mt-1 w-full border rounded px-3 py-2 text-sm"
                disabled={!markCompleted}
              >
                <option value="cash">現金</option>
                <option value="card">カード</option>
                <option value="mixed">混合</option>
              </select>
            </div>
            <div className="text-xs text-gray-500">
              過去日を選択した場合は既定で精算にチェックが入ります。
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            disabled={submitting}
            onClick={handleSubmit}
            className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
          >
            {submitting ? "登録中..." : "登録する"}
          </button>
        </div>
      </div>
    </Access>
  );
}
