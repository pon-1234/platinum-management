-- 実際のカラム名を確認するスクリプト

-- staffsテーブルのカラムを確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'staffs' 
ORDER BY ordinal_position;

-- casts_profileテーブルのカラムを確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'casts_profile' 
ORDER BY ordinal_position;

-- tablesテーブルのカラムを確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tables' 
ORDER BY ordinal_position;

-- productsテーブルのカラムを確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;