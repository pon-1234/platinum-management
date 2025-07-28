# Admin User Setup Guide

## 方法1: Supabase Dashboard（推奨）

1. **Supabase Dashboardにアクセス**
   https://supabase.com/dashboard/project/pdomeeyvatachcothudq/auth/users

2. **「Invite user」ボタンをクリック**

3. **以下の情報を入力**:
   - Email: `admin@platinum-demo.com`
   - Send invitation email: OFF（チェックを外す）
   - Auto Confirm User: ON（チェックを入れる）

4. **「Create user」をクリック**

5. **作成されたユーザーのUUIDをコピー**

6. **SQL Editorで以下を実行**:
   ```sql
   -- ユーザーIDを置き換えてください
   INSERT INTO public.staffs (
     user_id,
     full_name,
     email,
     phone,
     role,
     is_active
   ) VALUES (
     'ここにコピーしたUUIDを貼り付け',
     'Admin User',
     'admin@platinum-demo.com',
     '090-1234-5678',
     'admin',
     true
   );
   ```

7. **パスワードをリセット**:
   - Dashboardでユーザーを選択
   - 「Send password reset」をクリック
   - メールでパスワードリセットリンクを受け取る

## 方法2: 一時的なテスト用ユーザー作成

SQL Editorで以下を実行:

```sql
-- Create a function to create test user
CREATE OR REPLACE FUNCTION create_test_admin_user()
RETURNS TABLE (user_id UUID, message TEXT) AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Create auth user
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
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@platinum-demo.com',
    crypt('Admin123!@#', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    now(),
    now()
  ) RETURNING id INTO new_user_id;

  -- Create staff record
  INSERT INTO public.staffs (
    user_id,
    full_name,
    email,
    phone,
    role,
    is_active
  ) VALUES (
    new_user_id,
    'Admin User',
    'admin@platinum-demo.com',
    '090-1234-5678',
    'admin',
    true
  );

  RETURN QUERY SELECT new_user_id, 'User created successfully. Password: Admin123!@#'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT * FROM create_test_admin_user();

-- Clean up
DROP FUNCTION create_test_admin_user();
```

## セキュリティ注意事項

- 本番環境では必ず強力なパスワードを使用してください
- テスト用のパスワードは速やかに変更してください
- Supabase Dashboardからのユーザー作成が最も安全です