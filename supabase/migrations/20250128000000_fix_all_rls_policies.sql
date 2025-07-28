-- Fix RLS policies for all tables to allow anon access

-- 1. Customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
CREATE POLICY "Enable read access for all users" ON customers FOR SELECT USING (true);
GRANT SELECT ON customers TO anon;

-- Add is_deleted column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='is_deleted') THEN
    ALTER TABLE customers ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. Daily closings table
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;
-- Drop all existing policies
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

-- 3. Products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
GRANT SELECT ON products TO anon;

-- Add missing columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='reorder_point') THEN
    ALTER TABLE products ADD COLUMN reorder_point INTEGER NOT NULL DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='max_stock') THEN
    ALTER TABLE products ADD COLUMN max_stock INTEGER NOT NULL DEFAULT 100;
  END IF;
END $$;

-- 4. Staffs table
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON staffs;
CREATE POLICY "Enable read access for all users" ON staffs FOR SELECT USING (true);
GRANT SELECT ON staffs TO anon;

-- 5. Reservations table
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON reservations;
CREATE POLICY "Enable read access for all users" ON reservations FOR SELECT USING (true);
GRANT SELECT ON reservations TO anon;

-- 6. Visits table
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON visits;
CREATE POLICY "Enable read access for all users" ON visits FOR SELECT USING (true);
GRANT SELECT ON visits TO anon;

-- 7. Create inventory_movements table if not exists
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

-- 8. Create inventory RPC functions
CREATE OR REPLACE FUNCTION count_low_stock_products()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM products
    WHERE is_active = true 
    AND stock_quantity <= low_stock_threshold
    AND stock_quantity > 0
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS SETOF products AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM products
  WHERE is_active = true 
  AND stock_quantity <= low_stock_threshold;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION count_low_stock_products() TO anon;
GRANT EXECUTE ON FUNCTION get_low_stock_products() TO anon;

-- 9. Insert sample products if empty
INSERT INTO products (name, category, price, cost, stock_quantity, low_stock_threshold, reorder_point, max_stock)
SELECT * FROM (VALUES
  ('ドンペリニヨン', 'シャンパン', 50000, 25000, 10, 5, 3, 20),
  ('モエ・エ・シャンドン', 'シャンパン', 20000, 10000, 15, 5, 3, 30),
  ('ヘネシー XO', 'ブランデー', 40000, 20000, 8, 3, 2, 15),
  ('レミーマルタン', 'ブランデー', 30000, 15000, 12, 3, 2, 20),
  ('マッカラン 12年', 'ウイスキー', 25000, 12000, 20, 5, 3, 30),
  ('山崎 12年', 'ウイスキー', 35000, 18000, 5, 3, 2, 10),
  ('グレイグース', 'ウォッカ', 15000, 7000, 25, 5, 3, 40),
  ('ボンベイサファイア', 'ジン', 12000, 6000, 30, 5, 3, 50)
) AS v(name, category, price, cost, stock_quantity, low_stock_threshold, reorder_point, max_stock)
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);