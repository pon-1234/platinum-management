"use client";

import { useState, useEffect, useMemo } from "react";
import { useCastPerformance } from "@/hooks/useCastPerformance";
import type { Cast } from "@/types/cast.types";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

/**
 * @design_doc See doc.md - Cast Performance Metrics Display
 * @related_to useCastPerformance, CastPerformanceStore - uses centralized state management
 * @known_issues None currently known
 */
interface CastPerformanceMetricsProps {
  castId: string;
}

export function CastPerformanceMetrics({
  castId,
}: CastPerformanceMetricsProps) {
  const {
    currentMonthPerformances,
    performanceTotals,
    isLoading,
    error,
    getCastById,
  } = useCastPerformance(castId);

  const [cast, setCast] = useState<Cast | null>(null);

  // Fetch cast details when castId changes
  useEffect(() => {
    const fetchCast = async () => {
      if (castId) {
        const castData = await getCastById(castId);
        setCast(castData);
      }
    };
    fetchCast();
  }, [castId, getCastById]);

  if (isLoading) {
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

  // Memoize metrics to avoid recalculation on every render
  const metrics = useMemo(
    () => [
      {
        label: "指名数",
        value: performanceTotals.shimeiCount,
        unit: "回",
        bgColor: "bg-pink-50",
        textColor: "text-pink-700",
      },
      {
        label: "同伴数",
        value: performanceTotals.dohanCount,
        unit: "回",
        bgColor: "bg-purple-50",
        textColor: "text-purple-700",
      },
      {
        label: "売上金額",
        value: performanceTotals.salesAmount.toLocaleString(),
        unit: "円",
        bgColor: "bg-green-50",
        textColor: "text-green-700",
      },
      {
        label: "ドリンク数",
        value: performanceTotals.drinkCount,
        unit: "杯",
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
      },
    ],
    [performanceTotals]
  );

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

      {currentMonthPerformances.length === 0 && (
        <p className="text-center text-gray-500 py-4">
          今月の成績データはまだありません
        </p>
      )}
    </div>
  );
}
