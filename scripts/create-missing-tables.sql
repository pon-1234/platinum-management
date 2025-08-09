-- Create missing tables for cast management

-- nomination_types table
CREATE TABLE IF NOT EXISTS nomination_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name text UNIQUE NOT NULL,
    display_name text NOT NULL,
    fee_amount integer NOT NULL DEFAULT 0,
    back_percentage decimal(5,2) DEFAULT 50.00,
    is_active boolean DEFAULT true,
    display_order integer,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- cast_engagements table
CREATE TABLE IF NOT EXISTS cast_engagements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    cast_id uuid REFERENCES casts_profile(id),
    role text NOT NULL DEFAULT 'support',
    nomination_type_id uuid REFERENCES nomination_types(id),
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    is_active boolean DEFAULT true,
    fee_amount integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CHECK (role IN ('primary', 'support', 'help'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cast_engagements_visit_id ON cast_engagements(visit_id);
CREATE INDEX IF NOT EXISTS idx_cast_engagements_cast_id ON cast_engagements(cast_id);
CREATE INDEX IF NOT EXISTS idx_cast_engagements_active ON cast_engagements(is_active) WHERE is_active = true;

-- Insert default nomination types
INSERT INTO nomination_types (type_name, display_name, fee_amount, back_percentage, is_active, display_order) VALUES
  ('shimei', '指名', 3000, 50.00, true, 1),
  ('douhan', '同伴', 5000, 60.00, true, 2),
  ('after', 'アフター', 8000, 70.00, true, 3),
  ('help', 'ヘルプ', 0, 30.00, true, 4)
ON CONFLICT (type_name) DO NOTHING;

-- Disable RLS for these tables
ALTER TABLE IF EXISTS nomination_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cast_engagements DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON nomination_types TO anon;
GRANT ALL ON nomination_types TO authenticated;
GRANT ALL ON nomination_types TO service_role;

GRANT ALL ON cast_engagements TO anon;
GRANT ALL ON cast_engagements TO authenticated;
GRANT ALL ON cast_engagements TO service_role;