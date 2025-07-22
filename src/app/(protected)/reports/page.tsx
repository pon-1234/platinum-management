"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { LoadingSpinner } from "@/components/common";
import {
  ChartBarIcon,
  CurrencyYenIcon,
  UsersIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

interface ReportData {
  totalSales: number;
  totalCustomers: number;
  totalReservations: number;
  averageSpend: number;
  salesGrowth: number;
  customerGrowth: number;
}

// Mock data for demonstration
const mockReportData: ReportData = {
  totalSales: 2580000,
  totalCustomers: 156,
  totalReservations: 89,
  averageSpend: 16538,
  salesGrowth: 12.5,
  customerGrowth: 8.3,
};

const monthlySalesData = [
  { month: "1月", sales: 1200000, customers: 120 },
  { month: "2月", sales: 1450000, customers: 135 },
  { month: "3月", sales: 1680000, customers: 142 },
  { month: "4月", sales: 1520000, customers: 138 },
  { month: "5月", sales: 1890000, customers: 156 },
  { month: "6月", sales: 2100000, customers: 168 },
];

const topPerformers = [
  { name: "さくら", sales: 450000, reservations: 25 },
  { name: "みゆき", sales: 380000, reservations: 22 },
  { name: "あやか", sales: 320000, reservations: 18 },
  { name: "りな", sales: 290000, reservations: 16 },
  { name: "なな", sales: 260000, reservations: 14 },
];

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [isLoading] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">レポート</h1>
          <p className="text-gray-600">売上・顧客データの分析と報告</p>
        </div>
        <div className="flex gap-3">
          <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center gap-2">
            <FunnelIcon className="h-5 w-5" />
            フィルター
          </button>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2">
            <ArrowDownTrayIcon className="h-5 w-5" />
            エクスポート
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <span className="font-medium text-gray-700">期間:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="week">今週</option>
            <option value="month">今月</option>
            <option value="quarter">今四半期</option>
            <option value="year">今年</option>
          </select>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="総売上"
          value={`¥${mockReportData.totalSales.toLocaleString()}`}
          change={`+${mockReportData.salesGrowth}%`}
          icon={CurrencyYenIcon}
          trend="up"
        />
        <StatCard
          title="顧客数"
          value={mockReportData.totalCustomers.toString()}
          change={`+${mockReportData.customerGrowth}%`}
          icon={UsersIcon}
          trend="up"
        />
        <StatCard
          title="予約数"
          value={mockReportData.totalReservations.toString()}
          change="+15.2%"
          icon={CalendarIcon}
          trend="up"
        />
        <StatCard
          title="平均客単価"
          value={`¥${mockReportData.averageSpend.toLocaleString()}`}
          change="+5.8%"
          icon={ChartBarIcon}
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Sales Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            月次売上推移
          </h3>
          <div className="space-y-4">
            {monthlySalesData.map((data) => (
              <div
                key={data.month}
                className="flex items-center justify-between"
              >
                <span className="text-sm font-medium text-gray-600">
                  {data.month}
                </span>
                <div className="flex items-center gap-4">
                  <div className="w-48 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${(data.sales / 2500000) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-20 text-right">
                    ¥{(data.sales / 1000000).toFixed(1)}M
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Performers */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            トップパフォーマー
          </h3>
          <div className="space-y-4">
            {topPerformers.map((performer, index) => (
              <div
                key={performer.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-indigo-600">
                      {index + 1}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {performer.name}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    ¥{performer.sales.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {performer.reservations}件の予約
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">詳細分析</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Revenue Breakdown */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">売上内訳</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">ドリンク売上</span>
                <span className="text-sm font-medium">¥1,650,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">指名料</span>
                <span className="text-sm font-medium">¥580,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">同伴料</span>
                <span className="text-sm font-medium">¥350,000</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-sm">合計</span>
                  <span className="text-sm">¥2,580,000</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Analytics */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">顧客分析</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">新規顧客</span>
                <span className="text-sm font-medium">32名</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">リピート顧客</span>
                <span className="text-sm font-medium">124名</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">平均来店間隔</span>
                <span className="text-sm font-medium">12.5日</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-sm">顧客満足度</span>
                  <span className="text-sm">92%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Time Analytics */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">時間帯分析</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">18:00-20:00</span>
                <span className="text-sm font-medium">35%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">20:00-22:00</span>
                <span className="text-sm font-medium">42%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">22:00-24:00</span>
                <span className="text-sm font-medium">23%</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-sm">ピーク時間帯</span>
                  <span className="text-sm">20:00-22:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
