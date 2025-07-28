-- テーブル名の問題を修正

-- 1. table_name カラムが存在しない（table_number が正しい）
-- エラー: order=table_name.asc となっているが、カラム名は table_number

-- 2. is_active カラムが存在しない（is_available が正しい）
-- エラー: is_active=eq.true となっているが、カラム名は is_available

-- 3. casts_profile の外部キー名の問題
-- エラー: casts_profile_staff_id_fkey となっているが、実際の制約名を確認

-- 4. id_verifications テーブルが存在しない
-- このテーブルは定義されていない

-- テーブル構造を確認
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name IN ('tables', 'casts_profile', 'reservations')
ORDER BY table_name, ordinal_position;

-- 外部キー制約名を確認
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS foreign_table_name
FROM pg_constraint
WHERE contype = 'f'
    AND conrelid::regclass::text IN ('casts_profile', 'reservations')
ORDER BY conrelid::regclass::text;