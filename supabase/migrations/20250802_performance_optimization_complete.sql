-- Performance Optimization Complete Migration
-- This migration consolidates all performance optimizations including RPC functions and indexes

-- =====================================================
-- SECTION 1: RPC FUNCTIONS FOR ELIMINATING INEFFICIENT PROCESSING
-- =====================================================

-- Function to get available staff for cast assignment (not already cast and not admin)
CREATE OR REPLACE FUNCTION get_available_staff_for_cast()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  role TEXT,
  is_active BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to get bottle keep statistics
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
SECURITY DEFINER
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
          WHEN bk.status = 'active' THEN bk.remaining_amount * p.price
          ELSE 0
        END
      ), 0
    ) AS total_value
  FROM bottle_keeps bk
  LEFT JOIN products p ON bk.product_id = p.id;
END;
$$;

-- Function to get QR code statistics
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
SECURITY DEFINER
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
      COUNT(*) FILTER (WHERE created_at >= today_start AND created_at < today_end)::BIGINT AS today_scans
    FROM qr_attendance_logs
  ),
  active_codes AS (
    SELECT COUNT(*)::BIGINT AS active_qr_codes
    FROM qr_codes
    WHERE is_active = true AND expires_at > NOW()
  ),
  unique_today AS (
    SELECT COUNT(DISTINCT staff_id)::BIGINT AS unique_users_today
    FROM qr_attendance_logs
    WHERE created_at >= today_start AND created_at < today_end
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

-- Function to get weekly schedule (placeholder for now)
CREATE OR REPLACE FUNCTION get_weekly_schedule(week_start DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- TODO: Implement actual weekly schedule logic
  RETURN jsonb_build_object(
    'weekStart', week_start,
    'dailySchedules', '[]'::jsonb
  );
END;
$$;

-- Grant execute permissions for RPC functions
GRANT EXECUTE ON FUNCTION get_available_staff_for_cast() TO authenticated;
GRANT EXECUTE ON FUNCTION get_bottle_keep_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_qr_code_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_schedule(DATE) TO authenticated;

-- Add comments for RPC functions documentation
COMMENT ON FUNCTION get_available_staff_for_cast() IS 'Returns all active staff members who are not admins and not already registered as casts';
COMMENT ON FUNCTION get_bottle_keep_stats() IS 'Returns comprehensive bottle keep statistics including counts by status and total value';
COMMENT ON FUNCTION get_qr_code_stats() IS 'Returns comprehensive QR code usage statistics';
COMMENT ON FUNCTION get_weekly_schedule(DATE) IS 'Returns weekly schedule data for the given week start date';

-- =====================================================
-- SECTION 2: PERFORMANCE INDEXES
-- =====================================================

-- Attendance Records indexes
CREATE INDEX IF NOT EXISTS idx_attendance_records_staff_date 
ON attendance_records(staff_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_records_date 
ON attendance_records(date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_records_needs_correction 
ON attendance_records(needs_correction) 
WHERE needs_correction = true;

-- Shift Requests indexes
CREATE INDEX IF NOT EXISTS idx_shift_requests_status 
ON shift_requests(status);

CREATE INDEX IF NOT EXISTS idx_shift_requests_staff_status 
ON shift_requests(staff_id, status);

CREATE INDEX IF NOT EXISTS idx_shift_requests_date 
ON shift_requests(request_date DESC);

-- Bottle Keeps indexes
CREATE INDEX IF NOT EXISTS idx_bottle_keeps_status 
ON bottle_keeps(status);

CREATE INDEX IF NOT EXISTS idx_bottle_keeps_customer_status 
ON bottle_keeps(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_bottle_keeps_expiry 
ON bottle_keeps(expiry_date) 
WHERE status = 'active';

-- QR Code related indexes
CREATE INDEX IF NOT EXISTS idx_qr_attendance_logs_created 
ON qr_attendance_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qr_attendance_logs_staff_date 
ON qr_attendance_logs(staff_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qr_codes_active 
ON qr_codes(is_active, expires_at) 
WHERE is_active = true;

-- Tables indexes for real-time updates
CREATE INDEX IF NOT EXISTS idx_tables_location_status 
ON tables(location, status);

CREATE INDEX IF NOT EXISTS idx_tables_active 
ON tables(is_active) 
WHERE is_active = true;

-- Visits indexes
CREATE INDEX IF NOT EXISTS idx_visits_customer 
ON visits(customer_id);

CREATE INDEX IF NOT EXISTS idx_visits_table 
ON visits(table_id);

CREATE INDEX IF NOT EXISTS idx_visits_check_in 
ON visits(check_in_at DESC);

CREATE INDEX IF NOT EXISTS idx_visits_status 
ON visits(status);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_category 
ON products(category);

CREATE INDEX IF NOT EXISTS idx_products_active 
ON products(is_active) 
WHERE is_active = true;

-- Inventory movements indexes
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product 
ON inventory_movements(product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_created 
ON inventory_movements(created_at DESC);

-- Casts profile indexes
CREATE INDEX IF NOT EXISTS idx_casts_profile_staff 
ON casts_profile(staff_id);

-- Comments for index documentation
COMMENT ON INDEX idx_attendance_records_staff_date IS 'Optimizes queries for staff attendance history';
COMMENT ON INDEX idx_attendance_records_date IS 'Optimizes queries for daily attendance reports';
COMMENT ON INDEX idx_attendance_records_needs_correction IS 'Optimizes queries for correction requests';
COMMENT ON INDEX idx_shift_requests_status IS 'Optimizes queries for pending shift requests';
COMMENT ON INDEX idx_bottle_keeps_status IS 'Optimizes bottle keep statistics queries';
COMMENT ON INDEX idx_bottle_keeps_expiry IS 'Optimizes queries for expiring bottles';
COMMENT ON INDEX idx_qr_attendance_logs_created IS 'Optimizes QR code statistics queries';
COMMENT ON INDEX idx_tables_active IS 'Optimizes real-time table status queries';

-- =====================================================
-- SECTION 3: UPDATE STATISTICS
-- =====================================================

-- Analyze tables to update statistics after creating indexes
ANALYZE attendance_records;
ANALYZE shift_requests;
ANALYZE bottle_keeps;
ANALYZE qr_attendance_logs;
ANALYZE qr_codes;
ANALYZE tables;
ANALYZE visits;
ANALYZE products;
ANALYZE inventory_movements;
ANALYZE casts_profile;