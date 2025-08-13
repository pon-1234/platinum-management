-- Harden RLS helper functions: set search_path and volatility

CREATE OR REPLACE FUNCTION get_current_user_staff_id()
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff_id_val UUID;
BEGIN
  SELECT id INTO staff_id_val
  FROM public.staffs
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN staff_id_val;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_val TEXT;
BEGIN
  SELECT role::TEXT INTO role_val
  FROM public.staffs
  WHERE user_id = auth.uid()
  LIMIT 1;

  RETURN role_val IN ('admin', 'manager');
END;
$$ LANGUAGE plpgsql STABLE;
