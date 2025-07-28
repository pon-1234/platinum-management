-- Create admin user for testing
-- Email: admin@platinum-demo.com
-- Password: admin123456

-- First, create the auth user
-- Note: This needs to be run in Supabase Dashboard's SQL Editor

-- Step 1: Create auth user (this will return the user ID)
-- You need to run this in the SQL editor and note the returned user_id
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@platinum-demo.com',
  crypt('admin123456', gen_salt('bf')),
  now(),
  now(),
  '',
  now(),
  '',
  now(),
  '',
  '',
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  now(),
  now(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL
) RETURNING id;

-- Step 2: After getting the user_id from above, create the staff record
-- Replace 'YOUR_USER_ID_HERE' with the actual UUID returned from step 1
/*
INSERT INTO public.staffs (
  user_id,
  full_name,
  email,
  phone,
  role,
  is_active
) VALUES (
  'YOUR_USER_ID_HERE', -- Replace with the UUID from step 1
  'Admin User',
  'admin@platinum-demo.com',
  '090-1234-5678',
  'admin',
  true
);
*/

-- Alternative: Use Supabase Auth Admin API to create user
-- This is the recommended approach for production