#!/bin/bash

# Load production environment variables
source .env.production

# Create a combined migration file
cat > /tmp/production_migration.sql << 'EOF'
-- 1. Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  recipient_id UUID REFERENCES staffs(id),
  subject VARCHAR(500),
  message TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  message_id VARCHAR(255),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_type_status 
ON notification_logs(type, status);

CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient 
ON notification_logs(recipient);

CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at 
ON notification_logs(sent_at);

CREATE OR REPLACE FUNCTION update_notification_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notification_logs_updated_at
  BEFORE UPDATE ON notification_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_logs_updated_at();

GRANT ALL ON TABLE notification_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE notification_logs_id_seq TO authenticated;

-- 2. Create bottle_keep_alerts_sent table
CREATE TABLE IF NOT EXISTS bottle_keep_alerts_sent (
  id SERIAL PRIMARY KEY,
  bottle_keep_id UUID NOT NULL REFERENCES bottle_keeps(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  message TEXT
);

CREATE INDEX IF NOT EXISTS idx_bottle_keep_alerts_sent_bottle_keep_id 
ON bottle_keep_alerts_sent(bottle_keep_id);

CREATE INDEX IF NOT EXISTS idx_bottle_keep_alerts_sent_customer_id 
ON bottle_keep_alerts_sent(customer_id);

CREATE INDEX IF NOT EXISTS idx_bottle_keep_alerts_sent_alert_type 
ON bottle_keep_alerts_sent(alert_type);

GRANT ALL ON TABLE bottle_keep_alerts_sent TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE bottle_keep_alerts_sent_id_seq TO authenticated;

-- 3. Apply security fixes
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification logs"
  ON public.notification_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM staffs WHERE id = notification_logs.recipient_id
    )
  );

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

ALTER TABLE public.bottle_keep_alerts_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view bottle keep alerts"
  ON public.bottle_keep_alerts_sent
  FOR SELECT
  TO authenticated
  USING (true);

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

-- Fix function search_path
DROP FUNCTION IF EXISTS public.current_user_is_admin() CASCADE;

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

DROP FUNCTION IF EXISTS public.get_current_staff_id() CASCADE;

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

DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;

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

-- Add comments
COMMENT ON TABLE public.notification_logs IS 'Notification logs with RLS enabled for security';
COMMENT ON TABLE public.bottle_keep_alerts_sent IS 'Bottle keep alert tracking with RLS enabled for security';
COMMENT ON FUNCTION public.current_user_is_admin() IS 'Check if current user is admin with secure search_path';
COMMENT ON FUNCTION public.get_current_staff_id() IS 'Get current staff ID with secure search_path';
COMMENT ON FUNCTION public.get_current_user_role() IS 'Get current user role with secure search_path';
EOF

echo "Applying migrations to production Supabase..."

# Apply the migration using psql
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DATABASE -f /tmp/production_migration.sql

# Clean up
rm /tmp/production_migration.sql

echo "Migration completed!"