"use client";

import { useEffect, useMemo, useState } from "react";
import { Access } from "@/components/auth/Access";
import { billingService } from "@/services/billing.service";
import { tableService } from "@/services/table.service";
import type { Table } from "@/types/reservation.types";
import type { Product } from "@/types/billing.types";
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
  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<
    Array<{ productId: number | ""; quantity: number; unitPrice?: number }>
  >([{ productId: "", quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [ts, ps] = await Promise.all([
          tableService.searchTables({ isActive: true }),
          billingService.searchProducts({ isActive: true, limit: 200 }),
        ]);
        setTables(ts);
        setProducts(ps);
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
        notes: note || undefined,
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

      toast.success("手入力の登録が完了しました");
      // フォーム初期化
      setItems([{ productId: "", quantity: 1 }]);
      setNote("");
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
