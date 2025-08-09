-- Fix RLS policies for visit_table_segments table
-- This script should be run in Supabase SQL Editor

-- First, check if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'visit_table_segments') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "visit_table_segments_select" ON visit_table_segments;
        DROP POLICY IF EXISTS "visit_table_segments_insert" ON visit_table_segments;
        DROP POLICY IF EXISTS "visit_table_segments_update" ON visit_table_segments;
        DROP POLICY IF EXISTS "visit_table_segments_delete" ON visit_table_segments;
        
        -- Disable RLS temporarily for anonymous access
        ALTER TABLE visit_table_segments DISABLE ROW LEVEL SECURITY;
        
        -- Grant permissions
        GRANT ALL ON visit_table_segments TO anon;
        GRANT ALL ON visit_table_segments TO authenticated;
        GRANT ALL ON visit_table_segments TO service_role;
        
        RAISE NOTICE 'RLS policies fixed for visit_table_segments';
    ELSE
        -- Create the table if it doesn't exist
        CREATE TABLE visit_table_segments (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            visit_id uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
            table_id bigint NOT NULL REFERENCES tables(id),
            started_at timestamptz NOT NULL DEFAULT now(),
            ended_at timestamptz,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
        
        -- Create indexes
        CREATE INDEX idx_visit_table_segments_visit_id ON visit_table_segments(visit_id);
        CREATE INDEX idx_visit_table_segments_table_id ON visit_table_segments(table_id);
        
        -- Grant permissions
        GRANT ALL ON visit_table_segments TO anon;
        GRANT ALL ON visit_table_segments TO authenticated;
        GRANT ALL ON visit_table_segments TO service_role;
        
        RAISE NOTICE 'Created visit_table_segments table with proper permissions';
    END IF;
END $$;

-- Also fix permissions for other related tables
GRANT ALL ON visits TO anon;
GRANT ALL ON visits TO authenticated;
GRANT ALL ON visits TO service_role;

GRANT ALL ON customers TO anon;
GRANT ALL ON customers TO authenticated;
GRANT ALL ON customers TO service_role;

GRANT ALL ON tables TO anon;
GRANT ALL ON tables TO authenticated;
GRANT ALL ON tables TO service_role;

-- Ensure RLS is disabled for development
ALTER TABLE visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE tables DISABLE ROW LEVEL SECURITY;