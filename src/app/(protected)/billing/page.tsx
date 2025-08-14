"use client";

import { useState, useEffect, useCallback } from "react";
import { billingService } from "@/services/billing.service";
import type { Visit, DailyReport } from "@/types/billing.types";
import {
  CalendarIcon,
  CurrencyYenIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { StatCard } from "@/components/ui/StatCard";
import OrderTicketManagement from "@/components/billing/OrderTicketManagement";
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
                          <td className="px-4 py-2 text-right">
                            <button
                              className="text-indigo-600 hover:text-indigo-800"
                              onClick={async () => {
                                try {
                                  const detail =
                                    await billingService.getVisitWithDetails(
                                      v.id
                                    );
                                  setDetailVisit(detail);
                                  setDetailOpen(true);
                                } catch {
                                  toast.error("詳細の取得に失敗しました");
                                }
                              }}
                            >
                              詳細
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-gray-500">顧客</div>
                <div>{detailVisit.customer?.name ?? "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">テーブル</div>
                <div>{detailVisit.tableId ?? "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">時間</div>
                <div>
                  {new Date(detailVisit.checkInAt).toLocaleString("ja-JP")}
                  {detailVisit.checkOutAt && (
                    <>
                      <span> 〜 </span>
                      {new Date(detailVisit.checkOutAt).toLocaleString("ja-JP")}
                    </>
                  )}
                </div>
              </div>
              <div>
                <div className="text-gray-500">人数</div>
                <div>{detailVisit.numGuests}名</div>
              </div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">注文明細</div>
              <ul className="divide-y divide-gray-100">
                {(detailVisit.orderItems || []).map((oi) => (
                  <li key={oi.id} className="py-1 flex justify-between">
                    <span>
                      {oi.product?.name ?? oi.productId} × {oi.quantity}
                    </span>
                    <span>¥{oi.totalPrice.toLocaleString()}</span>
                  </li>
                ))}
                {(!detailVisit.orderItems ||
                  detailVisit.orderItems.length === 0) && (
                  <li className="py-1 text-gray-400">データなし</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
