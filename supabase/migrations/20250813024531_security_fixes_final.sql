-- Set views to use invoker security if not already set
DO $$
BEGIN
  -- Only update if not already set to true
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
    AND c.relname = 'payroll_revenue_facts'
    AND c.reloptions::text LIKE '%security_invoker=true%'
  ) THEN
    ALTER VIEW public.payroll_revenue_facts SET (security_invoker = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
    AND c.relname = 'customer_analytics_metrics'
    AND c.reloptions::text LIKE '%security_invoker=true%'
  ) THEN
    ALTER VIEW public.customer_analytics_metrics SET (security_invoker = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
    AND c.relname = 'customer_segments'
    AND c.reloptions::text LIKE '%security_invoker=true%'
  ) THEN
    ALTER VIEW public.customer_segments SET (security_invoker = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
    AND c.relname = 'staff'
    AND c.reloptions::text LIKE '%security_invoker=true%'
  ) THEN
    ALTER VIEW public.staff SET (security_invoker = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
    AND c.relname = 'visit_cast_summary'
    AND c.reloptions::text LIKE '%security_invoker=true%'
  ) THEN
    ALTER VIEW public.visit_cast_summary SET (security_invoker = true);
  END IF;
END $$;

-- Enable RLS on customer_cohorts if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
    AND c.relname = 'customer_cohorts'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.customer_cohorts ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policy if not exists
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