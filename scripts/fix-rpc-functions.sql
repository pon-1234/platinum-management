-- Fix RPC functions with proper DROP statements
-- Run this FIRST before other migrations

-- 1. Find existing functions and drop them with correct signatures
DO $$
DECLARE
    func_rec RECORD;
BEGIN
    -- Drop all versions of count_low_stock_products
    FOR func_rec IN 
        SELECT proname, oidvectortypes(proargtypes) as args 
        FROM pg_proc 
        WHERE proname = 'count_low_stock_products'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I(%s)', func_rec.proname, func_rec.args);
    END LOOP;
    
    -- Drop all versions of get_low_stock_products
    FOR func_rec IN 
        SELECT proname, oidvectortypes(proargtypes) as args 
        FROM pg_proc 
        WHERE proname = 'get_low_stock_products'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I(%s)', func_rec.proname, func_rec.args);
    END LOOP;
END $$;

-- 2. Also try CASCADE drop
DROP FUNCTION IF EXISTS count_low_stock_products CASCADE;
DROP FUNCTION IF EXISTS get_low_stock_products CASCADE;

-- 3. Check what functions exist
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    t.typname as return_type
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_type t ON p.prorettype = t.oid
WHERE p.proname IN ('count_low_stock_products', 'get_low_stock_products')
  AND n.nspname = 'public';

-- After running this, you can run the main migration