#!/bin/bash

# Load production environment variables
source .env.production

# Check RPC function status
cat > /tmp/check_rpc_status.sql << 'EOF'
-- List all functions in public schema
SELECT 
  proname AS function_name,
  pg_get_function_identity_arguments(oid) AS arguments,
  prorettype::regtype AS return_type
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
ORDER BY proname;

-- Check if functions exist with correct names
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'get_monthly_sales' 
  AND pronamespace = 'public'::regnamespace
) as get_monthly_sales_exists;

SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'get_cast_performance' 
  AND pronamespace = 'public'::regnamespace
) as get_cast_performance_exists;

-- Test function calls
DO $$
BEGIN
  RAISE NOTICE 'Testing get_monthly_sales function...';
  PERFORM get_monthly_sales(2025, 1);
  RAISE NOTICE 'get_monthly_sales executed successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in get_monthly_sales: %', SQLERRM;
END $$;
EOF

echo "Checking RPC function status in production..."

# Run status check
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DATABASE -f /tmp/check_rpc_status.sql

# Clean up
rm /tmp/check_rpc_status.sql

echo "Status check completed!"