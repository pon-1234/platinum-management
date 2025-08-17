"use client";

import { useState, useEffect, useCallback } from "react";
import { billingService } from "@/services/billing.service";
import { VisitSessionService } from "@/services/visit-session.service";
import { castService } from "@/services/cast.service";
import { NominationTypeService } from "@/services/nomination-type.service";
import type { Visit, DailyReport } from "@/types/billing.types";
import {
  CalendarIcon,
  CurrencyYenIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { StatCard } from "@/components/ui/StatCard";
import OrderTicketManagement from "@/components/billing/OrderTicketManagement";
import QuotePreviewModal from "@/components/billing/QuotePreviewModal";
import ProductSelectModal from "@/components/billing/ProductSelectModal";
import { useState as useReactState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Access } from "@/components/auth/Access";
import type {
  BillCalculation,
  VisitWithDetails,
  PaymentMethod,
} from "@/types/billing.types";

export default function BillingPage() {
  const [todayReport, setTodayReport] = useState<DailyReport | null>(null);
  const [activeVisits, setActiveVisits] = useState<Visit[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAlreadyClosed, setIsAlreadyClosed] = useState(false);
  const [dayVisits, setDayVisits] = useState<Visit[]>([]);
  const [dayVisitsLoading, setDayVisitsLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailVisit, setDetailVisit] = useState<VisitWithDetails | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTableId, setEditTableId] = useState<number | "">("");
  const [editNumGuests, setEditNumGuests] = useState<number>(1);
  const [editCheckIn, setEditCheckIn] = useState<string>("");
  const [editCheckOut, setEditCheckOut] = useState<string>("");
  // Order items editing state
  const [editOrderItems, setEditOrderItems] = useState<
    Record<number, { quantity: number; unitPrice: number; notes?: string }>
  >({});
  // Engagements state
  const [engagements, setEngagements] = useState<Array<any>>([]);
  const [engagementLoading, setEngagementLoading] = useState(false);
  const [allCasts, setAllCasts] = useState<
    Array<{ id: string; stageName: string }>
  >([]);
  const [nominationTypes, setNominationTypes] = useState<
    Array<{ id: string; display_name: string }>
  >([]);
  const [newEngagement, setNewEngagement] = useState<{
    castId: string;
    role: "primary" | "inhouse" | "help" | "douhan" | "after";
    nominationTypeId?: string;
  }>({ castId: "", role: "inhouse" });
  // Backoffice delegated checkout (by session id)
  const [delegateOpen, setDelegateOpen] = useReactState(false);
  const [delegateVisitId, setDelegateVisitId] = useReactState("");
  const [delegateLoading, setDelegateLoading] = useReactState(false);
  const [delegateVisit, setDelegateVisit] =
    useReactState<VisitWithDetails | null>(null);
  const [delegateCalc, setDelegateCalc] = useReactState<BillCalculation | null>(
    null
  );
  const [delegateMethod, setDelegateMethod] =
    useReactState<PaymentMethod>("cash");
  const [delegateCashReceived, setDelegateCashReceived] =
    useReactState<number>(0);
  const [delegateNotes, setDelegateNotes] = useReactState<string>("");
  // Access control is handled via <Access> component

  const loadBillingData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load daily report
      const report = await billingService.generateDailyReport(selectedDate);
      setTodayReport(report);

      // Check if already closed
      const closingStatus =
        await billingService.getDailyClosingStatus(selectedDate);
      setIsAlreadyClosed(closingStatus);

      // Load visits for the selected day (all statuses)
      setDayVisitsLoading(true);
      const visitsOfDay = await billingService.searchVisits({
        startDate: `${selectedDate}T00:00:00.000Z`,
        endDate: `${selectedDate}T23:59:59.999Z`,
      });
      setDayVisits(visitsOfDay);
      setDayVisitsLoading(false);

      // Load active visits for today (separately)
      const today = new Date().toISOString().split("T")[0];
      if (selectedDate === today) {
        const visits = await billingService.searchVisits({
          status: "active",
          startDate: `${selectedDate}T00:00:00.000Z`,
          endDate: `${selectedDate}T23:59:59.999Z`,
        });
        setActiveVisits(visits);
      } else {
        setActiveVisits([]);
      }
    } catch (err) {
      setError("請求データの取得に失敗しました");
      if (process.env.NODE_ENV === "development") {
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  // (removed) client-side role fetch; unified with <Access>

  const handleClosingProcess = async () => {
    // Check for open visits first
    const openVisitsCount = await billingService.checkOpenVisits(selectedDate);

    let confirmMessage = "本日の売上を確定してレジ締めを実行しますか？";
    if (openVisitsCount > 0) {
      confirmMessage = `現在${openVisitsCount}組のお客様が来店中です。すべての来店を終了してレジ締めを実行しますか？`;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      // Perform daily closing
      const finalReport =
        await billingService.performDailyClosing(selectedDate);

      // Update the display with final report
      setTodayReport(finalReport);
      setActiveVisits([]); // Clear active visits as they're now completed
      setIsAlreadyClosed(true); // Mark as closed

      toast.success(
        `レジ締めが完了しました。総売上: ¥${finalReport.totalSales.toLocaleString()}`
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "レジ締め処理に失敗しました";
      setError(errorMessage);
      toast.error(errorMessage);
      if (process.env.NODE_ENV === "development") {
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">会計管理</h1>
          <p className="mt-2 text-sm text-gray-700">
            売上管理とレジ締め処理を行います
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <div className="flex gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-md border-gray-300 text-sm"
            />
            <Access
              roles={["admin", "manager", "cashier"]}
              resource="billing"
              action="process"
              require="any"
            >
              <button
                onClick={() => setDelegateOpen(true)}
                className="inline-flex items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium shadow-sm bg-indigo-600 text-white hover:bg-indigo-700"
              >
                代行会計
              </button>
            </Access>
            {selectedDate === new Date().toISOString().split("T")[0] && (
              <Access
                roles={["admin", "manager", "cashier"]}
                resource="billing"
                action="manage"
                require="any"
              >
                <button
                  onClick={handleClosingProcess}
                  disabled={isAlreadyClosed}
                  className={`inline-flex items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isAlreadyClosed
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
                  }`}
                >
                  <ClipboardDocumentListIcon className="-ml-1 mr-2 h-5 w-5" />
                  {isAlreadyClosed ? "レジ締め済み" : "レジ締め"}
                </button>
              </Access>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Closing Status */}
      {isAlreadyClosed && (
        <div className="mt-4 rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">
                {selectedDate}のレジ締めは完了しています
              </p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-gray-500">読み込み中...</span>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {/* Visits list for selected date */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                選択日の来店一覧
              </h3>
              <span className="text-sm text-gray-500">
                {dayVisitsLoading ? "読み込み中..." : `${dayVisits.length}件`}
              </span>
            </div>
            <div className="px-6 py-4">
              {dayVisitsLoading ? (
                <div className="text-sm text-gray-500">読み込み中...</div>
              ) : dayVisits.length === 0 ? (
                <div className="text-sm text-gray-500">来店がありません</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">テーブル</th>
                        <th className="px-4 py-2 text-left">顧客</th>
                        <th className="px-4 py-2 text-left">時間</th>
                        <th className="px-4 py-2 text-left">人数</th>
                        <th className="px-4 py-2 text-left">ステータス</th>
                        <th className="px-4 py-2 text-right">合計</th>
                        <th className="px-4 py-2 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dayVisits.map((v) => (
                        <tr key={v.id}>
                          <td className="px-4 py-2">{v.tableId ?? "-"}</td>
                          <td className="px-4 py-2">
                            {(v as any).customer?.name ?? "-"}
                          </td>
                          <td className="px-4 py-2">
                            {new Date(v.checkInAt).toLocaleTimeString("ja-JP", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {v.checkOutAt && (
                              <>
                                <span>〜</span>
                                {new Date(v.checkOutAt).toLocaleTimeString(
                                  "ja-JP",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </>
                            )}
                          </td>
                          <td className="px-4 py-2">{v.numGuests}名</td>
                          <td className="px-4 py-2">
                            {v.status === "active"
                              ? "滞在中"
                              : v.status === "completed"
                                ? "完了"
                                : "キャンセル"}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {typeof v.totalAmount === "number"
                              ? `¥${v.totalAmount.toLocaleString()}`
                              : "-"}
                          </td>
                          <td className="px-4 py-2 text-right space-x-3">
                            <button
                              className="text-indigo-600 hover:text-indigo-800"
                              onClick={async () => {
                                try {
                                  const detail =
                                    await billingService.getVisitWithDetails(
                                      v.id
                                    );
                                  if (!detail) {
                                    toast.error("対象の来店が見つかりません");
                                    return;
                                  }
                                  setDetailVisit(detail);
                                  setEditing(false);
                                  setEditTableId(detail.tableId || "");
                                  setEditNumGuests(detail.numGuests || 1);
                                  setEditCheckIn(detail.checkInAt);
                                  setEditCheckOut(detail.checkOutAt || "");
                                  // Prepare order items edit buffer
                                  const mapped: Record<
                                    number,
                                    {
                                      quantity: number;
                                      unitPrice: number;
                                      notes?: string;
                                    }
                                  > = {};
                                  (detail.orderItems || []).forEach((oi) => {
                                    mapped[oi.id] = {
                                      quantity: oi.quantity,
                                      unitPrice: oi.unitPrice,
                                      notes: oi.notes || undefined,
                                    };
                                  });
                                  setEditOrderItems(mapped);
                                  // Load engagements
                                  setEngagementLoading(true);
                                  try {
                                    const session =
                                      await VisitSessionService.getSessionDetails(
                                        detail.id
                                      );
                                    setEngagements(
                                      session?.cast_engagements || []
                                    );
                                    const [castsRes, types] = await Promise.all(
                                      [
                                        castService.getAllCasts(1, 200),
                                        NominationTypeService.getAllNominationTypes(),
                                      ]
                                    );
                                    setAllCasts(
                                      castsRes.data.map((c) => ({
                                        id: c.id,
                                        stageName: c.stageName,
                                      }))
                                    );
                                    setNominationTypes(
                                      types.map((t) => ({
                                        id: t.id as string,
                                        display_name: t.display_name,
                                      }))
                                    );
                                  } finally {
                                    setEngagementLoading(false);
                                  }
                                  setDetailOpen(true);
                                } catch {
                                  toast.error("詳細の取得に失敗しました");
                                }
                              }}
                            >
                              詳細
                            </button>
                            <button
                              className="text-green-700 hover:text-green-900"
                              onClick={async () => {
                                try {
                                  const detail =
                                    await billingService.getVisitWithDetails(
                                      v.id
                                    );
                                  if (!detail) {
                                    toast.error("対象の来店が見つかりません");
                                    return;
                                  }
                                  setDetailVisit(detail);
                                  setQuoteOpen(true);
                                } catch {
                                  toast.error("見積りの取得に失敗しました");
                                }
                              }}
                            >
                              見積り
                            </button>
                            <button
                              className="text-yellow-700 hover:text-yellow-900"
                              onClick={async () => {
                                if (
                                  !confirm("この来店をキャンセルにしますか？")
                                )
                                  return;
                                try {
                                  await billingService.cancelVisit(v.id);
                                  toast.success("キャンセルしました");
                                  loadBillingData();
                                } catch {
                                  toast.error("キャンセルに失敗しました");
                                }
                              }}
                            >
                              キャンセル
                            </button>
                            <button
                              className="text-red-600 hover:text-red-800"
                              onClick={async () => {
                                if (
                                  !confirm(
                                    "この来店を完全に削除します。元に戻せません。続行しますか？"
                                  )
                                )
                                  return;
                                try {
                                  await billingService.deleteVisit(v.id);
                                  toast.success("削除しました");
                                  loadBillingData();
                                } catch {
                                  toast.error("削除に失敗しました");
                                }
                              }}
                            >
                              削除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Order Ticket Management */}
          <OrderTicketManagement onVisitUpdate={loadBillingData} />

          {/* Daily Report Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="来店組数"
              value={todayReport ? todayReport.totalVisits : 0}
              icon={<CalendarIcon className="h-6 w-6" />}
              valueFormatter={(value) => `${formatNumber(Number(value))}組`}
            />

            <StatCard
              title="総売上"
              value={todayReport ? todayReport.totalSales : 0}
              icon={<CurrencyYenIcon className="h-6 w-6" />}
              valueFormatter={(value) => formatCurrency(Number(value))}
            />

            <StatCard
              title="現金売上"
              value={todayReport ? todayReport.totalCash : 0}
              icon={<CurrencyYenIcon className="h-6 w-6" />}
              iconColor="text-green-400"
              valueFormatter={(value) => formatCurrency(Number(value))}
            />

            <StatCard
              title="カード売上"
              value={todayReport ? todayReport.totalCard : 0}
              icon={<CurrencyYenIcon className="h-6 w-6" />}
              iconColor="text-blue-400"
              valueFormatter={(value) => formatCurrency(Number(value))}
            />
          </div>

          {/* Active Visits */}
          {activeVisits.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                進行中の来店（{activeVisits.length}組）
              </h3>
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {activeVisits.map((visit) => (
                    <li key={visit.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium">
                                {visit.tableId}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900">
                              テーブル {visit.tableId}
                            </p>
                            <p className="text-sm text-gray-500">
                              {visit.numGuests}名 •{" "}
                              {new Date(visit.checkInAt).toLocaleTimeString(
                                "ja-JP",
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                              〜
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            進行中
                          </p>
                          <p className="text-sm text-gray-500">
                            {Math.floor(
                              (Date.now() -
                                new Date(visit.checkInAt).getTime()) /
                                (1000 * 60)
                            )}
                            分経過
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Daily Report Details */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Products */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  人気商品ランキング
                </h3>
              </div>
              <div className="px-6 py-4">
                {todayReport?.topProducts &&
                todayReport.topProducts.length > 0 ? (
                  <ul className="space-y-3">
                    {todayReport.topProducts.map((product, index) => (
                      <li
                        key={product.productId}
                        className="flex justify-between"
                      >
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-500 w-6">
                            {index + 1}.
                          </span>
                          <span className="text-sm font-medium text-gray-900 ml-2">
                            {product.productName}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(product.totalAmount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {product.quantity}個
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">データがありません</p>
                )}
              </div>
            </div>

            {/* Top Casts */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  キャスト売上ランキング
                </h3>
              </div>
              <div className="px-6 py-4">
                {todayReport?.topCasts && todayReport.topCasts.length > 0 ? (
                  <ul className="space-y-3">
                    {todayReport.topCasts.map((cast, index) => (
                      <li key={cast.castId} className="flex justify-between">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-500 w-6">
                            {index + 1}.
                          </span>
                          <span className="text-sm font-medium text-gray-900 ml-2">
                            {cast.castName}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(cast.totalAmount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {cast.orderCount}件
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">データがありません</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delegate checkout modal */}
      <Modal
        isOpen={delegateOpen}
        onClose={() => setDelegateOpen(false)}
        title="代行会計（セッションID指定）"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Visit (Session) ID</label>
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded px-3 py-2 text-sm"
                placeholder="Visit ID を入力"
                value={delegateVisitId}
                onChange={(e) => setDelegateVisitId(e.target.value)}
              />
              <button
                disabled={!delegateVisitId || delegateLoading}
                onClick={async () => {
                  try {
                    setDelegateLoading(true);
                    setDelegateVisit(null);
                    setDelegateCalc(null);
                    const visit =
                      await billingService.getOpenCheckBySession(
                        delegateVisitId
                      );
                    if (!visit) {
                      toast.error("対象のセッションが見つかりません");
                      return;
                    }
                    const calc = await billingService.calculateBill(visit.id);
                    setDelegateVisit(visit);
                    setDelegateCalc(calc);
                    setDelegateMethod("cash");
                    setDelegateCashReceived(calc.totalAmount);
                  } catch (e) {
                    toast.error("読み込みに失敗しました");
                    if (process.env.NODE_ENV === "development") {
                      console.error(e);
                    }
                  } finally {
                    setDelegateLoading(false);
                  }
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-800 disabled:opacity-60"
              >
                {delegateLoading ? "読み込み中..." : "読み込み"}
              </button>
            </div>
          </div>

          {delegateVisit && delegateCalc && (
            <div className="space-y-3">
              <div className="text-sm">
                お客様: {delegateVisit.customer?.name || "未登録"}
              </div>
              <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>小計</span>
                  <span>¥{delegateCalc.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>サービス料</span>
                  <span>¥{delegateCalc.serviceCharge.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>税額</span>
                  <span>¥{delegateCalc.taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold pt-1 border-t">
                  <span>合計</span>
                  <span>¥{delegateCalc.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">支払い方法</label>
                <select
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={delegateMethod}
                  onChange={(e) =>
                    setDelegateMethod(e.target.value as PaymentMethod)
                  }
                >
                  <option value="cash">現金</option>
                  <option value="card">カード</option>
                  <option value="mixed">混合</option>
                </select>
              </div>

              {(delegateMethod === "cash" || delegateMethod === "mixed") && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">お預かり金額</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={delegateCashReceived}
                    onChange={(e) =>
                      setDelegateCashReceived(Number(e.target.value))
                    }
                  />
                  {delegateMethod === "cash" && delegateCashReceived > 0 && (
                    <div className="text-xs text-gray-600">
                      お釣り: ¥
                      {Math.max(
                        0,
                        delegateCashReceived - delegateCalc.totalAmount
                      ).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium">備考</label>
                <textarea
                  className="w-full border rounded px-2 py-1 text-sm"
                  rows={2}
                  value={delegateNotes}
                  onChange={(e) => setDelegateNotes(e.target.value)}
                />
              </div>

              <button
                disabled={delegateLoading}
                onClick={async () => {
                  if (!delegateVisit || !delegateCalc) return;
                  try {
                    setDelegateLoading(true);
                    await billingService.checkoutSession(delegateVisit.id, {
                      method: delegateMethod,
                      amount: delegateCalc.totalAmount,
                      cashReceived:
                        delegateMethod === "card"
                          ? undefined
                          : delegateCashReceived,
                      changeAmount:
                        delegateMethod === "cash" && delegateCashReceived
                          ? Math.max(
                              0,
                              delegateCashReceived - delegateCalc.totalAmount
                            )
                          : undefined,
                      notes: delegateNotes || undefined,
                    });
                    toast.success("代行会計が完了しました");
                    setDelegateOpen(false);
                    setDelegateVisitId("");
                    setDelegateVisit(null);
                    setDelegateCalc(null);
                    setDelegateCashReceived(0);
                    setDelegateNotes("");
                    loadBillingData();
                  } catch (e) {
                    toast.error("代行会計に失敗しました");
                    if (process.env.NODE_ENV === "development") {
                      console.error(e);
                    }
                  } finally {
                    setDelegateLoading(false);
                  }
                }}
                className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
              >
                {delegateLoading ? "処理中..." : "会計実行"}
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Visit detail modal */}
      <Modal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="来店詳細"
      >
        {!detailVisit ? (
          <div className="py-8 text-center text-sm text-gray-500">
            読み込み中...
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium">基本情報</div>
              <button
                className="text-indigo-600 hover:text-indigo-800"
                onClick={() => setEditing((e) => !e)}
              >
                {editing ? "編集をやめる" : "編集"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-gray-500">顧客</div>
                <div className="flex items-center gap-2">
                  <span>{detailVisit.customer?.name ?? "未登録"}</span>
                  <button
                    className="text-xs px-2 py-0.5 border rounded"
                    onClick={async () => {
                      const customerId =
                        prompt("割当てる顧客IDを入力してください");
                      if (!customerId) return;
                      try {
                        await billingService.updateVisit(detailVisit.id, {
                          customerId,
                        });
                        const refreshed =
                          await billingService.getVisitWithDetails(
                            detailVisit.id
                          );
                        setDetailVisit(refreshed);
                        toast.success("顧客を割当てました");
                      } catch {
                        toast.error("割当てに失敗しました");
                      }
                    }}
                  >
                    顧客割当
                  </button>
                </div>
              </div>
              <div>
                <div className="text-gray-500">テーブル</div>
                {editing ? (
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1"
                    value={editTableId === "" ? "" : String(editTableId)}
                    onChange={(e) =>
                      setEditTableId(
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                  />
                ) : (
                  <div>{detailVisit.tableId ?? "-"}</div>
                )}
              </div>
              <div>
                <div className="text-gray-500">時間</div>
                <div>
                  {editing ? (
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">
                          チェックイン
                        </label>
                        <input
                          type="datetime-local"
                          className="w-full border rounded px-2 py-1"
                          value={editCheckIn.slice(0, 16)}
                          onChange={(e) =>
                            setEditCheckIn(
                              new Date(e.target.value).toISOString()
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">
                          チェックアウト（任意）
                        </label>
                        <input
                          type="datetime-local"
                          className="w-full border rounded px-2 py-1"
                          value={editCheckOut ? editCheckOut.slice(0, 16) : ""}
                          onChange={(e) =>
                            setEditCheckOut(
                              e.target.value
                                ? new Date(e.target.value).toISOString()
                                : ""
                            )
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      {new Date(detailVisit.checkInAt).toLocaleString("ja-JP")}
                      {detailVisit.checkOutAt && (
                        <>
                          <span> 〜 </span>
                          {new Date(detailVisit.checkOutAt).toLocaleString(
                            "ja-JP"
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div>
                <div className="text-gray-500">人数</div>
                {editing ? (
                  <input
                    type="number"
                    min={1}
                    className="w-full border rounded px-2 py-1"
                    value={editNumGuests}
                    onChange={(e) =>
                      setEditNumGuests(Math.max(1, Number(e.target.value || 1)))
                    }
                  />
                ) : (
                  <div>{detailVisit.numGuests}名</div>
                )}
              </div>
            </div>
            {editing && (
              <div className="pt-2 flex justify-end gap-2">
                <button
                  className="px-3 py-1.5 border rounded"
                  onClick={() => {
                    setEditing(false);
                    setEditTableId(detailVisit.tableId || "");
                    setEditNumGuests(detailVisit.numGuests || 1);
                    setEditCheckIn(detailVisit.checkInAt);
                    setEditCheckOut(detailVisit.checkOutAt || "");
                  }}
                >
                  取消
                </button>
                <button
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded"
                  onClick={async () => {
                    try {
                      await billingService.updateVisit(detailVisit.id, {
                        tableId:
                          editTableId === "" ? undefined : Number(editTableId),
                        numGuests: editNumGuests,
                        // 型整合のため、チェックイン/アウトはnotesに追記で暫定保存（DBに専用カラムがない環境向け）
                        notes: [
                          detailVisit.notes || "",
                          `checkInAt:${editCheckIn}`,
                          editCheckOut ? `checkOutAt:${editCheckOut}` : "",
                        ]
                          .filter(Boolean)
                          .join(" | "),
                      });
                      const refreshed =
                        await billingService.getVisitWithDetails(
                          detailVisit.id
                        );
                      setDetailVisit(refreshed);
                      setEditing(false);
                      const visitsOfDay = await billingService.searchVisits({
                        startDate: `${selectedDate}T00:00:00.000Z`,
                        endDate: `${selectedDate}T23:59:59.999Z`,
                      });
                      setDayVisits(visitsOfDay);
                      toast.success("更新しました");
                    } catch (e) {
                      toast.error("更新に失敗しました");
                    }
                  }}
                >
                  保存
                </button>
              </div>
            )}
            <div>
              <div className="text-gray-500 mb-1 flex items-center justify-between">
                <span>注文明細</span>
                <button
                  className="text-xs px-2 py-1 border rounded"
                  onClick={() => setProductModalOpen(true)}
                >
                  明細を追加
                </button>
              </div>
              <div className="space-y-2">
                {(detailVisit.orderItems || []).map((oi) => (
                  <div
                    key={oi.id}
                    className="grid grid-cols-12 gap-2 items-center py-1 border-b border-gray-100"
                  >
                    <div
                      className="col-span-4 truncate"
                      title={oi.product?.name ?? String(oi.productId)}
                    >
                      {oi.product?.name ?? oi.productId}
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min={1}
                        className="w-full border rounded px-2 py-1 text-right"
                        value={editOrderItems[oi.id]?.quantity ?? oi.quantity}
                        onChange={(e) =>
                          setEditOrderItems((prev) => ({
                            ...prev,
                            [oi.id]: {
                              quantity: Math.max(
                                1,
                                Number(e.target.value || 1)
                              ),
                              unitPrice: prev[oi.id]?.unitPrice ?? oi.unitPrice,
                              notes:
                                (prev[oi.id]?.notes ?? oi.notes) || undefined,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min={0}
                        className="w-full border rounded px-2 py-1 text-right"
                        value={editOrderItems[oi.id]?.unitPrice ?? oi.unitPrice}
                        onChange={(e) =>
                          setEditOrderItems((prev) => ({
                            ...prev,
                            [oi.id]: {
                              quantity: prev[oi.id]?.quantity ?? oi.quantity,
                              unitPrice: Math.max(
                                0,
                                Number(e.target.value || 0)
                              ),
                              notes:
                                (prev[oi.id]?.notes ?? oi.notes) || undefined,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        className="w-full border rounded px-2 py-1"
                        placeholder="備考"
                        value={editOrderItems[oi.id]?.notes ?? oi.notes ?? ""}
                        onChange={(e) =>
                          setEditOrderItems((prev) => ({
                            ...prev,
                            [oi.id]: {
                              quantity: prev[oi.id]?.quantity ?? oi.quantity,
                              unitPrice: prev[oi.id]?.unitPrice ?? oi.unitPrice,
                              notes: e.target.value || undefined,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      <button
                        className="px-2 py-1 text-xs border rounded mr-2"
                        onClick={async () => {
                          try {
                            const payload = editOrderItems[oi.id];
                            if (payload) {
                              await billingService.updateOrderItem(oi.id, {
                                quantity: payload.quantity,
                                unitPrice: payload.unitPrice,
                                notes: payload.notes,
                              });
                              const refreshed =
                                await billingService.getVisitWithDetails(
                                  detailVisit.id
                                );
                              setDetailVisit(refreshed);
                              toast.success("明細を更新しました");
                            }
                          } catch {
                            toast.error("明細の更新に失敗しました");
                          }
                        }}
                      >
                        保存
                      </button>
                      <button
                        className="px-2 py-1 text-xs border rounded text-red-600"
                        onClick={async () => {
                          if (!confirm("この明細を削除しますか？")) return;
                          try {
                            await billingService.deleteOrderItem(oi.id);
                            const refreshed =
                              await billingService.getVisitWithDetails(
                                detailVisit.id
                              );
                            setDetailVisit(refreshed);
                            toast.success("明細を削除しました");
                          } catch {
                            toast.error("明細の削除に失敗しました");
                          }
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
                {(!detailVisit.orderItems ||
                  detailVisit.orderItems.length === 0) && (
                  <div className="py-1 text-gray-400">データなし</div>
                )}
              </div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">指名・着席キャスト</div>
              {engagementLoading ? (
                <div className="text-xs text-gray-500">読み込み中...</div>
              ) : (
                <div className="space-y-2">
                  {(engagements || []).map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between text-sm border-b border-gray-100 py-1"
                    >
                      <div className="truncate">
                        {e.cast?.stage_name || e.cast_id}{" "}
                        <span className="text-gray-400">/ {e.role}</span>
                        {e.nomination_type?.display_name && (
                          <span className="ml-1 text-gray-400">
                            ({e.nomination_type.display_name})
                          </span>
                        )}
                      </div>
                      {e.is_active ? (
                        <button
                          className="text-xs text-red-600 hover:text-red-700"
                          onClick={async () => {
                            try {
                              await VisitSessionService.endCastEngagement(e.id);
                              const session =
                                await VisitSessionService.getSessionDetails(
                                  detailVisit.id
                                );
                              setEngagements(session?.cast_engagements || []);
                              toast.success("終了しました");
                            } catch {
                              toast.error("終了に失敗しました");
                            }
                          }}
                        >
                          終了
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">終了</span>
                      )}
                    </div>
                  ))}
                  <div className="pt-2 grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                    <div>
                      <label className="text-xs text-gray-500">キャスト</label>
                      <select
                        className="w-full border rounded px-2 py-1"
                        value={newEngagement.castId}
                        onChange={(e) =>
                          setNewEngagement((p) => ({
                            ...p,
                            castId: e.target.value,
                          }))
                        }
                      >
                        <option value="">選択</option>
                        {allCasts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.stageName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">役割</label>
                      <select
                        className="w-full border rounded px-2 py-1"
                        value={newEngagement.role}
                        onChange={(e) =>
                          setNewEngagement((p) => ({
                            ...p,
                            role: e.target.value as typeof p.role,
                          }))
                        }
                      >
                        <option value="primary">本指名</option>
                        <option value="inhouse">場内指名</option>
                        <option value="help">ヘルプ</option>
                        <option value="douhan">同伴</option>
                        <option value="after">アフター</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">指名種別</label>
                      <select
                        className="w-full border rounded px-2 py-1"
                        value={newEngagement.nominationTypeId || ""}
                        onChange={(e) =>
                          setNewEngagement((p) => ({
                            ...p,
                            nominationTypeId: e.target.value || undefined,
                          }))
                        }
                      >
                        <option value="">選択</option>
                        {nominationTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.display_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end">
                      <button
                        className="px-3 py-1.5 text-sm border rounded"
                        onClick={async () => {
                          if (!newEngagement.castId) {
                            toast.error("キャストを選択してください");
                            return;
                          }
                          try {
                            await VisitSessionService.addCastEngagement(
                              detailVisit.id,
                              newEngagement.castId,
                              newEngagement.role,
                              newEngagement.nominationTypeId
                            );
                            const session =
                              await VisitSessionService.getSessionDetails(
                                detailVisit.id
                              );
                            setEngagements(session?.cast_engagements || []);
                            toast.success("指名を追加しました");
                          } catch {
                            toast.error("指名の追加に失敗しました");
                          }
                        }}
                      >
                        追加
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Product select modal for adding order items */}
      <ProductSelectModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        visitId={detailVisit?.id || ""}
        onItemsAdded={async () => {
          if (!detailVisit) return;
          try {
            const refreshed = await billingService.getVisitWithDetails(
              detailVisit.id
            );
            setDetailVisit(refreshed);
          } catch {
            /* ignore */
          }
        }}
      />

      {/* Quote preview modal */}
      {detailVisit && (
        <QuotePreviewModal
          isOpen={quoteOpen}
          onClose={() => setQuoteOpen(false)}
          visit={detailVisit}
        />
      )}
    </div>
  );
}
