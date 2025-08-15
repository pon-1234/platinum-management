"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { RecentActivities } from "./RecentActivities";
import { HourlySalesChart } from "./HourlySalesChart";

// ... (existing interfaces)
interface DashboardStats {
  totalCustomers: number;
  todayReservations: number;
  todaySales: number;
  todayVisits: number;
  todayNewCustomers: number;
  activeCastCount: number;
  activeTableCount: number;
  lowStockCount: number;
}

interface Activity {
  id: string;
  created_at: string;
  activity_type: string;
  details: string;
}

interface HourlySale {
  hour: string;
  total_sales: number;
}

interface DashboardClientProps {
  initialStats: DashboardStats | null;
  recentActivities: Activity[];
  hourlySales: HourlySale[];
  error: string | null;
}

export function DashboardClient({
  initialStats,
  recentActivities,
  hourlySales,
  error,
}: DashboardClientProps) {
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const stats = initialStats || {
    totalCustomers: 0,
    todayReservations: 0,
    todaySales: 0,
    todayVisits: 0,
    todayNewCustomers: 0,
    activeCastCount: 0,
    activeTableCount: 0,
    lowStockCount: 0,
  };

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
        ダッシュボード
      </h1>
      <p className="mt-2 text-sm text-gray-600">今日の状況と次のアクション</p>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/reservations"
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
          >
            予約を作成
          </Link>
          <Link
            href="/tables"
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50"
          >
            テーブル状況
          </Link>
          <Link
            href="/qr-attendance"
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50"
          >
            QR打刻
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* ... (existing stat cards) */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-indigo-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-semibold text-xs sm:text-sm">
                    顧客
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    登録顧客数
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {`${formatNumber(stats.totalCustomers)}人`}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-semibold text-xs sm:text-sm">
                    予約
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    本日の予約
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {`${formatNumber(stats.todayReservations)}件`}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-semibold text-xs sm:text-sm">
                    売上
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    本日の売上
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {formatCurrency(stats.todaySales)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="lg:col-span-1 min-w-0">
          <HourlySalesChart
            data={hourlySales.map((p) => ({
              hour: p.hour,
              amount: p.total_sales,
            }))}
          />
        </div>
        <div className="lg:col-span-1">
          {recentActivities && recentActivities.length > 0 ? (
            <RecentActivities activities={recentActivities} />
          ) : (
            <div className="bg-white shadow rounded-lg p-5 text-sm text-gray-500">
              最近の活動はまだありません。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
