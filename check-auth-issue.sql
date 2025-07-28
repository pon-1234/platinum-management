-- 認証問題の診断

-- 1. Authユーザーの存在確認
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'admin@platinum-demo.com';

-- 2. Staffレコードの確認
SELECT 
  id,
  user_id,
  email,
  role,
  is_active
FROM public.staffs 
WHERE email = 'admin@platinum-demo.com';

-- 3. 両方を結合して確認
SELECT 
  u.id as auth_id,
  u.email as auth_email,
  s.id as staff_id,
  s.user_id as staff_user_id,
  s.role,
  s.is_active
FROM auth.users u
LEFT JOIN public.staffs s ON u.id = s.user_id
WHERE u.email = 'admin@platinum-demo.com';

-- 4. RLSポリシーの確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'staffs';