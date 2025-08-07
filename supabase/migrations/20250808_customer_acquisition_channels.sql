-- 顧客獲得チャネル機能の実装

-- customersテーブルに獲得チャネル関連カラムを追加
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS acquisition_channel text DEFAULT 'walk-in' 
  CHECK (acquisition_channel IN ('walk-in', 'referral', 'social_media', 'online', 'event', 'other')),
ADD COLUMN IF NOT EXISTS acquisition_date timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS referrer_customer_id uuid REFERENCES customers(id),
ADD COLUMN IF NOT EXISTS referrer_staff_id uuid REFERENCES staffs(id),
ADD COLUMN IF NOT EXISTS acquisition_source text, -- 詳細な獲得元（Instagram, Facebook, Google等）
ADD COLUMN IF NOT EXISTS acquisition_campaign text; -- キャンペーン名

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_customers_acquisition_channel ON customers(acquisition_channel);
CREATE INDEX IF NOT EXISTS idx_customers_referrer_customer ON customers(referrer_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_referrer_staff ON customers(referrer_staff_id);
CREATE INDEX IF NOT EXISTS idx_customers_acquisition_date ON customers(acquisition_date);

-- 顧客獲得チャネル分析関数（実データ版）
CREATE OR REPLACE FUNCTION get_acquisition_channel_analysis(
  p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '1 year')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'channels', (
      SELECT json_agg(
        json_build_object(
          'channel', acquisition_channel,
          'customers', customer_count,
          'revenue', total_revenue,
          'avg_ltv', avg_ltv,
          'retention_rate', retention_rate
        ) ORDER BY customer_count DESC
      )
      FROM (
        SELECT 
          c.acquisition_channel,
          COUNT(DISTINCT c.id) as customer_count,
          COALESCE(SUM(o.total_amount), 0) as total_revenue,
          COALESCE(AVG(
            CASE 
              WHEN COUNT(DISTINCT v.id) > 0 
              THEN SUM(o.total_amount) / COUNT(DISTINCT c.id)
              ELSE 0 
            END
          ), 0) as avg_ltv,
          ROUND(
            COUNT(DISTINCT CASE 
              WHEN v.check_in_time >= CURRENT_DATE - INTERVAL '30 days' 
              THEN c.id 
            END)::numeric / NULLIF(COUNT(DISTINCT c.id), 0) * 100,
            2
          ) as retention_rate
        FROM customers c
        LEFT JOIN visits v ON v.customer_id = c.id
        LEFT JOIN orders o ON o.visit_id = v.id
        WHERE c.acquisition_date >= p_start_date
          AND c.acquisition_date <= p_end_date
        GROUP BY c.acquisition_channel
      ) channel_stats
    ),
    'top_referrers', (
      SELECT json_agg(
        json_build_object(
          'referrer_type', referrer_type,
          'referrer_id', referrer_id,
          'referrer_name', referrer_name,
          'referred_count', referred_count,
          'total_revenue', total_revenue
        ) ORDER BY referred_count DESC
      )
      FROM (
        -- 顧客紹介者
        SELECT 
          'customer' as referrer_type,
          rc.id as referrer_id,
          rc.name as referrer_name,
          COUNT(c.id) as referred_count,
          COALESCE(SUM(o.total_amount), 0) as total_revenue
        FROM customers c
        JOIN customers rc ON rc.id = c.referrer_customer_id
        LEFT JOIN visits v ON v.customer_id = c.id
        LEFT JOIN orders o ON o.visit_id = v.id
        WHERE c.acquisition_date >= p_start_date
          AND c.acquisition_date <= p_end_date
        GROUP BY rc.id, rc.name
        
        UNION ALL
        
        -- スタッフ紹介者
        SELECT 
          'staff' as referrer_type,
          s.id as referrer_id,
          s.full_name as referrer_name,
          COUNT(c.id) as referred_count,
          COALESCE(SUM(o.total_amount), 0) as total_revenue
        FROM customers c
        JOIN staffs s ON s.id = c.referrer_staff_id
        LEFT JOIN visits v ON v.customer_id = c.id
        LEFT JOIN orders o ON o.visit_id = v.id
        WHERE c.acquisition_date >= p_start_date
          AND c.acquisition_date <= p_end_date
        GROUP BY s.id, s.full_name
        
        ORDER BY referred_count DESC
        LIMIT 10
      ) referrers
    ),
    'source_breakdown', (
      SELECT json_agg(
        json_build_object(
          'source', acquisition_source,
          'count', source_count,
          'percentage', percentage
        ) ORDER BY source_count DESC
      )
      FROM (
        SELECT 
          COALESCE(acquisition_source, acquisition_channel) as acquisition_source,
          COUNT(*) as source_count,
          ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) as percentage
        FROM customers
        WHERE acquisition_date >= p_start_date
          AND acquisition_date <= p_end_date
        GROUP BY acquisition_source, acquisition_channel
      ) sources
    ),
    'monthly_trend', (
      SELECT json_agg(
        json_build_object(
          'month', month,
          'walk_in', walk_in,
          'referral', referral,
          'social_media', social_media,
          'online', online,
          'event', event,
          'other', other,
          'total', total
        ) ORDER BY month
      )
      FROM (
        SELECT 
          to_char(date_trunc('month', acquisition_date), 'YYYY-MM') as month,
          COUNT(CASE WHEN acquisition_channel = 'walk-in' THEN 1 END) as walk_in,
          COUNT(CASE WHEN acquisition_channel = 'referral' THEN 1 END) as referral,
          COUNT(CASE WHEN acquisition_channel = 'social_media' THEN 1 END) as social_media,
          COUNT(CASE WHEN acquisition_channel = 'online' THEN 1 END) as online,
          COUNT(CASE WHEN acquisition_channel = 'event' THEN 1 END) as event,
          COUNT(CASE WHEN acquisition_channel = 'other' THEN 1 END) as other,
          COUNT(*) as total
        FROM customers
        WHERE acquisition_date >= p_start_date
          AND acquisition_date <= p_end_date
        GROUP BY date_trunc('month', acquisition_date)
      ) monthly
    ),
    'campaign_performance', (
      SELECT json_agg(
        json_build_object(
          'campaign', acquisition_campaign,
          'customers', customer_count,
          'revenue', total_revenue,
          'roi', roi
        ) ORDER BY customer_count DESC
      )
      FROM (
        SELECT 
          acquisition_campaign,
          COUNT(DISTINCT c.id) as customer_count,
          COALESCE(SUM(o.total_amount), 0) as total_revenue,
          -- ROIは仮計算（実際のキャンペーンコストデータがない場合）
          ROUND(COALESCE(SUM(o.total_amount), 0) / GREATEST(COUNT(DISTINCT c.id) * 1000, 1), 2) as roi
        FROM customers c
        LEFT JOIN visits v ON v.customer_id = c.id
        LEFT JOIN orders o ON o.visit_id = v.id
        WHERE c.acquisition_campaign IS NOT NULL
          AND c.acquisition_date >= p_start_date
          AND c.acquisition_date <= p_end_date
        GROUP BY c.acquisition_campaign
      ) campaigns
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- チャネル別のパフォーマンス比較関数
CREATE OR REPLACE FUNCTION compare_channel_performance(
  p_channel1 text,
  p_channel2 text,
  p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '3 months')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  metric text,
  channel1_value numeric,
  channel2_value numeric,
  difference numeric,
  percentage_diff numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH channel1_stats AS (
    SELECT 
      COUNT(DISTINCT c.id) as customer_count,
      COALESCE(AVG(o.total_amount), 0) as avg_order_value,
      COUNT(DISTINCT v.id)::numeric / NULLIF(COUNT(DISTINCT c.id), 0) as avg_visits,
      COALESCE(SUM(o.total_amount), 0) as total_revenue
    FROM customers c
    LEFT JOIN visits v ON v.customer_id = c.id
    LEFT JOIN orders o ON o.visit_id = v.id
    WHERE c.acquisition_channel = p_channel1
      AND c.acquisition_date >= p_start_date
      AND c.acquisition_date <= p_end_date
  ),
  channel2_stats AS (
    SELECT 
      COUNT(DISTINCT c.id) as customer_count,
      COALESCE(AVG(o.total_amount), 0) as avg_order_value,
      COUNT(DISTINCT v.id)::numeric / NULLIF(COUNT(DISTINCT c.id), 0) as avg_visits,
      COALESCE(SUM(o.total_amount), 0) as total_revenue
    FROM customers c
    LEFT JOIN visits v ON v.customer_id = c.id
    LEFT JOIN orders o ON o.visit_id = v.id
    WHERE c.acquisition_channel = p_channel2
      AND c.acquisition_date >= p_start_date
      AND c.acquisition_date <= p_end_date
  )
  SELECT 
    'Customer Count'::text,
    c1.customer_count::numeric,
    c2.customer_count::numeric,
    (c1.customer_count - c2.customer_count)::numeric,
    ROUND(
      CASE 
        WHEN c2.customer_count > 0 
        THEN ((c1.customer_count - c2.customer_count)::numeric / c2.customer_count * 100)
        ELSE 0 
      END, 2
    )
  FROM channel1_stats c1, channel2_stats c2
  
  UNION ALL
  
  SELECT 
    'Average Order Value'::text,
    c1.avg_order_value,
    c2.avg_order_value,
    c1.avg_order_value - c2.avg_order_value,
    ROUND(
      CASE 
        WHEN c2.avg_order_value > 0 
        THEN ((c1.avg_order_value - c2.avg_order_value) / c2.avg_order_value * 100)
        ELSE 0 
      END, 2
    )
  FROM channel1_stats c1, channel2_stats c2
  
  UNION ALL
  
  SELECT 
    'Average Visits'::text,
    ROUND(c1.avg_visits, 2),
    ROUND(c2.avg_visits, 2),
    ROUND(c1.avg_visits - c2.avg_visits, 2),
    ROUND(
      CASE 
        WHEN c2.avg_visits > 0 
        THEN ((c1.avg_visits - c2.avg_visits) / c2.avg_visits * 100)
        ELSE 0 
      END, 2
    )
  FROM channel1_stats c1, channel2_stats c2
  
  UNION ALL
  
  SELECT 
    'Total Revenue'::text,
    c1.total_revenue,
    c2.total_revenue,
    c1.total_revenue - c2.total_revenue,
    ROUND(
      CASE 
        WHEN c2.total_revenue > 0 
        THEN ((c1.total_revenue - c2.total_revenue) / c2.total_revenue * 100)
        ELSE 0 
      END, 2
    )
  FROM channel1_stats c1, channel2_stats c2;
END;
$$;

-- 紹介プログラムの効果測定関数
CREATE OR REPLACE FUNCTION analyze_referral_program()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'summary', json_build_object(
      'total_referrals', (
        SELECT COUNT(*) 
        FROM customers 
        WHERE referrer_customer_id IS NOT NULL 
           OR referrer_staff_id IS NOT NULL
      ),
      'customer_referrals', (
        SELECT COUNT(*) 
        FROM customers 
        WHERE referrer_customer_id IS NOT NULL
      ),
      'staff_referrals', (
        SELECT COUNT(*) 
        FROM customers 
        WHERE referrer_staff_id IS NOT NULL
      ),
      'referral_revenue', (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM customers c
        JOIN visits v ON v.customer_id = c.id
        JOIN orders o ON o.visit_id = v.id
        WHERE c.referrer_customer_id IS NOT NULL 
           OR c.referrer_staff_id IS NOT NULL
      )
    ),
    'top_customer_referrers', (
      SELECT json_agg(
        json_build_object(
          'customer_id', rc.id,
          'customer_name', rc.name,
          'referral_count', COUNT(c.id),
          'total_revenue_generated', COALESCE(SUM(o.total_amount), 0),
          'avg_referral_value', COALESCE(AVG(o.total_amount), 0)
        ) ORDER BY COUNT(c.id) DESC
      )
      FROM customers c
      JOIN customers rc ON rc.id = c.referrer_customer_id
      LEFT JOIN visits v ON v.customer_id = c.id
      LEFT JOIN orders o ON o.visit_id = v.id
      GROUP BY rc.id, rc.name
      LIMIT 10
    ),
    'top_staff_referrers', (
      SELECT json_agg(
        json_build_object(
          'staff_id', s.id,
          'staff_name', s.full_name,
          'referral_count', COUNT(c.id),
          'total_revenue_generated', COALESCE(SUM(o.total_amount), 0),
          'avg_referral_value', COALESCE(AVG(o.total_amount), 0)
        ) ORDER BY COUNT(c.id) DESC
      )
      FROM customers c
      JOIN staffs s ON s.id = c.referrer_staff_id
      LEFT JOIN visits v ON v.customer_id = c.id
      LEFT JOIN orders o ON o.visit_id = v.id
      GROUP BY s.id, s.full_name
      LIMIT 10
    ),
    'referral_chain_analysis', (
      -- 紹介の連鎖（紹介された顧客がさらに紹介）
      SELECT json_build_object(
        'second_generation_referrals', (
          SELECT COUNT(*)
          FROM customers c1
          JOIN customers c2 ON c2.referrer_customer_id = c1.id
          WHERE c1.referrer_customer_id IS NOT NULL
        ),
        'third_generation_referrals', (
          SELECT COUNT(*)
          FROM customers c1
          JOIN customers c2 ON c2.referrer_customer_id = c1.id
          JOIN customers c3 ON c3.referrer_customer_id = c2.id
          WHERE c1.referrer_customer_id IS NOT NULL
        )
      )
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION get_acquisition_channel_analysis(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION compare_channel_performance(text, text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_referral_program() TO authenticated;