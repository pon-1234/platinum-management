-- Create missing RPC functions for billing calculations

-- Function: calculate_visit_totals
-- Purpose: Calculate subtotal and service charge for a visit based on order items
CREATE OR REPLACE FUNCTION calculate_visit_totals(visit_id_param uuid)
RETURNS TABLE(
    subtotal integer,
    "serviceCharge" integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(oi.total_price)::integer, 0) as subtotal,
        COALESCE(FLOOR(SUM(oi.total_price) * 0.1)::integer, 0) as "serviceCharge"
    FROM order_items oi
    WHERE oi.visit_id = visit_id_param;
END;
$$;

-- Function: calculate_nomination_fees
-- Purpose: Calculate total nomination fees for a visit
CREATE OR REPLACE FUNCTION calculate_nomination_fees(p_visit_id uuid)
RETURNS TABLE(
    total_nomination_fee integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(ce.fee_amount)::integer, 0) as total_nomination_fee
    FROM cast_engagements ce
    WHERE ce.visit_id = p_visit_id
    AND ce.is_active = true;
END;
$$;

-- Function: generate_daily_billing_report
-- Purpose: Generate daily sales report
CREATE OR REPLACE FUNCTION generate_daily_billing_report(report_date date)
RETURNS TABLE(
    total_visits bigint,
    total_sales numeric,
    cash_sales numeric,
    card_sales numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT v.id) as total_visits,
        COALESCE(SUM(v.total_amount), 0) as total_sales,
        COALESCE(SUM(CASE WHEN v.payment_method = 'cash' THEN v.total_amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN v.payment_method = 'card' THEN v.total_amount ELSE 0 END), 0) as card_sales
    FROM visits v
    WHERE DATE(v.check_in_at) = report_date
    AND v.status = 'completed';
END;
$$;

-- Function: get_top_products_with_details
-- Purpose: Get top selling products for a specific date
CREATE OR REPLACE FUNCTION get_top_products_with_details(report_date date, limit_count integer DEFAULT 5)
RETURNS TABLE(
    product_id uuid,
    product_name text,
    quantity_sold bigint,
    revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as product_id,
        p.name as product_name,
        SUM(oi.quantity)::bigint as quantity_sold,
        SUM(oi.total_price) as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN visits v ON oi.visit_id = v.id
    WHERE DATE(v.check_in_at) = report_date
    GROUP BY p.id, p.name
    ORDER BY revenue DESC
    LIMIT limit_count;
END;
$$;

-- Function: get_top_cast_performance
-- Purpose: Get top performing casts for a specific date
CREATE OR REPLACE FUNCTION get_top_cast_performance(report_date date, limit_count integer DEFAULT 5)
RETURNS TABLE(
    cast_id uuid,
    staff_name text,
    total_sales numeric,
    visits_attended bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as cast_id,
        s.full_name as staff_name,
        COALESCE(SUM(ce.fee_amount), 0) as total_sales,
        COUNT(DISTINCT ce.visit_id) as visits_attended
    FROM cast_engagements ce
    JOIN casts_profile c ON ce.cast_id = c.id
    JOIN staffs s ON c.staff_id = s.id
    JOIN visits v ON ce.visit_id = v.id
    WHERE DATE(v.check_in_at) = report_date
    AND ce.is_active = true
    GROUP BY c.id, s.full_name
    ORDER BY total_sales DESC
    LIMIT limit_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_visit_totals(uuid) TO anon;
GRANT EXECUTE ON FUNCTION calculate_visit_totals(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_visit_totals(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION calculate_nomination_fees(uuid) TO anon;
GRANT EXECUTE ON FUNCTION calculate_nomination_fees(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_nomination_fees(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION generate_daily_billing_report(date) TO anon;
GRANT EXECUTE ON FUNCTION generate_daily_billing_report(date) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_daily_billing_report(date) TO service_role;

GRANT EXECUTE ON FUNCTION get_top_products_with_details(date, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_top_products_with_details(date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_products_with_details(date, integer) TO service_role;

GRANT EXECUTE ON FUNCTION get_top_cast_performance(date, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_top_cast_performance(date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_cast_performance(date, integer) TO service_role;