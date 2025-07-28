#!/bin/bash

# Load production environment variables
source .env.production

# Create RPC functions SQL
cat > /tmp/create_rpc_functions.sql << 'EOF'
-- Create RPC functions for reporting module

-- 1. Monthly Sales Report Function
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
  end_date := start_date + INTERVAL '1 month' - INTERVAL '1 day';
  
  -- Build the report
  WITH daily_sales AS (
    SELECT 
      DATE(v.check_in_at) as sale_date,
      COUNT(DISTINCT v.id) as visit_count,
      COALESCE(SUM(bi.amount), 0) as daily_revenue
    FROM visits v
    LEFT JOIN billing_items bi ON bi.visit_id = v.id
    WHERE v.check_in_at >= start_date 
      AND v.check_in_at < end_date + INTERVAL '1 day'
      AND v.status = 'completed'
    GROUP BY DATE(v.check_in_at)
  ),
  monthly_totals AS (
    SELECT 
      COUNT(DISTINCT v.id) as total_visits,
      COALESCE(SUM(bi.amount), 0) as total_revenue
    FROM visits v
    LEFT JOIN billing_items bi ON bi.visit_id = v.id
    WHERE v.check_in_at >= start_date 
      AND v.check_in_at < end_date + INTERVAL '1 day'
      AND v.status = 'completed'
  ),
  payment_breakdown AS (
    SELECT 
      b.payment_method,
      COALESCE(SUM(b.amount), 0) as method_total
    FROM bills b
    JOIN visits v ON v.id = b.visit_id
    WHERE v.check_in_at >= start_date 
      AND v.check_in_at < end_date + INTERVAL '1 day'
      AND b.status = 'paid'
    GROUP BY b.payment_method
  ),
  top_products AS (
    SELECT 
      bi.item_name,
      COUNT(*) as order_count,
      SUM(bi.amount) as product_revenue
    FROM billing_items bi
    JOIN visits v ON v.id = bi.visit_id
    WHERE v.check_in_at >= start_date 
      AND v.check_in_at < end_date + INTERVAL '1 day'
      AND v.status = 'completed'
    GROUP BY bi.item_name
    ORDER BY product_revenue DESC
    LIMIT 10
  )
  SELECT json_build_object(
    'year', report_year,
    'month', report_month,
    'totalRevenue', (SELECT total_revenue FROM monthly_totals),
    'totalVisits', (SELECT total_visits FROM monthly_totals),
    'averageRevenuePerVisit', 
      CASE 
        WHEN (SELECT total_visits FROM monthly_totals) > 0 
        THEN (SELECT total_revenue FROM monthly_totals) / (SELECT total_visits FROM monthly_totals)
        ELSE 0
      END,
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
          'name', item_name,
          'orderCount', order_count,
          'revenue', product_revenue
        )
      ) FROM top_products), '[]'::json
    ),
    'paymentMethodBreakdown', json_build_object(
      'cash', COALESCE((SELECT method_total FROM payment_breakdown WHERE payment_method = 'cash'), 0),
      'card', COALESCE((SELECT method_total FROM payment_breakdown WHERE payment_method = 'card'), 0),
      'other', COALESCE((SELECT method_total FROM payment_breakdown WHERE payment_method NOT IN ('cash', 'card')), 0)
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 2. Cast Performance Report Function
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
      COALESCE(SUM(bi.amount), 0) as total_sales,
      COUNT(DISTINCT DATE(v.check_in_at)) as working_days
    FROM staffs s
    LEFT JOIN visit_cast_assignments vca ON vca.cast_id = s.id
    LEFT JOIN visits v ON v.id = vca.visit_id
    LEFT JOIN billing_items bi ON bi.visit_id = v.id
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

-- 3. Daily Revenue Report Function
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
      COALESCE(SUM(bi.amount), 0) as hourly_revenue
    FROM visits v
    LEFT JOIN billing_items bi ON bi.visit_id = v.id
    WHERE DATE(v.check_in_at) = report_date
      AND v.status = 'completed'
    GROUP BY EXTRACT(HOUR FROM v.check_in_at)
  ),
  daily_totals AS (
    SELECT 
      COUNT(DISTINCT v.id) as total_visits,
      COALESCE(SUM(bi.amount), 0) as total_revenue
    FROM visits v
    LEFT JOIN billing_items bi ON bi.visit_id = v.id
    WHERE DATE(v.check_in_at) = report_date
      AND v.status = 'completed'
  ),
  payment_methods AS (
    SELECT 
      b.payment_method,
      COALESCE(SUM(b.amount), 0) as method_total
    FROM bills b
    JOIN visits v ON v.id = b.visit_id
    WHERE DATE(v.check_in_at) = report_date
      AND b.status = 'paid'
    GROUP BY b.payment_method
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
      'cash', COALESCE((SELECT method_total FROM payment_methods WHERE payment_method = 'cash'), 0),
      'card', COALESCE((SELECT method_total FROM payment_methods WHERE payment_method = 'card'), 0),
      'other', COALESCE((SELECT SUM(method_total) FROM payment_methods WHERE payment_method NOT IN ('cash', 'card')), 0)
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_monthly_sales(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cast_performance(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_revenue(DATE) TO authenticated;
EOF

echo "Creating RPC functions in production..."

# Apply the functions
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DATABASE -f /tmp/create_rpc_functions.sql

# Clean up
rm /tmp/create_rpc_functions.sql

echo "RPC functions created successfully!"