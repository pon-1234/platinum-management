-- 完全なデータベースリセットとパフォーマンス最適化を含むマイグレーション
-- WARNING: これはすべてのデータを削除し、データベースを再構築します

-- ==========================================
-- 1. 既存のオブジェクトをすべて削除
-- ==========================================

-- Drop all existing tables
DROP TABLE IF EXISTS qr_attendance_logs CASCADE;
DROP TABLE IF EXISTS qr_codes CASCADE;
DROP TABLE IF EXISTS attendance_corrections CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS bottle_keep_usage CASCADE;
DROP TABLE IF EXISTS bottle_keeps CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS visit_cast_assignments CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS cast_performances CASCADE;
DROP TABLE IF EXISTS casts_profile CASCADE;
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS daily_closings CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS staffs CASCADE;
DROP TABLE IF EXISTS payments CASCADE;

-- Drop all existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_cast_ranking(DATE, DATE, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS generate_customer_summary_report(DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS generate_cast_performance_report(DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS generate_sales_report(DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS count_low_stock_products() CASCADE;
DROP FUNCTION IF EXISTS get_low_stock_products() CASCADE;
DROP FUNCTION IF EXISTS get_inventory_stats() CASCADE;
DROP FUNCTION IF EXISTS get_distinct_product_categories() CASCADE;
DROP FUNCTION IF EXISTS get_inventory_alerts() CASCADE;
DROP FUNCTION IF EXISTS get_inventory_page_data(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_inventory_movement_summary(INTEGER, DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS get_daily_sales(DATE) CASCADE;
DROP FUNCTION IF EXISTS get_dashboard_stats(DATE) CASCADE;
DROP FUNCTION IF EXISTS get_recent_activities(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_hourly_sales(DATE) CASCADE;
DROP FUNCTION IF EXISTS get_top_products(DATE, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_top_cast_performers(DATE, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS generate_daily_billing_report(DATE) CASCADE;
DROP FUNCTION IF EXISTS get_top_products_with_details(DATE, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_top_cast_performance(DATE, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_hourly_billing_analysis(DATE) CASCADE;
DROP FUNCTION IF EXISTS get_monthly_comparison(DATE) CASCADE;
DROP FUNCTION IF EXISTS get_payment_method_summary(DATE) CASCADE;
DROP FUNCTION IF EXISTS get_attendance_dashboard_stats(DATE) CASCADE;
DROP FUNCTION IF EXISTS get_staff_attendance_status(DATE) CASCADE;
DROP FUNCTION IF EXISTS get_monthly_attendance_summary(INTEGER, INTEGER, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_shift_schedule(DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS get_attendance_alerts(DATE, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_cast_attendance_performance(DATE, INTEGER) CASCADE;

-- ==========================================
-- 2. テーブルの作成
-- ==========================================

-- スタッフテーブル
CREATE TABLE IF NOT EXISTS staffs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'cast', 'hall', 'cashier')),
  is_active BOOLEAN DEFAULT true,
  hired_at DATE DEFAULT CURRENT_DATE,
  birth_date DATE,
  address TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- テーブル管理
CREATE TABLE IF NOT EXISTS tables (
  id SERIAL PRIMARY KEY,
  table_number VARCHAR(10) NOT NULL UNIQUE,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  is_available BOOLEAN DEFAULT true,
  location VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- シフト管理
CREATE TABLE IF NOT EXISTS shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- キャストプロフィール
CREATE TABLE IF NOT EXISTS casts_profile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL UNIQUE REFERENCES staffs(id) ON DELETE CASCADE,
  stage_name VARCHAR(100) NOT NULL,
  experience_months INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  bio TEXT,
  instagram_id VARCHAR(50),
  twitter_id VARCHAR(50),
  preferred_working_hours TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- キャストパフォーマンス
CREATE TABLE IF NOT EXISTS cast_performances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cast_id UUID NOT NULL REFERENCES casts_profile(id),
  date DATE NOT NULL,
  shimei_count INTEGER DEFAULT 0,
  dohan_count INTEGER DEFAULT 0,
  sales_amount BIGINT DEFAULT 0,
  drink_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_cast_date UNIQUE (cast_id, date)
);

-- 顧客管理
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_kana VARCHAR(255),
  phone_number VARCHAR(20),
  email VARCHAR(255),
  birth_date DATE,
  preferences TEXT,
  tags TEXT[],
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'vip', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false
);

-- 来店記録
CREATE TABLE IF NOT EXISTS visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id),
  table_id INTEGER REFERENCES tables(id),
  check_in_at TIMESTAMPTZ DEFAULT now(),
  check_out_at TIMESTAMPTZ,
  number_of_guests INTEGER DEFAULT 1 CHECK (number_of_guests > 0),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  total_amount BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 来店キャスト割り当て
CREATE TABLE IF NOT EXISTS visit_cast_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  cast_id UUID NOT NULL REFERENCES casts_profile(id),
  is_shimei BOOLEAN DEFAULT false,
  is_dohan BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 予約管理
CREATE TABLE IF NOT EXISTS reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id),
  table_id INTEGER REFERENCES tables(id),
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  number_of_guests INTEGER DEFAULT 1 CHECK (number_of_guests > 0),
  assigned_cast_id UUID REFERENCES casts_profile(id),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 勤怠記録
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staffs(id),
  attendance_date DATE DEFAULT CURRENT_DATE,
  shift_id UUID REFERENCES shifts(id),
  clock_in_time TIME,
  clock_out_time TIME,
  break_start_time TIME,
  break_end_time TIME,
  status VARCHAR(50) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'holiday', 'late', 'early_leave')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_staff_date UNIQUE (staff_id, attendance_date)
);

-- 勤怠修正
CREATE TABLE IF NOT EXISTS attendance_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_record_id UUID NOT NULL REFERENCES attendance_records(id),
  field_name VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT NOT NULL,
  approved_by UUID REFERENCES staffs(id),
  approved_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- QRコード
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staffs(id),
  qr_data TEXT NOT NULL,
  signature TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- QR勤怠ログ
CREATE TABLE IF NOT EXISTS qr_attendance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES staffs(id),
  qr_code_id UUID REFERENCES qr_codes(id),
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
  location_data JSONB,
  device_info JSONB,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  scanned_at TIMESTAMPTZ DEFAULT now()
);

-- 商品管理
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  cost INTEGER NOT NULL DEFAULT 0 CHECK (cost >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  reorder_point INTEGER NOT NULL DEFAULT 5,
  max_stock INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES staffs(id),
  updated_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 注文明細
CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  cast_id UUID REFERENCES staffs(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  total_price INTEGER GENERATED ALWAYS AS (quantity * unit_price) STORED,
  notes TEXT,
  created_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 在庫移動
CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  unit_cost INTEGER,
  reason TEXT,
  reference_id TEXT,
  created_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ボトルキープ
CREATE TABLE IF NOT EXISTS bottle_keeps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  bottle_number VARCHAR(50) NOT NULL UNIQUE,
  purchase_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  remaining_percentage INTEGER DEFAULT 100 CHECK (remaining_percentage >= 0 AND remaining_percentage <= 100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'finished', 'expired')),
  notes TEXT,
  created_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ボトルキープ使用履歴
CREATE TABLE IF NOT EXISTS bottle_keep_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bottle_keep_id UUID NOT NULL REFERENCES bottle_keeps(id),
  visit_id UUID NOT NULL REFERENCES visits(id),
  used_percentage INTEGER NOT NULL CHECK (used_percentage > 0 AND used_percentage <= 100),
  notes TEXT,
  created_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 通知ログ
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type VARCHAR(50) NOT NULL,
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('staff', 'customer')),
  recipient_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 日次締め処理
CREATE TABLE IF NOT EXISTS daily_closings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  closing_date DATE NOT NULL UNIQUE,
  total_sales DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_visits INTEGER NOT NULL DEFAULT 0,
  total_cash DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_card DECIMAL(10, 2) NOT NULL DEFAULT 0,
  closed_by UUID REFERENCES staffs(id),
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 支払い情報
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES visits(id),
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'card', 'credit_card', 'e_money', 'other')),
  amount BIGINT NOT NULL CHECK (amount >= 0),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  processed_at TIMESTAMPTZ,
  created_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 3. インデックスの作成（パフォーマンス最適化）
-- ==========================================

-- スタッフ関連
CREATE INDEX IF NOT EXISTS idx_staffs_user_id ON staffs(user_id);
CREATE INDEX IF NOT EXISTS idx_staffs_role ON staffs(role);
CREATE INDEX IF NOT EXISTS idx_staffs_is_active ON staffs(is_active);

-- キャスト関連
CREATE INDEX IF NOT EXISTS idx_casts_profile_staff_id ON casts_profile(staff_id);
CREATE INDEX IF NOT EXISTS idx_casts_profile_is_active ON casts_profile(is_active);
CREATE INDEX IF NOT EXISTS idx_cast_performances_cast_id ON cast_performances(cast_id);
CREATE INDEX IF NOT EXISTS idx_cast_performances_date ON cast_performances(date);

-- 顧客関連
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_name_kana ON customers(name_kana);
CREATE INDEX IF NOT EXISTS idx_customers_phone_number ON customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_unique ON customers(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_created_date ON customers(created_at) WHERE is_deleted = false;

-- 来店関連
CREATE INDEX IF NOT EXISTS idx_visits_customer_id ON visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_check_in_at ON visits(check_in_at);
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at);
CREATE INDEX IF NOT EXISTS idx_visits_check_in_date ON visits(check_in_at, status);
CREATE INDEX IF NOT EXISTS idx_visits_total_amount ON visits(total_amount) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_visit_cast_assignments_cast_visit ON visit_cast_assignments(cast_id, visit_id);

-- 予約関連
CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_table_id ON reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_reservations_assigned_cast_id ON reservations(assigned_cast_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_date_status ON reservations(reservation_date, status);

-- 勤怠関連
CREATE INDEX IF NOT EXISTS idx_attendance_records_staff_id ON attendance_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date_status ON attendance_records(attendance_date, status);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date_staff ON attendance_records(attendance_date, staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_shift ON attendance_records(shift_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_attendance_record_id ON attendance_corrections(attendance_record_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_staff_id ON qr_codes(staff_id);
CREATE INDEX IF NOT EXISTS idx_qr_attendance_logs_staff_id ON qr_attendance_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_qr_attendance_logs_scanned_at ON qr_attendance_logs(scanned_at);

-- 商品・在庫関連
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_is_active_category ON products(is_active, category);
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(stock_quantity, low_stock_threshold) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_date ON inventory_movements(product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);

-- 注文関連
CREATE INDEX IF NOT EXISTS idx_order_items_visit_id ON order_items(visit_id);
CREATE INDEX IF NOT EXISTS idx_order_items_visit_product ON order_items(visit_id, product_id);

-- ボトルキープ関連
CREATE INDEX IF NOT EXISTS idx_bottle_keeps_customer ON bottle_keeps(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_bottle_keeps_expiry ON bottle_keeps(expiry_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_bottle_keep_usage_bottle_keep_id ON bottle_keep_usage(bottle_keep_id);

-- 支払い関連
CREATE INDEX IF NOT EXISTS idx_payments_visit_method ON payments(visit_id, payment_method) WHERE status = 'completed';

-- その他
CREATE INDEX IF NOT EXISTS idx_daily_closings_date ON daily_closings(closing_date);
CREATE INDEX IF NOT EXISTS idx_shifts_active ON shifts(is_active) WHERE is_active = true;

-- ==========================================
-- 4. トリガー関数の作成
-- ==========================================

-- updated_at自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーの適用
CREATE TRIGGER update_staffs_updated_at BEFORE UPDATE ON staffs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_casts_profile_updated_at BEFORE UPDATE ON casts_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cast_performances_updated_at BEFORE UPDATE ON cast_performances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bottle_keeps_updated_at BEFORE UPDATE ON bottle_keeps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_closings_updated_at BEFORE UPDATE ON daily_closings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 5. RLS（Row Level Security）の設定
-- ==========================================

-- RLSを有効化
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE casts_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE cast_performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_cast_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_keeps ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_keep_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- anonユーザー（非認証）は読み取りのみ許可
CREATE POLICY "anon_select" ON staffs FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON tables FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON shifts FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON casts_profile FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON cast_performances FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON customers FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON visits FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON visit_cast_assignments FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON reservations FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON attendance_records FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON attendance_corrections FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON qr_codes FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON qr_attendance_logs FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON products FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON order_items FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON inventory_movements FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON bottle_keeps FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON bottle_keep_usage FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON notification_logs FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON daily_closings FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select" ON payments FOR SELECT TO anon USING (true);

-- 認証済みユーザーはすべての操作を許可
CREATE POLICY "auth_all" ON staffs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON tables FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON casts_profile FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON cast_performances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON visits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON visit_cast_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON attendance_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON attendance_corrections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON qr_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON qr_attendance_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON inventory_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON bottle_keeps FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON bottle_keep_usage FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON notification_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON daily_closings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 権限の付与
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ==========================================
-- 6. パフォーマンス最適化用RPC関数
-- ==========================================

-- 在庫管理関連の最適化関数
-- 6.1 在庫統計
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

-- 6.2 カテゴリ一覧
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

-- 6.3 在庫アラート
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

-- 6.4 低在庫商品
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

-- 6.5 在庫ページデータ統合
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

-- ダッシュボード関連の最適化関数
-- 6.6 日次売上
CREATE OR REPLACE FUNCTION get_daily_sales(report_date DATE)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(oi.total_price), 0)
  FROM order_items oi
  JOIN visits v ON oi.visit_id = v.id
  WHERE v.check_in_at::date = report_date
    AND v.status = 'completed';
$$ LANGUAGE sql;

-- 6.7 ダッシュボード統計
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
    COALESCE((SELECT SUM(oi.total_price)::NUMERIC
     FROM order_items oi
     JOIN visits v ON oi.visit_id = v.id
     WHERE v.check_in_at::date = report_date
       AND v.status = 'completed'), 0)::NUMERIC AS today_sales,
    
    -- 本日の来店数
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM visits
     WHERE check_in_at::date = report_date
       AND status = 'completed'), 0)::NUMERIC AS today_visits,
    
    -- 本日の顧客数（重複なし）
    COALESCE((SELECT COUNT(DISTINCT customer_id)::NUMERIC
     FROM visits
     WHERE check_in_at::date = report_date), 0)::NUMERIC AS today_customers,
    
    -- 本日の新規顧客数
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM customers
     WHERE created_at::date = report_date
       AND is_deleted = false), 0)::NUMERIC AS today_new_customers,
    
    -- アクティブなキャスト数
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM casts_profile cp
     JOIN staffs s ON cp.staff_id = s.id
     WHERE cp.is_active = true
       AND s.is_active = true), 0)::NUMERIC AS active_cast_count,
    
    -- 利用可能なテーブル数
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM tables
     WHERE is_available = true), 0)::NUMERIC AS active_table_count,
    
    -- 在庫不足商品数
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM products
     WHERE is_active = true
       AND stock_quantity <= low_stock_threshold), 0)::NUMERIC AS low_stock_count,
    
    -- 本日の保留中予約数
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM reservations
     WHERE reservation_date = report_date
       AND status = 'pending'), 0)::NUMERIC AS pending_reservations;
