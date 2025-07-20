"use client";

import { useState, useEffect } from "react";
import { BottleKeepService } from "@/services/bottle-keep.service";
import type {
  BottleKeepStats,
  BottleKeepAlert,
} from "@/types/bottle-keep.types";
import {
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ClockIcon,
  BanknotesIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";

interface BottleKeepDashboardProps {
  onViewBottleKeeps?: () => void;
  onViewAlerts?: () => void;
  onViewExpiry?: () => void;
}

export function BottleKeepDashboard({
  onViewBottleKeeps,
  onViewAlerts,
  onViewExpiry,
}: BottleKeepDashboardProps) {
  const [stats, setStats] = useState<BottleKeepStats | null>(null);
  const [alerts, setAlerts] = useState<BottleKeepAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bottleKeepService = new BottleKeepService();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, alertsData] = await Promise.all([
        bottleKeepService.getBottleKeepStats(),
        bottleKeepService.getBottleKeepAlerts(),
      ]);
      setStats(statsData);
      setAlerts(alertsData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "データの取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">エラー</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BeakerIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    総ボトル数
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.totalBottles || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <button
                onClick={onViewBottleKeeps}
                className="font-medium text-blue-700 hover:text-blue-900"
              >
                ボトル一覧を見る
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    アクティブ
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.activeBottles || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-600">保管中</span>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    期限間近
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.expiringTown || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <button
                onClick={onViewExpiry}
                className="font-medium text-yellow-700 hover:text-yellow-900"
              >
                期限管理を見る
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    期限切れ
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.expiredBottles || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-600">処理必要</span>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BanknotesIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    保管総額
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(stats?.totalValue || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-600">アクティブボトル</span>
            </div>
          </div>
        </div>
      </div>

      {/* アラート一覧 */}
      {alerts.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              ボトルキープアラート
            </h3>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center p-3 rounded-md ${
                    alert.severity === "critical"
                      ? "bg-red-50 border border-red-200"
                      : "bg-yellow-50 border border-yellow-200"
                  }`}
                >
                  <ExclamationTriangleIcon
                    className={`h-5 w-5 ${
                      alert.severity === "critical"
                        ? "text-red-400"
                        : "text-yellow-400"
                    }`}
                  />
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {alert.customerName} - {alert.productName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {alert.message}
                      {alert.expiryDate && (
                        <span className="ml-2">
                          (期限:{" "}
                          {new Date(alert.expiryDate).toLocaleDateString(
                            "ja-JP"
                          )}
                          )
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="ml-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        alert.severity === "critical"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {alert.alertType === "expired"
                        ? "期限切れ"
                        : alert.alertType === "expiring"
                          ? "期限間近"
                          : "残量少"}
                    </span>
                  </div>
                </div>
              ))}
              {alerts.length > 5 && (
                <div className="text-center pt-3">
                  <button
                    onClick={onViewAlerts}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    すべてのアラートを見る ({alerts.length})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 消費済み・期限切れサマリー */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <BeakerIcon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <h4 className="text-lg font-medium text-gray-900">
                消費済みボトル
              </h4>
              <p className="text-3xl font-bold text-blue-600">
                {stats?.consumedBottles || 0}
              </p>
              <p className="text-sm text-gray-500">完全に消費されたボトル</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <ClockIcon className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <div className="ml-4">
              <h4 className="text-lg font-medium text-gray-900">
                期限切れボトル
              </h4>
              <p className="text-3xl font-bold text-red-600">
                {stats?.expiredBottles || 0}
              </p>
              <p className="text-sm text-gray-500">期限が切れたボトル</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
