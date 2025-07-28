-- Alternative RLS approach using user metadata and simpler policies
-- This avoids recursion by using JWT claims or a role cache table

-- Option 1: Create a role cache table to avoid self-referential queries
CREATE TABLE IF NOT EXISTS user_roles_cache (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
  -- CONSTRAINT fk_user_roles_cache_staffs FOREIGN KEY (user_id) REFERENCES staffs(user_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_cache_user_id ON user_roles_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_cache_role ON user_roles_cache(role);

-- Enable RLS on the cache table
ALTER TABLE user_roles_cache ENABLE ROW LEVEL SECURITY;

-- Simple policies for the cache table (no recursion possible)
CREATE POLICY "users_can_view_own_role_cache" ON user_roles_cache
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "service_role_can_manage_role_cache" ON user_roles_cache
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to sync roles from staffs to cache
CREATE OR REPLACE FUNCTION sync_user_roles_cache()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Upsert into cache
    INSERT INTO user_roles_cache (user_id, role, is_active, updated_at)
    VALUES (NEW.user_id, NEW.role, NEW.is_active, now())
    ON CONFLICT (user_id)
    DO UPDATE SET
      role = EXCLUDED.role,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove from cache
    DELETE FROM user_roles_cache WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to keep cache in sync
DROP TRIGGER IF EXISTS sync_user_roles_cache_trigger ON staffs;
CREATE TRIGGER sync_user_roles_cache_trigger
  AFTER INSERT OR UPDATE OR DELETE ON staffs
  FOR EACH ROW EXECUTE FUNCTION sync_user_roles_cache();

-- Populate the cache with existing data
INSERT INTO user_roles_cache (user_id, role, is_active)
SELECT user_id, role, is_active
FROM staffs
WHERE user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Now create better RLS policies for staffs table using the cache
-- DROP POLICY IF EXISTS "authenticated_users_conditional_access" ON staffs;

-- New non-recursive policies using the cache table
CREATE POLICY "staff_can_view_own_record_v2" ON staffs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "managers_can_view_all_staff_v2" ON staffs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles_cache urc
      WHERE urc.user_id = auth.uid()
      AND urc.role IN ('admin', 'manager')
      AND urc.is_active = true
    )
  );

CREATE POLICY "service_role_full_access_v2" ON staffs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Update other policies to use the cache
-- DROP POLICY IF EXISTS "managers_can_insert_staff" ON staffs;
CREATE POLICY "managers_can_insert_staff_v2" ON staffs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles_cache urc
      WHERE urc.user_id = auth.uid()
      AND urc.role IN ('admin', 'manager')
      AND urc.is_active = true
    )
    OR auth.role() = 'service_role'
  );

-- DROP POLICY IF EXISTS "managers_can_update_staff" ON staffs;
CREATE POLICY "managers_can_update_staff_v2" ON staffs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles_cache urc
      WHERE urc.user_id = auth.uid()
      AND urc.role IN ('admin', 'manager')
      AND urc.is_active = true
    )
    OR auth.role() = 'service_role'
  );

-- DROP POLICY IF EXISTS "admins_can_delete_staff" ON staffs;
CREATE POLICY "admins_can_delete_staff_v2" ON staffs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles_cache urc
      WHERE urc.user_id = auth.uid()
      AND urc.role = 'admin'
      AND urc.is_active = true
    )
    OR auth.role() = 'service_role'
  );

-- Update the helper function to use cache
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Try cache first
  SELECT role INTO user_role
  FROM user_roles_cache
  WHERE user_id = user_uuid
  AND is_active = true;
  
  -- If not in cache, check staffs table directly and update cache
  IF user_role IS NULL THEN
    SELECT role INTO user_role
    FROM staffs
    WHERE user_id = user_uuid
    AND is_active = true;
    
    -- Update cache if found
    IF user_role IS NOT NULL THEN
      INSERT INTO user_roles_cache (user_id, role, is_active)
      VALUES (user_uuid, user_role, true)
      ON CONFLICT (user_id) DO UPDATE SET
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        updated_at = now();
    END IF;
  END IF;
  
  RETURN user_role;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON user_roles_cache TO authenticated;
GRANT ALL ON user_roles_cache TO service_role;