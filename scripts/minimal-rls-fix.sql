-- Minimal RLS fix without RPC functions
-- This focuses only on fixing the access issues

-- 1. Fix customers table (for dashboard)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
CREATE POLICY "Enable read access for all users" ON customers FOR SELECT USING (true);
GRANT SELECT ON customers TO anon;

-- Add is_deleted column if missing
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- 2. Fix daily_closings table (for 406 error)
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;
-- Drop all policies
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

-- 3. Fix products table (for inventory)
-- Add missing columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_stock INTEGER DEFAULT 100;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
GRANT SELECT ON products TO anon;

-- 4. Fix staffs table (for profile)
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON staffs;
CREATE POLICY "Enable read access for all users" ON staffs FOR SELECT USING (true);
GRANT SELECT ON staffs TO anon;

-- 5. Fix other important tables
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON reservations;
CREATE POLICY "Enable read access for all users" ON reservations FOR SELECT USING (true);
GRANT SELECT ON reservations TO anon;

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON visits;
CREATE POLICY "Enable read access for all users" ON visits FOR SELECT USING (true);
GRANT SELECT ON visits TO anon;

-- 6. Insert sample products if needed
INSERT INTO products (name, category, price, cost, stock_quantity, low_stock_threshold, reorder_point, max_stock)
SELECT * FROM (VALUES
  ('ドンペリニヨン', 'シャンパン', 50000, 25000, 10, 5, 3, 20),
  ('モエ・エ・シャンドン', 'シャンパン', 20000, 10000, 15, 5, 3, 30)
) AS v(name, category, price, cost, stock_quantity, low_stock_threshold, reorder_point, max_stock)
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);

-- 7. Verify the fix worked
SELECT 
  tablename,
  COUNT(*) as policy_count,
  bool_or(roles::text LIKE '%anon%') as anon_has_access
FROM pg_policies 
WHERE tablename IN ('customers', 'daily_closings', 'products', 'staffs', 'reservations', 'visits')
GROUP BY tablename
ORDER BY tablename;