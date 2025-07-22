-- シンプルで効果的なRLS無限再帰の解決策
-- SECURITY DEFINERを使用した安全なロール取得関数

-- 1. 既存の問題のあるポリシーを削除
DROP POLICY IF EXISTS "managers_can_view_all_staff" ON staffs;
DROP POLICY IF EXISTS "staff_can_view_own_record" ON staffs;
DROP POLICY IF EXISTS "managers_can_insert_staff" ON staffs;
DROP POLICY IF EXISTS "managers_can_update_staff" ON staffs;
DROP POLICY IF EXISTS "staff_can_update_own_basic_info" ON staffs;
DROP POLICY IF EXISTS "admins_can_delete_staff" ON staffs;

-- 他の一時的なポリシーも削除
DROP POLICY IF EXISTS "service_role_full_access" ON staffs;
DROP POLICY IF EXISTS "authenticated_users_conditional_access" ON staffs;
DROP POLICY IF EXISTS "managers_can_view_all_staff_v2" ON staffs;
DROP POLICY IF EXISTS "staff_can_view_own_record_v2" ON staffs;
DROP POLICY IF EXISTS "managers_can_insert_staff_v2" ON staffs;
DROP POLICY IF EXISTS "managers_can_update_staff_v2" ON staffs;
DROP POLICY IF EXISTS "admins_can_delete_staff_v2" ON staffs;
DROP POLICY IF EXISTS "service_role_full_access_v2" ON staffs;

-- 2. 安全なロール取得関数を作成（SECURITY DEFINERでRLSをバイパス）
CREATE OR REPLACE FUNCTION get_current_user_staff_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
  current_user_id UUID;
BEGIN
  -- 現在の認証されたユーザーIDを取得
  current_user_id := auth.uid();
  
  -- ユーザーが認証されていない場合はNULLを返す
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- SECURITY DEFINERにより、この関数はRLSをバイパスして実行される
  SELECT role INTO user_role
  FROM staffs
  WHERE user_id = current_user_id 
    AND is_active = true;
  
  RETURN user_role;
END;
$$;

-- 3. より具体的なロールチェック関数も作成
CREATE OR REPLACE FUNCTION current_user_has_role(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := get_current_user_staff_role();
  RETURN user_role = ANY(required_roles);
END;
$$;

-- 4. 管理者チェック関数
CREATE OR REPLACE FUNCTION current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN get_current_user_staff_role() = 'admin';
END;
$$;

-- 5. 管理者またはマネージャーチェック関数
CREATE OR REPLACE FUNCTION current_user_is_manager_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN current_user_has_role(ARRAY['admin', 'manager']);
END;
$$;

-- 6. 新しい安全なポリシーを作成

-- ポリシー1: スタッフは自分のレコードを見ることができる
CREATE POLICY "staff_can_view_own_record" ON staffs
  FOR SELECT
  USING (user_id = auth.uid());

-- ポリシー2: 管理者とマネージャーは全スタッフを見ることができる
CREATE POLICY "managers_can_view_all_staff" ON staffs
  FOR SELECT
  USING (current_user_is_manager_or_admin());

-- ポリシー3: サービスロールは全アクセス可能
CREATE POLICY "service_role_full_access" ON staffs
  FOR ALL
  USING (auth.role() = 'service_role');

-- ポリシー4: 管理者とマネージャーはスタッフを追加できる
CREATE POLICY "managers_can_insert_staff" ON staffs
  FOR INSERT
  WITH CHECK (current_user_is_manager_or_admin() OR auth.role() = 'service_role');

-- ポリシー5: 管理者とマネージャーはスタッフを更新できる
CREATE POLICY "managers_can_update_staff" ON staffs
  FOR UPDATE
  USING (current_user_is_manager_or_admin() OR auth.role() = 'service_role');

-- ポリシー6: スタッフは自分の基本情報を更新できる（役割と有効状態は除く）
CREATE POLICY "staff_can_update_own_basic_info" ON staffs
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() 
    AND role = OLD.role -- 自分の役割は変更不可
    AND is_active = OLD.is_active -- 自分の有効状態は変更不可
  );

-- ポリシー7: 管理者のみスタッフを削除できる
CREATE POLICY "admins_can_delete_staff" ON staffs
  FOR DELETE
  USING (current_user_is_admin() OR auth.role() = 'service_role');

-- 7. 関数の実行権限を付与
GRANT EXECUTE ON FUNCTION get_current_user_staff_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION current_user_has_role(TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION current_user_is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION current_user_is_manager_or_admin() TO authenticated, service_role;

-- 8. casts_profileテーブルのポリシーも同様に修正
DROP POLICY IF EXISTS "cast_can_view_own_profile" ON casts_profile;
DROP POLICY IF EXISTS "managers_can_view_all_cast_profiles" ON casts_profile;
DROP POLICY IF EXISTS "hall_staff_can_view_cast_profiles" ON casts_profile;
DROP POLICY IF EXISTS "cast_can_update_own_profile" ON casts_profile;
DROP POLICY IF EXISTS "managers_can_manage_cast_profiles" ON casts_profile;

-- casts_profileの新しいポリシー
CREATE POLICY "cast_can_view_own_profile" ON casts_profile
  FOR SELECT
  USING (
    staff_id IN (SELECT id FROM staffs WHERE user_id = auth.uid())
  );

CREATE POLICY "managers_can_view_all_cast_profiles" ON casts_profile
  FOR SELECT
  USING (current_user_is_manager_or_admin());

CREATE POLICY "hall_staff_can_view_cast_profiles" ON casts_profile
  FOR SELECT
  USING (current_user_has_role(ARRAY['hall']));

CREATE POLICY "cast_can_update_own_profile" ON casts_profile
  FOR UPDATE
  USING (
    staff_id IN (SELECT id FROM staffs WHERE user_id = auth.uid())
  )
  WITH CHECK (
    staff_id IN (SELECT id FROM staffs WHERE user_id = auth.uid())
    AND hourly_wage = OLD.hourly_wage -- 時給は変更不可
    AND commission_rate = OLD.commission_rate -- 歩合は変更不可
  );

CREATE POLICY "managers_can_manage_cast_profiles" ON casts_profile
  FOR ALL
  USING (current_user_is_manager_or_admin() OR auth.role() = 'service_role');

-- 9. パフォーマンス向上のためのコメント
COMMENT ON FUNCTION get_current_user_staff_role() IS 'SECURITY DEFINERによりRLSをバイパスして現在ユーザーのロールを安全に取得';
COMMENT ON FUNCTION current_user_has_role(TEXT[]) IS '現在ユーザーが指定されたロールのいずれかを持っているかチェック';
COMMENT ON FUNCTION current_user_is_admin() IS '現在ユーザーが管理者かチェック';
COMMENT ON FUNCTION current_user_is_manager_or_admin() IS '現在ユーザーが管理者またはマネージャーかチェック';