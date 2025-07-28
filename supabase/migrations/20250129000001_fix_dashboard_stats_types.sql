-- Fix get_dashboard_stats function type mismatches
-- This migration updates the function to ensure all return values are NUMERIC type

-- Drop existing function
DROP FUNCTION IF EXISTS get_dashboard_stats(DATE) CASCADE;

-- Recreate with proper type casting
CREATE OR REPLACE FUNCTION get_dashboard_stats(report_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  today_sales NUMERIC,
  today_visits NUMERIC,
  today_customers NUMERIC,
  today_new_customers NUMERIC,
  active_cast_count NUMERIC,
  active_table_count NUMERIC,
  low_stock_count NUMERIC,
  pending_reservations NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- 本日の売上（NUMERIC型にキャスト）
    COALESCE((SELECT SUM(oi.total_price)::NUMERIC
     FROM order_items oi
     JOIN visits v ON oi.visit_id = v.id
     WHERE v.check_in_at::date = report_date
       AND v.status = 'completed'), 0)::NUMERIC AS today_sales,
    
    -- 本日の来店数（NUMERIC型にキャスト）
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM visits
     WHERE check_in_at::date = report_date
       AND status = 'completed'), 0)::NUMERIC AS today_visits,
    
    -- 本日の顧客数（重複なし、NUMERIC型にキャスト）
    COALESCE((SELECT COUNT(DISTINCT customer_id)::NUMERIC
     FROM visits
     WHERE check_in_at::date = report_date), 0)::NUMERIC AS today_customers,
    
    -- 本日の新規顧客数（NUMERIC型にキャスト）
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM customers
     WHERE created_at::date = report_date
       AND is_deleted = false), 0)::NUMERIC AS today_new_customers,
    
    -- アクティブなキャスト数（NUMERIC型にキャスト）
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM casts_profile cp
     JOIN staffs s ON cp.staff_id = s.id
     WHERE cp.is_active = true
       AND s.is_active = true), 0)::NUMERIC AS active_cast_count,
    
    -- 利用可能なテーブル数（NUMERIC型にキャスト）
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM tables
     WHERE is_available = true), 0)::NUMERIC AS active_table_count,
    
    -- 在庫不足商品数（NUMERIC型にキャスト）
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM products
     WHERE is_active = true
       AND stock_quantity <= low_stock_threshold), 0)::NUMERIC AS low_stock_count,
    
    -- 本日の保留中予約数（NUMERIC型にキャスト）
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM reservations
     WHERE reservation_date = report_date
       AND status = 'pending'), 0)::NUMERIC AS pending_reservations;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_dashboard_stats(DATE) TO anon, authenticated;