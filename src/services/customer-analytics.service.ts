import { createClient } from "@/lib/supabase/client";
import {
  parseSupabaseError,
  CustomerNotFoundError,
  InvalidDateRangeError,
} from "@/lib/errors/analytics-errors";

// 顧客分析メトリクス
export interface CustomerMetrics {
  customer_id: string;
  customer_name: string;
  phone_number?: string;
  first_visit: string;
  visit_count: number;
  last_visit?: string;
  avg_visit_interval_days?: number;
  total_revenue: number;
  avg_spending_per_visit: number;
  retention_status: "active" | "churning" | "churned";
  favorite_staff?: string;
  active_bottle_count: number;
}

// 顧客セグメント
export interface CustomerSegment {
  customer_id: string;
  customer_name: string;
  segment: "VIP" | "Premium" | "Regular" | "New" | "Prospect";
  risk_level: "Lost" | "High Risk" | "Medium Risk" | "Low Risk" | "Healthy";
  visit_count: number;
  total_revenue: number;
  avg_spending_per_visit: number;
  retention_status: string;
  days_since_last_visit?: number;
}

// RFMスコア
export interface RFMScore {
  customer_id: string;
  customer_name: string;
  recency_days: number;
  frequency: number;
  monetary: number;
  recency_score: number;
  frequency_score: number;
  monetary_score: number;
  rfm_score: string;
  rfm_segment: string;
}

// ライフタイムバリュー
export interface CustomerLifetimeValue {
  current_value: number;
  predicted_value: number;
  retention_probability: number;
}

// コホート分析データ
export interface CohortData {
  cohort_month: string;
  month_index: number;
  retained_customers: number;
  total_customers: number;
  retention_rate: number;
}

// 分析サマリー
export interface AnalyticsSummary {
  total_customers: number;
  active_customers: number;
  churning_customers: number;
  churned_customers: number;
  avg_retention_rate: number;
  avg_customer_value: number;
  total_revenue: number;
  vip_count: number;
  at_risk_count: number;
}

// 獲得チャネル分析
export interface AcquisitionChannelAnalysis {
  channels: Array<{
    channel: string;
    customers: number;
    revenue: number;
    avg_ltv: number;
    retention_rate: number;
  }>;
  top_referrers: Array<{
    referrer_type: string;
    referrer_id: string;
    referrer_name: string;
    referred_count: number;
    total_revenue: number;
  }>;
  source_breakdown: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  monthly_trend: Array<{
    month: string;
    walk_in: number;
    referral: number;
    social_media: number;
    online: number;
    event: number;
    other: number;
    total: number;
  }>;
  campaign_performance?: Array<{
    campaign: string;
    customers: number;
    revenue: number;
    roi: number;
  }>;
}

// チャネルパフォーマンス比較
export interface ChannelComparison {
  metric: string;
  channel1_value: number;
  channel2_value: number;
  difference: number;
  percentage_diff: number;
}

// 紹介プログラム分析
export interface ReferralProgramAnalysis {
  summary: {
    total_referrals: number;
    customer_referrals: number;
    staff_referrals: number;
    referral_revenue: number;
  };
  top_customer_referrers: Array<{
    customer_id: string;
    customer_name: string;
    referral_count: number;
    total_revenue_generated: number;
    avg_referral_value: number;
  }>;
  top_staff_referrers: Array<{
    staff_id: string;
    staff_name: string;
    referral_count: number;
    total_revenue_generated: number;
    avg_referral_value: number;
  }>;
  referral_chain_analysis: {
    second_generation_referrals: number;
    third_generation_referrals: number;
  };
}

export class CustomerAnalyticsService {
  // 顧客メトリクス一覧取得
  static async getCustomerMetrics(filters?: {
    retention_status?: string;
    min_visits?: number;
    min_revenue?: number;
  }): Promise<CustomerMetrics[]> {
    const supabase = createClient();

    let query = supabase
      .from("customer_analytics_metrics")
      .select("*")
      .order("total_revenue", { ascending: false });

    if (filters?.retention_status) {
      query = query.eq("retention_status", filters.retention_status);
    }
    if (filters?.min_visits) {
      query = query.gte("visit_count", filters.min_visits);
    }
    if (filters?.min_revenue) {
      query = query.gte("total_revenue", filters.min_revenue);
    }

    const { data, error } = await query;
    if (error) throw parseSupabaseError(error);
    return data || [];
  }

