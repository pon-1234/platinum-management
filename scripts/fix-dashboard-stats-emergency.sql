-- 緊急修正: get_dashboard_stats関数（アクティブチェックを削除）
-- 本番環境のカラム名が不明なため、一時的にアクティブチェックを削除

DROP FUNCTION IF EXISTS get_dashboard_stats(DATE) CASCADE;

CREATE OR REPLACE FUNCTION get_dashboard_stats(report_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  today_sales NUMERIC,
  today_visits NUMERIC,
  today_customers NUMERIC,
  today_new_customers NUMERIC,
  active_cast_count NUMERIC,
  active_table_count NUMERIC,
  low_stock_count NUMERIC,
  pending_reservations NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- 本日の売上
    (SELECT COALESCE(SUM(oi.total_price), 0)
     FROM order_items oi
     JOIN visits v ON oi.visit_id = v.id
     WHERE v.check_in_at::date = report_date
       AND v.status = 'completed')::NUMERIC AS today_sales,
    
    -- 本日の来店数
    (SELECT COUNT(*)
     FROM visits
     WHERE check_in_at::date = report_date
       AND status IN ('checked_in', 'completed'))::NUMERIC AS today_visits,
    
    -- 本日の顧客数（重複除外）
    (SELECT COUNT(DISTINCT customer_id)
     FROM visits
     WHERE check_in_at::date = report_date
       AND status IN ('checked_in', 'completed'))::NUMERIC AS today_customers,
    
    -- 本日の新規顧客数
    (SELECT COUNT(DISTINCT c.id)
     FROM customers c
     WHERE c.created_at::date = report_date
       AND c.is_deleted = false)::NUMERIC AS today_new_customers,
    
    -- アクティブなキャスト数（アクティブチェックを一時的に削除）
    (SELECT COUNT(*)
     FROM staffs s
     JOIN casts_profile cp ON s.id = cp.staff_id)::NUMERIC AS active_cast_count,
    
    -- アクティブなテーブル数（アクティブチェックを一時的に削除）
    (SELECT COUNT(*)
     FROM tables)::NUMERIC AS active_table_count,
    
    -- 在庫不足商品数（アクティブチェックを一時的に削除）
    (SELECT COUNT(*)
     FROM products
     WHERE stock_quantity <= low_stock_threshold)::NUMERIC AS low_stock_count,
    
    -- 本日の予約数（未チェックイン）
    (SELECT COUNT(*)
     FROM reservations
     WHERE reservation_date = report_date
       AND status IN ('pending', 'confirmed'))::NUMERIC AS pending_reservations;
END;
$$ LANGUAGE plpgsql;

-- 権限付与
GRANT EXECUTE ON FUNCTION get_dashboard_stats(DATE) TO anon, authenticated;

-- 関数の動作確認
SELECT * FROM get_dashboard_stats(CURRENT_DATE);