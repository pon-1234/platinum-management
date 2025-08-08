-- Remove cast_id from order_items table as cast assignments are now managed through guest_cast_assignments
-- This migration is part of the multi-guest billing system implementation

-- 1. Drop the foreign key constraint if it exists
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_cast_id_fkey;

-- 2. Drop the cast_id column
ALTER TABLE order_items DROP COLUMN IF EXISTS cast_id;

-- 3. Create index for better query performance on guest orders
CREATE INDEX IF NOT EXISTS idx_order_items_created_at ON order_items(created_at DESC);

-- Note: Cast assignments are now managed through the guest_cast_assignments table
-- which provides a more flexible many-to-many relationship between guests and casts