"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { BottleKeepDashboard } from "@/components/bottle-keep/BottleKeepDashboard";
import { BottleKeepList } from "@/components/bottle-keep/BottleKeepList";
import {
  getBottleKeeps,
  getStorageLocations,
  createBottleKeep,
  updateBottleKeep,
  useBottleKeep,
  type GetBottleKeepsInput,
  type CreateBottleKeepInput,
  type UpdateBottleKeepInput,
  type UseBottleKeepInput,
} from "@/app/actions/bottle-keep.actions";
import type {
  BottleKeepDetail,
  BottleKeepSearchFilter,
} from "@/types/bottle-keep.types";
import {
  BeakerIcon,
  PlusIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";

type ViewMode = "dashboard" | "list" | "alerts" | "expiry";

export default function BottleKeepPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [isLoading, setIsLoading] = useState(false);
  const [bottleKeeps, setBottleKeeps] = useState<BottleKeepDetail[]>([]);
  const [storageLocations, setStorageLocations] = useState<string[]>([]);
  const [currentFilter, setCurrentFilter] = useState<BottleKeepSearchFilter>(
    {}
  );

  // Modal states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showUsageForm, setShowUsageForm] = useState(false);
  const [selectedBottleKeep, setSelectedBottleKeep] =
    useState<BottleKeepDetail | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [locationsResult] = await Promise.all([getStorageLocations({})]);

      if (locationsResult.success) {
        setStorageLocations(locationsResult.data);
      }
    } catch (error) {
      toast.error("初期データの読み込みに失敗しました");
      console.error(error);
    }
  };

  const loadBottleKeeps = async (filter: BottleKeepSearchFilter = {}) => {
    try {
      setIsLoading(true);
      const result = await getBottleKeeps(filter);

      if (result.success) {
        setBottleKeeps(result.data);
      } else {
        toast.error("ボトルキープデータの取得に失敗しました");
      }
    } catch (error) {
      toast.error("データの取得中にエラーが発生しました");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (filter: BottleKeepSearchFilter) => {
    setCurrentFilter(filter);
    loadBottleKeeps(filter);
  };

  const handleCreateBottleKeep = async (data: CreateBottleKeepInput) => {
    try {
      const result = await createBottleKeep(data);
      if (result.success) {
        toast.success("ボトルキープを登録しました");
        setShowCreateForm(false);
        loadBottleKeeps(currentFilter);
      } else {
        toast.error("ボトルキープの登録に失敗しました");
      }
    } catch (error) {
      toast.error("エラーが発生しました");
      console.error(error);
    }
  };

  const handleUpdateBottleKeep = async (
    id: string,
    data: Omit<UpdateBottleKeepInput, "id">
  ) => {
    try {
      const result = await updateBottleKeep({ id, ...data });
      if (result.success) {
        toast.success("ボトルキープを更新しました");
        loadBottleKeeps(currentFilter);
      } else {
        toast.error("ボトルキープの更新に失敗しました");
      }
    } catch (error) {
      toast.error("エラーが発生しました");
      console.error(error);
    }
  };

  const handleUseBottleKeep = async (data: UseBottleKeepInput) => {
    try {
      const result = await useBottleKeep(data);
      if (result.success) {
        toast.success("ボトルキープの使用を記録しました");
        setShowUsageForm(false);
        setSelectedBottleKeep(null);
        loadBottleKeeps(currentFilter);
      } else {
        toast.error("使用記録の登録に失敗しました");
      }
    } catch (error) {
      toast.error("エラーが発生しました");
      console.error(error);
    }
  };

  const handleViewBottleKeeps = () => {
    setViewMode("list");
    loadBottleKeeps(currentFilter);
  };

  const handleViewAlerts = () => {
    setViewMode("alerts");
    // アラート表示の実装
  };

  const handleViewExpiry = () => {
    setViewMode("expiry");
    // 期限管理表示の実装
  };

  const handleEditBottleKeep = (bottleKeep: BottleKeepDetail) => {
    setSelectedBottleKeep(bottleKeep);
    setShowCreateForm(true);
  };

  const handleUseBottleKeepClick = (bottleKeep: BottleKeepDetail) => {
    setSelectedBottleKeep(bottleKeep);
    setShowUsageForm(true);
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
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  新規登録
                </button>
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
                loading={isLoading}
              />
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
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            新規登録
          </button>
        )}
      </div>

      {/* Content */}
      {renderContent()}

      {/* Modals would go here - placeholder for now */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">
              {selectedBottleKeep ? "ボトルキープ編集" : "新規ボトルキープ登録"}
            </h3>
            <p className="text-gray-500 mb-4">フォーム実装中...</p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setSelectedBottleKeep(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {showUsageForm && selectedBottleKeep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">ボトルキープ使用記録</h3>
            <p className="text-gray-500 mb-2">
              {selectedBottleKeep.customer?.name} -{" "}
              {selectedBottleKeep.product?.name}
            </p>
            <p className="text-sm text-gray-500 mb-4">使用フォーム実装中...</p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowUsageForm(false);
                  setSelectedBottleKeep(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