END;
$$ LANGUAGE plpgsql;

-- 6.8 最近のアクティビティ
CREATE OR REPLACE FUNCTION get_recent_activities(
  activity_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  customer_name TEXT,
  cast_name TEXT,
  amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_visits AS (
    SELECT 
      v.id,
      'visit' AS type,
      CASE 
        WHEN v.status = 'active' THEN '来店中'
        ELSE '会計完了'
      END AS description,
      v.check_in_at AS created_at,
      c.name AS customer_name,
      NULL::TEXT AS cast_name,
      v.total_amount AS amount
    FROM visits v
    JOIN customers c ON v.customer_id = c.id
    WHERE v.check_in_at >= NOW() - INTERVAL '24 hours'
    ORDER BY v.check_in_at DESC
    LIMIT activity_limit
  ),
  recent_reservations AS (
    SELECT 
      r.id,
      'reservation' AS type,
      '新規予約' AS description,
      r.created_at,
      c.name AS customer_name,
      cp.stage_name AS cast_name,
      NULL::NUMERIC AS amount
    FROM reservations r
    JOIN customers c ON r.customer_id = c.id
    LEFT JOIN casts_profile cp ON r.assigned_cast_id = cp.id
    WHERE r.created_at >= NOW() - INTERVAL '24 hours'
    ORDER BY r.created_at DESC
    LIMIT activity_limit
  )
  SELECT * FROM (
    SELECT * FROM recent_visits
    UNION ALL
    SELECT * FROM recent_reservations
  ) combined
  ORDER BY created_at DESC
  LIMIT activity_limit;
END;
$$ LANGUAGE plpgsql;

-- 6.9 時間帯別売上
CREATE OR REPLACE FUNCTION get_hourly_sales(
  report_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  hour INTEGER,
  sales NUMERIC,
  visit_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM v.check_in_at)::INTEGER AS hour,
    COALESCE(SUM(oi.total_price), 0) AS sales,
    COUNT(DISTINCT v.id) AS visit_count
  FROM generate_series(0, 23) AS h(hour)
  LEFT JOIN visits v ON EXTRACT(HOUR FROM v.check_in_at) = h.hour
    AND v.check_in_at::date = report_date
    AND v.status = 'completed'
  LEFT JOIN order_items oi ON oi.visit_id = v.id
  GROUP BY h.hour
  ORDER BY h.hour;
END;
$$ LANGUAGE plpgsql;

-- 6.10 トップ商品
CREATE OR REPLACE FUNCTION get_top_products(
  report_date DATE DEFAULT CURRENT_DATE,
  limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  product_id INTEGER,
  product_name TEXT,
  total_quantity BIGINT,
  total_sales NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS product_id,
    p.name AS product_name,
    SUM(oi.quantity) AS total_quantity,
    SUM(oi.total_price) AS total_sales
  FROM order_items oi
  JOIN products p ON oi.product_id = p.id
  JOIN visits v ON oi.visit_id = v.id
  WHERE v.check_in_at::date = report_date
    AND v.status = 'completed'
  GROUP BY p.id, p.name
  ORDER BY total_sales DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 6.11 トップキャスト
CREATE OR REPLACE FUNCTION get_top_cast_performers(
  report_date DATE DEFAULT CURRENT_DATE,
  limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  cast_id UUID,
  cast_name VARCHAR,
  visit_count BIGINT,
  sales_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id AS cast_id,
    cp.stage_name AS cast_name,
    COUNT(DISTINCT vca.visit_id) AS visit_count,
    COALESCE(SUM(oi.total_price), 0) AS sales_amount
  FROM casts_profile cp
  JOIN visit_cast_assignments vca ON vca.cast_id = cp.id
  JOIN visits v ON vca.visit_id = v.id
  LEFT JOIN order_items oi ON oi.visit_id = v.id AND oi.cast_id = cp.staff_id
  WHERE v.check_in_at::date = report_date
    AND v.status = 'completed'
  GROUP BY cp.id, cp.stage_name
  ORDER BY sales_amount DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 会計管理関連の最適化関数
-- 6.12 日次会計レポート
CREATE OR REPLACE FUNCTION generate_daily_billing_report(
  report_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_sales NUMERIC,
  total_visits BIGINT,
  total_customers BIGINT,
  average_per_customer NUMERIC,
  cash_sales NUMERIC,
  card_sales NUMERIC,
  service_charge NUMERIC,
  tax_amount NUMERIC,
  net_sales NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT
      COALESCE(SUM(v.total_amount), 0) AS total_sales,
      COUNT(DISTINCT v.id) AS total_visits,
      COUNT(DISTINCT v.customer_id) AS total_customers
    FROM visits v
    WHERE v.check_in_at::date = report_date
      AND v.status = 'completed'
  ),
  payment_methods AS (
    SELECT
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) AS cash_sales,
      COALESCE(SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END), 0) AS card_sales
    FROM payments p
    JOIN visits v ON p.visit_id = v.id
    WHERE v.check_in_at::date = report_date
      AND v.status = 'completed'
      AND p.status = 'completed'
  )
  SELECT
    ds.total_sales,
    ds.total_visits,
    ds.total_customers,
    CASE WHEN ds.total_customers > 0 
      THEN ds.total_sales / ds.total_customers 
      ELSE 0 
    END AS average_per_customer,
    pm.cash_sales,
    pm.card_sales,
    ROUND(ds.total_sales * 0.1, 0) AS service_charge,
    ROUND(ds.total_sales * 0.1, 0) AS tax_amount,
    ds.total_sales - ROUND(ds.total_sales * 0.2, 0) AS net_sales
  FROM daily_stats ds, payment_methods pm;
END;
$$ LANGUAGE plpgsql;

-- 6.13 トップ商品詳細
CREATE OR REPLACE FUNCTION get_top_products_with_details(
  report_date DATE DEFAULT CURRENT_DATE,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  rank BIGINT,
  product_id INTEGER,
  product_name TEXT,
  category TEXT,
  quantity_sold BIGINT,
  revenue NUMERIC,
  percentage_of_total NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH product_sales AS (
    SELECT 
      p.id,
      p.name,
      p.category,
      SUM(oi.quantity) AS quantity_sold,
      SUM(oi.total_price) AS revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN visits v ON oi.visit_id = v.id
    WHERE v.check_in_at::date = report_date
      AND v.status = 'completed'
    GROUP BY p.id, p.name, p.category
  ),
  total_sales AS (
    SELECT SUM(revenue) AS total FROM product_sales
  )
  SELECT 
    ROW_NUMBER() OVER (ORDER BY ps.revenue DESC) AS rank,
    ps.id AS product_id,
    ps.name AS product_name,
    ps.category,
    ps.quantity_sold,
    ps.revenue,
    ROUND((ps.revenue / NULLIF(ts.total, 0) * 100)::NUMERIC, 2) AS percentage_of_total
  FROM product_sales ps, total_sales ts
  ORDER BY ps.revenue DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 6.14 トップキャストパフォーマンス
CREATE OR REPLACE FUNCTION get_top_cast_performance(
  report_date DATE DEFAULT CURRENT_DATE,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  rank BIGINT,
  cast_id UUID,
  cast_name VARCHAR,
  staff_id UUID,
  visits_attended BIGINT,
  shimei_count BIGINT,
  dohan_count BIGINT,
  drink_sales NUMERIC,
  total_sales NUMERIC,
  percentage_of_total NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH cast_stats AS (
    SELECT 
      cp.id AS cast_id,
      cp.stage_name AS cast_name,
      cp.staff_id,
      COUNT(DISTINCT vca.visit_id) AS visits_attended,
      COUNT(DISTINCT CASE WHEN vca.is_shimei THEN vca.visit_id END) AS shimei_count,
      COUNT(DISTINCT CASE WHEN vca.is_dohan THEN vca.visit_id END) AS dohan_count,
      COALESCE(SUM(oi.total_price), 0) AS drink_sales,
      COALESCE(SUM(v.total_amount) / COUNT(DISTINCT v.id), 0) AS avg_per_visit
    FROM casts_profile cp
    JOIN visit_cast_assignments vca ON vca.cast_id = cp.id
    JOIN visits v ON vca.visit_id = v.id
    LEFT JOIN order_items oi ON oi.visit_id = v.id AND oi.cast_id = cp.staff_id
    WHERE v.check_in_at::date = report_date
      AND v.status = 'completed'
    GROUP BY cp.id, cp.stage_name, cp.staff_id
  ),
  total_sales AS (
    SELECT SUM(drink_sales) AS total FROM cast_stats
  )
  SELECT 
    ROW_NUMBER() OVER (ORDER BY cs.drink_sales DESC) AS rank,
    cs.cast_id,
    cs.cast_name,
    cs.staff_id,
    cs.visits_attended,
    cs.shimei_count,
    cs.dohan_count,
    cs.drink_sales,
    cs.drink_sales AS total_sales,
    ROUND((cs.drink_sales / NULLIF(ts.total, 0) * 100)::NUMERIC, 2) AS percentage_of_total
  FROM cast_stats cs, total_sales ts
  ORDER BY cs.drink_sales DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 勤怠管理関連の最適化関数
-- 6.15 勤怠ダッシュボード統計
CREATE OR REPLACE FUNCTION get_attendance_dashboard_stats(
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_staff BIGINT,
  present_count BIGINT,
  absent_count BIGINT,
  late_count BIGINT,
  on_break_count BIGINT,
  early_leave_count BIGINT,
  scheduled_count BIGINT,
  attendance_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH staff_stats AS (
    SELECT COUNT(*) AS total_staff
    FROM staffs
    WHERE is_active = true
  ),
  attendance_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'present') AS present_count,
      COUNT(*) FILTER (WHERE status = 'absent') AS absent_count,
      COUNT(*) FILTER (WHERE status = 'late') AS late_count,
      COUNT(*) FILTER (WHERE status = 'early_leave') AS early_leave_count,
      COUNT(*) FILTER (WHERE clock_in_time IS NOT NULL AND clock_out_time IS NULL AND break_start_time IS NOT NULL AND break_end_time IS NULL) AS on_break_count
    FROM attendance_records
    WHERE attendance_date = target_date
  ),
  schedule_stats AS (
    SELECT COUNT(DISTINCT staff_id) AS scheduled_count
    FROM shifts s
    WHERE s.is_active = true
      AND EXISTS (
        SELECT 1 FROM attendance_records ar
        WHERE ar.shift_id = s.id
          AND ar.attendance_date = target_date
      )
  )
  SELECT
    ss.total_staff,
    as_.present_count,
    as_.absent_count,
    as_.late_count,
    as_.on_break_count,
    as_.early_leave_count,
    scs.scheduled_count,
    CASE WHEN scs.scheduled_count > 0 
      THEN ROUND((as_.present_count::NUMERIC / scs.scheduled_count * 100), 2)
      ELSE 0 
    END AS attendance_rate
  FROM staff_stats ss, attendance_stats as_, schedule_stats scs;
END;
$$ LANGUAGE plpgsql;

-- 6.16 月次勤怠サマリー
CREATE OR REPLACE FUNCTION get_monthly_attendance_summary(
  target_year INTEGER,
  target_month INTEGER,
  staff_id_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  staff_id UUID,
  staff_name VARCHAR,
  total_days BIGINT,
  present_days BIGINT,
  absent_days BIGINT,
  late_days BIGINT,
  early_leave_days BIGINT,
  total_working_hours INTERVAL,
  total_overtime_hours INTERVAL,
  attendance_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT 
      DATE(target_year || '-' || LPAD(target_month::TEXT, 2, '0') || '-01') AS start_date,
      DATE(target_year || '-' || LPAD(target_month::TEXT, 2, '0') || '-01') + INTERVAL '1 month' - INTERVAL '1 day' AS end_date
  ),
  monthly_data AS (
    SELECT 
      s.id AS staff_id,
      s.full_name AS staff_name,
      COUNT(DISTINCT ar.attendance_date) AS total_days,
      COUNT(*) FILTER (WHERE ar.status = 'present') AS present_days,
      COUNT(*) FILTER (WHERE ar.status = 'absent') AS absent_days,
      COUNT(*) FILTER (WHERE ar.status = 'late') AS late_days,
      COUNT(*) FILTER (WHERE ar.status = 'early_leave') AS early_leave_days,
      COALESCE(SUM(
        CASE 
          WHEN ar.clock_in_time IS NOT NULL AND ar.clock_out_time IS NOT NULL THEN
            (ar.clock_out_time - ar.clock_in_time) - COALESCE((ar.break_end_time - ar.break_start_time), INTERVAL '0')
          ELSE INTERVAL '0'
        END
      ), INTERVAL '0') AS total_working_hours,
      COALESCE(SUM(
        CASE 
          WHEN ar.clock_in_time IS NOT NULL AND ar.clock_out_time IS NOT NULL AND sh.end_time IS NOT NULL THEN
            GREATEST(INTERVAL '0', (ar.clock_out_time - sh.end_time))
          ELSE INTERVAL '0'
        END
      ), INTERVAL '0') AS total_overtime_hours
    FROM staffs s
    CROSS JOIN date_range dr
    LEFT JOIN attendance_records ar ON s.id = ar.staff_id 
      AND ar.attendance_date BETWEEN dr.start_date AND dr.end_date
    LEFT JOIN shifts sh ON ar.shift_id = sh.id
    WHERE s.is_active = true
      AND (staff_id_filter IS NULL OR s.id = staff_id_filter)
    GROUP BY s.id, s.full_name
  )
  SELECT 
    *,
    CASE WHEN total_days > 0 
      THEN ROUND((present_days::NUMERIC / total_days * 100), 2)
      ELSE 0 
    END AS attendance_rate
  FROM monthly_data
  ORDER BY staff_name;
END;
$$ LANGUAGE plpgsql;

-- その他の基本的なRPC関数
-- 6.17 キャストランキング
CREATE OR REPLACE FUNCTION get_cast_ranking(
  start_date DATE,
  end_date DATE,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  cast_id UUID,
  cast_name VARCHAR,
  total_shimei BIGINT,
  total_dohan BIGINT,
  total_sales BIGINT,
  total_drinks BIGINT,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id as cast_id,
    cp.stage_name as cast_name,
    COALESCE(SUM(perf.shimei_count), 0) as total_shimei,
    COALESCE(SUM(perf.dohan_count), 0) as total_dohan,
    COALESCE(SUM(perf.sales_amount), 0) as total_sales,
    COALESCE(SUM(perf.drink_count), 0) as total_drinks,
    RANK() OVER (ORDER BY COALESCE(SUM(perf.sales_amount), 0) DESC) as rank
  FROM casts_profile cp
  LEFT JOIN cast_performances perf ON cp.id = perf.cast_id
    AND perf.date >= start_date
    AND perf.date <= end_date
  WHERE cp.is_active = true
  GROUP BY cp.id, cp.stage_name
  ORDER BY total_sales DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 6.18 顧客サマリーレポート
CREATE OR REPLACE FUNCTION generate_customer_summary_report(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  total_customers BIGINT,
  new_customers BIGINT,
  returning_customers BIGINT,
  total_visits BIGINT,
  total_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT c.id) as total_customers,
    COUNT(DISTINCT CASE WHEN c.created_at::date BETWEEN start_date AND end_date THEN c.id END) as new_customers,
    COUNT(DISTINCT CASE WHEN v.customer_id IS NOT NULL AND c.created_at::date < start_date THEN c.id END) as returning_customers,
    COUNT(DISTINCT v.id) as total_visits,
    COALESCE(SUM(v.total_amount), 0)::NUMERIC as total_revenue
  FROM customers c
  LEFT JOIN visits v ON c.id = v.customer_id
    AND v.check_in_at::date BETWEEN start_date AND end_date
    AND v.status = 'completed'
  WHERE c.is_deleted = false;
END;
$$ LANGUAGE plpgsql;

-- 6.19 売上レポート
CREATE OR REPLACE FUNCTION generate_sales_report(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  report_date DATE,
  total_visits BIGINT,
  total_customers BIGINT,
  total_sales NUMERIC,
  average_per_customer NUMERIC,
  product_sales NUMERIC,
  cast_sales NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT
      v.check_in_at::date as visit_date,
      COUNT(DISTINCT v.id) as visits,
      COUNT(DISTINCT v.customer_id) as customers,
      COALESCE(SUM(v.total_amount), 0) as sales,
      COALESCE(SUM(oi.total_price), 0) as product_revenue
    FROM visits v
    LEFT JOIN order_items oi ON v.id = oi.visit_id
    WHERE v.check_in_at::date BETWEEN start_date AND end_date
      AND v.status = 'completed'
    GROUP BY v.check_in_at::date
  )
  SELECT
    visit_date as report_date,
    visits as total_visits,
    customers as total_customers,
    sales::NUMERIC as total_sales,
    CASE WHEN customers > 0 THEN (sales / customers)::NUMERIC ELSE 0 END as average_per_customer,
    product_revenue::NUMERIC as product_sales,
    (sales - product_revenue)::NUMERIC as cast_sales
  FROM daily_stats
  ORDER BY visit_date;
END;
$$ LANGUAGE plpgsql;

-- 6.20 低在庫商品数カウント
CREATE OR REPLACE FUNCTION count_low_stock_products()
RETURNS BIGINT AS $$
  SELECT COUNT(*)
  FROM products
  WHERE is_active = true
    AND stock_quantity > 0
    AND stock_quantity <= low_stock_threshold;
$$ LANGUAGE sql;

-- すべてのRPC関数に権限を付与
GRANT EXECUTE ON FUNCTION get_inventory_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_distinct_product_categories() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_alerts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_low_stock_products() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_page_data(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_daily_sales(DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats(DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_recent_activities(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_hourly_sales(DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_top_products(DATE, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_top_cast_performers(DATE, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_daily_billing_report(DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_top_products_with_details(DATE, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_top_cast_performance(DATE, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_attendance_dashboard_stats(DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_attendance_summary(INTEGER, INTEGER, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_cast_ranking(DATE, DATE, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_customer_summary_report(DATE, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_sales_report(DATE, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION count_low_stock_products() TO anon, authenticated;

-- ==========================================
-- 7. サンプルデータの挿入
-- ==========================================

-- サンプルスタッフ
INSERT INTO staffs (id, full_name, email, phone, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Admin User', 'admin@example.com', '090-1234-5678', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'Manager User', 'manager@example.com', '090-2345-6789', 'manager'),
  ('00000000-0000-0000-0000-000000000003', 'Cast User 1', 'cast1@example.com', '090-3456-7890', 'cast'),
  ('00000000-0000-0000-0000-000000000004', 'Cast User 2', 'cast2@example.com', '090-4567-8901', 'cast'),
  ('00000000-0000-0000-0000-000000000005', 'Hall Staff', 'hall@example.com', '090-5678-9012', 'hall');

-- サンプルテーブル
INSERT INTO tables (table_number, capacity, location) VALUES
  ('VIP-1', 4, 'VIPルーム'),
  ('VIP-2', 6, 'VIPルーム'),
  ('A-1', 4, 'メインフロア'),
  ('A-2', 4, 'メインフロア'),
  ('B-1', 6, 'メインフロア'),
  ('B-2', 6, 'メインフロア');

-- サンプルシフト
INSERT INTO shifts (name, start_time, end_time) VALUES
  ('早番', '18:00', '23:00'),
  ('遅番', '21:00', '03:00');

-- サンプルキャストプロフィール
INSERT INTO casts_profile (staff_id, stage_name) VALUES
  ('00000000-0000-0000-0000-000000000003', 'ゆい'),
  ('00000000-0000-0000-0000-000000000004', 'みく');

-- サンプル顧客
INSERT INTO customers (name, name_kana, phone_number, email, status) VALUES
  ('田中太郎', 'タナカタロウ', '090-1111-2222', 'tanaka@example.com', 'vip'),
  ('鈴木花子', 'スズキハナコ', '090-3333-4444', 'suzuki@example.com', 'active'),
  ('佐藤次郎', 'サトウジロウ', '090-5555-6666', 'sato@example.com', 'active');

-- サンプル商品
INSERT INTO products (name, category, price, cost, stock_quantity, low_stock_threshold, reorder_point, max_stock) VALUES
  ('ドンペリニヨン', 'シャンパン', 50000, 25000, 10, 5, 3, 20),
  ('モエ・エ・シャンドン', 'シャンパン', 20000, 10000, 15, 5, 3, 30),
  ('ヘネシー XO', 'ブランデー', 40000, 20000, 8, 3, 2, 15),
  ('レミーマルタン', 'ブランデー', 30000, 15000, 12, 3, 2, 20),
  ('マッカラン 12年', 'ウイスキー', 25000, 12000, 20, 5, 3, 30),
  ('山崎 12年', 'ウイスキー', 35000, 18000, 5, 3, 2, 10),
  ('グレイグース', 'ウォッカ', 15000, 7000, 25, 5, 3, 40),
  ('ボンベイサファイア', 'ジン', 12000, 6000, 30, 5, 3, 50),
  ('ジントニックセット', 'セット', 3000, 1000, 50, 10, 5, 100),
  ('フルーツ盛り合わせ', 'フード', 5000, 2000, 0, 0, 0, 20);

-- ==========================================
-- 8. 最終確認
-- ==========================================

-- テーブル権限の確認
SELECT 
  tablename,
  has_table_privilege('anon', tablename, 'SELECT') as anon_can_select
FROM (
  SELECT tablename FROM pg_tables WHERE schemaname = 'public'
) t
ORDER BY tablename;