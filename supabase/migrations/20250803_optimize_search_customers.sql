-- 顧客検索関数を最適化して、一度のクエリで全情報を取得
CREATE OR REPLACE FUNCTION search_customers_optimized(
  search_term TEXT,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  name_kana TEXT,
  phone_number TEXT,
  line_id TEXT,
  birthday DATE,
  job TEXT,
  memo TEXT,
  source TEXT,
  rank TEXT,
  status customer_status,
  last_visit_date DATE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  updated_by UUID,
  similarity REAL
) AS $$
BEGIN
  IF LENGTH(search_term) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.name_kana,
    c.phone_number,
    c.line_id,
    c.birthday,
    c.job,
    c.memo,
    c.source,
    c.rank,
    c.status,
    c.last_visit_date,
    c.created_at,
    c.updated_at,
    c.created_by,
    c.updated_by,
    GREATEST(
      similarity(COALESCE(c.name, ''), search_term),
      similarity(COALESCE(c.name_kana, ''), search_term),
      similarity(COALESCE(c.phone_number, ''), search_term),
      similarity(COALESCE(c.line_id, ''), search_term)
    ) as sim
  FROM customers c
  WHERE
    c.name % search_term OR
    c.name_kana % search_term OR
    c.phone_number % search_term OR
    c.line_id % search_term
  ORDER BY sim DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;