-- 顧客分析サマリーRPC関数（パフォーマンス最適化版）

CREATE OR REPLACE FUNCTION get_analytics_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  v_total_customers bigint;
  v_active_customers bigint;
  v_churning_customers bigint;
  v_churned_customers bigint;
  v_total_revenue numeric;
  v_avg_customer_value numeric;
  v_vip_count bigint;
  v_at_risk_count bigint;
  v_avg_retention_rate numeric;
BEGIN
  -- 顧客ステータス別カウント（1クエリで集計）
  WITH status_counts AS (
    SELECT 
      retention_status,
      COUNT(*) as count,
      SUM(total_revenue) as revenue_sum
    FROM customer_analytics_metrics
    GROUP BY retention_status
  )
  SELECT 
    COALESCE(SUM(count), 0),
    COALESCE(SUM(CASE WHEN retention_status = 'active' THEN count ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN retention_status = 'churning' THEN count ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN retention_status = 'churned' THEN count ELSE 0 END), 0),
    COALESCE(SUM(revenue_sum), 0)
  INTO 
    v_total_customers,
    v_active_customers,
    v_churning_customers,
    v_churned_customers,
    v_total_revenue
  FROM status_counts;
  
  -- 平均顧客価値と維持率
  IF v_total_customers > 0 THEN
    v_avg_customer_value := v_total_revenue / v_total_customers;
    v_avg_retention_rate := (v_active_customers::numeric / v_total_customers) * 100;
  ELSE
    v_avg_customer_value := 0;
    v_avg_retention_rate := 0;
  END IF;
  
  -- VIPとリスク顧客のカウント（1クエリで集計）
  WITH segment_counts AS (
    SELECT 
      SUM(CASE WHEN segment IN ('VIP', 'Premium') THEN 1 ELSE 0 END) as vip,
      SUM(CASE WHEN risk_level IN ('High Risk', 'Medium Risk') THEN 1 ELSE 0 END) as at_risk
    FROM customer_segments
  )
  SELECT 
    COALESCE(vip, 0),
    COALESCE(at_risk, 0)
  INTO 
    v_vip_count,
    v_at_risk_count
  FROM segment_counts;
  
  -- 結果をJSON形式で構築
  result := json_build_object(
    'total_customers', v_total_customers,
    'active_customers', v_active_customers,
    'churning_customers', v_churning_customers,
    'churned_customers', v_churned_customers,
    'avg_retention_rate', ROUND(v_avg_retention_rate, 2),
    'avg_customer_value', ROUND(v_avg_customer_value, 2),
    'total_revenue', v_total_revenue,
    'vip_count', v_vip_count,
    'at_risk_count', v_at_risk_count,
    'breakdown', json_build_object(
      'by_status', (
        SELECT json_agg(
          json_build_object(
            'status', retention_status,
            'count', COUNT(*),
            'percentage', ROUND(COUNT(*)::numeric / NULLIF(v_total_customers, 0) * 100, 2)
          )
        )
        FROM customer_analytics_metrics
        GROUP BY retention_status
      ),
      'by_segment', (
        SELECT json_agg(
          json_build_object(
            'segment', segment,
            'count', COUNT(*),
            'avg_revenue', ROUND(AVG(total_revenue), 2)
          )
        )
        FROM customer_segments
        GROUP BY segment
      ),
      'by_risk', (
        SELECT json_agg(
          json_build_object(
            'risk_level', risk_level,
            'count', COUNT(*)
          )
        )
        FROM customer_segments
        GROUP BY risk_level
      )
    ),
    'trends', json_build_object(
      'new_customers_30d', (
        SELECT COUNT(*)
        FROM customers
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      ),
      'new_customers_7d', (
        SELECT COUNT(*)
        FROM customers
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      ),
      'revenue_30d', (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM visits v
        JOIN orders o ON o.visit_id = v.id
        WHERE v.check_in_time >= CURRENT_DATE - INTERVAL '30 days'
      ),
      'revenue_7d', (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM visits v
        JOIN orders o ON o.visit_id = v.id
        WHERE v.check_in_time >= CURRENT_DATE - INTERVAL '7 days'
      )
    )
  );
  
  RETURN result;
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION get_analytics_summary() TO authenticated;