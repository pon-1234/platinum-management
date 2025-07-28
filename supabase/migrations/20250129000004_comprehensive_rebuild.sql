-- =============================================================================
-- Platinum Management System - 包括的データベース再構築 (Version 3.0)
-- =============================================================================
-- 作成日: 2025-01-29
-- 説明: プロジェクト全体の実装に基づいた完全なデータベーススキーマ
-- =============================================================================

-- 既存のオブジェクトを削除（CASCADE付きで依存関係も削除）
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- 必要な拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ENUM型の定義
-- =============================================================================
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'hall', 'cashier', 'cast');
CREATE TYPE customer_status AS ENUM ('active', 'vip', 'blocked');
CREATE TYPE visit_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
CREATE TYPE payment_method AS ENUM ('cash', 'credit_card', 'debit_card', 'qr_payment', 'other');
CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show');
CREATE TYPE shift_type AS ENUM ('regular', 'overtime', 'holiday');
CREATE TYPE shift_request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE bottle_keep_status AS ENUM ('active', 'consumed', 'expired');

-- =============================================================================
-- 2. テーブルの作成
-- =============================================================================

-- スタッフ (Staffs)
CREATE TABLE staffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    full_name_kana TEXT,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    role user_role NOT NULL,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- キャストプロフィール (Cast Profiles)
CREATE TABLE casts_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID UNIQUE NOT NULL REFERENCES staffs(id) ON DELETE CASCADE,
    stage_name VARCHAR(50) NOT NULL,
    birthday DATE,
    blood_type VARCHAR(3),
    height INTEGER,
    three_size VARCHAR(20),
    hobby TEXT,
    special_skill TEXT,
    self_introduction TEXT,
    profile_image_url TEXT,
    hourly_rate INTEGER NOT NULL DEFAULT 0,
    back_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    experience_months INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES staffs(id),
    updated_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 顧客 (Customers)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_kana TEXT,
    phone_number TEXT,
    email TEXT,
    line_id TEXT,
    instagram_id TEXT,
    twitter_id TEXT,
    birthday DATE,
    occupation TEXT,
    company TEXT,
    address TEXT,
    notes TEXT,
    tags TEXT[],
    preferred_staff UUID[] DEFAULT '{}',
    visit_count INTEGER NOT NULL DEFAULT 0,
    total_spent INTEGER NOT NULL DEFAULT 0,
    average_spent INTEGER NOT NULL DEFAULT 0,
    last_visit_date DATE,
    customer_rank VARCHAR(20),
    is_birthday_month BOOLEAN NOT NULL DEFAULT false,
    status customer_status NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES staffs(id),
    updated_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- テーブル (Tables)
