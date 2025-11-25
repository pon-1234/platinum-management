-- Add created_by and updated_by columns to products for audit trail
-- Safe to run multiple times due to IF NOT EXISTS
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staffs(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staffs(id);

-- Optional: backfill with NULLs is implicit; no data migration needed

-- Note: RLS policies already exist for products (read for authenticated,
-- write for admin/manager via is_admin_or_manager()). No policy change needed.
