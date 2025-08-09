-- Add period overlap constraints to payroll tables
-- Prevents overlapping assignment periods and rule periods

-- Ensure btree_gist extension is enabled
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================
-- cast_payroll_assignments period constraints
-- ============================================

-- Add date range column for cast_payroll_assignments if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cast_payroll_assignments') THEN
        -- Add generated column for the active period range
        ALTER TABLE public.cast_payroll_assignments
          ADD COLUMN IF NOT EXISTS active_range daterange
          GENERATED ALWAYS AS (
            daterange(
              assigned_from, 
              COALESCE(assigned_until, 'infinity'::date), 
              '[]'
            )
          ) STORED;

        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_cast_payroll_assignments_active_range 
          ON public.cast_payroll_assignments USING gist (active_range);

        -- Add exclusion constraint to prevent overlapping assignments for the same cast
        ALTER TABLE public.cast_payroll_assignments
          DROP CONSTRAINT IF EXISTS no_overlapping_assignments;
        
        ALTER TABLE public.cast_payroll_assignments
          ADD CONSTRAINT no_overlapping_assignments
          EXCLUDE USING gist (
            cast_id WITH =, 
            active_range WITH &&
          );

        -- Add comment for documentation
        COMMENT ON CONSTRAINT no_overlapping_assignments ON public.cast_payroll_assignments 
          IS 'Prevents a cast member from having overlapping payroll assignment periods';
    END IF;
END $$;

-- ============================================
-- payroll_rules period constraints  
-- ============================================

-- Add date range column for payroll_rules if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_rules') THEN
        -- Add generated column for the effective period range
        ALTER TABLE public.payroll_rules
          ADD COLUMN IF NOT EXISTS effective_range daterange
          GENERATED ALWAYS AS (
            daterange(
              effective_from, 
              COALESCE(effective_until, 'infinity'::date), 
              '[]'
            )
          ) STORED;

        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_payroll_rules_effective_range 
          ON public.payroll_rules USING gist (effective_range);

        -- Add exclusion constraint to prevent overlapping rules with the same name
        ALTER TABLE public.payroll_rules
          DROP CONSTRAINT IF EXISTS no_overlapping_rules;
        
        ALTER TABLE public.payroll_rules
          ADD CONSTRAINT no_overlapping_rules
          EXCLUDE USING gist (
            rule_name WITH =, 
            effective_range WITH &&
          )
          WHERE (is_active = true);

        -- Add comment for documentation
        COMMENT ON CONSTRAINT no_overlapping_rules ON public.payroll_rules 
          IS 'Prevents overlapping active payroll rules with the same name';
    END IF;
END $$;