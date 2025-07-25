"use client";

import { useState, useEffect } from "react";
import { customerService } from "@/services/customer.service";
import { reservationService } from "@/services/reservation.service";
import { billingService } from "@/services/billing.service";

interface DashboardStats {
  totalCustomers: number;
  todayReservations: number;
  todaySales: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    todayReservations: 0,
    todaySales: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const today = new Date();
        const todayString = today.toISOString().split("T")[0]; // Format as YYYY-MM-DD

        // Get total customers
        const customers = await customerService.searchCustomers({});

        // Get today's reservations
        const reservations = await reservationService.searchReservations({
          startDate: todayString,
          endDate: todayString,
        });

        // Get today's sales data
        const dailyReport =
          await billingService.generateDailyReport(todayString);

        setStats({
          totalCustomers: customers.length,
          todayReservations: reservations.length,
          todaySales: dailyReport.totalSales,
        });
      } catch (err) {
        setError("ダッシュボードデータの取得に失敗しました");
        if (process.env.NODE_ENV === "development") {
          console.error(err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
        ダッシュボード
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        プラチナ管理システムへようこそ
      </p>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                    {isLoading ? (
                      <div className="animate-pulse h-6 bg-gray-200 rounded w-16"></div>
                    ) : (
                      `${formatNumber(stats.totalCustomers)}人`
                    )}
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
                    {isLoading ? (
                      <div className="animate-pulse h-6 bg-gray-200 rounded w-16"></div>
                    ) : (
                      `${formatNumber(stats.todayReservations)}件`
                    )}
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
                    {isLoading ? (
                      <div className="animate-pulse h-6 bg-gray-200 rounded w-20"></div>
                    ) : (
                      formatCurrency(stats.todaySales)
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
