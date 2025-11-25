-- Reduce SECURITY DEFINER on additional read-only functions

-- get_inventory_page_data_optimized: read-only -> invoker
CREATE OR REPLACE FUNCTION get_inventory_page_data_optimized(
  p_category TEXT DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL,
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  result JSON;
BEGIN
  WITH filtered_products AS (
    SELECT 
      id,
      name,
      category,
      price,
      cost,
      stock_quantity,
      low_stock_threshold,
      max_stock,
      reorder_point,
      is_active,
      created_at,
      updated_at
    FROM products
    WHERE is_active = true
      AND (p_category IS NULL OR category = p_category)
      AND (p_search_term IS NULL OR name ILIKE '%' || p_search_term || '%')
    ORDER BY name
    LIMIT p_limit
    OFFSET p_offset
  ),
  categories AS (
    SELECT DISTINCT category
    FROM products
    WHERE is_active = true
    ORDER BY category
  )
  SELECT json_build_object(
    'products', COALESCE((SELECT json_agg(p.*) FROM filtered_products p), '[]'::JSON),
    'stats', (SELECT row_to_json(s.*) FROM inventory_stats_mv s),
    'alerts', COALESCE((SELECT json_agg(a.*) FROM inventory_alerts_mv a), '[]'::JSON),
    'categories', COALESCE((SELECT json_agg(c.category) FROM categories c), '[]'::JSON),
    'total_count', (
      SELECT COUNT(*)
      FROM products
      WHERE is_active = true
        AND (p_category IS NULL OR category = p_category)
        AND (p_search_term IS NULL OR name ILIKE '%' || p_search_term || '%')
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- get_available_staff_for_cast: read-only -> invoker
CREATE OR REPLACE FUNCTION get_available_staff_for_cast()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  role TEXT,
  is_active BOOLEAN
) 
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.full_name,
    s.role,
    s.is_active
  FROM staffs s
  LEFT JOIN casts_profile cp ON s.id = cp.staff_id
  WHERE 
    s.role != 'admin'
    AND s.is_active = true
    AND cp.staff_id IS NULL
  ORDER BY s.full_name;
END;
$$;

-- get_bottle_keep_stats: read-only -> invoker
CREATE OR REPLACE FUNCTION get_bottle_keep_stats()
RETURNS TABLE (
  total_bottles BIGINT,
  active_bottles BIGINT,
  expired_bottles BIGINT,
  consumed_bottles BIGINT,
  expiring_soon BIGINT,
  total_value NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  one_week_from_now DATE;
BEGIN
  one_week_from_now := CURRENT_DATE + INTERVAL '7 days';
  
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_bottles,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT AS active_bottles,
    COUNT(*) FILTER (WHERE status = 'expired')::BIGINT AS expired_bottles,
    COUNT(*) FILTER (WHERE status = 'consumed')::BIGINT AS consumed_bottles,
    COUNT(*) FILTER (WHERE status = 'active' AND expiry_date <= one_week_from_now)::BIGINT AS expiring_soon,
    COALESCE(
      SUM(
        CASE 
          WHEN bk.status = 'active' THEN bk.remaining_percentage/100.0 * p.price
          ELSE 0
        END
      ), 0
    )::NUMERIC AS total_value
  FROM bottle_keeps bk
  LEFT JOIN products p ON bk.product_id = p.id;
END;
$$;

-- get_qr_code_stats: read-only -> invoker
CREATE OR REPLACE FUNCTION get_qr_code_stats()
RETURNS TABLE (
  total_scans BIGINT,
  successful_scans BIGINT,
  failed_scans BIGINT,
  active_qr_codes BIGINT,
  today_scans BIGINT,
  unique_users_today BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  today_start TIMESTAMPTZ;
  today_end TIMESTAMPTZ;
BEGIN
  today_start := CURRENT_DATE::TIMESTAMPTZ;
  today_end := (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ;
  
  RETURN QUERY
  WITH scan_stats AS (
    SELECT
      COUNT(*)::BIGINT AS total_scans,
      COUNT(*) FILTER (WHERE success = true)::BIGINT AS successful_scans,
      COUNT(*) FILTER (WHERE scanned_at >= today_start AND scanned_at < today_end)::BIGINT AS today_scans
    FROM qr_attendance_logs
  ),
  active_codes AS (
    SELECT COUNT(*)::BIGINT AS active_qr_codes
    FROM qr_codes
    WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())
  ),
  unique_today AS (
    SELECT COUNT(DISTINCT staff_id)::BIGINT AS unique_users_today
    FROM qr_attendance_logs
    WHERE scanned_at >= today_start AND scanned_at < today_end
  )
  SELECT
    scan_stats.total_scans,
    scan_stats.successful_scans,
    scan_stats.total_scans - scan_stats.successful_scans AS failed_scans,
    active_codes.active_qr_codes,
    scan_stats.today_scans,
    unique_today.unique_users_today
  FROM scan_stats, active_codes, unique_today;
END;
$$;

-- get_weekly_schedule is a placeholder; keep definers or replace later when implemented properly