CREATE TABLE tables (
    id SERIAL PRIMARY KEY,
    table_number VARCHAR(10) NOT NULL UNIQUE,
    capacity INTEGER NOT NULL DEFAULT 4,
    is_available BOOLEAN NOT NULL DEFAULT true,
    location VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 来店 (Visits)
CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    table_id INTEGER REFERENCES tables(id),
    check_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    check_out_at TIMESTAMPTZ,
    num_guests INTEGER NOT NULL DEFAULT 1,
    assigned_casts UUID[] DEFAULT '{}',
    subtotal INTEGER NOT NULL DEFAULT 0,
    service_charge INTEGER NOT NULL DEFAULT 0,
    tax_amount INTEGER NOT NULL DEFAULT 0,
    discount_amount INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,
    payment_method payment_method,
    payment_status payment_status NOT NULL DEFAULT 'pending',
    status visit_status NOT NULL DEFAULT 'active',
    notes TEXT,
    created_by UUID REFERENCES staffs(id),
    updated_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 予約 (Reservations)
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    table_id INTEGER REFERENCES tables(id),
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    number_of_guests INTEGER NOT NULL DEFAULT 1,
    assigned_cast_ids UUID[] DEFAULT '{}',
    special_requests TEXT,
    status reservation_status NOT NULL DEFAULT 'pending',
    created_by UUID REFERENCES staffs(id),
    updated_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 商品 (Products)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price INTEGER NOT NULL,
    cost INTEGER NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 注文明細 (Order Items)
CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    cast_id UUID REFERENCES staffs(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 勤怠記録 (Attendance Records)
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staffs(id),
    attendance_date DATE NOT NULL,
    clock_in_time TIMESTAMPTZ,
    clock_out_time TIMESTAMPTZ,
    break_start_time TIMESTAMPTZ,
    break_end_time TIMESTAMPTZ,
    total_working_hours DECIMAL(4,2),
    total_break_hours DECIMAL(4,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(staff_id, attendance_date)
);

-- シフト申請 (Shift Requests)
CREATE TABLE shift_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staffs(id),
    requested_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status shift_request_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    approved_by UUID REFERENCES staffs(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 確定シフト (Confirmed Shifts)
CREATE TABLE confirmed_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staffs(id),
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    shift_type shift_type NOT NULL DEFAULT 'regular',
    notes TEXT,
    created_by UUID REFERENCES staffs(id),
    updated_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(staff_id, shift_date)
);

-- ボトルキープ (Bottle Keeps)
CREATE TABLE bottle_keeps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    bottle_number VARCHAR(20) UNIQUE,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    remaining_percentage INTEGER NOT NULL DEFAULT 100,
    status bottle_keep_status NOT NULL DEFAULT 'active',
    notes TEXT,
    created_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 日次締め (Daily Closings)
CREATE TABLE daily_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closing_date DATE NOT NULL UNIQUE,
    total_sales INTEGER NOT NULL DEFAULT 0,
    cash_sales INTEGER NOT NULL DEFAULT 0,
    card_sales INTEGER NOT NULL DEFAULT 0,
    other_sales INTEGER NOT NULL DEFAULT 0,
    total_customers INTEGER NOT NULL DEFAULT 0,
    total_orders INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    closed_by UUID NOT NULL REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 通知ログ (Notification Logs)
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_type VARCHAR(50) NOT NULL,
    recipient_id UUID,
    notification_type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3. インデックスの作成
-- =============================================================================
CREATE INDEX idx_staffs_user_id ON staffs(user_id);
CREATE INDEX idx_staffs_email ON staffs(email);
CREATE INDEX idx_staffs_role ON staffs(role) WHERE is_active = true;

CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_phone ON customers(phone_number);
CREATE INDEX idx_customers_status ON customers(status);

CREATE INDEX idx_visits_customer_id ON visits(customer_id);
CREATE INDEX idx_visits_check_in_at ON visits(check_in_at);
CREATE INDEX idx_visits_status ON visits(status);

CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_reservations_customer_id ON reservations(customer_id);

CREATE INDEX idx_order_items_visit_id ON order_items(visit_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

CREATE INDEX idx_attendance_records_staff_date ON attendance_records(staff_id, attendance_date);
CREATE INDEX idx_bottle_keeps_customer_status ON bottle_keeps(customer_id, status);

-- =============================================================================
-- 4. 関数とトリガーの作成
-- =============================================================================

-- updated_atを自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_staffs_updated_at BEFORE UPDATE ON staffs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_casts_profile_updated_at BEFORE UPDATE ON casts_profile
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shift_requests_updated_at BEFORE UPDATE ON shift_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_confirmed_shifts_updated_at BEFORE UPDATE ON confirmed_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bottle_keeps_updated_at BEFORE UPDATE ON bottle_keeps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 現在のユーザーのスタッフロールを取得する関数
CREATE OR REPLACE FUNCTION get_current_user_staff_role()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM staffs
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql;

-- ダッシュボード統計取得関数
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
     WHERE created_at::date = report_date), 0)::NUMERIC AS today_new_customers,
    
    COALESCE((SELECT COUNT(*)::NUMERIC
     FROM casts_profile cp
     JOIN staffs s ON cp.staff_id = s.id
     WHERE s.is_active = true
       AND cp.is_active = true), 0)::NUMERIC AS active_cast_count,
    
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

-- =============================================================================
-- 5. Row Level Security (RLS) ポリシーの設定
-- =============================================================================

-- 全てのテーブルでRLSを有効化
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE casts_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmed_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_keeps ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Staffsテーブルのポリシー
CREATE POLICY "Enable read for authenticated users" ON staffs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users" ON staffs  
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR get_current_user_staff_role() IN ('admin', 'manager'));

CREATE POLICY "Enable update own record" ON staffs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR get_current_user_staff_role() IN ('admin', 'manager'))
  WITH CHECK (auth.uid() = user_id OR get_current_user_staff_role() IN ('admin', 'manager'));

CREATE POLICY "Enable delete for admin" ON staffs
  FOR DELETE TO authenticated
  USING (get_current_user_staff_role() = 'admin');

-- その他のテーブルのポリシー（認証されたユーザーに全アクセスを許可）
CREATE POLICY "Enable write access for authenticated users" ON casts_profile
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON customers
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON visits
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON tables
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON reservations
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON products
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON order_items
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON attendance_records
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON shift_requests
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON confirmed_shifts
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON bottle_keeps
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON daily_closings
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON notification_logs
  FOR ALL TO authenticated USING (true);

-- =============================================================================
-- 6. 権限の付与
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =============================================================================
-- 7. サンプルデータの挿入
-- =============================================================================

-- サンプルスタッフ
INSERT INTO staffs (id, full_name, email, phone, role) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', '山田太郎', 'yamada@example.com', '090-1111-1111', 'manager'),
  ('550e8400-e29b-41d4-a716-446655440002', '鈴木花子', 'suzuki@example.com', '090-2222-2222', 'cast'),
  ('550e8400-e29b-41d4-a716-446655440003', '田中美咲', 'tanaka@example.com', '090-3333-3333', 'cast');

-- サンプルテーブル
INSERT INTO tables (table_number, capacity, location) VALUES
  ('A-1', 4, '1階窓際'),
  ('A-2', 4, '1階窓際'),
  ('B-1', 6, '1階中央'),
  ('B-2', 6, '1階中央'),
  ('VIP-1', 8, '2階VIPルーム'),
  ('VIP-2', 10, '2階VIPルーム');

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

-- =============================================================================
-- 完了
-- =============================================================================