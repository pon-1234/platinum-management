-- Allow updating visits.customer_id safely and adjust RLS if needed
-- Note: Adjust schema/constraints to fit your environment

-- Ensure policy exists to allow updates by authenticated users (tighten as needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'visits' AND policyname = 'update_customer_id_if_authenticated'
  ) THEN
    CREATE POLICY update_customer_id_if_authenticated ON public.visits
      FOR UPDATE USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- Optionally, you can refine USING/WITH CHECK clauses to your roles/ownership model.
