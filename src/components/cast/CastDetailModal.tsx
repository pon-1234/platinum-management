"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useCastPerformance } from "@/hooks/useCastPerformance";
import type { Cast } from "@/types/cast.types";
import {
  UserIcon,
  CurrencyYenIcon,
  ChartBarIcon,
  CalendarIcon,
  ClockIcon,
  StarIcon,
  TrophyIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

interface CastDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cast: Cast;
}

export function CastDetailModal({
  isOpen,
  onClose,
  cast,
}: CastDetailModalProps) {
  const { performanceTotals, isLoading: performanceLoading } =
    useCastPerformance(cast.staffId);
  const [activeTab, setActiveTab] = useState<
    "basic" | "performance" | "history"
  >("basic");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const tabs = [
    { id: "basic", label: "基本情報", icon: UserIcon },
    { id: "performance", label: "パフォーマンス", icon: ChartBarIcon },
    { id: "history", label: "履歴", icon: CalendarIcon },
  ] as const;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${cast.stageName} - 詳細情報`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg">
          <div className="flex items-center space-x-6">
            {cast.profileImageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={cast.profileImageUrl}
                alt={cast.stageName}
                className="h-20 w-20 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center border-4 border-white shadow-lg">
                <span className="text-white font-bold text-2xl">
                  {cast.stageName.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  {cast.stageName}
                </h2>
                {!cast.isActive && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    無効
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CurrencyYenIcon className="h-4 w-4 text-green-500" />
                  <span className="text-gray-600">
                    時給: {formatCurrency(cast.hourlyRate || 0)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BanknotesIcon className="h-4 w-4 text-blue-500" />
                  <span className="text-gray-600">
                    バック率: {cast.backPercentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === "basic" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  基本情報
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      ステージネーム
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {cast.stageName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      スタッフID
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {cast.staffId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      ステータス
                    </dt>
                    <dd className="mt-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cast.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {cast.isActive ? "アクティブ" : "非アクティブ"}
                      </span>
                    </dd>
                  </div>
                  {cast.birthday && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        生年月日
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {formatDate(cast.birthday)}
                      </dd>
                    </div>
                  )}
                </div>
              </div>

              {/* Compensation Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <CurrencyYenIcon className="h-5 w-5" />
                  報酬情報
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">時給</dt>
                    <dd className="mt-1 text-lg font-semibold text-green-600">
                      {formatCurrency(cast.hourlyRate || 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      バック率
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-blue-600">
                      {cast.backPercentage}%
                    </dd>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "performance" && (
            <div className="space-y-6">
              {performanceLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : performanceTotals ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Performance Metrics */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <ChartBarIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          今月の売上
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(performanceTotals?.salesAmount || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <ClockIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          今月の勤務時間
                        </p>
                        <p className="text-2xl font-bold text-green-600">-</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <StarIcon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          平均売上/時間
                        </p>
                        <p className="text-2xl font-bold text-purple-600">-</p>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Performance Chart Placeholder */}
                  <div className="md:col-span-3 bg-white p-6 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <TrophyIcon className="h-5 w-5" />
                      パフォーマンス推移
                    </h4>
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      <p>パフォーマンスチャートは開発中です</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    パフォーマンスデータがありません
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                活動履歴
              </h3>
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          プロフィール作成
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(cast.createdAt)}
                        </p>
                      </div>
                    </div>
                    {cast.updatedAt !== cast.createdAt && (
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            最終更新
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(cast.updatedAt)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </Modal>
  );
}
