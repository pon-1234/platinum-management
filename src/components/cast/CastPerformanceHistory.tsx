"use client";

import { useState, useEffect } from "react";
import { castPerformanceService } from "@/services/cast-performance.service";
import type { CastPerformance } from "@/types/cast.types";
import { format, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { ChartBarIcon } from "@heroicons/react/24/outline";

interface CastPerformanceHistoryProps {
  castId: string;
  months?: number;
}

export function CastPerformanceHistory({
  castId,
  months = 3,
}: CastPerformanceHistoryProps) {
  const [performances, setPerformances] = useState<CastPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);

        // Get performances for the last N months
        const endDate = new Date();
        const startDate = subMonths(endDate, months);

        const data = await castPerformanceService.getCastPerformances({
          castId,
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
        });

        setPerformances(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [castId, months]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  // Group performances by month
  const monthlyData = performances.reduce(
    (acc, perf) => {
      const monthKey = format(new Date(perf.date), "yyyy-MM");
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          shimeiCount: 0,
          dohanCount: 0,
          salesAmount: 0,
          drinkCount: 0,
          days: 0,
        };
      }
      acc[monthKey].shimeiCount += perf.shimeiCount;
      acc[monthKey].dohanCount += perf.dohanCount;
      acc[monthKey].salesAmount += perf.salesAmount;
      acc[monthKey].drinkCount += perf.drinkCount;
      acc[monthKey].days += 1;
      return acc;
    },
    {} as Record<
      string,
      {
        month: string;
        shimeiCount: number;
        dohanCount: number;
        salesAmount: number;
        drinkCount: number;
        days: number;
      }
    >
  );

  const sortedMonths = Object.values(monthlyData).sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            成績推移
          </h3>
          <ChartBarIcon className="h-5 w-5 text-gray-400" />
        </div>
      </div>
      <div className="px-4 py-5 sm:p-6">
        {sortedMonths.length === 0 ? (
          <p className="text-center text-gray-500">成績データがありません</p>
        ) : (
          <div className="space-y-4">
            {sortedMonths.map((monthData) => (
              <div
                key={monthData.month}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">
                    {format(new Date(monthData.month + "-01"), "yyyy年MM月", {
                      locale: ja,
                    })}
                  </h4>
                  <span className="text-sm text-gray-500">
                    {monthData.days}日間
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">指名</p>
                    <p className="text-lg font-semibold text-pink-600">
                      {monthData.shimeiCount}回
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">同伴</p>
                    <p className="text-lg font-semibold text-purple-600">
                      {monthData.dohanCount}回
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">売上</p>
                    <p className="text-lg font-semibold text-green-600">
                      ¥{monthData.salesAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ドリンク</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {monthData.drinkCount}杯
                    </p>
                  </div>
                </div>

                {/* Daily average */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">日平均</p>
                  <div className="flex space-x-4 text-sm">
                    <span>
                      指名:{" "}
                      {(monthData.shimeiCount / monthData.days).toFixed(1)}
                    </span>
                    <span>
                      売上: ¥
                      {Math.round(
                        monthData.salesAmount / monthData.days
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
