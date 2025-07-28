-- Admin user creation script for Supabase
-- Email: admin@platinum-demo.com
-- UUID: a2b4d3c8-af32-4205-8ae6-207df5b5ac06

-- Create the admin user in auth.users table
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a2b4d3c8-af32-4205-8ae6-207df5b5ac06',
  'authenticated',
  'authenticated',
  'admin@platinum-demo.com',
  crypt('admin123456', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Create the corresponding staff record
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

-- Verify the user was created
SELECT 
  u.id,
  u.email,
  s.full_name,
  s.role
FROM auth.users u
LEFT JOIN public.staffs s ON u.id = s.user_id
WHERE u.email = 'admin@platinum-demo.com';