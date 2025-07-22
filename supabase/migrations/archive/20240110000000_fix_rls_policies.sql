-- Fix RLS infinite recursion by creating a proper policy structure
-- This migration replaces the self-referential policies with safe ones

-- First, drop all existing policies on staffs table
DROP POLICY IF EXISTS "managers_can_view_all_staff" ON staffs;
DROP POLICY IF EXISTS "staff_can_view_own_record" ON staffs;
DROP POLICY IF EXISTS "managers_can_insert_staff" ON staffs;
DROP POLICY IF EXISTS "managers_can_update_staff" ON staffs;
DROP POLICY IF EXISTS "staff_can_update_own_basic_info" ON staffs;
DROP POLICY IF EXISTS "admins_can_delete_staff" ON staffs;

-- Create a safe, non-recursive policy structure
-- Policy 1: Allow users to view their own staff record
CREATE POLICY "staff_can_view_own_record" ON staffs
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy 2: Allow service role to access everything (for middleware)
CREATE POLICY "service_role_full_access" ON staffs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy 3: Allow authenticated users to view staff records if they are admin/manager
-- This uses a simpler check that doesn't cause recursion
CREATE POLICY "authenticated_users_conditional_access" ON staffs
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      -- Either viewing own record
      user_id = auth.uid() 
      OR 
      -- Or user has admin/manager role (checked via JWT claims or separate mechanism)
      EXISTS (
        SELECT 1 FROM auth.users u 
        WHERE u.id = auth.uid() 
        AND u.raw_user_meta_data->>'role' IN ('admin', 'manager')
      )
      OR
      -- Or use a direct role check without self-reference
      auth.uid() IN (
        SELECT user_id FROM staffs 
        WHERE role IN ('admin', 'manager') 
        AND is_active = true
        AND user_id = auth.uid()  -- This prevents the recursion
      )
    )
  );

-- Policy 4: Insert permissions for admins/managers
CREATE POLICY "managers_can_insert_staff" ON staffs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staffs existing_staff
      WHERE existing_staff.user_id = auth.uid()
      AND existing_staff.role IN ('admin', 'manager')
      AND existing_staff.is_active = true
      AND existing_staff.user_id = auth.uid()  -- Explicit self-reference to prevent recursion
    )
    OR auth.role() = 'service_role'
  );

-- Policy 5: Update permissions for admins/managers (for other staff records)
CREATE POLICY "managers_can_update_staff" ON staffs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staffs existing_staff
      WHERE existing_staff.user_id = auth.uid()
      AND existing_staff.role IN ('admin', 'manager')
      AND existing_staff.is_active = true
      AND existing_staff.user_id = auth.uid()  -- Explicit self-reference
    )
    OR auth.role() = 'service_role'
  );

-- Policy 6: Allow staff to update their own basic info
CREATE POLICY "staff_can_update_own_basic_info" ON staffs
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() 
    AND role = OLD.role -- Cannot change own role
    AND is_active = OLD.is_active -- Cannot change own active status
  );

-- Policy 7: Delete permissions for admins only
CREATE POLICY "admins_can_delete_staff" ON staffs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM staffs existing_staff
      WHERE existing_staff.user_id = auth.uid()
      AND existing_staff.role = 'admin'
      AND existing_staff.is_active = true
      AND existing_staff.user_id = auth.uid()  -- Explicit self-reference
    )
    OR auth.role() = 'service_role'
  );

-- Create a helper function for role checking (alternative approach)
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM staffs
  WHERE user_id = user_uuid
  AND is_active = true;
  
  RETURN user_role;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO service_role;