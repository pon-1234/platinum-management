-- Optimize inventory performance with database-side aggregation

-- 1. Create optimized inventory stats function
CREATE OR REPLACE FUNCTION get_inventory_stats()
RETURNS TABLE (
  total_products BIGINT,
  low_stock_items BIGINT,
  out_of_stock_items BIGINT,
  total_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_products,
    COUNT(*) FILTER (WHERE stock_quantity > 0 AND stock_quantity <= low_stock_threshold) AS low_stock_items,
    COUNT(*) FILTER (WHERE stock_quantity = 0) AS out_of_stock_items,
    COALESCE(SUM(stock_quantity::NUMERIC * cost::NUMERIC), 0) AS total_value
  FROM products
  WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;

-- 2. Create function to get distinct categories
CREATE OR REPLACE FUNCTION get_distinct_product_categories()
RETURNS TABLE (category TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.category
  FROM products p
  WHERE p.is_active = true
  ORDER BY p.category;
END;
$$ LANGUAGE plpgsql;

-- 3. Create function to get inventory alerts
CREATE OR REPLACE FUNCTION get_inventory_alerts()
RETURNS TABLE (
  id TEXT,
  product_id INTEGER,
  product_name TEXT,
  current_stock INTEGER,
  threshold INTEGER,
  alert_type TEXT,
  severity TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN p.stock_quantity = 0 THEN 'out-' || p.id::TEXT
      WHEN p.stock_quantity <= p.low_stock_threshold THEN 'low-' || p.id::TEXT
      ELSE 'over-' || p.id::TEXT
    END as id,
    p.id as product_id,
    p.name as product_name,
    p.stock_quantity as current_stock,
    CASE 
      WHEN p.stock_quantity = 0 THEN p.low_stock_threshold
      WHEN p.stock_quantity <= p.low_stock_threshold THEN p.low_stock_threshold
      ELSE p.max_stock
    END as threshold,
    CASE 
      WHEN p.stock_quantity = 0 THEN 'out_of_stock'
      WHEN p.stock_quantity <= p.low_stock_threshold THEN 'low_stock'
      ELSE 'overstock'
    END as alert_type,
    CASE 
      WHEN p.stock_quantity = 0 THEN 'critical'
      ELSE 'warning'
    END as severity
  FROM products p
  WHERE p.is_active = true
    AND (p.stock_quantity = 0 
         OR p.stock_quantity <= p.low_stock_threshold 
         OR p.stock_quantity >= p.max_stock)
  ORDER BY 
    CASE WHEN p.stock_quantity = 0 THEN 1 ELSE 2 END,
    p.stock_quantity;
END;
$$ LANGUAGE plpgsql;

-- 4. Optimize get_low_stock_products function
DROP FUNCTION IF EXISTS get_low_stock_products();
CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS SETOF products AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM products
  WHERE is_active = true 
  AND stock_quantity <= low_stock_threshold
  ORDER BY stock_quantity, name;
END;
$$ LANGUAGE plpgsql;

-- 5. Create inventory movement summary function
CREATE OR REPLACE FUNCTION get_inventory_movement_summary(
  p_product_id INTEGER DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_in BIGINT,
  total_out BIGINT,
  total_adjustments BIGINT,
  movement_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE 0 END), 0) AS total_in,
    COALESCE(SUM(CASE WHEN movement_type = 'out' THEN quantity ELSE 0 END), 0) AS total_out,
    COALESCE(SUM(CASE WHEN movement_type = 'adjustment' THEN 1 ELSE 0 END), 0) AS total_adjustments,
    COUNT(*) AS movement_count
  FROM inventory_movements
  WHERE (p_product_id IS NULL OR product_id = p_product_id)
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- 6. Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_is_active_category ON products(is_active, category);
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(stock_quantity, low_stock_threshold) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category) WHERE is_active = true;

-- 7. Create combined inventory page data function
CREATE OR REPLACE FUNCTION get_inventory_page_data(
  p_category TEXT DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
  products JSON,
  stats JSON,
  alerts JSON,
  categories JSON
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_products AS (
    SELECT 
      p.id,
      p.name,
      p.category,
      p.price,
      p.cost,
      p.stock_quantity,
      p.low_stock_threshold,
      p.reorder_point,
      p.max_stock,
      p.is_active,
      p.created_at,
      p.updated_at
    FROM products p
    WHERE p.is_active = true
      AND (p_category IS NULL OR p_category = 'all' OR p.category = p_category)
      AND (p_search_term IS NULL OR p.name ILIKE '%' || p_search_term || '%')
    ORDER BY p.name
  ),
  inventory_stats AS (
    SELECT * FROM get_inventory_stats()
  ),
  inventory_alerts AS (
    SELECT * FROM get_inventory_alerts()
  ),
  distinct_categories AS (
    SELECT * FROM get_distinct_product_categories()
  )
  SELECT
    (SELECT json_agg(row_to_json(fp.*)) FROM filtered_products fp) AS products,
    (SELECT row_to_json(ist.*) FROM inventory_stats ist) AS stats,
    (SELECT json_agg(row_to_json(ia.*)) FROM inventory_alerts ia) AS alerts,
    (SELECT json_agg(category) FROM distinct_categories) AS categories;
END;
$$ LANGUAGE plpgsql;

-- 8. Grant permissions on new functions
GRANT EXECUTE ON FUNCTION get_inventory_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_distinct_product_categories() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_alerts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_movement_summary(INTEGER, DATE, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_page_data(TEXT, TEXT) TO anon, authenticated;

-- 9. Analyze tables for query optimization
ANALYZE products;
ANALYZE inventory_movements;