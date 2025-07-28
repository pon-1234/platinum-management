-- ==========================================
-- 完全クリーンセットアップ
-- 実行日: 2025-07-29
-- 
-- このマイグレーションは全てを削除して再構築します
-- ==========================================

-- 既存のスキーマを完全に削除
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- 必要な拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. 基本テーブルの作成
-- ==========================================

-- スタッフ管理
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
  name VARCHAR(100) NOT NULL,
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

-- 商品管理
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  cost INTEGER DEFAULT 0 CHECK (cost >= 0),
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER DEFAULT 10,
  reorder_point INTEGER DEFAULT 5,
  max_stock INTEGER DEFAULT 100,
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
  cast_id UUID REFERENCES casts_profile(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  total_price INTEGER NOT NULL CHECK (total_price >= 0),
  notes TEXT,
  created_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now()
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
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'present', 'absent', 'late', 'early_leave')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
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

-- その他必要なテーブルを追加...

-- ==========================================
-- 2. インデックスの作成
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_customers_created_date ON customers(created_at) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_visits_check_in_date ON visits(check_in_at, status);
CREATE INDEX IF NOT EXISTS idx_visits_customer_id ON visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_visit_id ON order_items(visit_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date, status);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date, staff_id);

-- ==========================================
-- 3. 関数の作成（修正版）
-- ==========================================

-- 3.1 更新日時の自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3.2 ダッシュボード統計（全てNUMERIC型で統一）
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
    COALESCE((SELECT SUM(oi.total_price)::NUMERIC
     FROM order_items oi
     JOIN visits v ON oi.visit_id = v.id
     WHERE v.check_in_at::date = report_date
       AND v.status = 'completed'), 0)::NUMERIC AS today_sales,
    
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM visits
     WHERE check_in_at::date = report_date
       AND status = 'completed'), 0)::NUMERIC AS today_visits,
    
    COALESCE((SELECT COUNT(DISTINCT customer_id)::NUMERIC
     FROM visits
     WHERE check_in_at::date = report_date), 0)::NUMERIC AS today_customers,
    
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM customers
     WHERE created_at::date = report_date
       AND is_deleted = false), 0)::NUMERIC AS today_new_customers,
    
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM casts_profile cp
     JOIN staffs s ON cp.staff_id = s.id
     WHERE cp.is_active = true
       AND s.is_active = true), 0)::NUMERIC AS active_cast_count,
    
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM tables
     WHERE is_available = true), 0)::NUMERIC AS active_table_count,
    
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM products
     WHERE is_active = true
       AND stock_quantity <= low_stock_threshold), 0)::NUMERIC AS low_stock_count,
    
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM reservations
     WHERE reservation_date = report_date
       AND status = 'pending'), 0)::NUMERIC AS pending_reservations;
END;
$$ LANGUAGE plpgsql;

-- 3.3 在庫統計
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
    COUNT(*)::BIGINT AS total_products,
    COUNT(*) FILTER (WHERE stock_quantity > 0 AND stock_quantity <= low_stock_threshold)::BIGINT AS low_stock_items,
    COUNT(*) FILTER (WHERE stock_quantity = 0)::BIGINT AS out_of_stock_items,
    COALESCE(SUM(stock_quantity * price), 0)::NUMERIC AS total_value
  FROM products
  WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 4. トリガーの設定
-- ==========================================

CREATE TRIGGER update_staffs_updated_at BEFORE UPDATE ON staffs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 5. RLSポリシーの設定
-- ==========================================

-- RLSを有効化
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 基本的な読み取りポリシー
CREATE POLICY "Enable read access for authenticated users" ON staffs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON tables
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON visits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON reservations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON order_items
  FOR SELECT TO authenticated USING (true);

-- 書き込みポリシー（認証されたユーザーのみ）
CREATE POLICY "Enable write access for authenticated users" ON staffs
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON tables
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON customers
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON visits
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON reservations
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON products
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON order_items
  FOR ALL TO authenticated USING (true);

-- ==========================================
-- 6. 権限の付与
-- ==========================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ==========================================
-- 7. サンプルデータの挿入
-- ==========================================

-- サンプルスタッフ
INSERT INTO staffs (id, full_name, email, phone, role) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', '山田太郎', 'yamada@example.com', '090-1111-1111', 'manager'),
  ('550e8400-e29b-41d4-a716-446655440002', '鈴木花子', 'suzuki@example.com', '090-2222-2222', 'cast'),
  ('550e8400-e29b-41d4-a716-446655440003', '田中美咲', 'tanaka@example.com', '090-3333-3333', 'cast');

-- サンプルテーブル
INSERT INTO tables (table_number, capacity, is_available, location) VALUES
  ('A-1', 4, true, '1階窓際'),
  ('A-2', 4, true, '1階窓際'),
  ('B-1', 6, true, '1階中央'),
  ('B-2', 6, true, '1階中央'),
  ('VIP-1', 8, true, '2階VIPルーム'),
  ('VIP-2', 10, true, '2階VIPルーム');

-- サンプルキャストプロフィール
INSERT INTO casts_profile (staff_id, stage_name, experience_months) VALUES
  ('550e8400-e29b-41d4-a716-446655440002', 'はなちゃん', 12),
  ('550e8400-e29b-41d4-a716-446655440003', 'みさきちゃん', 6);

-- サンプル顧客
INSERT INTO customers (name, name_kana, phone_number, status) VALUES
  ('佐藤一郎', 'サトウイチロウ', '090-5555-5555', 'active'),
  ('高橋二郎', 'タカハシジロウ', '090-6666-6666', 'vip'),
  ('伊藤三郎', 'イトウサブロウ', '090-7777-7777', 'active');

-- サンプル商品
INSERT INTO products (name, category, price, cost, stock_quantity, low_stock_threshold) VALUES
  ('ビール', 'ドリンク', 800, 300, 100, 20),
  ('ハイボール', 'ドリンク', 700, 250, 80, 20),
  ('シャンパン', 'ボトル', 15000, 8000, 10, 2),
  ('ウイスキー', 'ボトル', 12000, 6000, 15, 3),
  ('焼酎', 'ボトル', 8000, 4000, 20, 5),
  ('枝豆', 'フード', 500, 200, 50, 10),
  ('ミックスナッツ', 'フード', 800, 300, 30, 10),
  ('チーズ盛り合わせ', 'フード', 1500, 600, 20, 5),
  ('フルーツ盛り合わせ', 'フード', 2000, 1000, 15, 3),
  ('ドライフルーツ', 'フード', 1000, 400, 25, 5);