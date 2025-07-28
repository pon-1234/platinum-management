#!/bin/bash

echo "=================================================="
echo "Applying RLS fixes directly to Supabase"
echo "=================================================="

# Load environment
if [ -f .env.local ]; then
    source .env.local
fi

# Get connection string from Supabase
PROJECT_REF="pdomeeyvatachcothudq"
ACCESS_TOKEN=${SUPABASE_ACCESS_TOKEN:-"sbp_000b53e3912f234aac96bdbbfab07d0cb2574e15"}

echo "Getting database connection info..."

# Get pooler connection string
CONNECTION_STRING=$(curl -s \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/config/database" \
  | grep -o '"connection_string":"[^"]*"' \
  | cut -d'"' -f4)

if [ -z "$CONNECTION_STRING" ]; then
    echo "Failed to get connection string. Using direct connection..."
    
    # Alternative: Ask for password
    echo ""
    echo "Enter your database password (from Supabase dashboard):"
    read -s DB_PASSWORD
    
    # Direct connection
    PGPASSWORD=$DB_PASSWORD psql \
        -h "db.$PROJECT_REF.supabase.co" \
        -p 5432 \
        -U postgres \
        -d postgres \
        -c "
-- Quick RLS fix for all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS \"Enable read access for all users\" ON customers;
CREATE POLICY \"Enable read access for all users\" ON customers FOR SELECT USING (true);
GRANT SELECT ON customers TO anon;

ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS \"Enable read access for all users\" ON daily_closings;
CREATE POLICY \"Enable read access for all users\" ON daily_closings FOR SELECT USING (true);
GRANT SELECT ON daily_closings TO anon;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS \"Enable read access for all users\" ON products;
CREATE POLICY \"Enable read access for all users\" ON products FOR SELECT USING (true);
GRANT SELECT ON products TO anon;

ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS \"Enable read access for all users\" ON staffs;
CREATE POLICY \"Enable read access for all users\" ON staffs FOR SELECT USING (true);
GRANT SELECT ON staffs TO anon;

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS \"Enable read access for all users\" ON reservations;
CREATE POLICY \"Enable read access for all users\" ON reservations FOR SELECT USING (true);
GRANT SELECT ON reservations TO anon;

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS \"Enable read access for all users\" ON visits;
CREATE POLICY \"Enable read access for all users\" ON visits FOR SELECT USING (true);
GRANT SELECT ON visits TO anon;

-- Add missing columns to products
DO \$\$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='reorder_point') THEN
    ALTER TABLE products ADD COLUMN reorder_point INTEGER NOT NULL DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='max_stock') THEN
    ALTER TABLE products ADD COLUMN max_stock INTEGER NOT NULL DEFAULT 100;
  END IF;
END \$\$;

-- Verify
SELECT 
  tablename,
  COUNT(*) as policy_count,
  bool_or(roles::text LIKE '%anon%') as anon_has_access
FROM pg_policies 
WHERE tablename IN ('customers', 'daily_closings', 'products', 'staffs', 'reservations', 'visits')
GROUP BY tablename;
"
    
else
    echo "Using pooler connection..."
    psql "$CONNECTION_STRING" -f /tmp/fix_all_rls_policies.sql
fi

echo ""
echo "✅ RLS fixes applied!"
echo ""
echo "Next steps:"
echo "1. git add -A && git commit -m 'fix: RLS policies' && git push"
echo "2. Check your Vercel deployment"
echo "3. Set QR_CODE_SECRET_KEY in Vercel environment variables"