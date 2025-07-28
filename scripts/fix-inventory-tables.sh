#!/bin/bash

# Load production environment variables
source .env.production

# Fix inventory tables
cat > /tmp/fix_inventory_tables.sql << 'EOF'
-- Add missing columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS max_stock INTEGER DEFAULT 100;

-- Update existing products with reasonable defaults
UPDATE products 
SET 
  reorder_point = GREATEST(5, low_stock_threshold / 2),
  max_stock = GREATEST(100, stock_quantity * 3)
WHERE reorder_point IS NULL OR max_stock IS NULL;

-- Add constraints
ALTER TABLE products
ADD CONSTRAINT reorder_point_positive CHECK (reorder_point >= 0),
ADD CONSTRAINT max_stock_positive CHECK (max_stock >= 0);

-- Ensure inventory_movements table exists with correct structure
CREATE TABLE IF NOT EXISTS inventory_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'return', 'adjustment_in', 'adjustment_out', 'transfer_in', 'transfer_out')),
  quantity INTEGER NOT NULL,
  unit_cost INTEGER,
  reference_type TEXT,
  reference_id TEXT,
  reason TEXT,
  created_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes if not exists
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_date ON inventory_movements(product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);

-- Grant permissions
GRANT ALL ON TABLE inventory_movements TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE inventory_movements_id_seq TO authenticated;

-- Enable RLS if not already enabled
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Create RLS policy if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inventory_movements' 
    AND policyname = 'inventory_policy'
  ) THEN
    CREATE POLICY "inventory_policy" ON inventory_movements
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
EOF

echo "Fixing inventory tables in production..."

# Apply the fixes
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DATABASE -f /tmp/fix_inventory_tables.sql

# Clean up
rm /tmp/fix_inventory_tables.sql

echo "Inventory tables fixed successfully!"