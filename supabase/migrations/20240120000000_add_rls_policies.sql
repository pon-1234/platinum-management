-- =============================================================================
-- Row Level Security (RLS) ポリシーの実装
-- =============================================================================
-- このマイグレーションは、セキュリティを強化するためRLSポリシーを追加します。
-- すべてのテーブルでRLSを有効化し、権限ベースのアクセス制御を実装します。

-- =============================================================================
-- RLSの有効化
-- =============================================================================

-- スタッフテーブル
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;

-- キャストプロフィールテーブル
ALTER TABLE casts_profile ENABLE ROW LEVEL SECURITY;

-- キャスト実績テーブル
ALTER TABLE cast_performances ENABLE ROW LEVEL SECURITY;

-- 顧客テーブル
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 来店履歴テーブル
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- 出勤記録テーブル
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- 請求情報テーブル
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- 請求明細テーブル
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;

-- 支払い履歴テーブル
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- 在庫テーブル
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- ボトルキープテーブル
ALTER TABLE bottle_keeps ENABLE ROW LEVEL SECURITY;

-- 予約テーブル
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 権限チェック用関数の作成
-- =============================================================================

-- ユーザーの権限を取得する関数
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM staffs
  WHERE staffs.user_id = $1
  AND is_active = true
  LIMIT 1;
  
  RETURN user_role;
END;
$$;

-- 権限チェック関数
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, resource TEXT, action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- ユーザーのロールを取得
  user_role := get_user_role(user_id);
  
  -- ロールがない場合はアクセス拒否
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- admin は全てのアクセスを許可
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- リソースとアクションに基づいた権限チェック
  CASE resource
    WHEN 'staff' THEN
      CASE action
        WHEN 'view' THEN
          RETURN user_role IN ('admin', 'manager');
        WHEN 'create', 'edit', 'delete' THEN
          RETURN user_role IN ('admin', 'manager');
        ELSE
          RETURN FALSE;
      END CASE;
      
    WHEN 'cast' THEN
      CASE action
        WHEN 'view' THEN
          RETURN user_role IN ('admin', 'manager', 'hall', 'cast');
        WHEN 'create', 'edit', 'delete' THEN
          RETURN user_role IN ('admin', 'manager');
        ELSE
          RETURN FALSE;
      END CASE;
      
    WHEN 'customer' THEN
      CASE action
        WHEN 'view' THEN
          RETURN user_role IN ('admin', 'manager', 'hall', 'cashier');
        WHEN 'create', 'edit' THEN
          RETURN user_role IN ('admin', 'manager', 'hall');
        WHEN 'delete' THEN
          RETURN user_role IN ('admin', 'manager');
        ELSE
          RETURN FALSE;
      END CASE;
      
    WHEN 'attendance' THEN
      CASE action
        WHEN 'view' THEN
          -- 自分の勤怠は誰でも閲覧可能
          RETURN TRUE;
        WHEN 'create', 'edit' THEN
          RETURN user_role IN ('admin', 'manager', 'hall', 'cashier', 'cast');
        WHEN 'delete' THEN
          RETURN user_role IN ('admin', 'manager');
        ELSE
          RETURN FALSE;
      END CASE;
      
    WHEN 'billing' THEN
      CASE action
        WHEN 'view' THEN
          RETURN user_role IN ('admin', 'manager', 'cashier');
        WHEN 'create', 'edit' THEN
          RETURN user_role IN ('admin', 'manager', 'cashier');
        WHEN 'delete' THEN
          RETURN user_role IN ('admin', 'manager');
        ELSE
          RETURN FALSE;
      END CASE;
      
    WHEN 'inventory' THEN
      CASE action
        WHEN 'view' THEN
          RETURN user_role IN ('admin', 'manager', 'hall');
        WHEN 'create', 'edit', 'delete' THEN
          RETURN user_role IN ('admin', 'manager');
        ELSE
          RETURN FALSE;
      END CASE;
      
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

-- =============================================================================
-- RLSポリシーの作成
-- =============================================================================

-- スタッフテーブルのポリシー
CREATE POLICY "staffs_select_policy" ON staffs
  FOR SELECT
  USING (has_permission(auth.uid(), 'staff', 'view'));

CREATE POLICY "staffs_insert_policy" ON staffs
  FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'staff', 'create'));

CREATE POLICY "staffs_update_policy" ON staffs
  FOR UPDATE
  USING (has_permission(auth.uid(), 'staff', 'edit'))
  WITH CHECK (has_permission(auth.uid(), 'staff', 'edit'));

CREATE POLICY "staffs_delete_policy" ON staffs
  FOR DELETE
  USING (has_permission(auth.uid(), 'staff', 'delete'));

-- キャストプロフィールテーブルのポリシー
CREATE POLICY "casts_profile_select_policy" ON casts_profile
  FOR SELECT
  USING (has_permission(auth.uid(), 'cast', 'view'));

CREATE POLICY "casts_profile_insert_policy" ON casts_profile
  FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'cast', 'create'));

