-- 顧客分析用の追加RPC関数

-- コホート分析データ取得関数
CREATE OR REPLACE FUNCTION get_cohort_analysis(
  p_start_month date DEFAULT (CURRENT_DATE - INTERVAL '12 months')::date,
  p_end_month date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  cohort_month date,
  month_index integer,
  retained_customers bigint,
  total_customers bigint,
  retention_rate numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- コホートデータを初期化
  PERFORM initialize_customer_cohorts();
  
  RETURN QUERY
  WITH cohort_data AS (
    SELECT 
      cc.cohort_month,
      EXTRACT(MONTH FROM age(date_trunc('month', v.check_in_time::date), cc.cohort_month))::integer as month_idx,
      COUNT(DISTINCT cc.customer_id) as customers
    FROM customer_cohorts cc
    LEFT JOIN visits v ON v.customer_id = cc.customer_id
      AND v.check_in_time >= cc.cohort_month
    WHERE cc.cohort_month >= p_start_month
      AND cc.cohort_month <= p_end_month
    GROUP BY cc.cohort_month, month_idx
  ),
  cohort_sizes AS (
    SELECT 
      cohort_month as cm,
      COUNT(DISTINCT customer_id) as total
    FROM customer_cohorts
    WHERE cohort_month >= p_start_month
      AND cohort_month <= p_end_month
    GROUP BY cohort_month
  )
  SELECT 
    cd.cohort_month,
    cd.month_idx,
    cd.customers,
    cs.total,
    ROUND((cd.customers::numeric / NULLIF(cs.total, 0) * 100), 2)
  FROM cohort_data cd
  JOIN cohort_sizes cs ON cs.cm = cd.cohort_month
  WHERE cd.month_idx >= 0
  ORDER BY cd.cohort_month, cd.month_idx;
END;
$$;

-- 顧客セグメント別統計取得関数
CREATE OR REPLACE FUNCTION get_segment_statistics()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'segments', (
      SELECT json_agg(
        json_build_object(
          'segment', segment,
          'count', count,
          'total_revenue', total_revenue,
          'avg_revenue', avg_revenue
        )
      )
      FROM (
        SELECT 
          segment,
          COUNT(*) as count,
          SUM(total_revenue) as total_revenue,
          AVG(total_revenue) as avg_revenue
        FROM customer_segments
        GROUP BY segment
        ORDER BY total_revenue DESC
      ) s
    ),
    'risk_levels', (
      SELECT json_agg(
        json_build_object(
          'risk_level', risk_level,
          'count', count,
          'avg_days_since_visit', avg_days
        )
      )
      FROM (
        SELECT 
          risk_level,
          COUNT(*) as count,
          AVG(days_since_last_visit) as avg_days
        FROM customer_segments
        GROUP BY risk_level
        ORDER BY 
          CASE risk_level
            WHEN 'Lost' THEN 1
            WHEN 'High Risk' THEN 2
            WHEN 'Medium Risk' THEN 3
            WHEN 'Low Risk' THEN 4
            WHEN 'Healthy' THEN 5
          END
      ) r
    ),
    'retention_status', (
      SELECT json_agg(
        json_build_object(
          'status', retention_status,
          'count', count,
          'percentage', percentage
        )
      )
      FROM (
        SELECT 
          retention_status,
          COUNT(*) as count,
          ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) as percentage
        FROM customer_analytics_metrics
        GROUP BY retention_status
      ) rs
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 期間別売上トレンド取得関数
CREATE OR REPLACE FUNCTION get_revenue_trends(
  p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '12 months')::date,
  p_end_date date DEFAULT CURRENT_DATE,
  p_interval text DEFAULT 'month'
)
RETURNS TABLE(
  period text,
  new_customers bigint,
  returning_customers bigint,
  total_visits bigint,
  total_revenue numeric,
  avg_order_value numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE p_interval
      WHEN 'day' THEN to_char(date_trunc('day', v.check_in_time), 'YYYY-MM-DD')
      WHEN 'week' THEN to_char(date_trunc('week', v.check_in_time), 'YYYY-"W"IW')
      WHEN 'month' THEN to_char(date_trunc('month', v.check_in_time), 'YYYY-MM')
      WHEN 'quarter' THEN to_char(date_trunc('quarter', v.check_in_time), 'YYYY-"Q"Q')
      ELSE to_char(date_trunc('month', v.check_in_time), 'YYYY-MM')
    END as period,
    COUNT(DISTINCT CASE 
      WHEN c.created_at >= date_trunc(p_interval, v.check_in_time) 
       AND c.created_at < date_trunc(p_interval, v.check_in_time) + ('1 ' || p_interval)::interval
      THEN c.id 
    END) as new_customers,
    COUNT(DISTINCT CASE 
      WHEN c.created_at < date_trunc(p_interval, v.check_in_time) 
      THEN c.id 
    END) as returning_customers,
    COUNT(v.id) as total_visits,
    COALESCE(SUM(o.total_amount), 0) as total_revenue,
    CASE 
      WHEN COUNT(o.id) > 0 THEN SUM(o.total_amount) / COUNT(o.id)
      ELSE 0
    END as avg_order_value
  FROM visits v
  LEFT JOIN customers c ON c.id = v.customer_id
  LEFT JOIN orders o ON o.visit_id = v.id
  WHERE v.check_in_time >= p_start_date
    AND v.check_in_time <= p_end_date
  GROUP BY 1
  ORDER BY 1;
END;
$$;

-- 顧客獲得チャネル分析関数（仮実装）
CREATE OR REPLACE FUNCTION get_acquisition_channel_analysis()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
BEGIN
  -- 実際のチャネルデータがない場合の仮実装
  -- 将来的にはcustomersテーブルにacquisition_channelカラムを追加
  SELECT json_build_object(
    'channels', json_build_array(
      json_build_object('channel', 'Direct', 'customers', 120, 'revenue', 5400000),
      json_build_object('channel', 'Referral', 'customers', 85, 'revenue', 4200000),
      json_build_object('channel', 'Social Media', 'customers', 45, 'revenue', 1800000),
      json_build_object('channel', 'Walk-in', 'customers', 200, 'revenue', 8500000)
    ),
    'top_referrers', json_build_array(
      json_build_object('referrer_name', 'スタッフA', 'referred_count', 25),
      json_build_object('referrer_name', 'スタッフB', 'referred_count', 18),
      json_build_object('referrer_name', 'スタッフC', 'referred_count', 12)
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 顧客エンゲージメントスコア計算関数
CREATE OR REPLACE FUNCTION calculate_engagement_score(p_customer_id uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_score numeric := 0;
  v_visit_score numeric;
  v_spending_score numeric;
  v_recency_score numeric;
  v_bottle_score numeric;
  v_metrics customer_analytics_metrics%ROWTYPE;
BEGIN
  -- メトリクスを取得
  SELECT * INTO v_metrics
  FROM customer_analytics_metrics
  WHERE customer_id = p_customer_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- 来店頻度スコア（30点満点）
  v_visit_score := LEAST(30, v_metrics.visit_count * 3);
  
  -- 支出スコア（30点満点）
  v_spending_score := LEAST(30, (v_metrics.total_revenue / 10000)::numeric);
  
  -- 最近性スコア（20点満点）
  IF v_metrics.last_visit IS NOT NULL THEN
    v_recency_score := GREATEST(0, 20 - (
      EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_metrics.last_visit)) / 86400 / 7
    ));
  ELSE
    v_recency_score := 0;
  END IF;
  
  -- ボトルキープスコア（20点満点）
  v_bottle_score := LEAST(20, v_metrics.active_bottle_count * 10);
  
  -- 合計スコア
  v_score := v_visit_score + v_spending_score + v_recency_score + v_bottle_score;
  
  RETURN ROUND(v_score, 2);
END;
$$;

-- 顧客推奨アクション生成関数
CREATE OR REPLACE FUNCTION get_customer_recommendations(p_customer_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_metrics customer_analytics_metrics%ROWTYPE;
  v_segment customer_segments%ROWTYPE;
  v_churn_score numeric;
  v_recommendations json[];
BEGIN
  -- データ取得
  SELECT * INTO v_metrics FROM customer_analytics_metrics WHERE customer_id = p_customer_id;
  SELECT * INTO v_segment FROM customer_segments WHERE customer_id = p_customer_id;
  v_churn_score := calculate_churn_prediction_score(p_customer_id);
  
  v_recommendations := ARRAY[]::json[];
  
  -- リスクレベルに基づく推奨アクション
  IF v_segment.risk_level IN ('High Risk', 'Medium Risk') THEN
    v_recommendations := array_append(v_recommendations, 
      json_build_object(
        'type', 'retention',
        'priority', 'high',
        'action', 'リテンションキャンペーン実施',
        'detail', '特別オファーや割引クーポンの送付を検討'
      )
    );
  END IF;
  
  -- 来店間隔に基づく推奨
  IF v_metrics.last_visit IS NOT NULL AND 
     EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_metrics.last_visit)) / 86400 > 
     COALESCE(v_metrics.avg_visit_interval_days, 30) * 1.5 THEN
    v_recommendations := array_append(v_recommendations,
      json_build_object(
        'type', 'reactivation',
        'priority', 'medium',
        'action', '再来店促進',
        'detail', 'パーソナライズされたメッセージを送信'
      )
    );
  END IF;
  
  -- VIP顧客への特別対応
  IF v_segment.segment IN ('VIP', 'Premium') THEN
    v_recommendations := array_append(v_recommendations,
      json_build_object(
        'type', 'vip_service',
        'priority', 'high',
        'action', 'VIP特典の提供',
        'detail', '専用サービスや優先予約の案内'
      )
    );
  END IF;
  
  -- 新規顧客へのフォローアップ
  IF v_metrics.visit_count <= 2 THEN
    v_recommendations := array_append(v_recommendations,
      json_build_object(
        'type', 'onboarding',
        'priority', 'medium',
        'action', '新規顧客フォローアップ',
        'detail', '次回来店時の特典案内やサービス説明'
      )
    );
  END IF;
  
  RETURN json_build_object(
    'customer_id', p_customer_id,
    'segment', v_segment.segment,
    'risk_level', v_segment.risk_level,
    'churn_score', v_churn_score,
    'recommendations', v_recommendations
  );
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION get_cohort_analysis(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_segment_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_trends(date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_acquisition_channel_analysis() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_engagement_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_recommendations(uuid) TO authenticated;