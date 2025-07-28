#!/bin/bash

# Load production environment variables
source .env.production

# Create missing tables
cat > /tmp/create_missing_tables.sql << 'EOF'
-- Create order_items table if not exists
CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  cast_id UUID REFERENCES staffs(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  total_price INTEGER GENERATED ALWAYS AS (quantity * unit_price) STORED,
  notes TEXT,
  created_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_items_visit_id ON order_items(visit_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_cast_id ON order_items(cast_id);

-- Grant permissions
GRANT ALL ON TABLE order_items TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE order_items_id_seq TO authenticated;

-- Enable RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY IF NOT EXISTS "Staff can manage order items" ON order_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create visit_cast_assignments table if not exists  
CREATE TABLE IF NOT EXISTS visit_cast_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  cast_id UUID NOT NULL REFERENCES staffs(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES staffs(id),
  UNIQUE(visit_id, cast_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_visit_cast_assignments_visit_id ON visit_cast_assignments(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_cast_assignments_cast_id ON visit_cast_assignments(cast_id);

-- Grant permissions
GRANT ALL ON TABLE visit_cast_assignments TO authenticated;

-- Enable RLS
ALTER TABLE visit_cast_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY IF NOT EXISTS "Staff can manage visit cast assignments" ON visit_cast_assignments
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
EOF

echo "Creating missing tables in production..."

# Apply the table creation
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DATABASE -f /tmp/create_missing_tables.sql

# Clean up
rm /tmp/create_missing_tables.sql

echo "Tables created successfully!"