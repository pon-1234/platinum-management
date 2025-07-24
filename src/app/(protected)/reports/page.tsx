"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/common";
import {
  getMonthlySalesReport,
  getCastPerformanceReport,
  getCustomerReport,
  getInventoryReport,
} from "@/app/actions/report.actions";
import type {
  MonthlySalesReport,
  CastPerformanceReport,
  CustomerReport,
  InventoryReport,
} from "@/types/report.types";
import { toast } from "react-hot-toast";

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [monthlySales, setMonthlySales] = useState<MonthlySalesReport | null>(
    null
  );
  const [castPerformance, setCastPerformance] = useState<
    CastPerformanceReport[]
  >([]);
  const [customerReport, setCustomerReport] = useState<CustomerReport | null>(
    null
  );
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

      const [salesResult, castResult, customerResult, inventoryResult] =
        await Promise.all([
          getMonthlySalesReport({ year: currentYear, month: currentMonth }),
          getCastPerformanceReport({
            startDate: new Date(currentYear, currentMonth - 1, 1)
              .toISOString()
              .split("T")[0],
            endDate: new Date(currentYear, currentMonth, 0)
              .toISOString()
              .split("T")[0],
          }),
          getCustomerReport({}),
          getInventoryReport({}),
        ]);

      if (salesResult.success) {
        setMonthlySales(salesResult.data);
      }
      if (castResult.success) {
        setCastPerformance(castResult.data);
      }
      if (customerResult.success) {
        setCustomerReport(customerResult.data);
      }
      if (inventoryResult.success) {
        setInventoryReport(inventoryResult.data);
      }
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
              ¥{(monthlySales?.totalRevenue || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">月次売上</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-green-600">
              {customerReport?.totalCustomers || 0}
            </div>
            <div className="text-sm text-gray-500">総顧客数</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-purple-600">
              {monthlySales?.totalVisits || 0}
            </div>
            <div className="text-sm text-gray-500">月次来店数</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-orange-600">
              ¥
              {Math.round(
                monthlySales?.averageRevenuePerVisit || 0
              ).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">平均客単価</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">月次売上推移</h2>
        <div className="space-y-4">
          {[
            { month: "1月", sales: 1200000 },
            { month: "2月", sales: 1450000 },
            { month: "3月", sales: 1680000 },
            { month: "4月", sales: 1520000 },
            { month: "5月", sales: 1890000 },
            { month: "6月", sales: 2100000 },
          ].map((data) => (
            <div key={data.month} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">
                {data.month}
              </span>
              <div className="flex items-center gap-4">
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
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
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">トップパフォーマー</h2>
        <div className="space-y-4">
          {[
            { name: "さくら", sales: 450000, reservations: 25 },
            { name: "みゆき", sales: 380000, reservations: 22 },
            { name: "あやか", sales: 320000, reservations: 18 },
            { name: "りな", sales: 290000, reservations: 16 },
            { name: "なな", sales: 260000, reservations: 14 },
          ].map((performer, index) => (
            <div
              key={performer.name}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600">
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
      </div>
    </div>
  );
}
