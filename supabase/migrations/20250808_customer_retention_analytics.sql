-- 顧客維持分析機能のデータベーススキーマ

-- 顧客分析メトリクスビュー
CREATE OR REPLACE VIEW customer_analytics_metrics AS
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  c.phone_number,
  c.created_at as first_visit,
  -- 来店回数
  COUNT(DISTINCT v.id) as visit_count,
  -- 最終来店日
  MAX(v.check_in_time) as last_visit,
  -- 平均来店間隔（日数）
  CASE 
    WHEN COUNT(DISTINCT v.id) > 1 THEN
      EXTRACT(EPOCH FROM (MAX(v.check_in_time) - MIN(v.check_in_time))) / 86400 / NULLIF(COUNT(DISTINCT v.id) - 1, 0)
    ELSE NULL
  END as avg_visit_interval_days,
  -- 総売上
  COALESCE(SUM(o.total_amount), 0) as total_revenue,
  -- 平均客単価
  CASE 
    WHEN COUNT(DISTINCT v.id) > 0 THEN
      COALESCE(SUM(o.total_amount), 0) / COUNT(DISTINCT v.id)
    ELSE 0
  END as avg_spending_per_visit,
  -- アクティブステータス（30日以内に来店）
  CASE 
    WHEN MAX(v.check_in_time) >= CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 'active'
    WHEN MAX(v.check_in_time) >= CURRENT_TIMESTAMP - INTERVAL '90 days' THEN 'churning'
    ELSE 'churned'
  END as retention_status,
  -- 指名スタッフ
  (
    SELECT s.full_name 
    FROM staffs s 
    WHERE s.id = (
      SELECT host_staff_id 
      FROM visits 
      WHERE customer_id = c.id 
      GROUP BY host_staff_id 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    )
  ) as favorite_staff,
  -- ボトルキープ数
  (
    SELECT COUNT(*) 
    FROM bottle_keeps 
    WHERE customer_id = c.id AND status = 'active'
  ) as active_bottle_count
FROM customers c
LEFT JOIN visits v ON v.customer_id = c.id
LEFT JOIN orders o ON o.visit_id = v.id
GROUP BY c.id, c.name, c.phone_number, c.created_at;

-- 顧客セグメントビュー
CREATE OR REPLACE VIEW customer_segments AS
WITH customer_metrics AS (
  SELECT 
    customer_id,
    customer_name,
    visit_count,
    total_revenue,
    avg_spending_per_visit,
    retention_status,
    last_visit,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_visit)) / 86400 as days_since_last_visit
  FROM customer_analytics_metrics
)
SELECT 
  customer_id,
  customer_name,
  -- 顧客セグメント分類
  CASE 
    WHEN visit_count >= 10 AND avg_spending_per_visit >= 50000 THEN 'VIP'
    WHEN visit_count >= 5 AND avg_spending_per_visit >= 30000 THEN 'Premium'
    WHEN visit_count >= 3 THEN 'Regular'
    WHEN visit_count = 1 THEN 'New'
    ELSE 'Prospect'
  END as segment,
  -- リスクレベル
  CASE 
    WHEN retention_status = 'churned' THEN 'Lost'
    WHEN retention_status = 'churning' AND days_since_last_visit > 60 THEN 'High Risk'
    WHEN retention_status = 'churning' THEN 'Medium Risk'
    WHEN days_since_last_visit > 21 THEN 'Low Risk'
    ELSE 'Healthy'
  END as risk_level,
  visit_count,
  total_revenue,
  avg_spending_per_visit,
  retention_status,
  days_since_last_visit
FROM customer_metrics;

-- コホート分析用テーブル
CREATE TABLE IF NOT EXISTS customer_cohorts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort_month date NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(cohort_month, customer_id)
);

-- コホートデータの初期化関数
CREATE OR REPLACE FUNCTION initialize_customer_cohorts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO customer_cohorts (cohort_month, customer_id)
  SELECT 
    date_trunc('month', c.created_at)::date as cohort_month,
    c.id as customer_id
  FROM customers c
  ON CONFLICT (cohort_month, customer_id) DO NOTHING;
