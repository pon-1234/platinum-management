#!/bin/bash

echo "=================================================="
echo "Applying RLS fixes via Supabase Management API"
echo "=================================================="

# Get project URL from environment
if [ -f .env.local ]; then
    source .env.local
fi

SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ACCESS_TOKEN=${SUPABASE_ACCESS_TOKEN:-"sbp_000b53e3912f234aac96bdbbfab07d0cb2574e15"}

# Extract project ref
PROJECT_REF=$(echo $SUPABASE_URL | sed -E 's/https:\/\/([^.]+).supabase.co/\1/')

echo "Project: $PROJECT_REF"

# Generate SQL file
cat > /tmp/fix_rls.sql << 'EOF'
-- Fix customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
CREATE POLICY "Enable read access for all users" ON customers FOR SELECT USING (true);
GRANT SELECT ON customers TO anon;

-- Fix daily_closings table  
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'daily_closings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON daily_closings', pol.policyname);
    END LOOP;
END $$;
CREATE POLICY "Enable read access for all users" ON daily_closings FOR SELECT USING (true);
GRANT SELECT ON daily_closings TO anon;

-- Fix products table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='reorder_point') THEN
    ALTER TABLE products ADD COLUMN reorder_point INTEGER NOT NULL DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='max_stock') THEN
    ALTER TABLE products ADD COLUMN max_stock INTEGER NOT NULL DEFAULT 100;
  END IF;
END $$;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
GRANT SELECT ON products TO anon;

-- Fix staffs table
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON staffs;
CREATE POLICY "Enable read access for all users" ON staffs FOR SELECT USING (true);
GRANT SELECT ON staffs TO anon;

-- Create inventory_movements if not exists
CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  unit_cost INTEGER,
  reason TEXT,
  reference_id TEXT,
  created_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON inventory_movements FOR SELECT USING (true);
GRANT SELECT ON inventory_movements TO anon;

-- Insert sample products
INSERT INTO products (name, category, price, cost, stock_quantity, low_stock_threshold, reorder_point, max_stock)
SELECT * FROM (VALUES
  ('ドンペリニヨン', 'シャンパン', 50000, 25000, 10, 5, 3, 20),
  ('モエ・エ・シャンドン', 'シャンパン', 20000, 10000, 15, 5, 3, 30)
) AS v(name, category, price, cost, stock_quantity, low_stock_threshold, reorder_point, max_stock)
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);
EOF

echo ""
echo "Go to Supabase Dashboard:"
echo "1. Open https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo "2. Copy and paste the SQL below:"
echo ""
echo "=================================================="
cat /tmp/fix_rls.sql
echo "=================================================="
echo ""
echo "3. Click 'RUN' to execute"
echo ""
echo "Direct link: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"

# Clean up
rm /tmp/fix_rls.sql