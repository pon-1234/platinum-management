"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { RecentActivities } from "./RecentActivities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/common";
const HourlySalesChartLazy = dynamic(
  () =>
    import("./HourlySalesChart").then((m) => ({ default: m.HourlySalesChart })),
  {
    ssr: false,
    loading: () => (
      <div
        aria-busy="true"
        aria-label="時間帯別売上を読み込み中"
        className="h-[300px] w-full animate-pulse rounded-md bg-gray-100"
      />
    ),
  }
);

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

interface KpiDeltas {
  today: number;
  d1: number | null;
  dow: number | null;
}

interface KpiTrendsData {
  sales?: KpiDeltas;
  reservations?: KpiDeltas;
}

interface DashboardClientProps {
  initialStats: DashboardStats | null;
  recentActivities: Activity[];
  hourlySales: HourlySale[];
  error: string | null;
  kpiTrends?: KpiTrendsData;
}

export function DashboardClient({
  initialStats,
  recentActivities,
  hourlySales,
  error,
  kpiTrends,
}: DashboardClientProps) {
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const renderDelta = (delta?: number | null, label?: string) => {
    if (delta == null) return null;
    const sign = delta >= 0 ? "▲" : "▼";
    const color = delta >= 0 ? "text-emerald-600" : "text-rose-600";
    return (
      <span
        className={`text-xs ${color}`}
      >{`${sign} ${Math.abs(delta).toFixed(1)}%${label ? `（${label}）` : ""}`}</span>
    );
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
      <section className="mt-6" role="region" aria-label="クイックアクション">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/bookings"
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
      </section>

      {/* Summary cards */}
      <section
        className="mt-6 grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3"
        role="region"
        aria-label="本日のサマリー"
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">登録顧客数</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              role="status"
              aria-live="polite"
            >
              {formatNumber(stats.totalCustomers)}人
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">本日の予約</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              role="status"
              aria-live="polite"
            >
              {formatNumber(stats.todayReservations)}件
            </div>
            <div className="mt-1 flex items-center gap-2">
              {renderDelta(kpiTrends?.reservations?.d1, "前日")}
              {renderDelta(kpiTrends?.reservations?.dow, "同曜")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">本日の売上</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              role="status"
              aria-live="polite"
            >
              {formatCurrency(stats.todaySales)}
            </div>
            <div className="mt-1 flex items-center gap-2">
              {renderDelta(kpiTrends?.sales?.d1, "前日")}
              {renderDelta(kpiTrends?.sales?.dow, "同曜")}
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div
          className="lg:col-span-1 min-w-0"
          role="region"
          aria-label="時間帯別売上"
        >
          <HourlySalesChartLazy
            data={hourlySales.map((p) => ({
              hour: p.hour,
              amount: p.total_sales,
            }))}
          />
        </div>
        <div className="lg:col-span-1" role="region" aria-label="最近の活動">
          {recentActivities && recentActivities.length > 0 ? (
            <RecentActivities activities={recentActivities} />
          ) : (
            <Card>
              <CardContent>
                <EmptyState
                  title="最近の活動はまだありません"
                  description="予約作成や会計処理を行うと、ここに最新のアクティビティが表示されます。"
                  action={
                    <Link
                      href="/bookings"
                      className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      予約を作成
                    </Link>
                  }
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
