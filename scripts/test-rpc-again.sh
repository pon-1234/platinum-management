#!/bin/bash

# Load production environment variables
source .env.production

# Test RPC functions again
cat > /tmp/test_rpc_again.sql << 'EOF'
-- Test get_monthly_sales
SELECT get_monthly_sales(2025, 1);

-- Test get_cast_performance  
SELECT get_cast_performance('2025-01-01'::date, '2025-01-31'::date);

-- Test get_daily_revenue
SELECT get_daily_revenue('2025-01-27'::date);
EOF

echo "Testing RPC functions again..."

# Run tests
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DATABASE -f /tmp/test_rpc_again.sql

# Clean up
rm /tmp/test_rpc_again.sql

echo "Test completed!"