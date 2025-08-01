-- 在庫管理のパフォーマンス最適化

-- 1. 統計情報用のマテリアライズドビューを作成
CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_stats_mv AS
SELECT
  COUNT(*)::INTEGER AS total_products,
  COUNT(CASE WHEN stock_quantity <= low_stock_threshold AND stock_quantity > 0 THEN 1 END)::INTEGER AS low_stock_items,
  COUNT(CASE WHEN stock_quantity = 0 THEN 1 END)::INTEGER AS out_of_stock_items,
  COALESCE(SUM(stock_quantity * cost), 0)::NUMERIC AS total_value
FROM products
WHERE is_active = true;

-- インデックスを追加
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_stats_mv ON inventory_stats_mv ((1));

-- 2. アラート用のマテリアライズドビューを作成
CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_alerts_mv AS
SELECT
  CASE
    WHEN stock_quantity = 0 THEN 'out-' || id::TEXT
    WHEN stock_quantity <= low_stock_threshold THEN 'low-' || id::TEXT
    ELSE 'over-' || id::TEXT
  END AS id,
  id::TEXT AS product_id,
  name AS product_name,
  stock_quantity AS current_stock,
  CASE
    WHEN stock_quantity = 0 OR stock_quantity <= low_stock_threshold THEN low_stock_threshold
    ELSE max_stock
  END AS threshold,
  CASE
    WHEN stock_quantity = 0 THEN 'out_of_stock'
    WHEN stock_quantity <= low_stock_threshold THEN 'low_stock'
    ELSE 'overstock'
  END AS alert_type,
  CASE
    WHEN stock_quantity = 0 THEN 'critical'
    ELSE 'warning'
  END AS severity
FROM products
WHERE is_active = true
  AND (stock_quantity = 0 OR stock_quantity <= low_stock_threshold OR stock_quantity >= max_stock)
ORDER BY
  CASE WHEN stock_quantity = 0 THEN 1 ELSE 2 END,
  stock_quantity;

-- 3. 製品検索用のインデックスを追加（まだ存在しない場合）
CREATE INDEX IF NOT EXISTS idx_products_search ON products 
USING gin (name gin_trgm_ops) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_stock_status ON products (stock_quantity, low_stock_threshold) 
WHERE is_active = true;

-- 4. マテリアライズドビューを更新する関数
CREATE OR REPLACE FUNCTION refresh_inventory_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_stats_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_alerts_mv;
END;
$$ LANGUAGE plpgsql;

-- 5. 製品が更新されたときにマテリアライズドビューを更新するトリガー
CREATE OR REPLACE FUNCTION trigger_refresh_inventory_stats()
RETURNS trigger AS $$
BEGIN
  -- 非同期で実行するためにpg_notify を使用
  PERFORM pg_notify('refresh_inventory_stats', '');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成
DROP TRIGGER IF EXISTS refresh_inventory_stats_trigger ON products;
CREATE TRIGGER refresh_inventory_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_inventory_stats();

-- 6. 最適化されたページデータ取得関数
CREATE OR REPLACE FUNCTION get_inventory_page_data_optimized(
  p_category TEXT DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL,
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH filtered_products AS (
    SELECT 
      id,
      name,
      category,
      price,
      cost,
      stock_quantity,
      low_stock_threshold,
      max_stock,
      reorder_point,
      is_active,
      created_at,
      updated_at
    FROM products
    WHERE is_active = true
      AND (p_category IS NULL OR category = p_category)
      AND (p_search_term IS NULL OR name ILIKE '%' || p_search_term || '%')
    ORDER BY name
    LIMIT p_limit
    OFFSET p_offset
  ),
  categories AS (
    SELECT DISTINCT category
    FROM products
    WHERE is_active = true
    ORDER BY category
  )
  SELECT json_build_object(
    'products', COALESCE((SELECT json_agg(p.*) FROM filtered_products p), '[]'::JSON),
    'stats', (SELECT row_to_json(s.*) FROM inventory_stats_mv s),
    'alerts', COALESCE((SELECT json_agg(a.*) FROM inventory_alerts_mv a), '[]'::JSON),
    'categories', COALESCE((SELECT json_agg(c.category) FROM categories c), '[]'::JSON),
    'total_count', (
      SELECT COUNT(*)
      FROM products
      WHERE is_active = true
        AND (p_category IS NULL OR category = p_category)
        AND (p_search_term IS NULL OR name ILIKE '%' || p_search_term || '%')
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 初回のマテリアライズドビューをリフレッシュ
REFRESH MATERIALIZED VIEW inventory_stats_mv;
REFRESH MATERIALIZED VIEW inventory_alerts_mv;

-- 8. 定期的にマテリアライズドビューを更新するための推奨設定
-- 注: これはcronジョブやSupabaseのEdge Functionsで実装することを推奨
-- 例: 1時間ごとに SELECT refresh_inventory_stats(); を実行