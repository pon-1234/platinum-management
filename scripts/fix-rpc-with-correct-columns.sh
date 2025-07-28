#!/bin/bash

# Load production environment variables
source .env.production

# Fix RPC functions with correct column names
cat > /tmp/fix_rpc_columns.sql << 'EOF'
-- Drop and recreate get_monthly_sales function with correct column names
DROP FUNCTION IF EXISTS get_monthly_sales(INT, INT);

CREATE OR REPLACE FUNCTION get_monthly_sales(
  report_year INT,
  report_month INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date DATE;
  end_date DATE;
  result JSON;
BEGIN
  -- Calculate date range
  start_date := DATE(report_year || '-' || LPAD(report_month::TEXT, 2, '0') || '-01');
  end_date := (start_date + INTERVAL '1 month')::DATE - 1;
  
  -- Build the report with correct column names
  WITH daily_sales AS (
    SELECT 
      DATE(v.check_in_at) as sale_date,
      COUNT(DISTINCT v.id) as visit_count,
      COALESCE(SUM(oi.total_price), 0) as daily_revenue
    FROM visits v
    LEFT JOIN order_items oi ON oi.visit_id = v.id
    WHERE v.check_in_at >= start_date 
      AND v.check_in_at < end_date + INTERVAL '1 day'
      AND v.status = 'completed'
    GROUP BY DATE(v.check_in_at)
  ),
  monthly_totals AS (
    SELECT 
      COUNT(DISTINCT v.id) as total_visits,
      COALESCE(SUM(oi.total_price), 0) as total_revenue,
      COUNT(DISTINCT DATE(v.check_in_at)) as total_days
    FROM visits v
    LEFT JOIN order_items oi ON oi.visit_id = v.id
    WHERE v.check_in_at >= start_date 
      AND v.check_in_at < end_date + INTERVAL '1 day'
      AND v.status = 'completed'
  ),
  best_worst_days AS (
    SELECT 
      MAX(daily_revenue) as max_revenue,
      MIN(daily_revenue) as min_revenue
    FROM daily_sales
  ),
  best_day_info AS (
    SELECT sale_date, daily_revenue
    FROM daily_sales
    WHERE daily_revenue = (SELECT max_revenue FROM best_worst_days)
    LIMIT 1
  ),
  worst_day_info AS (
    SELECT sale_date, daily_revenue
    FROM daily_sales
    WHERE daily_revenue = (SELECT min_revenue FROM best_worst_days)
    LIMIT 1
  ),
  product_breakdown AS (
    SELECT 
      p.id as product_id,
      p.name as product_name,
      SUM(oi.quantity) as total_quantity,
      COALESCE(SUM(oi.total_price), 0) as total_revenue
    FROM order_items oi
    JOIN visits v ON v.id = oi.visit_id
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE v.check_in_at >= start_date 
      AND v.check_in_at < end_date + INTERVAL '1 day'
      AND v.status = 'completed'
    GROUP BY p.id, p.name
    ORDER BY total_revenue DESC
  ),
  cast_breakdown AS (
    SELECT 
      s.id as cast_id,
      s.full_name as cast_name,
      COALESCE(SUM(oi.total_price), 0) as total_sales,
      COUNT(DISTINCT DATE(v.check_in_at)) * 8 as total_hours
    FROM staffs s
    LEFT JOIN visit_cast_assignments vca ON vca.cast_id = s.id
    LEFT JOIN visits v ON v.id = vca.visit_id
    LEFT JOIN order_items oi ON oi.visit_id = v.id
    WHERE s.role = 'cast' 
      AND v.check_in_at >= start_date
      AND v.check_in_at < end_date + INTERVAL '1 day'
      AND v.status = 'completed'
    GROUP BY s.id, s.full_name
    ORDER BY total_sales DESC
  )
  SELECT json_build_object(
    'year', report_year,
    'month', report_month::TEXT,
    'totalSales', COALESCE((SELECT total_revenue FROM monthly_totals), 0),
    'totalRevenue', COALESCE((SELECT total_revenue FROM monthly_totals), 0),
    'totalVisits', COALESCE((SELECT total_visits FROM monthly_totals), 0),
    'totalDays', COALESCE((SELECT total_days FROM monthly_totals), 0),
    'averageDailySales', 
      CASE 
        WHEN (SELECT total_days FROM monthly_totals) > 0 
        THEN (SELECT total_revenue FROM monthly_totals) / (SELECT total_days FROM monthly_totals)
        ELSE 0
      END,
    'averageRevenuePerVisit', 
      CASE 
        WHEN (SELECT total_visits FROM monthly_totals) > 0 
        THEN (SELECT total_revenue FROM monthly_totals) / (SELECT total_visits FROM monthly_totals)
        ELSE 0
      END,
    'bestDay', COALESCE(
      (SELECT json_build_object(
        'date', sale_date::TEXT,
        'sales', daily_revenue
      ) FROM best_day_info),
      json_build_object('date', start_date::TEXT, 'sales', 0)
    ),
    'worstDay', COALESCE(
      (SELECT json_build_object(
        'date', sale_date::TEXT,
        'sales', daily_revenue
      ) FROM worst_day_info),
      json_build_object('date', start_date::TEXT, 'sales', 0)
    ),
    'dailyBreakdown', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'date', sale_date,
          'revenue', daily_revenue,
          'visits', visit_count
        ) ORDER BY sale_date
      ) FROM daily_sales), '[]'::json
    ),
    'topProducts', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'name', product_name,
          'orderCount', total_quantity,
          'revenue', total_revenue
        )
      ) FROM (SELECT * FROM product_breakdown LIMIT 10) t), '[]'::json
    ),
    'productBreakdown', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'productId', COALESCE(product_id::TEXT, '0'),
          'productName', COALESCE(product_name, 'Unknown'),
          'totalQuantity', total_quantity,
          'totalRevenue', total_revenue
        )
      ) FROM product_breakdown), '[]'::json
    ),
    'castBreakdown', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'castId', cast_id::TEXT,
          'castName', cast_name,
          'totalSales', total_sales,
          'totalHours', total_hours
        )
      ) FROM cast_breakdown), '[]'::json
    ),
    'paymentMethodBreakdown', json_build_object(
      'cash', 0,
      'card', 0,
      'other', 0
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Fix get_cast_performance function
DROP FUNCTION IF EXISTS get_cast_performance(DATE, DATE);

CREATE OR REPLACE FUNCTION get_cast_performance(
  start_date DATE,
  end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  WITH cast_performance AS (
    SELECT 
      s.id as cast_id,
      s.full_name as cast_name,
      COUNT(DISTINCT vca.visit_id) as total_orders,
      COALESCE(SUM(oi.total_price), 0) as total_sales,
      COUNT(DISTINCT DATE(v.check_in_at)) as working_days
    FROM staffs s
    LEFT JOIN visit_cast_assignments vca ON vca.cast_id = s.id
    LEFT JOIN visits v ON v.id = vca.visit_id
    LEFT JOIN order_items oi ON oi.visit_id = v.id
    WHERE s.role = 'cast' 
      AND s.is_active = true
      AND v.check_in_at >= start_date
      AND v.check_in_at < end_date + INTERVAL '1 day'
      AND v.status = 'completed'
    GROUP BY s.id, s.full_name
  )
  SELECT json_agg(
    json_build_object(
      'castId', cast_id,
      'castName', cast_name,
      'totalSales', total_sales,
      'totalOrders', total_orders,
      'averageOrderValue', 
        CASE 
          WHEN total_orders > 0 THEN total_sales / total_orders
          ELSE 0
        END,
      'workingDays', working_days,
      'rating', 4.5
    )
  ) INTO result
  FROM cast_performance;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Fix get_daily_revenue function
DROP FUNCTION IF EXISTS get_daily_revenue(DATE);

CREATE OR REPLACE FUNCTION get_daily_revenue(
  report_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  WITH hourly_breakdown AS (
    SELECT 
      EXTRACT(HOUR FROM v.check_in_at) as hour,
      COUNT(DISTINCT v.id) as visit_count,
      COALESCE(SUM(oi.total_price), 0) as hourly_revenue
    FROM visits v
    LEFT JOIN order_items oi ON oi.visit_id = v.id
    WHERE DATE(v.check_in_at) = report_date
      AND v.status = 'completed'
    GROUP BY EXTRACT(HOUR FROM v.check_in_at)
  ),
  daily_totals AS (
    SELECT 
      COUNT(DISTINCT v.id) as total_visits,
      COALESCE(SUM(oi.total_price), 0) as total_revenue
    FROM visits v
    LEFT JOIN order_items oi ON oi.visit_id = v.id
    WHERE DATE(v.check_in_at) = report_date
      AND v.status = 'completed'
  )
  SELECT json_build_object(
    'date', report_date,
    'totalRevenue', (SELECT total_revenue FROM daily_totals),
    'totalVisits', (SELECT total_visits FROM daily_totals),
    'averageRevenuePerVisit', 
      CASE 
        WHEN (SELECT total_visits FROM daily_totals) > 0 
        THEN (SELECT total_revenue FROM daily_totals) / (SELECT total_visits FROM daily_totals)
        ELSE 0
      END,
    'hourlyBreakdown', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'hour', hour,
          'revenue', hourly_revenue,
          'visits', visit_count
        ) ORDER BY hour
      ) FROM hourly_breakdown), '[]'::json
    ),
    'paymentMethods', json_build_object(
      'cash', 0,
      'card', 0,
      'other', 0
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_monthly_sales(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cast_performance(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_revenue(DATE) TO authenticated;
EOF

echo "Fixing RPC functions with correct column names..."

# Apply the fixes
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DATABASE -f /tmp/fix_rpc_columns.sql

# Clean up
rm /tmp/fix_rpc_columns.sql

echo "RPC functions fixed!"