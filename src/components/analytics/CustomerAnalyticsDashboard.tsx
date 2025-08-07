"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Trophy,
  Activity,
  DollarSign,
  Calendar,
  UserCheck,
} from "lucide-react";
import {
  CustomerAnalyticsService,
  AnalyticsSummary,
} from "@/services/customer-analytics.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CustomerAnalyticsDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await CustomerAnalyticsService.getAnalyticsSummary();
      setSummary(data);
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
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      {/* KPIカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総顧客数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_customers}</div>
            <div className="text-xs text-muted-foreground">
              アクティブ: {summary.active_customers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均維持率</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.avg_retention_rate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              30日以内の来店率
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総売上</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{summary.total_revenue.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              平均: ¥{Math.round(summary.avg_customer_value).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">リスク顧客</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.at_risk_count}</div>
            <div className="text-xs text-muted-foreground">
              要フォローアップ
            </div>
          </CardContent>
        </Card>
      </div>

      {/* タブコンテンツ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="segments">セグメント</TabsTrigger>
          <TabsTrigger value="retention">リテンション</TabsTrigger>
          <TabsTrigger value="rfm">RFM分析</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>顧客ステータス分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">アクティブ</span>
                    <span className="font-medium">
                      {summary.active_customers}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">離脱中</span>
                    <span className="font-medium">
                      {summary.churning_customers}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">離脱済み</span>
                    <span className="font-medium">
                      {summary.churned_customers}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>VIP顧客</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <span className="text-2xl font-bold">
                      {summary.vip_count}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    高価値顧客
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="segments">
          <CustomerSegmentsView />
        </TabsContent>

        <TabsContent value="retention">
          <RetentionAnalysisView />
        </TabsContent>

        <TabsContent value="rfm">
          <RFMAnalysisView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// セグメント分析ビュー
function CustomerSegmentsView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>顧客セグメント分析</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          セグメント分析データを表示
        </div>
      </CardContent>
    </Card>
  );
}

// リテンション分析ビュー
function RetentionAnalysisView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>リテンション分析</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          コホート分析データを表示
        </div>
      </CardContent>
    </Card>
  );
}

// RFM分析ビュー
function RFMAnalysisView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>RFM分析</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          RFMスコアとセグメントを表示
        </div>
      </CardContent>
    </Card>
  );
}
