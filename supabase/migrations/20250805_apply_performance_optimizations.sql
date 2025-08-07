-- =============================================================================
-- Migration: Apply Performance Optimizations from PR #36
-- Date: 2025-08-05
-- Description: This migration applies the database changes from PR #36,
--              including Trigram indexes and optimized RPC functions,
--              on top of the unified initial schema.
-- =============================================================================

-- Enable Trigram extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for customer search optimization
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers
USING gin (
  name gin_trgm_ops, 
  name_kana gin_trgm_ops, 
  phone_number gin_trgm_ops, 
  line_id gin_trgm_ops
);

-- Create GIN index for staff search optimization
CREATE INDEX IF NOT EXISTS idx_staffs_search ON staffs
USING gin (
  full_name gin_trgm_ops, 
  full_name_kana gin_trgm_ops
);

-- Create indexes for date range queries on visits table
CREATE INDEX IF NOT EXISTS idx_visits_date_range ON visits (check_in_at, status);

-- Create indexes for date range queries on attendance_records table
-- Note: The original migration had 'work_date', but the unified schema has 'attendance_date'. Correcting it here.
CREATE INDEX IF NOT EXISTS idx_attendance_date_range ON attendance_records (attendance_date, staff_id);

-- Add comments to explain the indexes
COMMENT ON INDEX idx_customers_search IS 'GIN index for fast partial match searches on customer data';
COMMENT ON INDEX idx_staffs_search IS 'GIN index for fast partial match searches on staff names';
COMMENT ON INDEX idx_visits_date_range IS 'B-tree index for date range queries on visits';
COMMENT ON INDEX idx_attendance_date_range IS 'B-tree index for date range queries on attendance records';

-- Optimized customer search function using Trigram similarity
DROP FUNCTION IF EXISTS search_customers_optimized(TEXT, INTEGER, INTEGER);
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
DROP FUNCTION IF EXISTS search_staffs_optimized(TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION search_staffs_optimized(
  search_term TEXT,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  full_name_kana TEXT,
  role user_role,
  is_active BOOLEAN,
  similarity REAL
) AS $$
BEGIN
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

-- Update the optimized dashboard statistics function to include all required metrics
CREATE OR REPLACE FUNCTION get_optimized_dashboard_stats(report_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  today_customers BIGINT,
  today_sales NUMERIC,
  today_visits BIGINT,
  active_tables BIGINT,
  today_reservations BIGINT,
  today_new_customers BIGINT,
  active_cast_count BIGINT,
  low_stock_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(DISTINCT v.customer_id) as customer_count,
      COALESCE(SUM(oi.total_price), 0) as total_sales,
      COUNT(DISTINCT v.id) as visit_count,
      COUNT(DISTINCT CASE WHEN DATE(c.created_at) = report_date THEN c.id END) as new_customers
    FROM visits v
    LEFT JOIN customers c ON v.customer_id = c.id
    LEFT JOIN order_items oi ON v.id = oi.visit_id
    WHERE DATE(v.check_in_at) = report_date
  ),
  reservations AS (
    SELECT COUNT(*) as reservation_count
    FROM reservations
    WHERE reservation_date = report_date
      AND status IN ('confirmed', 'pending')
  ),
  active_cast AS (
    SELECT COUNT(*) as cast_count
    FROM staffs
    WHERE is_active = true
      AND role = 'cast'
  ),
  low_stock AS (
    SELECT COUNT(*) as low_stock_items
    FROM products
    WHERE stock_quantity < low_stock_threshold
      AND stock_quantity >= 0
      AND is_active = true
  )
  SELECT 
    s.customer_count,
    s.total_sales,
    s.visit_count,
    (SELECT COUNT(*) FROM tables WHERE current_status != 'available')::BIGINT as active_tables,
    r.reservation_count,
    s.new_customers,
    ac.cast_count,
    ls.low_stock_items
  FROM stats s
  CROSS JOIN reservations r
  CROSS JOIN active_cast ac
  CROSS JOIN low_stock ls;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for the functions
COMMENT ON FUNCTION search_customers_optimized IS 'Optimized customer search using Trigram similarity for fast partial matching';
COMMENT ON FUNCTION search_staffs_optimized IS 'Optimized staff search using Trigram similarity for fast partial matching';
COMMENT ON FUNCTION get_optimized_dashboard_stats IS 'Optimized dashboard statistics calculation including all required metrics';

-- Analyze the tables to update statistics
ANALYZE;

-- =============================================================================
-- End of Migration
-- =============================================================================