END;
$$;

-- RFM分析用関数
CREATE OR REPLACE FUNCTION calculate_rfm_score(
  p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '1 year')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  customer_id uuid,
  customer_name text,
  recency_days integer,
  frequency integer,
  monetary numeric,
  recency_score integer,
  frequency_score integer,
  monetary_score integer,
  rfm_score text,
  rfm_segment text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH rfm_data AS (
    SELECT 
      c.id as customer_id,
      c.name as customer_name,
      EXTRACT(EPOCH FROM (p_end_date - MAX(v.check_in_time::date))) / 86400 as recency_days,
      COUNT(DISTINCT v.id) as frequency,
      COALESCE(SUM(o.total_amount), 0) as monetary
    FROM customers c
    LEFT JOIN visits v ON v.customer_id = c.id 
      AND v.check_in_time >= p_start_date 
      AND v.check_in_time <= p_end_date
    LEFT JOIN orders o ON o.visit_id = v.id
    GROUP BY c.id, c.name
  ),
  rfm_scores AS (
    SELECT 
      customer_id,
      customer_name,
      recency_days::integer,
      frequency::integer,
      monetary,
      -- Recencyスコア（小さいほど良い）
      CASE 
        WHEN recency_days <= 7 THEN 5
        WHEN recency_days <= 14 THEN 4
        WHEN recency_days <= 30 THEN 3
        WHEN recency_days <= 60 THEN 2
        ELSE 1
      END as recency_score,
      -- Frequencyスコア
      CASE 
        WHEN frequency >= 10 THEN 5
        WHEN frequency >= 6 THEN 4
        WHEN frequency >= 3 THEN 3
        WHEN frequency >= 2 THEN 2
        ELSE 1
      END as frequency_score,
      -- Monetaryスコア
      CASE 
        WHEN monetary >= 100000 THEN 5
        WHEN monetary >= 50000 THEN 4
        WHEN monetary >= 20000 THEN 3
        WHEN monetary >= 10000 THEN 2
        ELSE 1
      END as monetary_score
    FROM rfm_data
  )
  SELECT 
    customer_id,
    customer_name,
    recency_days,
    frequency,
    monetary,
    recency_score,
    frequency_score,
    monetary_score,
    recency_score::text || frequency_score::text || monetary_score::text as rfm_score,
    -- RFMセグメント
    CASE 
      WHEN recency_score >= 4 AND frequency_score >= 4 AND monetary_score >= 4 THEN 'Champions'
      WHEN recency_score >= 3 AND frequency_score >= 4 AND monetary_score >= 4 THEN 'Loyal Customers'
      WHEN recency_score >= 4 AND frequency_score <= 2 THEN 'New Customers'
      WHEN recency_score <= 2 AND frequency_score >= 4 THEN 'At Risk'
      WHEN recency_score <= 2 AND frequency_score <= 2 THEN 'Lost'
      ELSE 'Regular'
    END as rfm_segment
  FROM rfm_scores;
END;
$$;

