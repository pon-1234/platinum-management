-- Supabase Dashboardで作成されたユーザーに対応するstaffレコードを作成
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
) ON CONFLICT (user_id) 
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- 確認
SELECT * FROM public.staffs WHERE user_id = 'a2b4d3c8-af32-4205-8ae6-207df5b5ac06';