-- This migration ensures all recent changes are synced
-- Most changes have already been applied directly

-- Verify RPC functions exist
DO $$
BEGIN
  -- Check and create get_top_cast_performance if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_top_cast_performance'
  ) THEN
    CREATE OR REPLACE FUNCTION get_top_cast_performance(report_date DATE, limit_count INTEGER)
    RETURNS TABLE(cast_id UUID, staff_name TEXT, total_sales NUMERIC) AS $func$
    BEGIN
      RETURN QUERY
      SELECT s.id AS cast_id, s.full_name AS staff_name, COALESCE(SUM(oi.total_price), 0)::NUMERIC AS total_sales
      FROM staffs s
      JOIN order_items oi ON oi.staff_id = s.id
      JOIN visits v ON oi.visit_id = v.id
      WHERE v.check_in_at::date = report_date AND v.status = 'completed'
      GROUP BY s.id, s.full_name
      ORDER BY total_sales DESC
      LIMIT limit_count;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;

  -- Check and create get_cast_performance if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_cast_performance'
  ) THEN
    CREATE OR REPLACE FUNCTION get_cast_performance(
      start_date DATE,
      end_date DATE
    )
    RETURNS TABLE(
      cast_id UUID,
      staff_name TEXT,
      total_sales NUMERIC,
      total_orders BIGINT
    ) AS $func$
    BEGIN
      RETURN QUERY
      SELECT
        s.id AS cast_id,
        s.full_name AS staff_name,
        COALESCE(SUM(oi.total_price), 0)::NUMERIC AS total_sales,
        COUNT(DISTINCT oi.visit_id)::BIGINT AS total_orders
      FROM staffs s
      LEFT JOIN order_items oi ON s.id = oi.staff_id
      LEFT JOIN visits v ON oi.visit_id = v.id
      WHERE s.role = 'cast'
        AND v.check_in_at::date BETWEEN start_date AND end_date
        AND v.status = 'completed'
      GROUP BY s.id, s.full_name
      ORDER BY total_sales DESC;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;

  -- Check and create get_weekly_schedule if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_weekly_schedule'
  ) THEN
    CREATE OR REPLACE FUNCTION get_weekly_schedule(week_start DATE)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
    BEGIN
      -- TODO: Implement actual weekly schedule logic
      RETURN jsonb_build_object(
        'weekStart', week_start,
        'dailySchedules', '[]'::jsonb
      );
    END;
    $func$;
  END IF;
END $$;

-- Ensure all views have security_invoker = true
DO $$
DECLARE
  view_name TEXT;
BEGIN
  FOR view_name IN 
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
    AND c.relkind = 'v'
    AND c.relname IN (
      'payroll_revenue_facts',
      'customer_analytics_metrics',
      'customer_segments',
      'staff',
      'visit_cast_summary'
    )
    AND (c.reloptions IS NULL OR NOT c.reloptions::text LIKE '%security_invoker=true%')
  LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', view_name);
  END LOOP;
END $$;

-- Ensure RLS is enabled on tables that need it
DO $$
BEGIN
  -- Enable RLS on customer_cohorts if not already enabled
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
    AND c.relname = 'customer_cohorts'
    AND c.relrowsecurity = false
  ) THEN
    ALTER TABLE public.customer_cohorts ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Ensure required policies exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'customer_cohorts'
    AND policyname = 'Allow read to staff on customer_cohorts'
  ) THEN
    CREATE POLICY "Allow read to staff on customer_cohorts"
    ON public.customer_cohorts
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.staffs s
        WHERE s.user_id = auth.uid()
      )
    );
  END IF;
END $$;