-- ログイン認証問題を修正

-- 1. get_current_user_staff_role関数を作成
CREATE OR REPLACE FUNCTION get_current_user_staff_role()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- 現在のユーザーのロールを取得
  SELECT role INTO user_role
  FROM staffs
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
  
  -- ロールが見つからない場合はNULLを返す
  RETURN user_role;
END;
$$ LANGUAGE plpgsql;

-- 2. 関数への権限を付与
GRANT EXECUTE ON FUNCTION get_current_user_staff_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_staff_role() TO anon;

-- 3. staffsテーブルのRLSポリシーを修正
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view their own staff record" ON staffs;
DROP POLICY IF EXISTS "Users can update their own staff record" ON staffs;
DROP POLICY IF EXISTS "Enable read access for all users" ON staffs;
DROP POLICY IF EXISTS "Enable insert for auth users" ON staffs;
DROP POLICY IF EXISTS "Enable update for auth users" ON staffs;

-- 新しいポリシーを作成
CREATE POLICY "Enable read for authenticated users" ON staffs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users" ON staffs  
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update own record" ON staffs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. データベース内のスタッフレコードを確認・修正
-- ユーザーIDがa2b4d3c8-af32-4205-8ae6-207df5b5ac06のスタッフレコードを更新
UPDATE staffs 
SET is_active = true
WHERE user_id = 'a2b4d3c8-af32-4205-8ae6-207df5b5ac06'::uuid;

-- 5. 確認クエリ
SELECT 
  s.id,
  s.user_id,
  s.email,
  s.role,
  s.is_active,
  au.id as auth_user_id,
  au.email as auth_email
FROM staffs s
LEFT JOIN auth.users au ON s.user_id = au.id
WHERE s.user_id = 'a2b4d3c8-af32-4205-8ae6-207df5b5ac06'::uuid;