"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CustomerAnalyticsService } from "@/services/customer-analytics.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CohortData {
  cohort_month: string;
  month_index: number;
  retained_customers: number;
  total_customers: number;
  retention_rate: number;
}

export function CohortAnalysisTable() {
  const [cohortData, setCohortData] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCohortData();
  }, []);

  const loadCohortData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await CustomerAnalyticsService.getCohortAnalysis();
      setCohortData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "データの取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>コホート分析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>コホート分析</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // コホートデータをマトリックス形式に変換
  const cohortMatrix = transformCohortData(cohortData);
  const maxMonthIndex = Math.max(...cohortData.map((d) => d.month_index), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>顧客コホート分析</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">コホート</th>
                <th className="text-center p-2 font-medium min-w-[80px]">
                  ユーザー数
                </th>
                {[...Array(Math.min(maxMonthIndex + 1, 12))].map((_, i) => (
                  <th
                    key={i}
                    className="text-center p-2 font-medium min-w-[60px]"
                  >
                    {i === 0 ? "初月" : `${i}ヶ月後`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(cohortMatrix).map(([cohortMonth, data]) => (
                <CohortRow
                  key={cohortMonth}
                  cohortMonth={cohortMonth}
                  data={data}
                  maxMonthIndex={Math.min(maxMonthIndex, 11)}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span>80%以上</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded" />
            <span>40-79%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span>40%未満</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CohortRowProps {
  cohortMonth: string;
  data: {
    total_customers: number;
    retention: { [key: number]: number };
  };
  maxMonthIndex: number;
}

function CohortRow({ cohortMonth, data, maxMonthIndex }: CohortRowProps) {
  const formatMonth = (month: string) => {
    const date = new Date(month);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
    });
  };

  const getHeatmapIntensity = (rate: number) => {
    // 0-100%を0-1に正規化
    const normalized = rate / 100;
    // 色の強度を計算
    if (rate >= 80) {
      return `rgba(34, 197, 94, ${0.2 + normalized * 0.4})`; // green-500
    } else if (rate >= 40) {
      return `rgba(234, 179, 8, ${0.2 + normalized * 0.4})`; // yellow-500
    } else {
      return `rgba(239, 68, 68, ${0.3 + normalized * 0.3})`; // red-500
    }
  };

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="p-2 font-medium">{formatMonth(cohortMonth)}</td>
      <td className="text-center p-2">{data.total_customers}</td>
      {[...Array(maxMonthIndex + 1)].map((_, monthIndex) => {
        const retentionRate = data.retention[monthIndex];

        if (retentionRate === undefined) {
          return (
            <td key={monthIndex} className="text-center p-2">
              -
            </td>
          );
        }

        const prevRate = monthIndex > 0 ? data.retention[monthIndex - 1] : 100;
        const change = retentionRate - prevRate;

        return (
          <td key={monthIndex} className="text-center p-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="px-2 py-1 rounded cursor-pointer relative"
                    style={{
                      backgroundColor: getHeatmapIntensity(retentionRate),
                    }}
                  >
                    <span className="font-medium">
                      {retentionRate.toFixed(1)}%
                    </span>
                    {monthIndex > 0 && change !== 0 && (
                      <span className="absolute -top-1 -right-1">
                        {change > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        )}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p>{data.total_customers}人中</p>
                    <p>
                      {Math.round((data.total_customers * retentionRate) / 100)}
                      人が継続
                    </p>
                    {monthIndex > 0 && (
                      <p
                        className={
                          change > 0 ? "text-green-600" : "text-red-600"
                        }
                      >
                        前月比: {change > 0 ? "+" : ""}
                        {change.toFixed(1)}%
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </td>
        );
      })}
    </tr>
  );
}

// コホートデータをマトリックス形式に変換
function transformCohortData(data: CohortData[]) {
  const matrix: {
    [cohortMonth: string]: {
      total_customers: number;
      retention: { [monthIndex: number]: number };
    };
  } = {};

  data.forEach((item) => {
    const cohortKey = item.cohort_month;

    if (!matrix[cohortKey]) {
      matrix[cohortKey] = {
        total_customers: item.total_customers,
        retention: {},
      };
    }

    matrix[cohortKey].retention[item.month_index] = item.retention_rate;
  });

  // コホート月でソート（新しい順）
  const sortedMatrix = Object.entries(matrix)
    .sort(([a], [b]) => b.localeCompare(a))
    .reduce(
      (acc, [key, value]) => {
        acc[key] = value;
        return acc;
      },
      {} as typeof matrix
    );

  return sortedMatrix;
}
