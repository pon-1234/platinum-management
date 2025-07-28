-- 認証を完全に修正

-- 1. staffsテーブルのRLSポリシーを追加（anonユーザーも読み取り可能に）
DROP POLICY IF EXISTS "Enable read access for all users" ON staffs;
CREATE POLICY "Enable read access for all users" ON staffs
  FOR SELECT TO anon, authenticated USING (true);

-- 2. staffsテーブルの書き込みポリシーも確認
DROP POLICY IF EXISTS "Enable insert for auth users" ON staffs;
CREATE POLICY "Enable insert for auth users" ON staffs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable update for auth users" ON staffs;
CREATE POLICY "Enable update for auth users" ON staffs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 3. 全テーブルのRLSを一時的に無効化（テスト用）
-- ALTER TABLE staffs DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE visits DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE products DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- 4. 権限の再付与
GRANT SELECT ON staffs TO anon, authenticated;
GRANT ALL ON staffs TO authenticated;

-- 5. 確認
SELECT 
  current_user,
  has_table_privilege('anon', 'staffs', 'SELECT') as anon_can_select,
  has_table_privilege('authenticated', 'staffs', 'SELECT') as auth_can_select;