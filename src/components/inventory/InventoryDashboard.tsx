"use client";

import { useState, useEffect } from "react";
import { inventoryService } from "@/services/inventory.service";
import type { InventoryStats, InventoryAlert } from "@/types/inventory.types";
import {
  ExclamationTriangleIcon,
  CubeIcon,
  ChartBarIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

interface InventoryDashboardProps {
  onViewProducts?: () => void;
  onViewAlerts?: () => void;
}

export function InventoryDashboard({
  onViewProducts,
  onViewAlerts,
}: InventoryDashboardProps) {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, alertsData] = await Promise.all([
        inventoryService.getInventoryStats(),
        inventoryService.getInventoryAlerts(),
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
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CubeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    商品総数
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.totalProducts || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <button
                onClick={onViewProducts}
                className="font-medium text-blue-700 hover:text-blue-900"
              >
                商品一覧を見る
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    在庫少量
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.lowStockItems || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <button
                onClick={onViewAlerts}
                className="font-medium text-yellow-700 hover:text-yellow-900"
              >
                アラートを見る
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    在庫切れ
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.outOfStockItems || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="text-gray-600">緊急補充必要</span>
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
                    在庫総額
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
              <span className="text-gray-600">原価ベース</span>
            </div>
          </div>
        </div>
      </div>

      {/* アラート一覧 */}
      {alerts.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              在庫アラート
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
                      {alert.productName}
                    </p>
                    <p className="text-sm text-gray-500">
                      現在の在庫: {alert.currentStock}
                      {alert.alertType === "out_of_stock"
                        ? " (在庫切れ)"
                        : ` (閾値: ${alert.threshold})`}
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
                      {alert.alertType === "out_of_stock"
                        ? "在庫切れ"
                        : "在庫少量"}
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
    </div>
  );
}
