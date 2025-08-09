-- Quick fix for RLS issues
-- Run this in Supabase SQL Editor

-- Disable RLS for all tables to allow anonymous access during development
ALTER TABLE IF EXISTS visit_table_segments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cast_engagements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS nomination_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS casts_profile DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staffs DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to anon role
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Create visit_table_segments if missing
CREATE TABLE IF NOT EXISTS visit_table_segments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    table_id bigint NOT NULL REFERENCES tables(id),
    reason text DEFAULT 'initial',
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_visit_table_segments_visit_id ON visit_table_segments(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_table_segments_table_id ON visit_table_segments(table_id);