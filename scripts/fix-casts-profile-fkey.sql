-- casts_profile外部キー名の問題を修正

-- 現在の外部キー制約を確認
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS foreign_table_name
FROM pg_constraint
WHERE contype = 'f'
    AND conrelid::regclass::text = 'casts_profile'
ORDER BY conrelid::regclass::text;

-- 正しい外部キー名を使用するためのビューを作成
CREATE OR REPLACE VIEW casts_profile_with_staff AS
SELECT 
    cp.*,
    s.full_name as staff_full_name,
    s.email as staff_email,
    s.phone as staff_phone
FROM casts_profile cp
JOIN staffs s ON cp.staff_id = s.id;

-- 既存の外部キー制約名を確認（予想される制約名）
-- 通常は: casts_profile_staff_id_fkey または fk_casts_profile_staff_id

-- 実際の制約名を確認した後、必要に応じて以下を実行：
-- ALTER TABLE casts_profile DROP CONSTRAINT IF EXISTS casts_profile_staff_id_fkey;
-- ALTER TABLE casts_profile ADD CONSTRAINT casts_profile_staff_id_fkey 
--   FOREIGN KEY (staff_id) REFERENCES staffs(id) ON DELETE CASCADE;