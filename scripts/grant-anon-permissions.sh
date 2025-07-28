#!/bin/bash

# Load production environment variables
source .env.production

# Grant permissions to anon role
cat > /tmp/grant_anon_permissions.sql << 'EOF'
-- Grant execute permissions to anon role for API access
GRANT EXECUTE ON FUNCTION get_monthly_sales(INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION get_cast_performance(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION get_daily_revenue(DATE) TO anon;

-- Verify permissions
SELECT 
  proname AS function_name,
  proacl AS permissions
FROM pg_proc
WHERE proname IN ('get_monthly_sales', 'get_cast_performance', 'get_daily_revenue')
  AND pronamespace = 'public'::regnamespace;
EOF

echo "Granting permissions to anon role..."

# Apply permissions
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DATABASE -f /tmp/grant_anon_permissions.sql

# Clean up
rm /tmp/grant_anon_permissions.sql

echo "Permissions granted!"