  // 個別顧客メトリクス取得
  static async getCustomerMetric(
    customerId: string
  ): Promise<CustomerMetrics | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("customer_analytics_metrics")
      .select("*")
      .eq("customer_id", customerId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new CustomerNotFoundError(customerId);
      }
      throw parseSupabaseError(error);
    }
    return data;
  }

  // 顧客セグメント一覧取得
  static async getCustomerSegments(filters?: {
    segment?: string;
    risk_level?: string;
  }): Promise<CustomerSegment[]> {
    const supabase = createClient();

    let query = supabase
      .from("customer_segments")
      .select("*")
      .order("total_revenue", { ascending: false });

    if (filters?.segment) {
      query = query.eq("segment", filters.segment);
    }
    if (filters?.risk_level) {
      query = query.eq("risk_level", filters.risk_level);
    }

    const { data, error } = await query;
    if (error) throw parseSupabaseError(error);
    return data || [];
  }

  // RFM分析実行
  static async calculateRFMScores(
    startDate?: string,
    endDate?: string
  ): Promise<RFMScore[]> {
    const supabase = createClient();

    const params: any = {};
    if (startDate) params.p_start_date = startDate;
    if (endDate) params.p_end_date = endDate;

    const { data, error } = await supabase.rpc("calculate_rfm_score", params);
    if (error) throw parseSupabaseError(error);
    return data || [];
  }

  // 離脱予測スコア計算
  static async calculateChurnScore(customerId: string): Promise<number> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "calculate_churn_prediction_score",
      { p_customer_id: customerId }
    );

    if (error) throw parseSupabaseError(error);
    return data || 0;
  }

  // ライフタイムバリュー計算
  static async calculateLifetimeValue(
    customerId: string
  ): Promise<CustomerLifetimeValue> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "calculate_customer_lifetime_value",
      { p_customer_id: customerId }
    );

    if (error) throw parseSupabaseError(error);
    return (
      data?.[0] || {
        current_value: 0,
        predicted_value: 0,
        retention_probability: 0,
      }
    );
  }

  // コホート分析データ取得
  static async getCohortAnalysis(
    startMonth?: string,
    endMonth?: string
  ): Promise<CohortData[]> {
    const supabase = createClient();

    // コホートの初期化
    await supabase.rpc("initialize_customer_cohorts");

    // コホート分析クエリ
    const query = `
      WITH cohort_data AS (
        SELECT 
          cc.cohort_month,
          date_part('month', age(date_trunc('month', v.check_in_time), cc.cohort_month)) as month_index,
          COUNT(DISTINCT cc.customer_id) as customers
        FROM customer_cohorts cc
        LEFT JOIN visits v ON v.customer_id = cc.customer_id
        WHERE cc.cohort_month >= $1::date
          AND cc.cohort_month <= $2::date
        GROUP BY cc.cohort_month, month_index
      ),
      cohort_sizes AS (
        SELECT 
          cohort_month,
          COUNT(DISTINCT customer_id) as total_customers
        FROM customer_cohorts
        WHERE cohort_month >= $1::date
          AND cohort_month <= $2::date
        GROUP BY cohort_month
      )
      SELECT 
        cd.cohort_month,
        cd.month_index::integer,
        cd.customers as retained_customers,
        cs.total_customers,
        (cd.customers::numeric / cs.total_customers * 100)::numeric(5,2) as retention_rate
      FROM cohort_data cd
      JOIN cohort_sizes cs ON cs.cohort_month = cd.cohort_month
      WHERE cd.month_index >= 0
      ORDER BY cd.cohort_month, cd.month_index
    `;

    const start =
      startMonth ||
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    const end = endMonth || new Date().toISOString().split("T")[0];

    const { data, error } = await supabase.rpc("get_cohort_analysis", {
      p_start_month: start,
      p_end_month: end,
    });

    if (error) throw parseSupabaseError(error);
    return data || [];
  }

  // 分析サマリー取得（RPC関数使用）
  static async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc("get_analytics_summary");

    if (error) throw parseSupabaseError(error);

    // RPC関数の結果を既存のインターフェースにマッピング
    if (data) {
      return {
        total_customers: data.total_customers || 0,
        active_customers: data.active_customers || 0,
        churning_customers: data.churning_customers || 0,
        churned_customers: data.churned_customers || 0,
        avg_retention_rate: data.avg_retention_rate || 0,
        avg_customer_value: data.avg_customer_value || 0,
        total_revenue: data.total_revenue || 0,
        vip_count: data.vip_count || 0,
        at_risk_count: data.at_risk_count || 0,
      };
    }

    // フォールバック
    return {
      total_customers: 0,
      active_customers: 0,
      churning_customers: 0,
      churned_customers: 0,
      avg_retention_rate: 0,
      avg_customer_value: 0,
      total_revenue: 0,
      vip_count: 0,
      at_risk_count: 0,
    };
  }

  // リスク顧客取得
  static async getAtRiskCustomers(): Promise<CustomerSegment[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("customer_segments")
      .select("*")
      .in("risk_level", ["High Risk", "Medium Risk"])
      .order("total_revenue", { ascending: false });

    if (error) throw parseSupabaseError(error);
    return data || [];
  }

  // VIP顧客取得
  static async getVIPCustomers(): Promise<CustomerSegment[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("customer_segments")
      .select("*")
      .in("segment", ["VIP", "Premium"])
      .order("total_revenue", { ascending: false });

    if (error) throw parseSupabaseError(error);
    return data || [];
  }

  // 顧客トレンド分析
  static async getCustomerTrends(
    customerId: string,
    months: number = 6
  ): Promise<{
    visits: Array<{ month: string; count: number }>;
    spending: Array<{ month: string; amount: number }>;
  }> {
    const supabase = createClient();

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data: visits, error: visitsError } = await supabase
      .from("visits")
      .select("check_in_time")
      .eq("customer_id", customerId)
      .gte("check_in_time", startDate.toISOString())
      .order("check_in_time");

    if (visitsError) throw parseSupabaseError(visitsError);

    const { data: orders, error: ordersError } = await supabase
      .from("visits")
      .select("check_in_time, orders(total_amount)")
      .eq("customer_id", customerId)
      .gte("check_in_time", startDate.toISOString())
      .order("check_in_time");

    if (ordersError) throw parseSupabaseError(ordersError);

    // 月別集計
    const visitsByMonth = new Map<string, number>();
    const spendingByMonth = new Map<string, number>();

    (visits || []).forEach((v) => {
      const month = new Date(v.check_in_time).toISOString().slice(0, 7);
      visitsByMonth.set(month, (visitsByMonth.get(month) || 0) + 1);
    });

    (orders || []).forEach((v: any) => {
      const month = new Date(v.check_in_time).toISOString().slice(0, 7);
      const amount = v.orders?.[0]?.total_amount || 0;
      spendingByMonth.set(month, (spendingByMonth.get(month) || 0) + amount);
    });

    return {
      visits: Array.from(visitsByMonth.entries()).map(([month, count]) => ({
        month,
        count,
      })),
      spending: Array.from(spendingByMonth.entries()).map(
        ([month, amount]) => ({
          month,
          amount,
        })
      ),
    };
  }

  // 獲得チャネル分析取得
  static async getAcquisitionChannelAnalysis(
    startDate?: string,
    endDate?: string
  ): Promise<AcquisitionChannelAnalysis> {
    const supabase = createClient();

    const params: any = {};
    if (startDate) params.p_start_date = startDate;
    if (endDate) params.p_end_date = endDate;

    const { data, error } = await supabase.rpc(
      "get_acquisition_channel_analysis",
      params
    );

    if (error) throw parseSupabaseError(error);
    return (
      data || {
        channels: [],
        top_referrers: [],
        source_breakdown: [],
        monthly_trend: [],
        campaign_performance: [],
      }
    );
  }

  // チャネルパフォーマンス比較
  static async compareChannelPerformance(
    channel1: string,
    channel2: string,
    startDate?: string,
    endDate?: string
  ): Promise<ChannelComparison[]> {
    const supabase = createClient();

    const params: any = {
      p_channel1: channel1,
      p_channel2: channel2,
    };
    if (startDate) params.p_start_date = startDate;
    if (endDate) params.p_end_date = endDate;

    const { data, error } = await supabase.rpc(
      "compare_channel_performance",
      params
    );

    if (error) throw parseSupabaseError(error);
    return data || [];
  }

  // 紹介プログラム分析
  static async analyzeReferralProgram(): Promise<ReferralProgramAnalysis> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc("analyze_referral_program");

    if (error) throw parseSupabaseError(error);
    return (
      data || {
        summary: {
          total_referrals: 0,
          customer_referrals: 0,
          staff_referrals: 0,
          referral_revenue: 0,
        },
        top_customer_referrers: [],
        top_staff_referrers: [],
        referral_chain_analysis: {
          second_generation_referrals: 0,
          third_generation_referrals: 0,
        },
      }
    );
  }
}
