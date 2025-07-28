-- ==========================================
-- 認証関数の追加
-- ==========================================

-- get_current_user_staff_role関数を作成
-- この関数はミドルウェアから呼び出され、現在のユーザーのロールを返す
CREATE OR REPLACE FUNCTION get_current_user_staff_role()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- 現在のユーザーのロールを取得
  SELECT role INTO user_role
  FROM staffs
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
  
  -- ロールが見つからない場合はNULLを返す
  RETURN user_role;
END;
$$ LANGUAGE plpgsql;

-- 関数への権限を付与
GRANT EXECUTE ON FUNCTION get_current_user_staff_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_staff_role() TO anon;

-- コメントを追加
COMMENT ON FUNCTION get_current_user_staff_role() IS 'ミドルウェアから呼び出され、現在認証されているユーザーのスタッフロールを返す関数';