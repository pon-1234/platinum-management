-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_optimized_dashboard_stats(DATE);

-- Create the optimized dashboard statistics function to include missing statistics
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
      COUNT(DISTINCT c.id) as customer_count,
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

-- Update the comment
COMMENT ON FUNCTION get_optimized_dashboard_stats IS 'Optimized dashboard statistics calculation including all required metrics';