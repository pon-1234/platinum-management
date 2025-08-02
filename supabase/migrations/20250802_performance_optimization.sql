-- Performance optimization migration
-- This migration creates optimized RPC functions to eliminate inefficient fallback processing

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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_available_staff_for_cast() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_available_staff_for_cast() IS 'Returns all active staff members who are not admins and not already registered as casts';

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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_bottle_keep_stats() TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_bottle_keep_stats() IS 'Returns comprehensive bottle keep statistics including counts by status and total value';

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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_qr_code_stats() TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_qr_code_stats() IS 'Returns comprehensive QR code usage statistics';

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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_weekly_schedule(DATE) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_weekly_schedule(DATE) IS 'Returns weekly schedule data for the given week start date';