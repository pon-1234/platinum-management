"use client";

import { useState, useEffect } from "react";
import { billingService } from "@/services/billing.service";
import { customerService } from "@/services/customer.service";
import { tableService } from "@/services/table.service";
import type {
  Visit,
  VisitWithDetails,
  OrderItem,
  CreateOrderItemData,
  CreateVisitData,
  BillCalculation,
} from "@/types/billing.types";
import type { Customer } from "@/types/customer.types";
import type { Table } from "@/types/database.types";
import {
  PlusIcon,
  TrashIcon,
  ReceiptPercentIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import ProductSelectModal from "./ProductSelectModal";

interface OrderTicketManagementProps {
  onVisitUpdate?: () => void;
}

export default function OrderTicketManagement({
  onVisitUpdate,
}: OrderTicketManagementProps) {
  const [activeVisits, setActiveVisits] = useState<Visit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<VisitWithDetails | null>(
    null
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [showNewVisitModal, setShowNewVisitModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProductSelectModal, setShowProductSelectModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // New visit form state
  const [newVisitForm, setNewVisitForm] = useState({
    customerId: "",
    tableId: 0,
    numGuests: 1,
    notes: "",
  });

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    method: "cash" as "cash" | "card" | "mixed",
    amount: 0,
    cashReceived: 0,
    notes: "",
  });
  const [billCalculation, setBillCalculation] =
    useState<BillCalculation | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [visitsData, customersData, tablesData] = await Promise.all([
        billingService.searchVisits({ status: "active" }),
        customerService.searchCustomers({}),
        tableService.getAllTables(),
      ]);

      setActiveVisits(visitsData);
      setCustomers(customersData);
      setTables(tablesData);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("データの読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVisit = async () => {
    try {
      const visitData: CreateVisitData = {
        customerId: newVisitForm.customerId,
        tableId: newVisitForm.tableId,
        numGuests: newVisitForm.numGuests,
        notes: newVisitForm.notes || undefined,
      };

      await billingService.createVisit(visitData);
      setShowNewVisitModal(false);
      setNewVisitForm({ customerId: "", tableId: 0, numGuests: 1, notes: "" });
      loadData();
      onVisitUpdate?.();
      toast.success("新しい来店を作成しました");
    } catch (error) {
      console.error("Failed to create visit:", error);
      toast.error("来店の作成に失敗しました");
    }
  };

  const handleSelectVisit = async (visitId: string) => {
    try {
      const visitDetails = await billingService.getVisitWithDetails(visitId);
      setSelectedVisit(visitDetails);
    } catch (error) {
      console.error("Failed to load visit details:", error);
      toast.error("来店詳細の読み込みに失敗しました");
    }
  };

  const loadBillCalculation = async (visitId: string) => {
    try {
      const calculation = await billingService.calculateBill(visitId);
      setBillCalculation(calculation);
      setPaymentForm((prev) => ({ ...prev, amount: calculation.totalAmount }));
    } catch (error) {
      console.error("Failed to calculate bill:", error);
      toast.error("料金計算に失敗しました");
    }
  };

  const handlePayment = async () => {
    if (!selectedVisit || !billCalculation) return;

    try {
      await billingService.processPayment(selectedVisit.id, {
        method: paymentForm.method,
        amount: billCalculation.totalAmount,
        cashReceived:
          paymentForm.method === "cash" ? paymentForm.cashReceived : undefined,
        changeAmount:
          paymentForm.method === "cash"
            ? paymentForm.cashReceived - billCalculation.totalAmount
            : undefined,
        notes: paymentForm.notes || undefined,
      });

      setShowPaymentModal(false);
      setSelectedVisit(null);
      setPaymentForm({ method: "cash", amount: 0, cashReceived: 0, notes: "" });
      loadData();
      onVisitUpdate?.();
      toast.success("お会計が完了しました");
    } catch (error) {
      console.error("Failed to process payment:", error);
      toast.error("お会計の処理に失敗しました");
    }
  };

  const handleDeleteOrderItem = async (orderItemId: number) => {
    if (!selectedVisit || !confirm("この注文を削除してもよろしいですか？"))
      return;

    try {
      await billingService.deleteOrderItem(orderItemId);
      toast.success("注文を削除しました");
      // Reload visit details
      await handleSelectVisit(selectedVisit.id);
    } catch (error) {
      console.error("Failed to delete order item:", error);
      toast.error("注文の削除に失敗しました");
    }
  };

  const handleProductsAdded = async () => {
    if (!selectedVisit) return;
    // Reload visit details to show new items
    await handleSelectVisit(selectedVisit.id);
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          オーダー・チケット管理
        </h2>
        <button
          onClick={() => setShowNewVisitModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          新規来店
        </button>
      </div>

      {/* Active Visits */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            進行中の来店 ({activeVisits.length}件)
          </h3>
        </div>
        {activeVisits.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-gray-500">現在進行中の来店はありません</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {activeVisits.map((visit) => (
              <li key={visit.id} className="px-4 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {visit.tableId}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        テーブル {visit.tableId}
                      </p>
                      <p className="text-sm text-gray-500">
                        {visit.numGuests}名 • {formatTime(visit.checkInAt)}〜
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSelectVisit(visit.id)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      詳細
                    </button>
                    <button
                      onClick={async () => {
                        await handleSelectVisit(visit.id);
                        await loadBillCalculation(visit.id);
                        setShowPaymentModal(true);
                      }}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <ReceiptPercentIcon className="-ml-1 mr-1 h-4 w-4" />
                      会計
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Visit Details Modal */}
      {selectedVisit && !showPaymentModal && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedVisit(null)}
          title={`テーブル ${selectedVisit.tableId} - 来店詳細`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">お客様:</span>
                <p>{selectedVisit.customer?.name || "未登録"}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">人数:</span>
                <p>{selectedVisit.numGuests}名</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">来店時刻:</span>
                <p>{formatTime(selectedVisit.checkInAt)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">経過時間:</span>
                <p>
                  {Math.floor(
                    (Date.now() - new Date(selectedVisit.checkInAt).getTime()) /
                      (1000 * 60)
                  )}
                  分
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-900">注文内容</h4>
                <button
                  onClick={() => setShowProductSelectModal(true)}
                  className="inline-flex items-center px-3 py-1 text-sm border border-transparent rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                >
                  <ShoppingCartIcon className="h-4 w-4 mr-1" />
                  商品追加
                </button>
              </div>
              {selectedVisit.orderItems &&
              selectedVisit.orderItems.length > 0 ? (
                <ul className="space-y-2">
                  {selectedVisit.orderItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded"
                    >
                      <div className="flex-1">
                        <span className="font-medium">
                          {item.product?.name} × {item.quantity}
                        </span>
                        {item.notes && (
                          <p className="text-xs text-gray-500 mt-1">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {formatCurrency(item.totalPrice)}
                        </span>
                        <button
                          onClick={() => handleDeleteOrderItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  まだ注文がありません
                </p>
              )}
              {selectedVisit.orderItems &&
                selectedVisit.orderItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-sm font-medium">
                      <span>小計</span>
                      <span>
                        {formatCurrency(
                          selectedVisit.orderItems.reduce(
                            (sum, item) => sum + item.totalPrice,
                            0
                          )
                        )}
                      </span>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </Modal>
      )}

      {/* New Visit Modal */}
      <Modal
        isOpen={showNewVisitModal}
        onClose={() => setShowNewVisitModal(false)}
        title="新規来店登録"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              お客様
            </label>
            <select
              value={newVisitForm.customerId}
              onChange={(e) =>
                setNewVisitForm({ ...newVisitForm, customerId: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">お客様を選択</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              テーブル
            </label>
            <select
              value={newVisitForm.tableId}
              onChange={(e) =>
                setNewVisitForm({
                  ...newVisitForm,
                  tableId: Number(e.target.value),
                })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value={0}>テーブルを選択</option>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  テーブル {table.id} ({table.seats}席)
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
              min="1"
              value={newVisitForm.numGuests}
              onChange={(e) =>
                setNewVisitForm({
                  ...newVisitForm,
                  numGuests: Number(e.target.value),
                })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              備考
            </label>
            <textarea
              value={newVisitForm.notes}
              onChange={(e) =>
                setNewVisitForm({ ...newVisitForm, notes: e.target.value })
              }
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowNewVisitModal(false)}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleCreateVisit}
              disabled={!newVisitForm.customerId || !newVisitForm.tableId}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
            >
              作成
            </button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setBillCalculation(null);
          setPaymentForm({
            method: "cash",
            amount: 0,
            cashReceived: 0,
            notes: "",
          });
        }}
        title="お会計処理"
      >
        {selectedVisit && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">
                テーブル {selectedVisit.tableId} - 請求内容
              </h4>
              {billCalculation ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">小計</span>
                    <span className="font-medium">
                      {formatCurrency(billCalculation.subtotal)}
                    </span>
                  </div>
                  {billCalculation.serviceCharge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">サービス料</span>
                      <span className="font-medium">
                        {formatCurrency(billCalculation.serviceCharge)}
                      </span>
                    </div>
                  )}
                  {billCalculation.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">消費税</span>
                      <span className="font-medium">
                        {formatCurrency(billCalculation.taxAmount)}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-300">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900">合計</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(billCalculation.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">計算中...</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                支払い方法
              </label>
              <select
                value={paymentForm.method}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    method: e.target.value as "cash" | "card" | "mixed",
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="cash">現金</option>
                <option value="card">カード</option>
                <option value="mixed">混合</option>
              </select>
            </div>

            {paymentForm.method === "cash" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    お預かり金額
                  </label>
                  <input
                    type="number"
                    value={paymentForm.cashReceived}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        cashReceived: Number(e.target.value),
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                {paymentForm.cashReceived > 0 && billCalculation && (
                  <div className="bg-blue-50 p-3 rounded-md">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-blue-900">お釣り</span>
                      <span className="font-bold text-blue-900">
                        {formatCurrency(
                          Math.max(
                            0,
                            paymentForm.cashReceived -
                              billCalculation.totalAmount
                          )
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                備考
              </label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, notes: e.target.value })
                }
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handlePayment}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                会計完了
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Product Select Modal */}
      {selectedVisit && (
        <ProductSelectModal
          isOpen={showProductSelectModal}
          onClose={() => setShowProductSelectModal(false)}
          visitId={selectedVisit.id}
          onItemsAdded={handleProductsAdded}
        />
      )}
    </div>
  );
}
