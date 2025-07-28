#!/bin/bash

# Load production environment variables
source .env.production

# Debug RPC functions
cat > /tmp/debug_rpc.sql << 'EOF'
-- Check if functions exist and their signatures
SELECT 
  proname AS function_name,
  proargtypes::regtype[] AS argument_types,
  prorettype::regtype AS return_type,
  pronargs AS num_args
FROM pg_proc
WHERE proname IN ('get_monthly_sales', 'get_cast_performance', 'get_daily_revenue')
  AND pronamespace = 'public'::regnamespace;

-- Test get_monthly_sales with sample parameters
SELECT get_monthly_sales(2025, 1);

-- Check for any error logs
SELECT * FROM pg_stat_activity WHERE state = 'active';
EOF

echo "Debugging RPC functions in production..."

# Run debug queries
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DATABASE -f /tmp/debug_rpc.sql

# Clean up
rm /tmp/debug_rpc.sql

echo "Debug completed!"