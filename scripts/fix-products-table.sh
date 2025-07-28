#!/bin/bash

# Fix products table schema

cat > /tmp/fix_products_table.sql << 'EOF'
-- Add missing columns to products table if they don't exist
DO $$ 
BEGIN
  -- Add reorder_point column if not exists
  IF NOT EXISTS (SELECT column_name 
                 FROM information_schema.columns 
                 WHERE table_name='products' AND column_name='reorder_point') THEN
    ALTER TABLE products ADD COLUMN reorder_point INTEGER NOT NULL DEFAULT 5;
  END IF;
  
  -- Add max_stock column if not exists
  IF NOT EXISTS (SELECT column_name 
                 FROM information_schema.columns 
                 WHERE table_name='products' AND column_name='max_stock') THEN
    ALTER TABLE products ADD COLUMN max_stock INTEGER NOT NULL DEFAULT 100;
  END IF;
END $$;

-- Create inventory_movements table if not exists
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

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_date ON inventory_movements(product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);

-- Enable RLS on all inventory tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON products;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON products;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON products;

DROP POLICY IF EXISTS "Enable read access for all users" ON inventory_movements;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON inventory_movements;

-- Create RLS policies for products
CREATE POLICY "Enable read access for all users" 
ON products 
FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for authenticated users only" 
ON products 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" 
ON products 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only" 
ON products 
FOR DELETE 
TO authenticated
USING (true);

-- Create RLS policies for inventory_movements
CREATE POLICY "Enable read access for all users" 
ON inventory_movements 
FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for authenticated users only" 
ON inventory_movements 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON products TO anon;
GRANT ALL ON products TO authenticated;
GRANT ALL ON products TO service_role;

GRANT SELECT ON inventory_movements TO anon;
GRANT ALL ON inventory_movements TO authenticated;
GRANT ALL ON inventory_movements TO service_role;

-- Create RPC functions for inventory operations
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

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION count_low_stock_products() TO anon;
GRANT EXECUTE ON FUNCTION get_low_stock_products() TO anon;

-- Insert sample products if table is empty
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

-- Verify the fix
SELECT 
  'Products table columns' as check_type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

SELECT 
  'Products count' as info,
  count(*) as value
FROM products;

SELECT 
  'Permissions check' as info,
  has_table_privilege('anon', 'products', 'SELECT') as anon_can_select,
  has_table_privilege('authenticated', 'products', 'SELECT, INSERT, UPDATE, DELETE') as auth_full_access;
EOF

echo "Fixing products table schema..."
echo ""
echo "Please run these SQL commands in your Supabase SQL editor:"
echo "=================================================="
cat /tmp/fix_products_table.sql
echo "=================================================="

# Clean up
rm /tmp/fix_products_table.sql