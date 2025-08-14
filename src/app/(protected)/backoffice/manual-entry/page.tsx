"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Access } from "@/components/auth/Access";
import { billingService } from "@/services/billing.service";
import { tableService } from "@/services/table.service";
import { castService } from "@/services/cast.service";
import { customerService } from "@/services/customer.service";
import {
  BottleKeepService,
  type BottleKeep,
} from "@/services/bottle-keep.service";
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
  const [casts, setCasts] = useState<
    Array<{ id: string; stageName: string; staffId?: string }>
  >([]);
  const [presentStaffIds, setPresentStaffIds] = useState<Set<string>>(
    new Set()
  );
  const [customerBottles, setCustomerBottles] = useState<BottleKeep[]>([]);
  const [queuedBottleServes, setQueuedBottleServes] = useState<
    Array<{ bottleKeepId: string; amount: number }>
  >([]);
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
  const selectedTable = useMemo(() => {
    const idStr = String(tableId || "");
    // Table.id is string in types
    return tables.find((t) => String(t.id) === idStr);
  }, [tableId, tables]);
  const [recentTableIds, setRecentTableIds] = useState<string[]>([]);

  // Draft autosave & leave guard
  const [dirty, setDirty] = useState(false);
  const initializedRef = useRef(false);
  const draftKey = "manual_entry_draft";

  const serializeDraft = () =>
    JSON.stringify({
      visitDate,
      visitTime,
      tableId,
      numGuests,
      customerQuery,
      customerId,
      note,
      externalSlipId,
      items,
      engagements,
      markCompleted,
      paymentMethod,
      mixedCash,
      mixedCard,
    });

  // mark dirty when the form changes (skip first run)
  useEffect(() => {
    if (initializedRef.current) {
      setDirty(true);
    } else {
      initializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    visitDate,
    visitTime,
    tableId,
    numGuests,
    customerQuery,
    customerId,
    note,
    externalSlipId,
    items,
    engagements,
    markCompleted,
    paymentMethod,
    mixedCash,
    mixedCard,
  ]);

  // Offer restore if draft exists
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <span className="text-sm">保存された下書きを復元しますか？</span>
            <button
              className="px-2 py-1 text-xs border rounded"
              onClick={() => {
                try {
                  const data = JSON.parse(raw);
                  setVisitDate(data.visitDate || visitDate);
                  setVisitTime(data.visitTime || visitTime);
                  setTableId(data.tableId || "");
                  setNumGuests(Number(data.numGuests) || 1);
                  setCustomerQuery(data.customerQuery || "");
                  setCustomerId(data.customerId || "");
                  setNote(data.note || "");
                  setExternalSlipId(data.externalSlipId || "");
                  setItems(Array.isArray(data.items) ? data.items : items);
                  setEngagements(
                    Array.isArray(data.engagements)
                      ? data.engagements
                      : engagements
                  );
                  setMarkCompleted(Boolean(data.markCompleted));
                  setPaymentMethod(
                    (data.paymentMethod as PaymentMethod) || "cash"
                  );
                  setMixedCash(Number(data.mixedCash) || 0);
                  setMixedCard(Number(data.mixedCard) || 0);
                } catch {
                  /* ignore */
                }
                toast.dismiss(t.id);
              }}
            >
              復元
            </button>
            <button
              className="px-2 py-1 text-xs border rounded"
              onClick={() => {
                localStorage.removeItem(draftKey);
                toast.dismiss(t.id);
              }}
            >
              破棄
            </button>
          </div>
        ),
        { duration: 6000 }
      );
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recent tables load
  useEffect(() => {
    try {
      const raw = localStorage.getItem("recent_tables");
      if (raw) setRecentTableIds(JSON.parse(raw));
    } catch {
      setRecentTableIds([]);
    }
  }, []);

  const pushRecentTable = (id: string) => {
    try {
      const raw = localStorage.getItem("recent_tables");
      const ids: string[] = Array.isArray(raw ? JSON.parse(raw) : [])
        ? JSON.parse(raw || "[]")
        : [];
      const next = [id, ...ids.filter((x) => x !== id)].slice(0, 10);
      localStorage.setItem("recent_tables", JSON.stringify(next));
      setRecentTableIds(next);
    } catch {
      /* ignore */
    }
  };

  // autosave every 30s
  useEffect(() => {
    const id = window.setInterval(() => {
      try {
        localStorage.setItem(draftKey, serializeDraft());
      } catch {
        /* ignore */
      }
    }, 30000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    visitDate,
    visitTime,
    tableId,
    numGuests,
    customerQuery,
    customerId,
    note,
    externalSlipId,
    items,
    engagements,
    markCompleted,
    paymentMethod,
    mixedCash,
    mixedCard,
  ]);

  // Leave guard (tab close/reload)
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (submitting) return;
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, submitting]);

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
        setCasts(
          cs.data.map((c) => ({
            id: c.id,
            stageName: c.stageName,
            staffId: c.staffId,
          }))
        );
        setNominationTypes(
          nts.map((t) => ({ id: t.id as string, display_name: t.display_name }))
        );
        // Fetch today's present staff to sort cast options (本日出勤者を先頭に)
        try {
          const supabase = createClient();
          const today = new Date().toISOString().slice(0, 10);
          const { data: attendance } = await supabase
            .from("attendance_records")
            .select("staff_id")
            .eq("date", today)
            .is("clock_out", null);
          const present = new Set(
            (attendance || []).map((r: { staff_id: string }) => r.staff_id)
          );
          setPresentStaffIds(present);
          setCasts((prev) => {
            const next = [...prev];
            next.sort((a, b) => {
              const aP = a.staffId ? present.has(a.staffId) : false;
              const bP = b.staffId ? present.has(b.staffId) : false;
              if (aP === bP)
                return a.stageName.localeCompare(b.stageName, "ja");
              return aP ? -1 : 1;
            });
            return next;
          });
        } catch {
          /* ignore attendance sorting */
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") console.error(e);
        toast.error("初期データの取得に失敗しました");
      }
    })();
  }, []);

  // Load bottle keeps when customer changes
  useEffect(() => {
    (async () => {
      if (!customerId) {
        setCustomerBottles([]);
        return;
      }
      try {
        const bottles = await BottleKeepService.getBottleKeeps(
          undefined,
          customerId
        );
        setCustomerBottles(bottles.filter((b) => b.status === "active"));
      } catch {
        setCustomerBottles([]);
      }
    })();
  }, [customerId]);

  // 顧客クイック検索（2文字以上で検索）: 最適化RPCを使用し、名前/ふりがな/電話末尾/ID/コード等も対象
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
        const results = await customerService.searchCustomers(supabase, {
          query: q,
          limit: 20,
          offset: 0,
        });
        if (!active) return;
        setCustomerOptions(
          (results || []).map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phoneNumber || null,
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
  const [serviceRate, setServiceRate] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(10);
  const estimatedService = useMemo(
    () => Math.floor(estimatedSubtotal * (serviceRate / 100)),
    [estimatedSubtotal, serviceRate]
  );
  const estimatedTax = useMemo(
    () => Math.floor((estimatedSubtotal + estimatedService) * (taxRate / 100)),
    [estimatedSubtotal, estimatedService, taxRate]
  );
  const estimatedTotal = useMemo(
    () => estimatedSubtotal + estimatedService + estimatedTax,
    [estimatedSubtotal, estimatedService, estimatedTax]
  );

  const hasValidRow = useMemo(
    () => items.some((r) => r.productId && (r.quantity || 0) > 0),
    [items]
  );
  const hasInvalidRow = useMemo(
    () => items.some((r) => r.productId && (r.quantity || 0) <= 0),
    [items]
  );
  const isSubmitDisabled =
    submitting || !tableId || !hasValidRow || hasInvalidRow;

  const addRow = () =>
    setItems((prev) => [...prev, { productId: "", quantity: 1, search: "" }]);

  // Refs for keyboard navigation
  const productRefs = useRef<Array<HTMLInputElement | null>>([]);
  const qtyRefs = useRef<Array<HTMLInputElement | null>>([]);
  const priceRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(
    null
  );
  const [suggestionTab, setSuggestionTab] = useState<
    "search" | "recent" | "popular"
  >("search");
  const [popularIds, setPopularIds] = useState<number[]>([]);
  const [recentIds, setRecentIds] = useState<number[]>([]);
  const [receiptRequested, setReceiptRequested] = useState<boolean>(false);
  const [receiptName, setReceiptName] = useState<string>("");
  const [lastItems, setLastItems] = useState<
    Array<{
      productId?: string | number;
      quantity?: number;
      unitPrice?: number;
    }>
  >([]);
  const [lastEngagements, setLastEngagements] = useState<
    Array<{
      castId: string;
      role: "primary" | "inhouse" | "help" | "douhan" | "after";
      nominationTypeId?: string;
    }>
  >([]);

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createClient();
        const today = new Date().toISOString().slice(0, 10);
        const { data } = await supabase.rpc("get_top_products_with_details", {
          report_date: today,
          limit_count: 20,
        });
        const ids: number[] = (data || [])
          .map((r: { product_id?: number | string }) => Number(r.product_id))
          .filter((n: number) => Number.isFinite(n));
        setPopularIds(ids);
      } catch {
        setPopularIds([]);
      }
    })();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("recent_products");
      if (raw) setRecentIds(JSON.parse(raw));
    } catch {
      setRecentIds([]);
    }
  }, []);

  const pushRecent = (productId: number) => {
    try {
      const raw = localStorage.getItem("recent_products");
      const ids: number[] = Array.isArray(raw ? JSON.parse(raw) : [])
        ? JSON.parse(raw || "[]")
        : [];
      const next = [productId, ...ids.filter((id) => id !== productId)].slice(
        0,
        20
      );
      localStorage.setItem("recent_products", JSON.stringify(next));
      setRecentIds(next);
    } catch {
      /* ignore */
    }
  };

  // Quick add bar state and handler
  const [quickInput, setQuickInput] = useState<string>("");
  const handleQuickAdd = () => {
    const raw = quickInput.trim();
    if (!raw) return;
    // Parse pattern: "keyword x3" or "keyword×3" (supports ascii/zenkaku)
    const m = raw.match(/^(.*?)[\s]*[x×＊*]\s*(\d+)$/i);
    let query = raw;
    let qty = 1;
    if (m) {
      query = m[1].trim();
      qty = Math.max(1, parseInt(m[2], 10) || 1);
    }
    const q = query.toLowerCase();
    const fieldsOf = (p: Product) =>
      [
        p.name,
        (p as unknown as { nameKana?: string }).nameKana,
        (p as unknown as { shortName?: string }).shortName,
        (p as unknown as { alias?: string }).alias,
        (p as unknown as { sku?: string }).sku,
        (p as unknown as { code?: string }).code,
        String(p.id),
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());
    const hit = products.find((p) => fieldsOf(p).some((f) => f.includes(q)));
    if (!hit) {
      toast.error("該当する商品が見つかりません");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        productId: hit.id,
        quantity: qty,
        search: `${hit.name}（¥${hit.price.toLocaleString()}）`,
      },
    ]);
    pushRecent(hit.id);
    setQuickInput("");
  };

  // Bottle keep serve queue helpers
  const toggleQueueBottleServe = (bottleKeepId: string, amount: number) => {
    setQueuedBottleServes((prev) => {
      const exists = prev.find(
        (q) => q.bottleKeepId === bottleKeepId && q.amount === amount
      );
      if (exists)
        return prev.filter(
          (q) => !(q.bottleKeepId === bottleKeepId && q.amount === amount)
        );
      return [...prev, { bottleKeepId, amount }];
    });
  };

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
      const valid = items.some((r) => r.productId && (r.quantity || 0) > 0);
      const invalid = items.some((r) => r.productId && (r.quantity || 0) <= 0);
      if (!valid || invalid) {
        toast.error(
          !valid
            ? "商品を1行以上選択してください"
            : "数量が不正な明細があります"
        );
        // scroll to first invalid row
        const badIdx = items.findIndex(
          (r) => r.productId && (r.quantity || 0) <= 0
        );
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

      // 4) キープからの出庫反映（任意）
      if (queuedBottleServes.length > 0) {
        try {
          for (const q of queuedBottleServes) {
            await BottleKeepService.serveBottle({
              bottle_keep_id: q.bottleKeepId,
              visit_id: visit.id,
              served_amount: q.amount,
            });
          }
        } catch (e) {
          if (process.env.NODE_ENV === "development") console.error(e);
          toast.error("ボトル出庫の反映に失敗しました");
        }
      }

      // 5)（任意）即時精算（チェックアウト）
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
            notes:
              [
                note || "",
                receiptRequested ? `領収書発行:${receiptName || "あり"}` : "",
                serviceRate ? `サ料:${serviceRate}%` : "",
                taxRate !== 10 ? `税率:${taxRate}%` : "",
              ]
                .filter(Boolean)
                .join(" | ") || undefined,
          });
        } catch (e) {
          if (process.env.NODE_ENV === "development") console.error(e);
          toast.error("精算に失敗しました");
          return; // ここで終了（再試行可能）
        }
      }

      toast.success("手入力の登録が完了しました");
      // フォーム初期化（前回明細の復元を可能にするため退避）
      setLastItems(
        items.map((r) => ({
          productId: r.productId,
          quantity: r.quantity,
          unitPrice: r.unitPrice,
        }))
      );
      setLastEngagements(
        engagements.map((e) => ({
          castId: e.castId,
          role: e.role,
          nominationTypeId: e.nominationTypeId,
        }))
      );
      setItems([{ productId: "", quantity: 1 }]);
      setEngagements([{ castId: "", role: "inhouse" }]);
      setNote("");
      setExternalSlipId("");
      setMixedCash(0);
      setMixedCard(0);
      setQueuedBottleServes([]);
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
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
                  {/* Quick time suggestions */}
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    {(() => {
                      const now = new Date();
                      const minutes = now.getMinutes();
                      const rounded = new Date(now);
                      rounded.setMinutes(Math.floor(minutes / 15) * 15, 0, 0);
                      const format = (d: Date) => d.toISOString().slice(11, 16);
                      const opts: string[] = [
                        format(rounded),
                        format(new Date(rounded.getTime() - 15 * 60000)),
                        format(new Date(rounded.getTime() + 15 * 60000)),
                      ];
                      const last = (() => {
                        try {
                          const raw = localStorage.getItem("last_visit_time");
                          return raw || null;
                        } catch {
                          return null;
                        }
                      })();
                      const unique = Array.from(
                        new Set([...(last ? [last] : []), ...opts])
                      );
                      return unique.map((t) => (
                        <button
                          key={t}
                          type="button"
                          className="px-2 py-1 border rounded hover:bg-gray-50"
                          onClick={() => setVisitTime(t)}
                        >
                          {t}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    テーブル
                  </label>
                  {/* Recent table suggestions */}
                  {recentTableIds.length > 0 && (
                    <div className="mt-1 mb-1 flex flex-wrap gap-2 text-xs">
                      {recentTableIds
                        .map((id) =>
                          tables.find((t) => String(t.id) === String(id))
                        )
                        .filter(Boolean)
                        .slice(0, 6)
                        .map((t) => (
                          <button
                            key={`rt-${(t as Table).id}`}
                            type="button"
                            className="px-2 py-1 border rounded hover:bg-gray-50"
                            onClick={() => setTableId(String((t as Table).id))}
                          >
                            {(t as Table).tableName}
                          </button>
                        ))}
                    </div>
                  )}
                  <select
                    id="table-select"
                    value={tableId}
                    onChange={(e) => {
                      setTableId(e.target.value);
                      if (e.target.value) pushRecentTable(e.target.value);
                    }}
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
                    className={`mt-1 w-full border rounded px-3 py-2 text-sm ${
                      selectedTable && numGuests > (selectedTable.capacity || 0)
                        ? "border-orange-400 bg-orange-50"
                        : ""
                    }`}
                  />
                  {selectedTable && (
                    <div className="mt-1 text-xs">
                      <span
                        className={
                          numGuests <= (selectedTable.capacity || 0)
                            ? "text-green-700"
                            : "text-orange-700"
                        }
                      >
                        {numGuests}/{selectedTable.capacity}
                      </span>
                      {numGuests > (selectedTable.capacity || 0) && (
                        <span className="ml-2 text-orange-700">定員超過</span>
                      )}
                    </div>
                  )}
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
                  {customerId && customerBottles.length > 0 && (
                    <div className="mt-3 border rounded p-2 bg-gray-50">
                      <div className="text-xs text-gray-700 mb-1 flex items-center justify-between">
                        <span>キープボトル（出庫可）</span>
                        {queuedBottleServes.length > 0 && (
                          <button
                            type="button"
                            className="text-[11px] text-indigo-600 hover:underline"
                            onClick={() => setQueuedBottleServes([])}
                          >
                            選択解除
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {customerBottles.slice(0, 6).map((b) => {
                          const selected = queuedBottleServes.some(
                            (q) => q.bottleKeepId === b.id
                          );
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => toggleQueueBottleServe(b.id, 10)}
                              className={`px-2 py-1 rounded border text-xs ${
                                selected
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-white hover:bg-gray-100"
                              }`}
                              title={`${b.product?.name || "ボトル"} 残量:${b.remaining_percentage}%`}
                            >
                              {(b.product?.name || "ボトル").slice(0, 8)}
                              <span className="ml-1 text-[10px] text-gray-500">
                                {b.remaining_percentage}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        クリックで「出庫10%」をトグル。登録時にまとめて反映します。
                      </div>
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
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    注文明細
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    F&Bを追加。単価は必要に応じて上書き可能です。
                  </p>
                </div>
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
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleQuickAdd();
                    }
                  }}
                  placeholder="クイック追加: 商品名/コード×数量（例: ﾋﾞｰﾙ×3）"
                  className="flex-1 border rounded px-3 py-2 text-sm"
                />
                <button
                  onClick={handleQuickAdd}
                  className="px-3 py-2 text-sm border rounded hover:bg-gray-50"
                >
                  追加
                </button>
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
                      if (
                        (e.ctrlKey || e.metaKey) &&
                        e.key.toLowerCase() === "k"
                      ) {
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
                        if (
                          document.activeElement === productRefs.current[idx]
                        ) {
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
                          onFocus={() => setActiveDropdownIndex(idx)}
                          onBlur={() => {
                            setTimeout(
                              () =>
                                setActiveDropdownIndex((v) =>
                                  v === idx ? null : v
                                ),
                              150
                            );
                          }}
                          placeholder="商品名/コードで検索（Ctrl/⌘+Kでフォーカス）"
                          className="w-full border rounded px-3 py-2 text-sm"
                        />
                        {activeDropdownIndex === idx && (
                          <div className="absolute z-10 mt-1 w-full max-h-64 overflow-auto bg-white border rounded shadow">
                            <div className="sticky top-0 bg-white border-b px-2 py-1 flex gap-2 text-xs">
                              <button
                                className={`px-2 py-1 rounded ${suggestionTab === "search" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setSuggestionTab("search")}
                              >
                                検索
                              </button>
                              <button
                                className={`px-2 py-1 rounded ${suggestionTab === "recent" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setSuggestionTab("recent")}
                              >
                                最近
                              </button>
                              <button
                                className={`px-2 py-1 rounded ${suggestionTab === "popular" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setSuggestionTab("popular")}
                              >
                                人気
                              </button>
                            </div>
                            {(() => {
                              const onPick = (p: Product) => {
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
                                pushRecent(p.id);
                                setTimeout(
                                  () => qtyRefs.current[idx]?.focus(),
                                  0
                                );
                              };
                              const q = (row.search || "").toLowerCase();
                              if (suggestionTab === "popular") {
                                const list = popularIds
                                  .map((id) => productMap.get(id))
                                  .filter(Boolean) as Product[];
                                return list.map((p) => (
                                  <button
                                    type="button"
                                    key={`pop-${p.id}`}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => onPick(p)}
                                  >
                                    {p.name}（¥{p.price.toLocaleString()}）
                                  </button>
                                ));
                              }
                              if (suggestionTab === "recent") {
                                const list = recentIds
                                  .map((id) => productMap.get(id))
                                  .filter(Boolean) as Product[];
                                return list.map((p) => (
                                  <button
                                    type="button"
                                    key={`rec-${p.id}`}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => onPick(p)}
                                  >
                                    {p.name}（¥{p.price.toLocaleString()}）
                                  </button>
                                ));
                              }
                              const filtered = products
                                .filter((p) => {
                                  if (!q) return true;
                                  const fields = [
                                    p.name,
                                    (p as unknown as { nameKana?: string })
                                      .nameKana,
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
                                .slice(0, 20);
                              return filtered.map((p) => (
                                <button
                                  type="button"
                                  key={p.id}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => onPick(p)}
                                >
                                  {p.name}（¥{p.price.toLocaleString()}）
                                </button>
                              ));
                            })()}
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
                            (
                              e.currentTarget as HTMLButtonElement
                            ).addEventListener("mouseleave", clearAll);
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
                                      quantity: parseInt(
                                        e.target.value || "1",
                                        10
                                      ),
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
                            (
                              e.currentTarget as HTMLButtonElement
                            ).addEventListener("mouseleave", clearAll);
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
                        className={`w-full border rounded px-3 py-2 text-sm ${(() => {
                          const pid = Number(items[idx]?.productId);
                          const base = pid
                            ? productMap.get(pid)?.price
                            : undefined;
                          const up = items[idx]?.unitPrice;
                          return up !== undefined &&
                            base !== undefined &&
                            up !== base
                            ? "border-indigo-400 bg-indigo-50"
                            : "";
                        })()}`}
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
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center"
                  >
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
              <h2 className="text-lg font-medium text-gray-900">
                精算（任意）
              </h2>
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
              {/* 税・サ料設定、領収書オプション */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    サービス料（%）
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={serviceRate}
                    onChange={(e) =>
                      setServiceRate(
                        Math.max(0, Math.min(30, Number(e.target.value || 0)))
                      )
                    }
                    className="mt-1 w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    税率（%）
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={taxRate}
                    onChange={(e) =>
                      setTaxRate(
                        Math.max(0, Math.min(20, Number(e.target.value || 0)))
                      )
                    }
                    className="mt-1 w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={receiptRequested}
                      onChange={(e) => setReceiptRequested(e.target.checked)}
                    />
                    領収書/レシートを発行する
                  </label>
                </div>
              </div>
              {receiptRequested && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      宛名（任意）
                    </label>
                    <input
                      type="text"
                      value={receiptName}
                      onChange={(e) => setReceiptName(e.target.value)}
                      className="mt-1 w-full border rounded px-3 py-2 text-sm"
                      placeholder="例: 株式会社〇〇 御中"
                    />
                  </div>
                </div>
              )}
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
                      onWheel={(e) =>
                        (e.currentTarget as HTMLInputElement).blur()
                      }
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
                      onWheel={(e) =>
                        (e.currentTarget as HTMLInputElement).blur()
                      }
                      className="mt-1 w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm">
                      合計: ¥{(mixedCash + mixedCard).toLocaleString()} / 目標:
                      ¥{estimatedTotal.toLocaleString()}
                      <br />
                      {mixedCash + mixedCard !== estimatedTotal && (
                        <span className="text-red-600">
                          合計が一致していません
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Aside summary */}
          <aside className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-5 sticky top-24">
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                確認
              </h3>
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
                  <span className="text-gray-500">明細行:</span> {items.length}{" "}
                  行
                </li>
                <li>
                  <span className="text-gray-500">税抜（小計）:</span> ¥
                  {estimatedSubtotal.toLocaleString()}
                </li>
                <li>
                  <span className="text-gray-500">
                    サービス料 ({serviceRate}%):
                  </span>{" "}
                  ¥{estimatedService.toLocaleString()}
                </li>
                <li>
                  <span className="text-gray-500">税額（{taxRate}%）:</span> ¥
                  {estimatedTax.toLocaleString()}
                </li>
                <li>
                  <span className="text-gray-500">税込（合計）:</span> ¥
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
              {lastItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setItems(
                      lastItems.map((r) => ({
                        productId:
                          r.productId === "" || r.productId === undefined
                            ? ""
                            : Number(r.productId),
                        quantity: r.quantity ?? 1,
                        unitPrice: r.unitPrice,
                      }))
                    );
                    setEngagements(
                      lastEngagements.length > 0
                        ? lastEngagements.map((e) => ({
                            castId: e.castId,
                            role: e.role,
                            nominationTypeId: e.nominationTypeId,
                          }))
                        : [{ castId: "", role: "inhouse" }]
                    );
                    setLastItems([]);
                    setLastEngagements([]);
                    setTimeout(() => productRefs.current[0]?.focus(), 0);
                    toast.success("前回の明細を復元しました");
                  }}
                  className="mt-2 w-full px-5 py-2 border rounded text-sm hover:bg-gray-50"
                >
                  同じ明細で続けて入力
                </button>
              )}
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
              {(!hasValidRow || hasInvalidRow) && (
                <p className="text-xs text-red-600 mt-1">
                  {hasInvalidRow
                    ? "数量が不正な明細があります。"
                    : "商品を1行以上選択してください。"}
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </Access>
  );
}
