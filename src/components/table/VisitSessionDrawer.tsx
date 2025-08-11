"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Table } from "@/types/reservation.types";
import type { VisitWithDetails } from "@/types/billing.types";
import { billingService } from "@/services/billing.service";
import { ShoppingCartIcon, XMarkIcon } from "@heroicons/react/24/outline";
import ProductSelectModal from "@/components/billing/ProductSelectModal";
import { toast } from "react-hot-toast";
import { tableService } from "@/services/table.service";
import { VisitSessionService } from "@/services/visit-session.service";
import { createClient } from "@/lib/supabase/client";

interface VisitSessionDrawerProps {
  open: boolean;
  onClose: () => void;
  table: Table | null;
}

export default function VisitSessionDrawer({
  open,
  onClose,
  table,
}: VisitSessionDrawerProps) {
  const visitId = table?.currentVisitId || null;
  const [visit, setVisit] = useState<VisitWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [payment, setPayment] = useState<{
    method: "cash" | "card" | "mixed";
    cashReceived?: number;
    notes?: string;
  }>({ method: "cash" });
  const [totals, setTotals] = useState<{
    subtotal: number;
    serviceCharge: number;
    taxAmount: number;
    totalAmount: number;
  } | null>(null);
  const [availableTables, setAvailableTables] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [moveToTableId, setMoveToTableId] = useState<string>("");
  const [assignCast, setAssignCast] = useState<{
    castId: string;
    role: "primary" | "inhouse" | "help" | "douhan" | "after";
    nominationTypeId?: string;
  }>({ castId: "", role: "inhouse" });
  const [castQuery, setCastQuery] = useState("");
  const [castOptions, setCastOptions] = useState<
    Array<{ id: string; label: string }>
  >([]);

  const formattedTotal = (n: number) =>
    new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(n);

  const load = async () => {
    if (!visitId) {
      setVisit(null);
      setTotals(null);
      return;
    }
    try {
      setIsLoading(true);
      const details = await billingService.getVisitWithDetails(visitId);
      setVisit(details);
      if (details) {
        const calc = await billingService.calculateBill(details.id);
        setTotals(calc);
      }
    } catch (e) {
      if (process.env.NODE_ENV === "development") console.error(e);
      toast.error("セッション情報の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, visitId]);

  // Load available tables for move
  useEffect(() => {
    const loadTables = async () => {
      if (!open) return;
      const tables = await tableService.searchTables();
      const options = tables
        .filter(
          (t) => t.currentStatus === "available" || t.id === (table?.id || "")
        )
        .map((t) => ({ id: t.id, label: `${t.tableName} (${t.capacity}席)` }));
      setAvailableTables(options);
      if (table?.id) setMoveToTableId(table.id);
    };
    loadTables();
  }, [open, table]);

  // Load cast options with simple client-side filtering
  useEffect(() => {
    const loadCasts = async () => {
      if (!open) return;
      const supabase = createClient();
      const { data, error } = await supabase
        .from("casts_profile")
        .select("id, staffs(full_name)")
        .eq("is_active", true)
        .limit(50);
      if (!error && data) {
        type CastProfileRow = {
          id: string;
          staffs: { full_name: string | null } | null;
        };
        const rows = data as CastProfileRow[];
        const opts = rows.map((c) => ({
          id: c.id,
          label: `${c.staffs?.full_name || "(無名)"}`,
        }));
        setCastOptions(opts);
      }
    };
    loadCasts();
  }, [open]);

  // Realtime reload for order/attribution/cast changes
  useEffect(() => {
    if (!open || !visitId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`visit-${visitId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
          filter: `visit_id=eq.${visitId}`,
        },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bill_item_attributions" },
        () => load()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cast_engagements",
          filter: `visit_id=eq.${visitId}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, visitId]);

  const orderSubtotal = useMemo(() => {
    return (
      visit?.orderItems?.reduce(
        (sum, item) => sum + (item.totalPrice || 0),
        0
      ) || 0
    );
  }, [visit]);

  const handleDeleteItem = async (id: number) => {
    try {
      await billingService.deleteOrderItem(id);
      await load();
      toast.success("削除しました");
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const handleCheckout = async () => {
    if (!visit || !totals) return;
    try {
      setIsPaying(true);
      await billingService.processPayment(visit.id, {
        method: payment.method,
        amount: totals.totalAmount,
        cashReceived:
          payment.method === "cash" ? payment.cashReceived : undefined,
        changeAmount:
          payment.method === "cash" && payment.cashReceived
            ? Math.max(0, payment.cashReceived - totals.totalAmount)
            : undefined,
        notes: payment.notes,
      });
      toast.success("お会計が完了しました");
      onClose();
    } catch (e) {
      if (process.env.NODE_ENV === "development") console.error(e);
      toast.error("お会計に失敗しました");
    } finally {
      setIsPaying(false);
    }
  };

  const handleMoveTable = async () => {
    if (!visit || !moveToTableId || !table?.id) return;
    try {
      await VisitSessionService.moveTable(
        visit.id,
        Number(table.id),
        Number(moveToTableId)
      );
      toast.success("テーブルを移動しました");
      await load();
    } catch (e) {
      if (process.env.NODE_ENV === "development") console.error(e);
      toast.error("テーブル移動に失敗しました");
    }
  };

  const handleAssignCast = async () => {
    if (!visit || !assignCast.castId) return;
    try {
      await VisitSessionService.addCastEngagement(
        visit.id,
        assignCast.castId,
        assignCast.role,
        assignCast.nominationTypeId
      );
      toast.success("キャストを割り当てました");
      setAssignCast({ castId: "", role: "inhouse" });
      await load();
    } catch (e) {
      if (process.env.NODE_ENV === "development") console.error(e);
      toast.error("キャスト割当に失敗しました");
    }
  };

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[520px] bg-white shadow-2xl transform transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="text-lg font-semibold">
            {table?.tableName || "-"} 会計・注文
          </h3>
          <p className="text-xs text-gray-500">
            テーブル {table?.tableName} / 収容 {table?.capacity} 名
          </p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {!visitId ? (
          <div className="text-sm text-gray-500">
            現在このテーブルにはアクティブな来店はありません。
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 text-sm">読み込み中...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                来店: {visit?.customer?.name || "未登録"} /{" "}
                {visit?.numGuests || 0}名
              </div>
              <button
                onClick={() => setShowProductModal(true)}
                className="inline-flex items-center px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                <ShoppingCartIcon className="w-4 h-4 mr-1" /> 商品追加
              </button>
            </div>

            {/* Order items */}
            <div className="border rounded-md divide-y">
              {visit?.orderItems && visit.orderItems.length > 0 ? (
                visit.orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 text-sm"
                  >
                    <div className="flex-1">
                      <span className="font-medium">
                        {item.product?.name || item.productId}
                      </span>
                      <span className="ml-2 text-gray-500">
                        × {item.quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {formattedTotal(item.totalPrice)}
                      </span>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-sm text-gray-500">
                  まだ注文がありません
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded-md p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span>小計</span>
                <span>{formattedTotal(totals?.subtotal || orderSubtotal)}</span>
              </div>
              {totals && (
                <>
                  <div className="flex justify-between">
                    <span>サービス料</span>
                    <span>{formattedTotal(totals.serviceCharge)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>税額</span>
                    <span>{formattedTotal(totals.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t">
                    <span>合計</span>
                    <span>{formattedTotal(totals.totalAmount)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Payment */}
            <div className="space-y-2">
              <label className="text-sm font-medium">支払い方法</label>
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={payment.method}
                onChange={(e) =>
                  setPayment((p) => ({
                    ...p,
                    method: e.target.value as typeof p.method,
                  }))
                }
              >
                <option value="cash">現金</option>
                <option value="card">カード</option>
                <option value="mixed">混合</option>
              </select>
              {(payment.method === "cash" || payment.method === "mixed") && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">お預かり金額</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={payment.cashReceived || 0}
                    onChange={(e) =>
                      setPayment((p) => ({
                        ...p,
                        cashReceived: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium">備考</label>
                <textarea
                  className="w-full border rounded px-2 py-1 text-sm"
                  rows={2}
                  value={payment.notes || ""}
                  onChange={(e) =>
                    setPayment((p) => ({ ...p, notes: e.target.value }))
                  }
                />
              </div>
              <button
                onClick={handleCheckout}
                disabled={!totals || isPaying}
                className="w-full mt-2 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
              >
                {isPaying ? "会計処理中..." : "会計完了"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Operations: move table & assign cast */}
      {visitId && (
        <div className="p-4 border-t space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-semibold">テーブル移動</div>
            <div className="flex gap-2">
              <select
                className="flex-1 border rounded px-2 py-1 text-sm"
                value={moveToTableId}
                onChange={(e) => setMoveToTableId(e.target.value)}
              >
                {availableTables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleMoveTable}
                className="px-3 py-1.5 bg-gray-700 text-white rounded text-sm hover:bg-gray-800"
              >
                移動
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">キャスト割り当て</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="border rounded px-2 py-1 text-sm col-span-2"
                placeholder="キャスト検索（氏名）"
                value={castQuery}
                onChange={(e) => setCastQuery(e.target.value)}
                list="cast-options"
              />
              <datalist id="cast-options">
                {castOptions
                  .filter((c) =>
                    castQuery
                      ? c.label.includes(castQuery) || c.id.includes(castQuery)
                      : true
                  )
                  .slice(0, 20)
                  .map((c) => (
                    <option key={c.id} value={c.label} />
                  ))}
              </datalist>
              <input
                className="border rounded px-2 py-1 text-sm col-span-2"
                placeholder="キャストID（上の候補から選択した場合は手入力不要）"
                value={assignCast.castId}
                onChange={(e) =>
                  setAssignCast((p) => ({ ...p, castId: e.target.value }))
                }
              />
              <select
                className="border rounded px-2 py-1 text-sm"
                value={assignCast.role}
                onChange={(e) =>
                  setAssignCast((p) => ({
                    ...p,
                    role: e.target.value as typeof p.role,
                  }))
                }
              >
                <option value="primary">メイン</option>
                <option value="inhouse">在籍</option>
                <option value="help">ヘルプ</option>
                <option value="douhan">同伴</option>
                <option value="after">アフター</option>
              </select>
              <input
                className="border rounded px-2 py-1 text-sm"
                placeholder="指名種別ID(任意)"
                value={assignCast.nominationTypeId || ""}
                onChange={(e) =>
                  setAssignCast((p) => ({
                    ...p,
                    nominationTypeId: e.target.value || undefined,
                  }))
                }
              />
            </div>
            <button
              onClick={handleAssignCast}
              className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
            >
              追加
            </button>
          </div>
        </div>
      )}

      {/* Product picker */}
      {visit && (
        <ProductSelectModal
          isOpen={showProductModal}
          onClose={() => setShowProductModal(false)}
          visitId={visit.id}
          onItemsAdded={async () => {
            setShowProductModal(false);
            await load();
          }}
        />
      )}
    </div>
  );
}
