#!/bin/bash

# Load production environment variables
source .env.production

# Fix daily_closings RLS policies
cat > /tmp/fix_daily_closings_rls.sql << 'EOF'
-- Check current RLS policies
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
WHERE tablename = 'daily_closings';

-- Drop existing policies if any
DROP POLICY IF EXISTS "daily_closings_select_policy" ON daily_closings;
DROP POLICY IF EXISTS "daily_closings_insert_policy" ON daily_closings;
DROP POLICY IF EXISTS "daily_closings_update_policy" ON daily_closings;

-- Create new RLS policies with proper permissions
-- Allow all authenticated users and anon to select
CREATE POLICY "Enable read access for all users" 
ON daily_closings 
FOR SELECT 
USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Enable insert for authenticated users only" 
ON daily_closings 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update
CREATE POLICY "Enable update for authenticated users only" 
ON daily_closings 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure anon role has select permission
GRANT SELECT ON daily_closings TO anon;

-- Test the permissions
SELECT has_table_privilege('anon', 'daily_closings', 'SELECT') as anon_can_select;
SELECT has_table_privilege('authenticated', 'daily_closings', 'SELECT') as auth_can_select;
SELECT has_table_privilege('authenticated', 'daily_closings', 'INSERT') as auth_can_insert;
EOF

echo "Fixing daily_closings RLS policies..."

# Apply the fixes
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DATABASE -f /tmp/fix_daily_closings_rls.sql

# Clean up
rm /tmp/fix_daily_closings_rls.sql

echo "RLS policies fixed!"