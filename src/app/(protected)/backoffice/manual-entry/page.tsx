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
import { createClient } from "@/lib/supabase/client";

export default function ManualEntryPage() {
  const [visitDate, setVisitDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [visitTime, setVisitTime] = useState(
    new Date().toISOString().slice(11, 16)
  );
  const [tableId, setTableId] = useState<string>("");
  const [numGuests, setNumGuests] = useState<number>(1);
  const [customerQuery, setCustomerQuery] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerOptions, setCustomerOptions] = useState<
    Array<{ id: string; name: string; phone?: string | null }>
  >([]);
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

  // 顧客クイック検索（2文字以上で検索）
  useEffect(() => {
    const q = customerQuery.trim();
    if (q.length < 2) {
      setCustomerOptions([]);
      return;
    }
    const supabase = createClient();
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("id, name, phone_number")
          .ilike("name", `%${q}%`)
          .limit(20);
        if (!active) return;
        if (error) {
          setCustomerOptions([]);
          return;
        }
        setCustomerOptions(
          (data || []).map((c) => ({
            id: c.id as string,
            name: c.name as string,
            phone: (c as any).phone_number as string | null,
          }))
        );
      } catch {
        if (!active) return;
        setCustomerOptions([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [customerQuery]);

  const productMap = useMemo(() => {
    const m = new Map<number, Product>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const estimatedSubtotal = useMemo(() => {
    return items.reduce((sum, r) => {
      const pid = Number(r.productId);
      if (!pid) return sum;
      const p = productMap.get(pid);
      const unit = r.unitPrice ?? (p ? p.price : 0);
      return sum + unit * (r.quantity || 0);
    }, 0);
  }, [items, productMap]);

  const isSubmitDisabled =
    submitting ||
    !tableId ||
    items.length === 0 ||
    items.some((r) => !r.productId || r.quantity <= 0);

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
                顧客（任意）
              </label>
              <input
                type="text"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2 text-sm"
                placeholder="名前で検索（2文字以上）"
              />
              {customerOptions.length > 0 && (
                <div className="mt-1 border rounded max-h-40 overflow-auto text-sm bg-white shadow">
                  {customerOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setCustomerId(opt.id);
                        setCustomerQuery(
                          `${opt.name}${opt.phone ? ` (${opt.phone})` : ""}`
                        );
                        setCustomerOptions([]);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50"
                    >
                      {opt.name}
                      {opt.phone ? ` (${opt.phone})` : ""}
                    </button>
                  ))}
                </div>
              )}
              {customerId && (
                <div className="mt-1 text-xs text-gray-600">
                  選択中の顧客ID:{" "}
                  <span className="font-mono">{customerId}</span>
                  <button
                    type="button"
                    className="ml-2 text-indigo-600 hover:underline"
                    onClick={() => {
                      setCustomerId("");
                      setCustomerQuery("");
                    }}
                  >
                    クリア
                  </button>
                </div>
              )}
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
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span>行数: {items.length}</span>
              <span>予想小計: ¥{estimatedSubtotal.toLocaleString()}</span>
              <button
                onClick={addRow}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                行を追加
              </button>
            </div>
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
                  <div className="flex items-center border rounded">
                    <button
                      type="button"
                      className="px-2 py-1 text-gray-600 hover:bg-gray-50"
                      onClick={() =>
                        setItems((prev) =>
                          prev.map((r, i) =>
                            i === idx
                              ? {
                                  ...r,
                                  quantity: Math.max(1, (r.quantity || 1) - 1),
                                }
                              : r
                          )
                        )
                      }
                    >
                      -
                    </button>
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
                      className="w-full px-2 py-1 text-sm text-center border-l border-r"
                    />
                    <button
                      type="button"
                      className="px-2 py-1 text-gray-600 hover:bg-gray-50"
                      onClick={() =>
                        setItems((prev) =>
                          prev.map((r, i) =>
                            i === idx
                              ? { ...r, quantity: (r.quantity || 0) + 1 }
                              : r
                          )
                        )
                      }
                    >
                      +
                    </button>
                  </div>
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

        <div className="bg-white shadow rounded-lg p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-3">確認</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>
              <span className="text-gray-500">来店:</span> {visitDate}{" "}
              {visitTime}
            </li>
            <li>
              <span className="text-gray-500">テーブル:</span>{" "}
              {tableId || "未選択"}
            </li>
            <li>
              <span className="text-gray-500">人数:</span> {numGuests}名
            </li>
            <li>
              <span className="text-gray-500">顧客:</span>{" "}
              {customerQuery || "未指定"}
            </li>
            <li>
              <span className="text-gray-500">明細行:</span> {items.length} 行
            </li>
            <li>
              <span className="text-gray-500">予想小計:</span> ¥
              {estimatedSubtotal.toLocaleString()}
            </li>
            <li>
              <span className="text-gray-500">精算:</span>{" "}
              {markCompleted ? `実行（${paymentMethod}）` : "なし"}
            </li>
          </ul>
          <button
            disabled={isSubmitDisabled}
            onClick={handleSubmit}
            className="mt-4 w-full px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
          >
            {submitting ? "登録中..." : "登録する"}
          </button>
          {!tableId && (
            <p className="text-xs text-red-600 mt-2">
              テーブルを選択してください。
            </p>
          )}
          {(items.length === 0 ||
            items.some((r) => !r.productId || r.quantity <= 0)) && (
            <p className="text-xs text-red-600 mt-1">
              明細の入力に不備があります。
            </p>
          )}
        </div>
      </div>
    </Access>
  );
}
