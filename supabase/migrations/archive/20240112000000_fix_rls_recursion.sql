-- Fix RLS infinite recursion issue
-- Create a SECURITY DEFINER function to safely get staff role

-- First, drop existing problematic policies
DROP POLICY IF EXISTS "admins_can_delete_staff" ON staffs;
DROP POLICY IF EXISTS "managers_can_insert_staff" ON staffs;
DROP POLICY IF EXISTS "managers_can_update_staff" ON staffs;
DROP POLICY IF EXISTS "managers_can_view_all_staff" ON staffs;
DROP POLICY IF EXISTS "staff_can_view_own_record" ON staffs;

-- Create a security definer function to get staff role without RLS
CREATE OR REPLACE FUNCTION get_staff_role_for_user(target_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM staffs WHERE user_id = target_user_id AND is_active = true LIMIT 1;
$$;

-- Grant execute permission to public (authenticated users)
GRANT EXECUTE ON FUNCTION get_staff_role_for_user(uuid) TO authenticated;

-- Re-enable RLS on staffs table
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;

-- Create new, non-recursive policies
CREATE POLICY "staff_can_view_own_record" ON staffs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- For admin/manager operations, we'll check roles using the safe function
CREATE POLICY "admins_can_view_all_staff" ON staffs
  FOR SELECT TO authenticated
  USING (get_staff_role_for_user(auth.uid()) IN ('admin'));

CREATE POLICY "managers_can_view_staff" ON staffs
  FOR SELECT TO authenticated
  USING (get_staff_role_for_user(auth.uid()) IN ('admin', 'manager'));

CREATE POLICY "admins_can_modify_staff" ON staffs
  FOR ALL TO authenticated
  USING (get_staff_role_for_user(auth.uid()) = 'admin')
  WITH CHECK (get_staff_role_for_user(auth.uid()) = 'admin');

CREATE POLICY "managers_can_insert_staff" ON staffs
  FOR INSERT TO authenticated
  WITH CHECK (get_staff_role_for_user(auth.uid()) IN ('admin', 'manager'));

CREATE POLICY "managers_can_update_staff" ON staffs
  FOR UPDATE TO authenticated
  USING (get_staff_role_for_user(auth.uid()) IN ('admin', 'manager'))
  WITH CHECK (get_staff_role_for_user(auth.uid()) IN ('admin', 'manager'));