CREATE POLICY "casts_profile_update_policy" ON casts_profile
  FOR UPDATE
  USING (has_permission(auth.uid(), 'cast', 'edit'))
  WITH CHECK (has_permission(auth.uid(), 'cast', 'edit'));

CREATE POLICY "casts_profile_delete_policy" ON casts_profile
  FOR DELETE
  USING (has_permission(auth.uid(), 'cast', 'delete'));

-- 顧客テーブルのポリシー
CREATE POLICY "customers_select_policy" ON customers
  FOR SELECT
  USING (has_permission(auth.uid(), 'customer', 'view'));

CREATE POLICY "customers_insert_policy" ON customers
  FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'customer', 'create'));

CREATE POLICY "customers_update_policy" ON customers
  FOR UPDATE
  USING (has_permission(auth.uid(), 'customer', 'edit'))
  WITH CHECK (has_permission(auth.uid(), 'customer', 'edit'));

CREATE POLICY "customers_delete_policy" ON customers
  FOR DELETE
  USING (has_permission(auth.uid(), 'customer', 'delete'));

-- 出勤記録テーブルのポリシー（自分の記録のみ操作可能）
CREATE POLICY "attendance_records_select_policy" ON attendance_records
  FOR SELECT
  USING (
    has_permission(auth.uid(), 'attendance', 'view') AND (
      -- 管理者は全て閲覧可能
      get_user_role(auth.uid()) IN ('admin', 'manager') OR
      -- 自分の記録のみ閲覧可能
      staff_id IN (SELECT id FROM staffs WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "attendance_records_insert_policy" ON attendance_records
  FOR INSERT
  WITH CHECK (
    has_permission(auth.uid(), 'attendance', 'create') AND (
      -- 管理者は全て作成可能
      get_user_role(auth.uid()) IN ('admin', 'manager') OR
      -- 自分の記録のみ作成可能
      staff_id IN (SELECT id FROM staffs WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "attendance_records_update_policy" ON attendance_records
  FOR UPDATE
  USING (
    has_permission(auth.uid(), 'attendance', 'edit') AND (
      -- 管理者は全て編集可能
      get_user_role(auth.uid()) IN ('admin', 'manager') OR
      -- 自分の記録のみ編集可能
      staff_id IN (SELECT id FROM staffs WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    has_permission(auth.uid(), 'attendance', 'edit') AND (
      -- 管理者は全て編集可能
      get_user_role(auth.uid()) IN ('admin', 'manager') OR
      -- 自分の記録のみ編集可能
      staff_id IN (SELECT id FROM staffs WHERE user_id = auth.uid())
    )
  );

-- 請求情報テーブルのポリシー
CREATE POLICY "bills_select_policy" ON bills
  FOR SELECT
  USING (has_permission(auth.uid(), 'billing', 'view'));

CREATE POLICY "bills_insert_policy" ON bills
  FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'billing', 'create'));

CREATE POLICY "bills_update_policy" ON bills
  FOR UPDATE
  USING (has_permission(auth.uid(), 'billing', 'edit'))
  WITH CHECK (has_permission(auth.uid(), 'billing', 'edit'));

CREATE POLICY "bills_delete_policy" ON bills
  FOR DELETE
  USING (has_permission(auth.uid(), 'billing', 'delete'));

-- 在庫テーブルのポリシー
CREATE POLICY "inventory_select_policy" ON inventory
  FOR SELECT
  USING (has_permission(auth.uid(), 'inventory', 'view'));

CREATE POLICY "inventory_insert_policy" ON inventory
  FOR INSERT
  WITH CHECK (has_permission(auth.uid(), 'inventory', 'create'));

CREATE POLICY "inventory_update_policy" ON inventory
  FOR UPDATE
  USING (has_permission(auth.uid(), 'inventory', 'edit'))
  WITH CHECK (has_permission(auth.uid(), 'inventory', 'edit'));

CREATE POLICY "inventory_delete_policy" ON inventory
  FOR DELETE
  USING (has_permission(auth.uid(), 'inventory', 'delete'));

-- =============================================================================
-- インデックスの作成（パフォーマンス向上）
-- =============================================================================

-- created_at でのソート用インデックス
CREATE INDEX IF NOT EXISTS idx_staffs_created_at ON staffs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_casts_profile_created_at ON casts_profile(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_created_at ON attendance_records(created_at DESC);

-- 検索用インデックス
CREATE INDEX IF NOT EXISTS idx_staffs_full_name ON staffs(full_name);
CREATE INDEX IF NOT EXISTS idx_staffs_role ON staffs(role);
CREATE INDEX IF NOT EXISTS idx_staffs_user_id ON staffs(user_id);
CREATE INDEX IF NOT EXISTS idx_casts_profile_staff_id ON casts_profile(staff_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number);

-- 権限チェック高速化用インデックス
CREATE INDEX IF NOT EXISTS idx_staffs_user_id_active ON staffs(user_id, is_active);