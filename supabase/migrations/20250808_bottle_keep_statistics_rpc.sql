-- ボトルキープ統計情報を取得するRPC関数
CREATE OR REPLACE FUNCTION get_bottle_keep_statistics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_active', COALESCE((
      SELECT COUNT(*) 
      FROM bottle_keeps 
      WHERE status = 'active'
    ), 0),
    'total_expired', COALESCE((
      SELECT COUNT(*) 
      FROM bottle_keeps 
      WHERE status = 'expired'
    ), 0),
    'total_consumed', COALESCE((
      SELECT COUNT(*) 
      FROM bottle_keeps 
      WHERE status = 'consumed'
    ), 0),
    'expiring_soon', COALESCE((
      SELECT COUNT(*) 
      FROM bottle_keeps 
      WHERE status = 'active' 
        AND expiry_date IS NOT NULL
        AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    ), 0),
    'by_product', COALESCE((
      SELECT json_agg(
        json_build_object(
          'product_id', p.id,
          'product_name', p.name,
          'total', COUNT(bk.id),
          'active', COUNT(CASE WHEN bk.status = 'active' THEN 1 END),
          'consumed', COUNT(CASE WHEN bk.status = 'consumed' THEN 1 END)
        )
      )
      FROM products p
      LEFT JOIN bottle_keeps bk ON bk.product_id = p.id
      WHERE EXISTS (SELECT 1 FROM bottle_keeps WHERE product_id = p.id)
      GROUP BY p.id, p.name
      ORDER BY COUNT(bk.id) DESC
      LIMIT 10
    ), '[]'::json),
    'by_customer', COALESCE((
      SELECT json_agg(
        json_build_object(
          'customer_id', c.id,
          'customer_name', c.name,
          'total', COUNT(bk.id),
          'active', COUNT(CASE WHEN bk.status = 'active' THEN 1 END)
        )
      )
      FROM customers c
      LEFT JOIN bottle_keeps bk ON bk.customer_id = c.id
      WHERE EXISTS (SELECT 1 FROM bottle_keeps WHERE customer_id = c.id)
      GROUP BY c.id, c.name
      ORDER BY COUNT(bk.id) DESC
      LIMIT 10
    ), '[]'::json),
    'recent_serves', COALESCE((
      SELECT json_agg(
        json_build_object(
          'bottle_id', bk.id,
          'bottle_number', bk.bottle_number,
          'product_name', p.name,
          'customer_name', c.name,
          'served_date', bk.last_served_date,
          'remaining', bk.remaining_percentage
        )
      )
      FROM (
        SELECT * 
        FROM bottle_keeps 
        WHERE last_served_date IS NOT NULL
        ORDER BY last_served_date DESC
        LIMIT 10
      ) bk
      LEFT JOIN products p ON p.id = bk.product_id
      LEFT JOIN customers c ON c.id = bk.customer_id
    ), '[]'::json)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 顧客別ボトルキープ統計を取得するRPC関数
CREATE OR REPLACE FUNCTION get_customer_bottle_statistics(p_customer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_bottles', COALESCE((
      SELECT COUNT(*) 
      FROM bottle_keeps 
      WHERE customer_id = p_customer_id
    ), 0),
    'active_bottles', COALESCE((
      SELECT COUNT(*) 
      FROM bottle_keeps 
      WHERE customer_id = p_customer_id AND status = 'active'
    ), 0),
    'consumed_bottles', COALESCE((
      SELECT COUNT(*) 
      FROM bottle_keeps 
      WHERE customer_id = p_customer_id AND status = 'consumed'
    ), 0),
    'total_served', COALESCE((
      SELECT SUM(served_amount) 
      FROM bottle_keep_histories 
      WHERE bottle_keep_id IN (
        SELECT id FROM bottle_keeps WHERE customer_id = p_customer_id
      ) AND action_type = 'serve'
    ), 0),
    'bottles', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', bk.id,
          'bottle_number', bk.bottle_number,
          'product_name', p.name,
          'opened_date', bk.opened_date,
          'expiry_date', bk.expiry_date,
          'remaining_percentage', bk.remaining_percentage,
          'status', bk.status,
          'storage_location', bk.storage_location,
          'last_served_date', bk.last_served_date
        ) ORDER BY bk.created_at DESC
      )
      FROM bottle_keeps bk
      LEFT JOIN products p ON p.id = bk.product_id
      WHERE bk.customer_id = p_customer_id
    ), '[]'::json)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 月別統計を取得するRPC関数
CREATE OR REPLACE FUNCTION get_bottle_keep_monthly_statistics(
  p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '6 months')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'month', to_char(month_date, 'YYYY-MM'),
      'new_bottles', COALESCE(new_bottles, 0),
      'consumed_bottles', COALESCE(consumed_bottles, 0),
      'expired_bottles', COALESCE(expired_bottles, 0),
      'total_serves', COALESCE(total_serves, 0),
      'total_served_amount', COALESCE(total_served_amount, 0)
    ) ORDER BY month_date
  ) INTO result
  FROM (
    SELECT 
      date_trunc('month', generate_series(p_start_date, p_end_date, '1 month'::interval))::date as month_date
  ) months
  LEFT JOIN (
    SELECT 
      date_trunc('month', created_at)::date as month,
      COUNT(*) as new_bottles
    FROM bottle_keeps
    WHERE created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY date_trunc('month', created_at)
  ) new_bottles ON new_bottles.month = months.month_date
  LEFT JOIN (
    SELECT 
      date_trunc('month', updated_at)::date as month,
      COUNT(*) as consumed_bottles
    FROM bottle_keeps
    WHERE status = 'consumed' 
      AND updated_at >= p_start_date 
      AND updated_at <= p_end_date
    GROUP BY date_trunc('month', updated_at)
  ) consumed ON consumed.month = months.month_date
  LEFT JOIN (
    SELECT 
      date_trunc('month', updated_at)::date as month,
      COUNT(*) as expired_bottles
    FROM bottle_keeps
    WHERE status = 'expired' 
      AND updated_at >= p_start_date 
      AND updated_at <= p_end_date
    GROUP BY date_trunc('month', updated_at)
  ) expired ON expired.month = months.month_date
  LEFT JOIN (
    SELECT 
      date_trunc('month', created_at)::date as month,
      COUNT(*) as total_serves,
      SUM(served_amount) as total_served_amount
    FROM bottle_keep_histories
    WHERE action_type = 'serve' 
      AND created_at >= p_start_date 
      AND created_at <= p_end_date
    GROUP BY date_trunc('month', created_at)
  ) serves ON serves.month = months.month_date;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 関数の権限設定
GRANT EXECUTE ON FUNCTION get_bottle_keep_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_bottle_statistics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_bottle_keep_monthly_statistics(date, date) TO authenticated;