-- 顧客離脱予測スコア計算関数
CREATE OR REPLACE FUNCTION calculate_churn_prediction_score(p_customer_id uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_score numeric := 0;
  v_days_since_last_visit integer;
  v_avg_interval numeric;
  v_visit_trend numeric;
  v_spending_trend numeric;
BEGIN
  -- 最終来店からの経過日数
  SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - MAX(check_in_time))) / 86400
  INTO v_days_since_last_visit
  FROM visits
  WHERE customer_id = p_customer_id;
  
  -- 平均来店間隔
  SELECT avg_visit_interval_days
  INTO v_avg_interval
  FROM customer_analytics_metrics
  WHERE customer_id = p_customer_id;
  
  -- 来店頻度トレンド（直近3ヶ月 vs その前3ヶ月）
  WITH visit_trends AS (
    SELECT 
      COUNT(CASE WHEN check_in_time >= CURRENT_DATE - INTERVAL '3 months' THEN 1 END) as recent_visits,
      COUNT(CASE WHEN check_in_time >= CURRENT_DATE - INTERVAL '6 months' 
                  AND check_in_time < CURRENT_DATE - INTERVAL '3 months' THEN 1 END) as previous_visits
    FROM visits
    WHERE customer_id = p_customer_id
  )
  SELECT 
    CASE 
      WHEN previous_visits > 0 THEN (recent_visits::numeric - previous_visits) / previous_visits
      ELSE 0
    END
  INTO v_visit_trend
  FROM visit_trends;
  
  -- 支出トレンド
  WITH spending_trends AS (
    SELECT 
      COALESCE(SUM(CASE WHEN v.check_in_time >= CURRENT_DATE - INTERVAL '3 months' THEN o.total_amount END), 0) as recent_spending,
      COALESCE(SUM(CASE WHEN v.check_in_time >= CURRENT_DATE - INTERVAL '6 months' 
                        AND v.check_in_time < CURRENT_DATE - INTERVAL '3 months' THEN o.total_amount END), 0) as previous_spending
    FROM visits v
    LEFT JOIN orders o ON o.visit_id = v.id
    WHERE v.customer_id = p_customer_id
  )
  SELECT 
    CASE 
      WHEN previous_spending > 0 THEN (recent_spending - previous_spending) / previous_spending
      ELSE 0
    END
  INTO v_spending_trend
  FROM spending_trends;
  
  -- スコア計算（0-100）
  -- 最終来店日数の影響（40%）
  IF v_avg_interval IS NOT NULL AND v_avg_interval > 0 THEN
    v_score := v_score + LEAST(40, (v_days_since_last_visit / v_avg_interval) * 20);
  ELSE
    v_score := v_score + LEAST(40, v_days_since_last_visit / 30 * 40);
  END IF;
  
  -- 来店頻度トレンドの影響（30%）
  v_score := v_score + GREATEST(0, (1 - v_visit_trend) * 30);
  
  -- 支出トレンドの影響（30%）
  v_score := v_score + GREATEST(0, (1 - v_spending_trend) * 30);
  
  RETURN LEAST(100, GREATEST(0, v_score));
END;
$$;

-- 顧客ライフタイムバリュー計算関数
CREATE OR REPLACE FUNCTION calculate_customer_lifetime_value(p_customer_id uuid)
RETURNS TABLE(
  current_value numeric,
  predicted_value numeric,
  retention_probability numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_avg_spending numeric;
  v_visit_frequency numeric;
  v_churn_score numeric;
BEGIN
  -- 現在までの総売上
  SELECT total_revenue INTO current_value
  FROM customer_analytics_metrics
  WHERE customer_id = p_customer_id;
  
  -- 平均客単価と来店頻度
  SELECT 
    avg_spending_per_visit,
    CASE 
      WHEN avg_visit_interval_days > 0 THEN 365.0 / avg_visit_interval_days
      ELSE visit_count::numeric / GREATEST(1, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - first_visit)) / 86400 / 365)
    END
  INTO v_avg_spending, v_visit_frequency
  FROM customer_analytics_metrics
  WHERE customer_id = p_customer_id;
  
  -- 離脱スコアから維持確率を計算
  v_churn_score := calculate_churn_prediction_score(p_customer_id);
  retention_probability := (100 - v_churn_score) / 100.0;
  
  -- 予測LTV（簡易版：次年度の予測値）
  predicted_value := current_value + (v_avg_spending * v_visit_frequency * retention_probability);
  
  RETURN NEXT;
END;
$$;

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_visits_customer_check_in ON visits(customer_id, check_in_time);
CREATE INDEX IF NOT EXISTS idx_orders_visit_total ON orders(visit_id, total_amount);
CREATE INDEX IF NOT EXISTS idx_bottle_keeps_customer_status ON bottle_keeps(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_cohorts_month ON customer_cohorts(cohort_month);

-- 権限設定
GRANT SELECT ON customer_analytics_metrics TO authenticated;
GRANT SELECT ON customer_segments TO authenticated;
GRANT ALL ON customer_cohorts TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_rfm_score(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_churn_prediction_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_customer_lifetime_value(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_customer_cohorts() TO authenticated;