-- Seed data for development environment
-- This file is automatically run after migrations during `supabase db reset`

-- Create admin user in staffs table
-- Note: You need to create the auth user separately in Supabase Dashboard
INSERT INTO public.staffs (
  user_id,
  full_name,
  email,
  phone,
  role,
  is_active
) VALUES (
  'a2b4d3c8-af32-4205-8ae6-207df5b5ac06',
  'Admin User',
  'admin@platinum-demo.com',
  '090-1234-5678',
  'admin',
  true
) ON CONFLICT (user_id) DO NOTHING;