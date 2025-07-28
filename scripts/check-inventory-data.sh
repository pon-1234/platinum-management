#!/bin/bash

# Load production environment variables
source .env.production

# Check inventory data
cat > /tmp/check_inventory_data.sql << 'EOF'
-- Check if products table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'products'
) as products_table_exists;

-- Count products
SELECT count(*) as total_products FROM products;

-- Show first 5 products
SELECT id, name, category, stock_quantity, is_active, created_at 
FROM products 
LIMIT 5;

-- Check RLS policies on products table
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
WHERE tablename = 'products';

-- Check permissions for anon role
SELECT has_table_privilege('anon', 'products', 'SELECT') as anon_can_select_products;
EOF

echo "Checking inventory data in production database..."

# Execute the check
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DATABASE -f /tmp/check_inventory_data.sql

# Clean up
rm /tmp/check_inventory_data.sql

echo "Check completed!"