-- Fix security issues reported by Supabase

-- 1. Enable RLS on notification_logs table
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notification_logs
-- Only authenticated users can view their own notification logs
CREATE POLICY "Users can view their own notification logs"
  ON public.notification_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM staffs WHERE id = notification_logs.recipient_id
    )
  );

-- Only system/admin can insert notification logs
CREATE POLICY "System can insert notification logs"
  ON public.notification_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staffs 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- 2. Enable RLS on bottle_keep_alerts_sent table
ALTER TABLE public.bottle_keep_alerts_sent ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bottle_keep_alerts_sent
-- Only authenticated users can view alerts
CREATE POLICY "Authenticated users can view bottle keep alerts"
  ON public.bottle_keep_alerts_sent
  FOR SELECT
  TO authenticated
  USING (true);

-- Only system/admin can manage bottle keep alerts
CREATE POLICY "Admin can manage bottle keep alerts"
  ON public.bottle_keep_alerts_sent
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staffs 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staffs 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 3. Fix function search_path for current_user_is_admin
-- Drop and recreate the function with immutable search_path
DROP FUNCTION IF EXISTS public.current_user_is_admin();

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.staffs 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;

-- Also check and fix other functions that might have mutable search_path
-- Fix get_current_staff_id function
DROP FUNCTION IF EXISTS public.get_current_staff_id();

CREATE OR REPLACE FUNCTION public.get_current_staff_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  staff_id uuid;
BEGIN
  SELECT id INTO staff_id
  FROM public.staffs
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN staff_id;
END;
$$;

-- Fix get_current_user_role function
DROP FUNCTION IF EXISTS public.get_current_user_role();

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.staffs
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN user_role;
END;
$$;

-- Add comments to document the security fixes
COMMENT ON TABLE public.notification_logs IS 'Notification logs with RLS enabled for security';
COMMENT ON TABLE public.bottle_keep_alerts_sent IS 'Bottle keep alert tracking with RLS enabled for security';
COMMENT ON FUNCTION public.current_user_is_admin() IS 'Check if current user is admin with secure search_path';
COMMENT ON FUNCTION public.get_current_staff_id() IS 'Get current staff ID with secure search_path';
COMMENT ON FUNCTION public.get_current_user_role() IS 'Get current user role with secure search_path';