-- Optimized customer search function using Trigram similarity
CREATE OR REPLACE FUNCTION search_customers_optimized(
  search_term TEXT,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  name_kana TEXT,
  phone_number TEXT,
  line_id TEXT,
  similarity REAL
) AS $$
BEGIN
  -- Return empty if search term is too short
  IF LENGTH(search_term) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.name_kana,
    c.phone_number,
    c.line_id,
    GREATEST(
      similarity(COALESCE(c.name, ''), search_term),
      similarity(COALESCE(c.name_kana, ''), search_term),
      similarity(COALESCE(c.phone_number, ''), search_term),
      similarity(COALESCE(c.line_id, ''), search_term)
    ) as sim
  FROM customers c
  WHERE 
    c.name % search_term OR
    c.name_kana % search_term OR
    c.phone_number % search_term OR
    c.line_id % search_term
  ORDER BY sim DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optimized staff search function using Trigram similarity
CREATE OR REPLACE FUNCTION search_staffs_optimized(
  search_term TEXT,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  full_name_kana TEXT,
  role TEXT,
  is_active BOOLEAN,
  similarity REAL
) AS $$
BEGIN
  -- Return empty if search term is too short
  IF LENGTH(search_term) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.full_name,
    s.full_name_kana,
    s.role,
    s.is_active,
    GREATEST(
      similarity(COALESCE(s.full_name, ''), search_term),
      similarity(COALESCE(s.full_name_kana, ''), search_term)
    ) as sim
  FROM staffs s
  WHERE 
    s.full_name % search_term OR
    s.full_name_kana % search_term
  ORDER BY sim DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optimized dashboard statistics function
CREATE OR REPLACE FUNCTION get_optimized_dashboard_stats(report_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  today_customers BIGINT,
  today_sales NUMERIC,
  today_visits BIGINT,
  active_tables BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(DISTINCT c.id) as customer_count,
      COALESCE(SUM(oi.total_price), 0) as total_sales,
      COUNT(DISTINCT v.id) as visit_count
    FROM visits v
    LEFT JOIN customers c ON v.customer_id = c.id
    LEFT JOIN order_items oi ON v.id = oi.visit_id
    WHERE DATE(v.check_in_at) = report_date
  )
  SELECT 
    s.customer_count,
    s.total_sales,
    s.visit_count,
    (SELECT COUNT(*) FROM tables WHERE current_status != 'available')::BIGINT
  FROM stats s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for the functions
COMMENT ON FUNCTION search_customers_optimized IS 'Optimized customer search using Trigram similarity for fast partial matching';
COMMENT ON FUNCTION search_staffs_optimized IS 'Optimized staff search using Trigram similarity for fast partial matching';
COMMENT ON FUNCTION get_optimized_dashboard_stats IS 'Optimized dashboard statistics calculation with efficient aggregation';