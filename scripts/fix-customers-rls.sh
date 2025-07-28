#!/bin/bash

# Fix customers table RLS policies

cat > /tmp/fix_customers_rls.sql << 'EOF'
-- Check if customers table exists and has correct columns
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'customers'
) as customers_table_exists;

-- Check if is_deleted column exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT column_name 
                 FROM information_schema.columns 
                 WHERE table_name='customers' AND column_name='is_deleted') THEN
    ALTER TABLE customers ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Check current RLS policies on customers table
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
WHERE tablename = 'customers';

-- Enable RLS on customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON customers;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON customers;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON customers;

-- Create new RLS policies allowing anon to select
CREATE POLICY "Enable read access for all users" 
ON customers 
FOR SELECT 
USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Enable insert for authenticated users only" 
ON customers 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update
CREATE POLICY "Enable update for authenticated users only" 
ON customers 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete (soft delete)
CREATE POLICY "Enable delete for authenticated users only" 
ON customers 
FOR DELETE 
TO authenticated
USING (true);

-- Grant permissions
GRANT SELECT ON customers TO anon;
GRANT ALL ON customers TO authenticated;
GRANT ALL ON customers TO service_role;

-- Also fix reservations and visits tables while we're at it
-- Enable RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Enable read access for all users" ON reservations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON reservations;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON reservations;

DROP POLICY IF EXISTS "Enable read access for all users" ON visits;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON visits;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON visits;

-- Create policies for reservations
CREATE POLICY "Enable read access for all users" 
ON reservations 
FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for authenticated users only" 
ON reservations 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" 
ON reservations 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policies for visits
CREATE POLICY "Enable read access for all users" 
ON visits 
FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for authenticated users only" 
ON visits 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" 
ON visits 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON reservations TO anon;
GRANT ALL ON reservations TO authenticated;
GRANT ALL ON reservations TO service_role;

GRANT SELECT ON visits TO anon;
GRANT ALL ON visits TO authenticated;
GRANT ALL ON visits TO service_role;

-- Verify permissions
SELECT 
  'Permissions check' as info,
  has_table_privilege('anon', 'customers', 'SELECT') as anon_can_select_customers,
  has_table_privilege('anon', 'reservations', 'SELECT') as anon_can_select_reservations,
  has_table_privilege('anon', 'visits', 'SELECT') as anon_can_select_visits;

-- Count records
SELECT 
  'customers' as table_name,
  count(*) as total_count,
  count(*) FILTER (WHERE is_deleted = false) as active_count
FROM customers
UNION ALL
SELECT 
  'reservations' as table_name,
  count(*) as total_count,
  count(*) as active_count
FROM reservations
UNION ALL
SELECT 
  'visits' as table_name,
  count(*) as total_count,
  count(*) as active_count
FROM visits;
EOF

echo "Fixing customers table RLS policies..."
echo ""
echo "Please run these SQL commands in your Supabase SQL editor:"
echo "=================================================="
cat /tmp/fix_customers_rls.sql
echo "=================================================="

# Clean up
rm /tmp/fix_customers_rls.sql