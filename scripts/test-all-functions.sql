-- 全ての関数をテストするスクリプト
-- ローカル環境で実行して問題がないことを確認

-- 1. ダッシュボード統計
SELECT * FROM get_dashboard_stats(CURRENT_DATE);

-- 2. 在庫統計
SELECT * FROM get_inventory_stats();

-- 3. 在庫アラート
SELECT * FROM get_inventory_alerts();

-- 4. 低在庫商品
SELECT * FROM get_low_stock_products();

-- 5. カテゴリ一覧
SELECT * FROM get_distinct_product_categories();

-- 6. 日次売上レポート
SELECT * FROM generate_daily_billing_report(CURRENT_DATE);

-- 7. トップ商品
SELECT * FROM get_top_products_with_details(CURRENT_DATE, 5);

-- 8. トップキャスト
SELECT * FROM get_top_cast_performance(CURRENT_DATE, 5);

-- 9. 勤怠ダッシュボード
SELECT * FROM get_attendance_dashboard_stats(CURRENT_DATE);

-- 10. キャストランキング
SELECT * FROM get_cast_ranking(
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE,
  10
);

-- 11. テーブル構造の確認
SELECT 
  t.table_name,
  array_agg(
    c.column_name || ' ' || c.data_type 
    ORDER BY c.ordinal_position
  ) as columns
FROM information_schema.tables t
JOIN information_schema.columns c 
  ON t.table_name = c.table_name 
  AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
ORDER BY t.table_name;