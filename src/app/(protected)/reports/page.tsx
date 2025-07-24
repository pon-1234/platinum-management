"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/common";
import { reportService } from "@/services/report.service";
import type {
  MonthlySalesReport,
  CastPerformanceReport,
  CustomerReport,
  InventoryReport,
  MonthlyReportSummary,
} from "@/types/report.types";
import { toast } from "react-hot-toast";

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyReport, setMonthlyReport] =
    useState<MonthlyReportSummary | null>(null);
  const [salesTrend, setSalesTrend] = useState<
    Array<{ month: string; sales: number }>
  >([]);
  const [castPerformance, setCastPerformance] =
    useState<CastPerformanceReport | null>(null);
  const [inventoryReport, setInventoryReport] =
    useState<InventoryReport | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const today = currentDate.toISOString().split("T")[0];

      // Load all reports in parallel
      const [
        monthlyReportData,
        salesTrendData,
        castPerformanceData,
        inventoryData,
      ] = await Promise.all([
        reportService.getMonthlyReportSummary(currentYear, currentMonth),
        reportService.getMonthlySalesTrend(6),
        reportService.getCastPerformanceReport(
          new Date(currentYear, currentMonth - 1, 1)
            .toISOString()
            .split("T")[0],
          new Date(currentYear, currentMonth, 0).toISOString().split("T")[0]
        ),
        reportService.getInventoryReport(today),
      ]);

      setMonthlyReport(monthlyReportData);
      setSalesTrend(salesTrendData);
      setCastPerformance(castPerformanceData);
      setInventoryReport(inventoryData);
    } catch (error) {
      toast.error("レポートデータの取得に失敗しました");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">レポート</h1>
        <p className="text-gray-600">売上・顧客データの分析と報告</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">基本統計</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-blue-600">
              ¥{(monthlyReport?.totalRevenue || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">月次売上</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-green-600">
              {monthlyReport?.totalCustomers || 0}
            </div>
            <div className="text-sm text-gray-500">総顧客数</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-purple-600">
              {monthlyReport?.totalVisits || 0}
            </div>
            <div className="text-sm text-gray-500">月次来店数</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-orange-600">
              ¥
              {Math.round(
                monthlyReport?.averageRevenuePerVisit || 0
              ).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">平均客単価</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">月次売上推移</h2>
        <div className="space-y-4">
          {salesTrend.map((data) => {
            const maxSales = Math.max(...salesTrend.map((d) => d.sales), 1);
            return (
              <div
                key={data.month}
                className="flex items-center justify-between"
              >
                <span className="text-sm font-medium text-gray-600 w-24">
                  {data.month}
                </span>
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(data.sales / maxSales) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-24 text-right">
                    ¥{(data.sales / 1000000).toFixed(1)}M
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">トップパフォーマー</h2>
        <div className="space-y-4">
          {castPerformance?.topCasts?.slice(0, 5).map((performer, index) => (
            <div
              key={performer.castId}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600">
                    {index + 1}
                  </span>
                </div>
                <span className="font-medium text-gray-900">
                  {performer.castName}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  ¥{performer.totalAmount.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {performer.orderCount}件の注文
                </div>
              </div>
            </div>
          )) || (
            <div className="text-center text-gray-500 py-4">
              データがありません
            </div>
          )}
        </div>
      </div>

      {inventoryReport && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">在庫状況</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-gray-900">
                {inventoryReport.totalProducts}
              </div>
              <div className="text-sm text-gray-500">総商品数</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded">
              <div className="text-2xl font-bold text-yellow-600">
                {inventoryReport.lowStockCount}
              </div>
              <div className="text-sm text-gray-500">在庫不足商品</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">
                {inventoryReport.totalMovements}
              </div>
              <div className="text-sm text-gray-500">本日の在庫移動</div>
            </div>
          </div>

          {inventoryReport.lowStockItems.length > 0 && (
            <div>
              <h3 className="text-md font-medium mb-2">在庫不足商品</h3>
              <div className="space-y-2">
                {inventoryReport.lowStockItems.slice(0, 5).map((item) => (
                  <div
                    key={item.productId}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-gray-700">{item.productName}</span>
                    <span className="text-red-600 font-medium">
                      残り{item.currentStock}個 (基準: {item.threshold}個)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
