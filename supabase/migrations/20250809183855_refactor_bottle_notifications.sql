-- Refactor bottle_keep_notifications to eliminate polymorphic references
-- This improves data integrity and query performance

-- First, backup existing data if needed
CREATE TEMP TABLE bottle_notifications_backup AS 
SELECT * FROM public.bottle_keep_notifications;

-- Add new columns for explicit customer and staff references
ALTER TABLE public.bottle_keep_notifications 
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staffs(id) ON DELETE CASCADE;

-- Migrate existing data from polymorphic references
UPDATE public.bottle_keep_notifications
SET 
  customer_id = CASE 
    WHEN recipient_type = 'customer' THEN recipient_id::UUID
    ELSE NULL
  END,
  staff_id = CASE
    WHEN recipient_type = 'staff' THEN recipient_id::UUID  
    ELSE NULL
  END
WHERE recipient_type IS NOT NULL AND recipient_id IS NOT NULL;

-- Drop the old polymorphic columns
ALTER TABLE public.bottle_keep_notifications 
  DROP COLUMN IF EXISTS recipient_type,
  DROP COLUMN IF EXISTS recipient_id;

-- Add constraint to ensure exactly one recipient is specified
ALTER TABLE public.bottle_keep_notifications 
  DROP CONSTRAINT IF EXISTS one_recipient_only;

ALTER TABLE public.bottle_keep_notifications 
  ADD CONSTRAINT one_recipient_only
  CHECK (
    (customer_id IS NOT NULL AND staff_id IS NULL) OR 
    (customer_id IS NULL AND staff_id IS NOT NULL)
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bottle_notifications_customer 
  ON public.bottle_keep_notifications(customer_id) 
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bottle_notifications_staff 
  ON public.bottle_keep_notifications(staff_id) 
  WHERE staff_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE public.bottle_keep_notifications IS 
'Notification records for bottle keep expiration alerts. Uses explicit foreign keys instead of polymorphic references for better data integrity.';