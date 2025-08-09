-- Add time-based exclusion constraint to cast_engagements table
-- This prevents overlapping engagement periods for the same cast member

-- Ensure btree_gist extension is enabled (should already be from 20250808_0001)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add generated column for the active time range
ALTER TABLE public.cast_engagements
  ADD COLUMN IF NOT EXISTS active_range tstzrange
  GENERATED ALWAYS AS (
    tstzrange(
      started_at, 
      COALESCE(ended_at, 'infinity'::timestamptz), 
      '[)'
    )
  ) STORED;

-- Create index for better performance on range queries
CREATE INDEX IF NOT EXISTS idx_cast_engagements_active_range 
  ON public.cast_engagements USING gist (active_range);

-- Add exclusion constraint to prevent overlapping engagements for the same cast
-- This ensures a cast member cannot be assigned to multiple visits simultaneously
ALTER TABLE public.cast_engagements
  ADD CONSTRAINT no_overlapping_engagements_per_cast
  EXCLUDE USING gist (
    cast_id WITH =, 
    active_range WITH &&
  );

-- Add comment for documentation
COMMENT ON CONSTRAINT no_overlapping_engagements_per_cast ON public.cast_engagements 
  IS 'Prevents a cast member from having overlapping engagement periods across different visits';