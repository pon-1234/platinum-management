"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CustomerMetrics,
  CustomerLifetimeValue,
  CustomerAnalyticsService,
} from "@/services/customer-analytics.service";
import { User, AlertTriangle, Wine, Activity, Target } from "lucide-react";
import { reportService } from "@/services/report.service";
import type { CustomerReport } from "@/types/report.types";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface CustomerDetailAnalyticsProps {
  customerId: string;
}

export function CustomerDetailAnalytics({
  customerId,
}: CustomerDetailAnalyticsProps) {
  const [metrics, setMetrics] = useState<CustomerMetrics | null>(null);
  const [ltv, setLtv] = useState<CustomerLifetimeValue | null>(null);
  const [churnScore, setChurnScore] = useState<number>(0);
  const [engagementScore, setEngagementScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<CustomerReport | null>(null);

  useEffect(() => {
    loadCustomerData();
  }, [customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsData, ltvData, churn, engagement] = await Promise.all([
        CustomerAnalyticsService.getCustomerMetric(customerId),
        CustomerAnalyticsService.calculateLifetimeValue(customerId),
        CustomerAnalyticsService.calculateChurnScore(customerId),
        fetch(`/api/analytics/customers/${customerId}?type=engagement`)
          .then((res) => res.json())
          .then((data) => data.engagement_score || 0),
      ]);

      setMetrics(metricsData);
      setLtv(ltvData);
      setChurnScore(churn);
      setEngagementScore(engagement);

      // Load extended customer report (orders and casts)
      const detailed = await reportService.generateCustomerReport(customerId);
      setReport(detailed);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "データの取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>読み込み中...</div>;
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (!metrics) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "churning":
        return "bg-yellow-100 text-yellow-800";
      case "churned":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "アクティブ";
      case "churning":
        return "離脱リスク";
      case "churned":
        return "離脱済み";
      default:
        return status;
    }
  };

  const getRiskLevel = (score: number) => {
    if (score >= 70) return { label: "高リスク", color: "text-red-600" };
    if (score >= 40) return { label: "中リスク", color: "text-yellow-600" };
    return { label: "低リスク", color: "text-green-600" };
  };

  const risk = getRiskLevel(churnScore);

  return (
    <div className="space-y-6">
      {/* 顧客情報ヘッダー */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-6 w-6" />
              <div>
                <CardTitle>{metrics.customer_name}</CardTitle>
                {metrics.phone_number && (
                  <p className="text-sm text-muted-foreground">
                    {metrics.phone_number}
                  </p>
                )}
              </div>
            </div>
            <Badge className={getStatusColor(metrics.retention_status)}>
              {getStatusLabel(metrics.retention_status)}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* KPIカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">来店回数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.visit_count}</div>
            {metrics.avg_visit_interval_days && (
              <p className="text-xs text-muted-foreground">
                平均{Math.round(metrics.avg_visit_interval_days)}日間隔
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">総売上</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{metrics.total_revenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              平均 ¥
              {Math.round(metrics.avg_spending_per_visit).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">最終来店</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.last_visit ? (
              <>
                <div className="text-lg font-bold">
                  {format(new Date(metrics.last_visit), "MM/dd", {
                    locale: ja,
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.floor(
                    (Date.now() - new Date(metrics.last_visit).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}
                  日前
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">データなし</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ボトルキープ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wine className="h-5 w-5" />
              <span className="text-2xl font-bold">
                {metrics.active_bottle_count}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">アクティブ</p>
          </CardContent>
        </Card>
      </div>

      {/* スコアカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              離脱リスクスコア
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {churnScore.toFixed(0)}
              </span>
              <span className={`font-medium ${risk.color}`}>{risk.label}</span>
            </div>
            <Progress value={churnScore} className="h-2" />
            <p className="text-sm text-muted-foreground">
              0-100のスケールで離脱リスクを評価（高いほどリスク大）
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              エンゲージメントスコア
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {engagementScore.toFixed(0)}
              </span>
              <span className="font-medium text-blue-600">
                {engagementScore >= 70
                  ? "高"
                  : engagementScore >= 40
                    ? "中"
                    : "低"}
              </span>
            </div>
            <Progress value={engagementScore} className="h-2" />
            <p className="text-sm text-muted-foreground">
              来店頻度、支出、最近性から総合評価
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ライフタイムバリュー */}
      {ltv && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              ライフタイムバリュー（LTV）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">現在価値</p>
                <p className="text-xl font-bold">
                  ¥{ltv.current_value.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">予測価値</p>
                <p className="text-xl font-bold">
                  ¥{ltv.predicted_value.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">維持確率</p>
                <p className="text-xl font-bold">
                  {(ltv.retention_probability * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 指名キャスト（ランキング） */}
      {report?.favoriteCasts && report.favoriteCasts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>指名キャスト・貢献ランキング</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.favoriteCasts.map((c) => (
                <div
                  key={c.castId}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{c.castName || c.castId}</span>
                    <Badge variant="outline">指名 {c.nominationCount}</Badge>
                  </div>
                  <div className="font-medium">
                    ¥{c.attributedRevenue.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 担当スタッフ */}
      {metrics.favorite_staff && (
        <Card>
          <CardHeader>
            <CardTitle>指名スタッフ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{metrics.favorite_staff}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
