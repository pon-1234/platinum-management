-- Fix order_items table RLS policies

-- 1. order_items table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- 全ポリシーを削除
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'order_items'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON order_items', r.policyname);
    END LOOP;
END $$;

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_policy" ON order_items FOR SELECT TO anon USING (true);
GRANT SELECT ON order_items TO anon;

-- 2. visits table (再確認)
GRANT SELECT ON visits TO anon;

-- 3. テーブル権限の確認
SELECT 
  tablename,
  has_table_privilege('anon', tablename, 'SELECT') as can_select
FROM (VALUES 
  ('visits'),
  ('order_items')
) AS t(tablename);

-- 4. order_itemsテーブルが存在するか確認
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'order_items'
) as order_items_exists;

-- 5. visits関連のテーブルを確認
SELECT 
  tablename,
  COUNT(*) as policy_count,
  bool_or(roles::text LIKE '%anon%' OR roles IS NULL OR roles = '{}') as anon_has_access
FROM pg_policies 
WHERE tablename IN ('visits', 'order_items')
GROUP BY tablename
ORDER BY tablename;