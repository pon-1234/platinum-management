"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
    Array<{
      productId: number | "";
      quantity: number;
      unitPrice?: number;
      search?: string;
    }>
  >([{ productId: "", quantity: 1, search: "" }]);
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
  const [mixedCash, setMixedCash] = useState<number>(0);
  const [mixedCard, setMixedCard] = useState<number>(0);

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
        // name / name_kana / phone_number を横断検索
        const { data, error } = await supabase
          .from("customers")
          .select("id, name, name_kana, phone_number")
          .or(
            `name.ilike.%${q}%,name_kana.ilike.%${q}%,phone_number.ilike.%${q}%`
          )
          .order("updated_at", { ascending: false })
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

  // 予想サービス料・税額・合計（必要に応じて計算式を調整）
  const estimatedService = useMemo(() => 0, []);
  const estimatedTax = useMemo(
    () => Math.floor((estimatedSubtotal + estimatedService) * 0.1),
    [estimatedSubtotal, estimatedService]
  );
  const estimatedTotal = useMemo(
    () => estimatedSubtotal + estimatedService + estimatedTax,
    [estimatedSubtotal, estimatedService, estimatedTax]
  );

  const isSubmitDisabled =
    submitting ||
    !tableId ||
    items.length === 0 ||
    items.some((r) => !r.productId || r.quantity <= 0);

  const addRow = () =>
    setItems((prev) => [...prev, { productId: "", quantity: 1, search: "" }]);

  // Refs for keyboard navigation
  const productRefs = useRef<Array<HTMLInputElement | null>>([]);
  const qtyRefs = useRef<Array<HTMLInputElement | null>>([]);
  const priceRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Undo for row deletion
  const removeRow = (idx: number) => {
    const removed = items[idx];
    setItems((prev) => prev.filter((_, i) => i !== idx));
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm">1 行削除しました</span>
          <button
            className="px-2 py-1 text-xs border rounded"
            onClick={() => {
              setItems((prev) => {
                const next = [...prev];
                next.splice(idx, 0, removed);
                return next;
              });
              toast.dismiss(t.id);
            }}
          >
            元に戻す
          </button>
        </div>
      ),
      { duration: 3000 }
    );
  };

  const addEngagementRow = () =>
    setEngagements((prev) => [...prev, { castId: "", role: "inhouse" }]);
  const removeEngagementRow = (idx: number) =>
    setEngagements((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    try {
      if (!tableId) {
        toast.error("テーブルを選択してください");
        const el = document.getElementById("table-select");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (
        items.length === 0 ||
        items.some((r) => !r.productId || r.quantity <= 0)
      ) {
        toast.error("商品と数量を入力してください");
        // scroll to first invalid row
        const badIdx = items.findIndex((r) => !r.productId || r.quantity <= 0);
        if (badIdx >= 0) {
          const el = qtyRefs.current[badIdx] || productRefs.current[badIdx];
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          el?.focus();
        }
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
      // Helper: role -> default nomination type id
      const roleToTypeName: Record<string, string> = {
        primary: "本指名",
        inhouse: "場内指名",
        help: "ヘルプ",
        douhan: "同伴",
        after: "アフター",
      };
      const pickTypeId = (role: string): string | undefined => {
        const name = roleToTypeName[role];
        const hit = nominationTypes.find((t) => t.display_name === name);
        return hit?.id;
      };

      for (const e of engagements) {
        if (!e.castId) continue;
        const typeId = e.nominationTypeId || pickTypeId(e.role);
        await VisitSessionService.addCastEngagement(
          visit.id,
          e.castId,
          e.role,
          typeId
        );
      }

      // 4)（任意）即時精算（チェックアウト）
      if (markCompleted) {
        if (paymentMethod === "mixed") {
          if (mixedCash + mixedCard !== estimatedTotal) {
            toast.error("内訳合計が合計金額と一致していません");
            setSubmitting(false);
            return;
          }
        }
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
      setMixedCash(0);
      setMixedCard(0);
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
                id="table-select"
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">選択してください</option>
                {tables.map((t) => {
                  const badge =
                    t.currentStatus === "available" ? "空き" : "満席";
                  return (
                    <option key={t.id} value={t.id}>
                      {t.tableName}（{t.capacity}） {badge}
                    </option>
                  );
                })}
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
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-center"
                onKeyDown={(e) => {
                  // Keyboard shortcuts per row
                  if (e.key === "Enter" && e.shiftKey) {
                    e.preventDefault();
                    addRow();
                    setTimeout(
                      () => productRefs.current[items.length]?.focus(),
                      0
                    );
                    return;
                  }
                  if (
                    (e.ctrlKey || e.metaKey) &&
                    (e.key === "ArrowUp" || e.key === "ArrowDown")
                  ) {
                    e.preventDefault();
                    setItems((prev) =>
                      prev.map((r, i) =>
                        i === idx
                          ? {
                              ...r,
                              quantity: Math.max(
                                1,
                                r.quantity + (e.key === "ArrowUp" ? 1 : -1)
                              ),
                            }
                          : r
                      )
                    );
                    return;
                  }
                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                    e.preventDefault();
                    productRefs.current[idx]?.focus();
                    return;
                  }
                  if (e.key === "Delete") {
                    e.preventDefault();
                    removeRow(idx);
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    // move focus to next cell
                    if (document.activeElement === productRefs.current[idx]) {
                      qtyRefs.current[idx]?.focus();
                    } else if (
                      document.activeElement === qtyRefs.current[idx]
                    ) {
                      priceRefs.current[idx]?.focus();
                    } else if (
                      document.activeElement === priceRefs.current[idx]
                    ) {
                      if (idx === items.length - 1) {
                        addRow();
                        setTimeout(
                          () => productRefs.current[items.length]?.focus(),
                          0
                        );
                      } else {
                        productRefs.current[idx + 1]?.focus();
                      }
                    }
                  }
                }}
              >
                <div className="col-span-6 md:col-span-6">
                  <div className="relative">
                    <input
                      ref={(el) => {
                        productRefs.current[idx] = el;
                      }}
                      type="text"
                      value={row.search || ""}
                      onChange={(e) => {
                        const q = e.target.value;
                        setItems((prev) =>
                          prev.map((r, i) =>
                            i === idx ? { ...r, search: q } : r
                          )
                        );
                      }}
                      placeholder="商品名/コードで検索（Ctrl/⌘+Kでフォーカス）"
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                    {(row.search || "").trim().length > 0 && (
                      <div className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-white border rounded shadow">
                        {products
                          .filter((p) => {
                            const q = (row.search || "").toLowerCase();
                            const fields = [
                              p.name,
                              (p as unknown as { nameKana?: string }).nameKana,
                              (p as unknown as { shortName?: string })
                                .shortName,
                              (p as unknown as { alias?: string }).alias,
                              (p as unknown as { sku?: string }).sku,
                              (p as unknown as { code?: string }).code,
                              String(p.id),
                            ]
                              .filter(Boolean)
                              .map((s) => String(s).toLowerCase());
                            return fields.some((f) => f.includes(q));
                          })
                          .slice(0, 20)
                          .map((p) => (
                            <button
                              type="button"
                              key={p.id}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                              onClick={() => {
                                setItems((prev) =>
                                  prev.map((r, i) =>
                                    i === idx
                                      ? {
                                          ...r,
                                          productId: p.id,
                                          search: `${p.name}（¥${p.price.toLocaleString()}）`,
                                        }
                                      : r
                                  )
                                );
                                setTimeout(
                                  () => qtyRefs.current[idx]?.focus(),
                                  0
                                );
                              }}
                            >
                              {p.name}（¥{p.price.toLocaleString()}）
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-3 md:col-span-2">
                  <div className="flex items-center border rounded">
                    <button
                      type="button"
                      className="px-2 py-1 text-gray-600 hover:bg-gray-50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        let timer: number | undefined;
                        const step = () =>
                          setItems((prev) =>
                            prev.map((r, i) =>
                              i === idx
                                ? {
                                    ...r,
                                    quantity: Math.max(
                                      1,
                                      (r.quantity || 1) - 1
                                    ),
                                  }
                                : r
                            )
                          );
                        step();
                        const interval = window.setInterval(step, 120);
                        const clearAll = () => {
                          if (interval) window.clearInterval(interval);
                          if (timer) window.clearTimeout(timer);
                          document.removeEventListener("mouseup", clearAll);
                          (
                            e.currentTarget as HTMLButtonElement
                          ).removeEventListener("mouseleave", clearAll);
                        };
                        document.addEventListener("mouseup", clearAll);
                        (e.currentTarget as HTMLButtonElement).addEventListener(
                          "mouseleave",
                          clearAll
                        );
                      }}
                    >
                      -
                    </button>
                    <input
                      ref={(el) => {
                        qtyRefs.current[idx] = el;
                      }}
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
                      onWheel={(e) =>
                        (e.currentTarget as HTMLInputElement).blur()
                      }
                      className="w-full px-2 py-1 text-sm text-center border-l border-r"
                    />
                    <button
                      type="button"
                      className="px-2 py-1 text-gray-600 hover:bg-gray-50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        let timer: number | undefined;
                        const step = () =>
                          setItems((prev) =>
                            prev.map((r, i) =>
                              i === idx
                                ? { ...r, quantity: (r.quantity || 0) + 1 }
                                : r
                            )
                          );
                        step();
                        const interval = window.setInterval(step, 120);
                        const clearAll = () => {
                          if (interval) window.clearInterval(interval);
                          if (timer) window.clearTimeout(timer);
                          document.removeEventListener("mouseup", clearAll);
                          (
                            e.currentTarget as HTMLButtonElement
                          ).removeEventListener("mouseleave", clearAll);
                        };
                        document.addEventListener("mouseup", clearAll);
                        (e.currentTarget as HTMLButtonElement).addEventListener(
                          "mouseleave",
                          clearAll
                        );
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="col-span-3 md:col-span-2">
                  <input
                    ref={(el) => {
                      priceRefs.current[idx] = el;
                    }}
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
                    onWheel={(e) =>
                      (e.currentTarget as HTMLInputElement).blur()
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
                <div className="col-span-6 md:col-span-6">
                  <select
                    value={row.role}
                    onChange={(e) => {
                      const role = e.target.value as typeof row.role;
                      // 役割に合わせて指名種別を自動設定
                      const roleToTypeName: Record<string, string> = {
                        primary: "本指名",
                        inhouse: "場内指名",
                        help: "ヘルプ",
                        douhan: "同伴",
                        after: "アフター",
                      };
                      const name = roleToTypeName[role];
                      const hit = nominationTypes.find(
                        (t) => t.display_name === name
                      );
                      setEngagements((prev) =>
                        prev.map((r, i) =>
                          i === idx
                            ? {
                                ...r,
                                role,
                                nominationTypeId: hit?.id,
                              }
                            : r
                        )
                      );
                    }}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="primary">本指名</option>
                    <option value="inhouse">場内指名</option>
                    <option value="help">ヘルプ</option>
                    <option value="douhan">同伴</option>
                    <option value="after">アフター</option>
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
                <span
                  className="ml-1 text-gray-400 cursor-help"
                  title="過去日を選ぶと自動でONになります。必要に応じて手動で切り替え可能です。"
                >
                  ⓘ
                </span>
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
              チェックのON/OFFはいつでも変更できます。
            </div>
          </div>
          {markCompleted && paymentMethod === "mixed" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  現金
                </label>
                <input
                  type="number"
                  min={0}
                  value={mixedCash}
                  onChange={(e) =>
                    setMixedCash(parseInt(e.target.value || "0", 10))
                  }
                  onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                  className="mt-1 w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  カード
                </label>
                <input
                  type="number"
                  min={0}
                  value={mixedCard}
                  onChange={(e) =>
                    setMixedCard(parseInt(e.target.value || "0", 10))
                  }
                  onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                  className="mt-1 w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end">
                <div className="text-sm">
                  合計: ¥{(mixedCash + mixedCard).toLocaleString()} / 目標: ¥
                  {estimatedTotal.toLocaleString()}
                  <br />
                  {mixedCash + mixedCard !== estimatedTotal && (
                    <span className="text-red-600">合計が一致していません</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="bg-white shadow rounded-lg p-5 sticky top-24">
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
              <span className="text-gray-500">予想サ料:</span> ¥
              {estimatedService.toLocaleString()}
            </li>
            <li>
              <span className="text-gray-500">予想税額:</span> ¥
              {estimatedTax.toLocaleString()}
            </li>
            <li>
              <span className="text-gray-500">予想合計:</span> ¥
              {estimatedTotal.toLocaleString()}
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
          {markCompleted && paymentMethod === "mixed" && (
            <div className="mt-2 text-xs text-gray-600">
              内訳: 現金 ¥{mixedCash.toLocaleString()} / カード ¥
              {mixedCard.toLocaleString()}
            </div>
          )}
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
