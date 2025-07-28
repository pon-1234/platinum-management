#!/bin/bash

# Fix products table RLS policies for anon role access

cat > /tmp/fix_products_rls.sql << 'EOF'
-- Check if products table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'products'
) as products_table_exists;

-- Check current RLS policies on products table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'products';

-- Drop existing policies if any
DROP POLICY IF EXISTS "products_select_policy" ON products;
DROP POLICY IF EXISTS "products_insert_policy" ON products;
DROP POLICY IF EXISTS "products_update_policy" ON products;
DROP POLICY IF EXISTS "products_delete_policy" ON products;

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies allowing anon to select
CREATE POLICY "Enable read access for all users" 
ON products 
FOR SELECT 
USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Enable insert for authenticated users only" 
ON products 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update
CREATE POLICY "Enable update for authenticated users only" 
ON products 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete (soft delete)
CREATE POLICY "Enable delete for authenticated users only" 
ON products 
FOR DELETE 
TO authenticated
USING (true);

-- Grant permissions
GRANT SELECT ON products TO anon;
GRANT ALL ON products TO authenticated;
GRANT ALL ON products TO service_role;

-- Check permissions for anon role
SELECT has_table_privilege('anon', 'products', 'SELECT') as anon_can_select_products;

-- Check inventory_movements table
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'inventory_movements'
) as inventory_movements_exists;

-- Fix inventory_movements RLS if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_movements') THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY';
    
    -- Drop old policies
    EXECUTE 'DROP POLICY IF EXISTS "inventory_movements_select_policy" ON inventory_movements';
    EXECUTE 'DROP POLICY IF EXISTS "inventory_movements_insert_policy" ON inventory_movements';
    
    -- Create new policies
    EXECUTE 'CREATE POLICY "Enable read access for all users" ON inventory_movements FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Enable insert for authenticated users only" ON inventory_movements FOR INSERT TO authenticated WITH CHECK (true)';
    
    -- Grant permissions
    EXECUTE 'GRANT SELECT ON inventory_movements TO anon';
    EXECUTE 'GRANT ALL ON inventory_movements TO authenticated';
    EXECUTE 'GRANT ALL ON inventory_movements TO service_role';
  END IF;
END $$;

-- Test: Count products
SELECT count(*) as total_products FROM products;
EOF

echo "Fixing products RLS policies..."

# Apply the fixes to local Supabase
supabase db reset
supabase db push

echo "RLS policies fixed locally! Please apply these changes to production database."
echo ""
echo "To apply to production, run these SQL commands in your Supabase SQL editor:"
cat /tmp/fix_products_rls.sql

# Clean up
rm /tmp/fix_products_rls.sql