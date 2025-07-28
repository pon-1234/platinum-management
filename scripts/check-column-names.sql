-- 各テーブルの実際のカラム名を確認

-- staffsテーブル
SELECT 
    'staffs' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'staffs'
ORDER BY ordinal_position;

-- casts_profileテーブル
SELECT 
    'casts_profile' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'casts_profile'
ORDER BY ordinal_position;

-- tablesテーブル
SELECT 
    'tables' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'tables'
ORDER BY ordinal_position;

-- productsテーブル
SELECT 
    'products' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'products'
ORDER BY ordinal_position;

-- qr_codesテーブル
SELECT 
    'qr_codes' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'qr_codes'
ORDER BY ordinal_position;

-- shift_templatesテーブル
SELECT 
    'shift_templates' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'shift_templates'
ORDER BY ordinal_position;