#!/bin/bash

echo "=================================================="
echo "Applying RLS fixes to production database"
echo "=================================================="

# Check for environment file
if [ -f .env.production ]; then
    echo "Using .env.production"
    source .env.production
elif [ -f .env.local ]; then
    echo "Using .env.local"
    source .env.local
else
    echo "Error: No environment file found"
    echo "Please create .env.production or .env.local with your Supabase credentials:"
    echo ""
    echo "NEXT_PUBLIC_SUPABASE_URL=your-project-url"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    echo ""
    echo "Or set SUPABASE_PROJECT_REF environment variable"
    exit 1
fi

# Support both SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL
SUPABASE_URL=${SUPABASE_URL:-$NEXT_PUBLIC_SUPABASE_URL}

# Extract project ref from SUPABASE_URL
PROJECT_REF=$(echo $SUPABASE_URL | sed -E 's/https:\/\/([^.]+).supabase.co/\1/')

if [ -z "$PROJECT_REF" ]; then
    echo "Error: Could not extract project reference from SUPABASE_URL"
    exit 1
fi

echo "Project Reference: $PROJECT_REF"

# Generate the SQL file
cat > /tmp/fix_all_rls_policies.sql << 'EOF'
-- ========================================
-- 1. Fix customers table
-- ========================================
-- Check if is_deleted column exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT column_name 
                 FROM information_schema.columns 
                 WHERE table_name='customers' AND column_name='is_deleted') THEN
    ALTER TABLE customers ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Enable RLS and fix policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON customers;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON customers;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON customers;

CREATE POLICY "Enable read access for all users" ON customers FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for authenticated users only" ON customers FOR DELETE TO authenticated USING (true);

GRANT SELECT ON customers TO anon;
GRANT ALL ON customers TO authenticated;
GRANT ALL ON customers TO service_role;

-- ========================================
-- 2. Fix daily_closings table
-- ========================================
-- Re-fix daily_closings with correct policies
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'daily_closings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON daily_closings', pol.policyname);
    END LOOP;
END $$;

-- Create single policy for all users
CREATE POLICY "Enable read access for all users" ON daily_closings FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON daily_closings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON daily_closings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON daily_closings TO anon;
GRANT SELECT ON daily_closings TO authenticated;
GRANT ALL ON daily_closings TO service_role;

-- ========================================
-- 3. Fix products table
-- ========================================
-- Add missing columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name='reorder_point') THEN
    ALTER TABLE products ADD COLUMN reorder_point INTEGER NOT NULL DEFAULT 5;
  END IF;
  
  IF NOT EXISTS (SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name='max_stock') THEN
    ALTER TABLE products ADD COLUMN max_stock INTEGER NOT NULL DEFAULT 100;
  END IF;
END $$;

-- Fix RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON products;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON products;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON products;

CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for authenticated users only" ON products FOR DELETE TO authenticated USING (true);

GRANT SELECT ON products TO anon;
GRANT ALL ON products TO authenticated;
GRANT ALL ON products TO service_role;

-- ========================================
-- 4. Fix inventory_movements table
-- ========================================
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

DROP POLICY IF EXISTS "Enable read access for all users" ON inventory_movements;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON inventory_movements;

CREATE POLICY "Enable read access for all users" ON inventory_movements FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON inventory_movements FOR INSERT TO authenticated WITH CHECK (true);

GRANT SELECT ON inventory_movements TO anon;
GRANT ALL ON inventory_movements TO authenticated;
GRANT ALL ON inventory_movements TO service_role;

-- ========================================
-- 5. Fix reservations and visits tables
-- ========================================
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON reservations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON reservations;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON reservations;

DROP POLICY IF EXISTS "Enable read access for all users" ON visits;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON visits;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON visits;

CREATE POLICY "Enable read access for all users" ON reservations FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON reservations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON reservations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON visits FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON visits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON visits FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT ON reservations TO anon;
GRANT ALL ON reservations TO authenticated;
GRANT ALL ON reservations TO service_role;

GRANT SELECT ON visits TO anon;
GRANT ALL ON visits TO authenticated;
GRANT ALL ON visits TO service_role;

-- ========================================
-- 6. Create inventory RPC functions
-- ========================================
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

-- ========================================
-- 7. Insert sample products if needed
-- ========================================
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

-- ========================================
-- 8. Fix staffs table RLS
-- ========================================
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON staffs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON staffs;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON staffs;

CREATE POLICY "Enable read access for all users" ON staffs FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON staffs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON staffs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT ON staffs TO anon;
GRANT ALL ON staffs TO authenticated;
GRANT ALL ON staffs TO service_role;

-- ========================================
-- 9. Verify all permissions
-- ========================================
SELECT 
  'Final permissions check' as info,
  has_table_privilege('anon', 'customers', 'SELECT') as customers_ok,
  has_table_privilege('anon', 'daily_closings', 'SELECT') as daily_closings_ok,
  has_table_privilege('anon', 'products', 'SELECT') as products_ok,
  has_table_privilege('anon', 'reservations', 'SELECT') as reservations_ok,
  has_table_privilege('anon', 'visits', 'SELECT') as visits_ok,
  has_table_privilege('anon', 'staffs', 'SELECT') as staffs_ok;

-- Show table counts
SELECT 'customers' as table_name, count(*) as count FROM customers
UNION ALL
SELECT 'daily_closings', count(*) FROM daily_closings
UNION ALL
SELECT 'products', count(*) FROM products
UNION ALL
SELECT 'reservations', count(*) FROM reservations
UNION ALL
SELECT 'visits', count(*) FROM visits;
EOF

echo ""
echo "Choose how to apply the fixes:"
echo "1) Using Supabase CLI (recommended)"
echo "2) Using psql directly"
echo "3) Show SQL only (copy to SQL editor)"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "Using Supabase CLI..."
        echo "Make sure you have logged in with: supabase login"
        echo ""
        
        # Link to the project if not already linked
        if [ ! -f supabase/.temp/project-ref ]; then
            echo "Linking to project $PROJECT_REF..."
            supabase link --project-ref $PROJECT_REF
        fi
        
        # Run the SQL
        echo "Applying SQL fixes..."
        cat /tmp/fix_all_rls_policies.sql | supabase db execute
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ RLS fixes applied successfully!"
        else
            echo ""
            echo "❌ Error applying fixes. Please check the error messages above."
        fi
        ;;
        
    2)
        echo ""
        echo "Using psql directly..."
        echo "Password: $POSTGRES_PASSWORD"
        echo ""
        
        # Use psql to execute the SQL
        PGPASSWORD=$POSTGRES_PASSWORD psql \
            -h db.$PROJECT_REF.supabase.co \
            -p 5432 \
            -U postgres \
            -d postgres \
            -f /tmp/fix_all_rls_policies.sql
            
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ RLS fixes applied successfully!"
        else
            echo ""
            echo "❌ Error applying fixes. Please check the error messages above."
        fi
        ;;
        
    3)
        echo ""
        echo "=================================================="
        echo "Copy the following SQL to your Supabase SQL editor:"
        echo "=================================================="
        cat /tmp/fix_all_rls_policies.sql
        echo ""
        echo "=================================================="
        ;;
        
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

# Clean up
rm /tmp/fix_all_rls_policies.sql

echo ""
echo "Next steps:"
echo "1. Verify the fixes in your application"
echo "2. Set QR_CODE_SECRET_KEY in Vercel environment variables"
echo "   Generate with: openssl rand -base64 32"