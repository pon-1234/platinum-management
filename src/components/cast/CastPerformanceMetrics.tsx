"use client";

import { useState, useEffect } from "react";
import { CastService } from "@/services/cast.service";
import type { Cast, CastPerformance } from "@/types/cast.types";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ja } from "date-fns/locale";

interface CastPerformanceMetricsProps {
  castId: string;
}

export function CastPerformanceMetrics({
  castId,
}: CastPerformanceMetricsProps) {
  const [cast, setCast] = useState<Cast | null>(null);
  const [performances, setPerformances] = useState<CastPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const castService = new CastService();

        // Get cast details
        const castData = await castService.getCastById(castId);
        if (!castData) {
          throw new Error("キャストが見つかりません");
        }
        setCast(castData);

        // Get performances for current month
        const now = new Date();
        const startDate = format(startOfMonth(now), "yyyy-MM-dd");
        const endDate = format(endOfMonth(now), "yyyy-MM-dd");

        const performanceData = await castService.getCastPerformances({
          castId,
          startDate,
          endDate,
        });
        setPerformances(performanceData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [castId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
          data-testid="loading-spinner"
        ></div>
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

  if (!cast) {
    return null;
  }

  // Calculate totals
  const totals = performances.reduce(
    (acc, perf) => ({
      shimeiCount: acc.shimeiCount + perf.shimeiCount,
      dohanCount: acc.dohanCount + perf.dohanCount,
      salesAmount: acc.salesAmount + perf.salesAmount,
      drinkCount: acc.drinkCount + perf.drinkCount,
    }),
    { shimeiCount: 0, dohanCount: 0, salesAmount: 0, drinkCount: 0 }
  );

  const metrics = [
    {
      label: "指名数",
      value: totals.shimeiCount,
      unit: "回",
      bgColor: "bg-pink-50",
      textColor: "text-pink-700",
    },
    {
      label: "同伴数",
      value: totals.dohanCount,
      unit: "回",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
    },
    {
      label: "売上金額",
      value: totals.salesAmount.toLocaleString(),
      unit: "円",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
    },
    {
      label: "ドリンク数",
      value: totals.drinkCount,
      unit: "杯",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {cast.stageName}の成績
        </h3>
        <span className="text-sm text-gray-500">
          {format(new Date(), "yyyy年MM月", { locale: ja })}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`${metric.bgColor} rounded-lg p-4 border border-gray-200`}
          >
            <p className="text-sm text-gray-600">{metric.label}</p>
            <p className={`text-2xl font-bold ${metric.textColor} mt-1`}>
              {metric.value}
              <span className="text-sm font-normal ml-1">{metric.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {performances.length === 0 && (
        <p className="text-center text-gray-500 py-4">
          今月の成績データはまだありません
        </p>
      )}
    </div>
  );
}
