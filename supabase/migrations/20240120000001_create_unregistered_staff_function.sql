-- =============================================================================
-- 未登録スタッフ取得用の関数とビュー
-- =============================================================================
-- キャストとして未登録のスタッフを効率的に取得するための関数を作成します。

-- 未登録スタッフを取得するビューの作成
CREATE OR REPLACE VIEW unregistered_staff_view AS
SELECT 
  s.id,
  s.user_id,
  s.full_name,
  s.role,
  s.hire_date,
  s.is_active,
  s.created_at,
  s.updated_at
FROM staffs s
LEFT JOIN casts_profile cp ON s.id = cp.staff_id
WHERE cp.staff_id IS NULL
  AND s.is_active = true
ORDER BY s.created_at DESC;

-- ビューに対するRLSポリシーを設定
ALTER VIEW unregistered_staff_view SET (security_invoker = true);

-- 未登録スタッフを取得する関数（ページネーション対応）
CREATE OR REPLACE FUNCTION get_unregistered_staff(
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 20,
  p_search_query TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name TEXT,
  role TEXT,
  hire_date DATE,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_count BIGINT,
  has_more BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_offset INTEGER;
  v_total_count BIGINT;
BEGIN
  -- 権限チェック
  IF NOT has_permission(auth.uid(), 'cast', 'view') THEN
    RAISE EXCEPTION 'Insufficient permissions to view staff data';
  END IF;

  -- オフセットを計算
  v_offset := (p_page - 1) * p_limit;
  
  -- 総数を取得
  SELECT COUNT(*)
  INTO v_total_count
  FROM staffs s
  LEFT JOIN casts_profile cp ON s.id = cp.staff_id
  WHERE cp.staff_id IS NULL
    AND s.is_active = true
    AND (p_search_query IS NULL OR s.full_name ILIKE '%' || p_search_query || '%');
  
  -- ページネーションされたデータを返す
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    s.full_name,
    s.role,
    s.hire_date,
    s.is_active,
    s.created_at,
    s.updated_at,
    v_total_count AS total_count,
    (v_offset + p_limit < v_total_count) AS has_more
  FROM staffs s
  LEFT JOIN casts_profile cp ON s.id = cp.staff_id
  WHERE cp.staff_id IS NULL
    AND s.is_active = true
    AND (p_search_query IS NULL OR s.full_name ILIKE '%' || p_search_query || '%')
  ORDER BY s.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

-- 未登録スタッフの総数を取得する関数
CREATE OR REPLACE FUNCTION get_unregistered_staff_count()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  -- 権限チェック
  IF NOT has_permission(auth.uid(), 'cast', 'view') THEN
    RAISE EXCEPTION 'Insufficient permissions to view staff data';
  END IF;

  SELECT COUNT(*)
  INTO v_count
  FROM staffs s
  LEFT JOIN casts_profile cp ON s.id = cp.staff_id
  WHERE cp.staff_id IS NULL
    AND s.is_active = true;
  
  RETURN v_count;
END;
$$;

-- インデックスの追加（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_casts_profile_staff_id_unique ON casts_profile(staff_id) WHERE staff_id IS NOT NULL;