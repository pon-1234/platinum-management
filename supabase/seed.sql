-- Seed data for local development environment
-- This file is automatically run after migrations during `supabase db reset`
-- Note: Production environment uses migration file for initial data

-- Create test auth users for local development only
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES (
  'a2b4d3c8-af32-4205-8ae6-207df5b5ac06',
  'admin@platinum-demo.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}'
)
ON CONFLICT (id) DO NOTHING;

-- Create admin user in staffs table for local development
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