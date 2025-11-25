"use client";

import { useState, useEffect } from "react";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { BottleKeepDashboard } from "@/components/bottle-keep/BottleKeepDashboard";
import { BottleKeepList } from "@/components/bottle-keep/BottleKeepList";
import { BottleKeepForm } from "@/components/bottle-keep/BottleKeepForm";
import { BottleKeepUsageForm } from "@/components/bottle-keep/BottleKeepUsageForm";
import {
  getBottleKeeps,
  getStorageLocations,
  getBottleKeepAlerts,
  getExpiryManagement,
  createBottleKeep,
  useBottleKeep as recordBottleKeepUsage,
} from "@/app/actions/bottle-keep.actions";
import { searchCustomers } from "@/app/actions/customer.actions";
import { getProducts } from "@/app/actions/inventory.actions";
import type {
  BottleKeepDetail,
  BottleKeepAlert,
  BottleKeepSearchFilter,
  CreateBottleKeepRequest,
  UseBottleKeepRequest,
  ExpiryManagement,
} from "@/types/bottle-keep.types";
import type { Customer } from "@/types/customer.types";
import type { Product } from "@/types/inventory.types";
import {
  BeakerIcon,
  PlusIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { Access } from "@/components/auth/Access";

type ViewMode = "dashboard" | "list" | "alerts" | "expiry";

export default function BottleKeepPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [isLoading, setIsLoading] = useState(false);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const [bottleKeeps, setBottleKeeps] = useState<BottleKeepDetail[]>([]);
  const [alerts, setAlerts] = useState<BottleKeepAlert[]>([]);
  const [expiryData, setExpiryData] = useState<ExpiryManagement | null>(null);
  const [storageLocations, setStorageLocations] = useState<string[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentFilter, setCurrentFilter] = useState<BottleKeepSearchFilter>(
    {}
  );

  // Modal states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showUsageForm, setShowUsageForm] = useState(false);
  const [selectedBottleKeep, setSelectedBottleKeep] =
    useState<BottleKeepDetail | null>(null);
  const [currentVisitId, setCurrentVisitId] = useState<string | undefined>();

  useEffect(() => {
    loadInitialData();
  }, []); // loadInitialData doesn't depend on any external variables

  const loadInitialData = async () => {
    try {
      const [locationsResult, customersResult, productsResult] =
        await Promise.all([
          getStorageLocations({}),
          searchCustomers({ limit: 50, offset: 0 }),
          getProducts({}),
        ]);

      if (locationsResult.success) {
        setStorageLocations(locationsResult.data);
      }
      if (customersResult.success) {
        setCustomers(customersResult.data);
      }
      if (productsResult.success) {
        setProducts(productsResult.data);
      }
    } catch (error) {
      toast.error("初期データの読み込みに失敗しました");
      if (process.env.NODE_ENV === "development") {
        console.error(error);
      }
    }
  };

  const loadBottleKeeps = async (filter: BottleKeepSearchFilter = {}) => {
    try {
      setIsLoading(true);
      const result = await getBottleKeeps(filter);

      if (result.success) {
        setBottleKeeps(result.data as unknown as BottleKeepDetail[]);
      } else {
        toast.error("ボトルキープデータの取得に失敗しました");
      }
    } catch (error) {
      toast.error("データの取得中にエラーが発生しました");
      if (process.env.NODE_ENV === "development") {
        console.error(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (filter: BottleKeepSearchFilter) => {
    setCurrentFilter(filter);
    loadBottleKeeps(filter);
  };

  const handleCreateBottleKeep = async (data: CreateBottleKeepRequest) => {
    try {
      const result = await createBottleKeep(data);
      if (result.success) {
        toast.success("ボトルキープを登録しました");
        setShowCreateForm(false);
        setSelectedBottleKeep(null);
        loadBottleKeeps(currentFilter);
      } else {
        toast.error(result.error || "ボトルキープの登録に失敗しました");
      }
    } catch (error) {
      toast.error("エラーが発生しました");
      if (process.env.NODE_ENV === "development") {
        console.error(error);
      }
    }
  };

  const handleUseBottleKeep = async (data: UseBottleKeepRequest) => {
    try {
      const result = await recordBottleKeepUsage(data);
      if (result.success) {
        toast.success("ボトルキープの使用を記録しました");
        setShowUsageForm(false);
        setSelectedBottleKeep(null);
        loadBottleKeeps(currentFilter);
      } else {
        toast.error(result.error || "使用記録の登録に失敗しました");
      }
    } catch (error) {
      toast.error("エラーが発生しました");
      if (process.env.NODE_ENV === "development") {
        console.error(error);
      }
    }
  };

  const handleViewBottleKeeps = () => {
    setViewMode("list");
    loadBottleKeeps(currentFilter);
  };

  const handleViewAlerts = () => {
    setViewMode("alerts");
    loadAlerts();
  };

  const handleViewExpiry = () => {
    setViewMode("expiry");
    loadExpiry();
  };

  const handleEditBottleKeep = (bottleKeep: BottleKeepDetail) => {
    // URL駆動ドロワーへ移行
    window.location.assign(`/bottle-keep/${bottleKeep.id}`);
  };

  const handleUseBottleKeepClick = (bottleKeep: BottleKeepDetail) => {
    setSelectedBottleKeep(bottleKeep);
    // TODO: 現在の来店IDを取得する処理を実装
    // 現在は来店IDなしで使用記録を作成
    setCurrentVisitId(undefined);
    setShowUsageForm(true);
  };

  const loadAlerts = async () => {
    try {
      setSecondaryLoading(true);
      const result = await getBottleKeepAlerts({});
      if (result.success) {
        setAlerts(result.data);
      } else {
        toast.error(result.error || "アラートの取得に失敗しました");
      }
    } catch (error) {
      toast.error("アラートの取得中にエラーが発生しました");
      if (process.env.NODE_ENV === "development") {
        console.error(error);
      }
    } finally {
      setSecondaryLoading(false);
    }
  };

  const loadExpiry = async () => {
    try {
      setSecondaryLoading(true);
      const result = await getExpiryManagement({});
      if (result.success) {
        setExpiryData(result.data);
      } else {
        toast.error(result.error || "期限データの取得に失敗しました");
      }
    } catch (error) {
      toast.error("期限データの取得中にエラーが発生しました");
      if (process.env.NODE_ENV === "development") {
        console.error(error);
      }
    } finally {
      setSecondaryLoading(false);
    }
  };

  const renderContent = () => {
    switch (viewMode) {
      case "dashboard":
        return (
          <BottleKeepDashboard
            onViewBottleKeeps={handleViewBottleKeeps}
            onViewAlerts={handleViewAlerts}
            onViewExpiry={handleViewExpiry}
          />
        );

      case "list":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  ボトルキープ一覧
                </h2>
                <p className="text-sm text-gray-500">
                  {bottleKeeps.length}件のボトルキープ
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setViewMode("dashboard")}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  ダッシュボードに戻る
                </button>
                <Access
                  roles={["admin", "manager", "hall", "cashier"]}
                  resource="bottle_keep"
                  action="manage"
                  require="any"
                >
                  <button
                    onClick={() => (window.location.href = "/bottle-keep/new")}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    新規登録
                  </button>
                </Access>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            ) : bottleKeeps.length === 0 ? (
              <EmptyState
                title="ボトルキープがありません"
                description="新しいボトルキープを登録してください。"
                icon={<BeakerIcon className="h-12 w-12" />}
              />
            ) : (
              <BottleKeepList
                bottleKeeps={bottleKeeps}
                onEdit={handleEditBottleKeep}
                onUse={handleUseBottleKeepClick}
                onFilterChange={handleFilterChange}
                storageLocations={storageLocations}
              />
            )}
          </div>
        );

      case "alerts":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  期限/残量アラート
                </h2>
                <p className="text-sm text-gray-500">
                  期限切れ・期限間近・残量わずかのボトルを確認します
                </p>
              </div>
              <button
                onClick={() => setViewMode("dashboard")}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                ダッシュボードに戻る
              </button>
            </div>

            {secondaryLoading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            ) : alerts.length === 0 ? (
              <EmptyState
                title="アラートはありません"
                description="期限や残量の警告はありません。"
                icon={<BeakerIcon className="h-12 w-12" />}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="border rounded-lg p-4 bg-white shadow-sm space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          alert.severity === "critical"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {alert.alertType === "low_amount"
                          ? "残量不足"
                          : alert.alertType === "expired"
                            ? "期限切れ"
                            : "期限間近"}
                      </span>
                      {alert.expiryDate && (
                        <span className="text-xs text-gray-500">
                          期限: {alert.expiryDate}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">
                        {alert.customerName}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {alert.productName}
                      </p>
                    </div>
                    <p className="text-sm text-gray-700">{alert.message}</p>
                    {typeof alert.remainingAmount === "number" && (
                      <p className="text-xs text-gray-500">
                        残量: {Math.round(alert.remainingAmount * 100)}%
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "expiry":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-900">期限管理</h2>
                <p className="text-sm text-gray-500">
                  期限が近いボトルを期日別に表示します
                </p>
              </div>
              <button
                onClick={() => setViewMode("dashboard")}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                ダッシュボードに戻る
              </button>
            </div>

            {secondaryLoading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            ) : !expiryData ? (
              <EmptyState
                title="期限データがありません"
                description="期限が設定されたボトルを登録すると表示されます。"
                icon={<AdjustmentsHorizontalIcon className="h-12 w-12" />}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    title: "今日期限",
                    data: expiryData.expiringToday,
                    tone: "text-red-700 bg-red-50",
                  },
                  {
                    title: "7日以内",
                    data: expiryData.expiringThisWeek,
                    tone: "text-amber-700 bg-amber-50",
                  },
                  {
                    title: "今月中",
                    data: expiryData.expiringThisMonth,
                    tone: "text-indigo-700 bg-indigo-50",
                  },
                  {
                    title: "期限切れ",
                    data: expiryData.expired,
                    tone: "text-gray-700 bg-gray-50",
                  },
                ].map((section) => (
                  <div
                    key={section.title}
                    className="border rounded-lg bg-white"
                  >
                    <div
                      className={`px-4 py-3 border-b font-semibold ${section.tone}`}
                    >
                      {section.title} ({section.data.length})
                    </div>
                    <div className="divide-y">
                      {section.data.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500">該当なし</p>
                      ) : (
                        section.data.map((bottle) => (
                          <div key={bottle.id} className="p-4 space-y-1">
                            <p className="text-sm text-gray-500">
                              {bottle.customer?.name}
                            </p>
                            <p className="font-medium text-gray-900">
                              {bottle.product?.name || "商品名不明"}
                            </p>
                            {bottle.expiry_date && (
                              <p className="text-xs text-gray-500">
                                期限: {bottle.expiry_date}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <AdjustmentsHorizontalIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              機能開発中
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              この機能は現在開発中です。
            </p>
            <div className="mt-6">
              <button
                onClick={() => setViewMode("dashboard")}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                ダッシュボードに戻る
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ボトルキープ管理</h1>
          <p className="text-gray-600">顧客のボトルキープを管理します</p>
        </div>
        {viewMode === "dashboard" && (
          <Access
            roles={["admin", "manager", "hall", "cashier"]}
            resource="bottle_keep"
            action="manage"
            require="any"
          >
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              新規登録
            </button>
          </Access>
        )}
      </div>

      {/* Content */}
      {renderContent()}

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-medium">
                {selectedBottleKeep
                  ? "ボトルキープ編集"
                  : "新規ボトルキープ登録"}
              </h3>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setSelectedBottleKeep(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <BottleKeepForm
                bottleKeep={selectedBottleKeep}
                customers={customers}
                products={products}
                storageLocations={storageLocations}
                onSubmit={handleCreateBottleKeep}
                onCancel={() => {
                  setShowCreateForm(false);
                  setSelectedBottleKeep(null);
                }}
                loading={isLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Usage Form Modal */}
      {showUsageForm && selectedBottleKeep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-medium">ボトルキープ使用記録</h3>
              <button
                onClick={() => {
                  setShowUsageForm(false);
                  setSelectedBottleKeep(null);
                  setCurrentVisitId(undefined);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <BottleKeepUsageForm
                bottleKeep={selectedBottleKeep}
                visitId={currentVisitId}
                onSubmit={handleUseBottleKeep}
                onCancel={() => {
                  setShowUsageForm(false);
                  setSelectedBottleKeep(null);
                  setCurrentVisitId(undefined);
                }}
                loading={isLoading}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
