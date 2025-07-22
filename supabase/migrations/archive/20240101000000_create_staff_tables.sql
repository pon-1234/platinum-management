-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create staffs table
CREATE TABLE IF NOT EXISTS staffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'hall', 'cashier', 'cast')),
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create casts_profile table
CREATE TABLE IF NOT EXISTS casts_profile (
  staff_id UUID PRIMARY KEY REFERENCES staffs(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  profile_image_url TEXT,
  bio TEXT,
  hourly_wage INTEGER NOT NULL DEFAULT 0,
  commission_rate JSONB NOT NULL DEFAULT '{"shimei": 0, "bottlePercent": 0}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_staffs_user_id ON staffs(user_id);
CREATE INDEX idx_staffs_role ON staffs(role);
CREATE INDEX idx_staffs_is_active ON staffs(is_active);

-- Enable Row Level Security
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE casts_profile ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staffs table
-- Policy: Staff can view all staff (for managers and admins)
CREATE POLICY "managers_can_view_all_staff" ON staffs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager')
      AND s.is_active = true
    )
  );

-- Policy: Staff can view own record
CREATE POLICY "staff_can_view_own_record" ON staffs
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Only admins and managers can insert staff
CREATE POLICY "managers_can_insert_staff" ON staffs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager')
      AND s.is_active = true
    )
  );

-- Policy: Only admins and managers can update staff
CREATE POLICY "managers_can_update_staff" ON staffs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager')
      AND s.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager')
      AND s.is_active = true
    )
  );

-- Policy: Staff can update their own basic info (limited fields)
CREATE POLICY "staff_can_update_own_basic_info" ON staffs
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() 
    AND role = OLD.role -- Cannot change own role
    AND is_active = OLD.is_active -- Cannot change own active status
  );

-- Policy: Only admins can delete staff
CREATE POLICY "admins_can_delete_staff" ON staffs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role = 'admin'
      AND s.is_active = true
    )
  );

-- RLS Policies for casts_profile table
-- Policy: Cast can view own profile
CREATE POLICY "cast_can_view_own_profile" ON casts_profile
  FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  );

-- Policy: Managers and admins can view all cast profiles
CREATE POLICY "managers_can_view_all_cast_profiles" ON casts_profile
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager')
      AND s.is_active = true
    )
  );

-- Policy: Hall staff can view cast profiles (for booking purposes)
CREATE POLICY "hall_staff_can_view_cast_profiles" ON casts_profile
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role = 'hall'
      AND s.is_active = true
    )
  );

-- Policy: Cast can update own profile (limited fields)
CREATE POLICY "cast_can_update_own_profile" ON casts_profile
  FOR UPDATE
  USING (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
    AND hourly_wage = OLD.hourly_wage -- Cannot change own wage
    AND commission_rate = OLD.commission_rate -- Cannot change own commission
  );

-- Policy: Only managers and admins can manage cast profiles fully
CREATE POLICY "managers_can_manage_cast_profiles" ON casts_profile
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager')
      AND s.is_active = true
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_staffs_updated_at BEFORE UPDATE ON staffs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_casts_profile_updated_at BEFORE UPDATE ON casts_profile
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();