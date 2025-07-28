-- スキーマを確認してから適切な修正を適用

-- 1. 各テーブルのカラムを確認
DO $$
DECLARE
    staff_active_col TEXT;
    cast_active_col TEXT;
    table_active_col TEXT;
    product_active_col TEXT;
BEGIN
    -- staffsテーブルのアクティブ系カラムを探す
    SELECT column_name INTO staff_active_col
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
        AND table_name = 'staffs'
        AND column_name IN ('is_active', 'is_available', 'active', 'status')
    LIMIT 1;

    -- casts_profileテーブルのアクティブ系カラムを探す
    SELECT column_name INTO cast_active_col
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
        AND table_name = 'casts_profile'
        AND column_name IN ('is_active', 'is_available', 'active', 'status')
    LIMIT 1;

    -- tablesテーブルのアクティブ系カラムを探す
    SELECT column_name INTO table_active_col
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
        AND table_name = 'tables'
        AND column_name IN ('is_active', 'is_available', 'active', 'status')
    LIMIT 1;

    -- productsテーブルのアクティブ系カラムを探す
    SELECT column_name INTO product_active_col
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
        AND table_name = 'products'
        AND column_name IN ('is_active', 'is_available', 'active', 'status')
    LIMIT 1;

    -- 結果を表示
    RAISE NOTICE 'staffs active column: %', COALESCE(staff_active_col, 'NOT FOUND');
    RAISE NOTICE 'casts_profile active column: %', COALESCE(cast_active_col, 'NOT FOUND');
    RAISE NOTICE 'tables active column: %', COALESCE(table_active_col, 'NOT FOUND');
    RAISE NOTICE 'products active column: %', COALESCE(product_active_col, 'NOT FOUND');
END $$;

-- 2. テーブル構造の詳細を表示
\d staffs
\d casts_profile  
\d tables
\d products