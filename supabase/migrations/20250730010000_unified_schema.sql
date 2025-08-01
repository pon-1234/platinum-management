-- =============================================================================
-- Platinum Management System - 統合スキーマ (最終版)
-- 最終更新日: 2025-07-30
-- 説明: 全てのテーブル、関数、RLSポリシーを含む完全なスキーマ定義。
--       パフォーマンス最適化、RLSの厳格化、可読性向上を適用済み。
-- =============================================================================

-- =============================================================================
-- 1. スキーマのクリーンアップと拡張機能の有効化
-- =============================================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- 必要な拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- 2. ENUM型の定義
-- =============================================================================
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'hall', 'cashier', 'cast');
CREATE TYPE customer_status AS ENUM ('active', 'vip', 'blocked');
CREATE TYPE visit_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
CREATE TYPE payment_method AS ENUM ('cash', 'credit_card', 'debit_card', 'qr_payment', 'other');
CREATE TYPE table_status AS ENUM ('available', 'reserved', 'occupied', 'cleaning');
CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show');
CREATE TYPE shift_type AS ENUM ('regular', 'overtime', 'holiday');
CREATE TYPE shift_request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE bottle_keep_status AS ENUM ('active', 'consumed', 'expired');

-- =============================================================================
-- 3. テーブルの作成
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
    is_active BOOLEAN NOT NULL DEFAULT true,
    location VARCHAR(100),
    current_status table_status DEFAULT 'available',
    current_visit_id UUID,
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
    assigned_cast_id UUID REFERENCES staffs(id),
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
    max_stock INTEGER NOT NULL DEFAULT 100,
    reorder_point INTEGER NOT NULL DEFAULT 15,
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

-- キャストパフォーマンス (Cast Performances)
CREATE TABLE cast_performances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cast_id UUID NOT NULL REFERENCES casts_profile(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    shimei_count INTEGER NOT NULL DEFAULT 0 CHECK (shimei_count >= 0),
    dohan_count INTEGER NOT NULL DEFAULT 0 CHECK (dohan_count >= 0),
    sales_amount INTEGER NOT NULL DEFAULT 0 CHECK (sales_amount >= 0),
    drink_count INTEGER NOT NULL DEFAULT 0 CHECK (drink_count >= 0),
    created_by UUID REFERENCES staffs(id),
    updated_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cast_id, date)
);

-- 在庫変動 (Inventory Movements)
CREATE TABLE inventory_movements (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    reason VARCHAR(100),
    reference_id UUID,
    created_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QRコード (QR Codes)
CREATE TABLE qr_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES staffs(id),
    qr_data TEXT NOT NULL UNIQUE,
    signature TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- QR勤怠ログ (QR Attendance Logs)
CREATE TABLE qr_attendance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    qr_code_id UUID REFERENCES qr_codes(id),
    staff_id UUID REFERENCES staffs(id),
    action_type TEXT NOT NULL CHECK (action_type IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    location_data JSONB,
    device_info JSONB,
    scanned_at TIMESTAMPTZ DEFAULT now(),
    ip_address INET,
    user_agent TEXT
);

-- 身分証確認 (ID Verifications)
CREATE TABLE id_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    id_type TEXT,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES staffs(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- コンプライアンスレポート (Compliance Reports)
CREATE TABLE compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type TEXT,
    status TEXT,
    generated_by UUID REFERENCES staffs(id),
    generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 4. インデックスの作成 (基本 + パフォーマンス最適化)
-- =============================================================================

-- 基本インデックス
CREATE INDEX idx_staffs_user_id ON staffs(user_id);
CREATE INDEX idx_staffs_email ON staffs(email);
CREATE INDEX idx_staffs_role ON staffs(role) WHERE is_active = true;
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_phone ON customers(phone_number);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_tables_is_active ON tables(is_active);
CREATE INDEX idx_visits_customer_id ON visits(customer_id);
CREATE INDEX idx_visits_check_in_at ON visits(check_in_at);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX idx_order_items_visit_id ON order_items(visit_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_attendance_records_staff_date ON attendance_records(staff_id, attendance_date);
CREATE INDEX idx_bottle_keeps_customer_status ON bottle_keeps(customer_id, status);

-- パフォーマンス最適化インデックス
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers
USING gin (
  name gin_trgm_ops,
  name_kana gin_trgm_ops,
  phone_number gin_trgm_ops,
  line_id gin_trgm_ops
);

CREATE INDEX IF NOT EXISTS idx_staffs_search ON staffs
USING gin (
  full_name gin_trgm_ops,
  full_name_kana gin_trgm_ops
);

CREATE INDEX IF NOT EXISTS idx_visits_date_range ON visits (check_in_at, status);
CREATE INDEX IF NOT EXISTS idx_attendance_date_range ON attendance_records (attendance_date, staff_id);

-- =============================================================================
-- 5. 関数とトリガーの作成 (最新版に統合)
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
CREATE TRIGGER update_staffs_updated_at BEFORE UPDATE ON staffs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_casts_profile_updated_at BEFORE UPDATE ON casts_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shift_requests_updated_at BEFORE UPDATE ON shift_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_confirmed_shifts_updated_at BEFORE UPDATE ON confirmed_shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bottle_keeps_updated_at BEFORE UPDATE ON bottle_keeps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cast_performances_updated_at BEFORE UPDATE ON cast_performances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_id_verifications_updated_at BEFORE UPDATE ON id_verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_reports_updated_at BEFORE UPDATE ON compliance_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 現在のユーザーのスタッフロールを取得する関数
CREATE OR REPLACE FUNCTION get_current_user_staff_role()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val TEXT;
BEGIN
  SELECT role::TEXT INTO user_role_val
  FROM staffs
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  RETURN user_role_val;
END;
$$ LANGUAGE plpgsql;

-- 最適化されたダッシュボード統計取得関数 (最終版)
CREATE OR REPLACE FUNCTION get_optimized_dashboard_stats(report_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  today_customers BIGINT,
  today_sales NUMERIC,
  today_visits BIGINT,
  active_tables BIGINT,
  today_reservations BIGINT,
  today_new_customers BIGINT,
  active_cast_count BIGINT,
  low_stock_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(DISTINCT c.id) as customer_count,
      COALESCE(SUM(oi.total_price), 0) as total_sales,
      COUNT(DISTINCT v.id) as visit_count,
      COUNT(DISTINCT CASE WHEN DATE(c.created_at) = report_date THEN c.id END) as new_customers
    FROM visits v
    LEFT JOIN customers c ON v.customer_id = c.id
    LEFT JOIN order_items oi ON v.id = oi.visit_id
    WHERE DATE(v.check_in_at) = report_date
  ),
  reservations AS (
    SELECT COUNT(*) as reservation_count
    FROM reservations
    WHERE reservation_date = report_date
      AND status IN ('confirmed', 'pending')
  ),
  active_cast AS (
    SELECT COUNT(*) as cast_count
    FROM staffs
    WHERE is_active = true
      AND role = 'cast'
  ),
  low_stock AS (
    SELECT COUNT(*) as low_stock_items
    FROM products
    WHERE stock_quantity < low_stock_threshold
      AND stock_quantity >= 0
      AND is_active = true
  )
  SELECT
    s.customer_count,
    s.total_sales,
    s.visit_count,
    (SELECT COUNT(*) FROM tables WHERE current_status != 'available')::BIGINT as active_tables,
    r.reservation_count,
    s.new_customers,
    ac.cast_count,
    ls.low_stock_items AS low_stock_count
  FROM stats s
  CROSS JOIN reservations r
  CROSS JOIN active_cast ac
  CROSS JOIN low_stock ls;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 最適化された顧客検索関数
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 最適化されたスタッフ検索関数
CREATE OR REPLACE FUNCTION search_staffs_optimized(
  search_term TEXT,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  full_name_kana TEXT,
  role TEXT,
  is_active BOOLEAN,
  similarity REAL
) AS $$
BEGIN
  IF LENGTH(search_term) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.full_name,
    s.full_name_kana,
    s.role::TEXT,
    s.is_active,
    GREATEST(
      similarity(COALESCE(s.full_name, ''), search_term),
      similarity(COALESCE(s.full_name_kana, ''), search_term)
    ) as sim
  FROM staffs s
  WHERE
    s.full_name % search_term OR
    s.full_name_kana % search_term
  ORDER BY sim DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 日次請求レポート生成関数
CREATE OR REPLACE FUNCTION generate_daily_billing_report(report_date DATE)
RETURNS TABLE(total_sales NUMERIC, total_visits INTEGER, cash_sales NUMERIC, card_sales NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(total_amount), 0)::NUMERIC AS total_sales,
    COUNT(*)::INTEGER AS total_visits,
    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0)::NUMERIC AS cash_sales,
    COALESCE(SUM(CASE WHEN payment_method = 'credit_card' THEN total_amount ELSE 0 END), 0)::NUMERIC AS card_sales
  FROM visits
  WHERE check_in_at::date = report_date AND status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- トップキャストパフォーマンス取得関数
CREATE OR REPLACE FUNCTION get_top_cast_performance(report_date DATE, limit_count INTEGER)
RETURNS TABLE(cast_id UUID, staff_name TEXT, total_sales NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id AS cast_id, s.full_name AS staff_name, COALESCE(SUM(oi.total_price), 0)::NUMERIC AS total_sales
  FROM staffs s
  JOIN order_items oi ON oi.cast_id = s.id
  JOIN visits v ON oi.visit_id = v.id
  WHERE v.check_in_at::date = report_date AND v.status = 'completed'
  GROUP BY s.id, s.full_name
  ORDER BY total_sales DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- トップ商品詳細取得関数
CREATE OR REPLACE FUNCTION get_top_products_with_details(
  report_date DATE,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
  product_id INTEGER,
  product_name TEXT,
  quantity_sold NUMERIC,
  revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    COALESCE(SUM(oi.quantity), 0)::NUMERIC AS quantity_sold,
    COALESCE(SUM(oi.total_price), 0)::NUMERIC AS revenue
  FROM products p
  LEFT JOIN order_items oi ON p.id = oi.product_id
  LEFT JOIN visits v ON oi.visit_id = v.id
  WHERE v.check_in_at::date = report_date
    AND v.status = 'completed'
  GROUP BY p.id, p.name
  ORDER BY revenue DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 勤怠ダッシュボード統計取得関数
CREATE OR REPLACE FUNCTION get_attendance_dashboard_stats(
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_staff BIGINT,
  present_count BIGINT,
  late_count BIGINT,
  absent_count BIGINT,
  attendance_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH staff_attendance AS (
    SELECT
      s.id,
      CASE
        WHEN ar.clock_in_time IS NOT NULL THEN 'present'
        ELSE 'absent'
      END as status
    FROM staffs s
    LEFT JOIN attendance_records ar ON s.id = ar.staff_id
      AND ar.attendance_date = target_date
    WHERE s.is_active = true
  )
  SELECT
    COUNT(*)::BIGINT AS total_staff,
    COUNT(*) FILTER (WHERE status = 'present')::BIGINT AS present_count,
    0::BIGINT AS late_count,
    COUNT(*) FILTER (WHERE status = 'absent')::BIGINT AS absent_count,
    CASE
      WHEN COUNT(*) > 0 THEN
        (COUNT(*) FILTER (WHERE status = 'present') * 100.0 / COUNT(*))::NUMERIC
      ELSE 0::NUMERIC
    END AS attendance_rate
  FROM staff_attendance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- キャストパフォーマンス取得関数
CREATE OR REPLACE FUNCTION get_cast_performance(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE(
  cast_id UUID,
  staff_name TEXT,
  total_sales NUMERIC,
  total_orders BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS cast_id,
    s.full_name AS staff_name,
    COALESCE(SUM(oi.total_price), 0)::NUMERIC AS total_sales,
    COUNT(DISTINCT oi.visit_id)::BIGINT AS total_orders
  FROM staffs s
  LEFT JOIN order_items oi ON s.id = oi.cast_id
  LEFT JOIN visits v ON oi.visit_id = v.id
  WHERE s.role = 'cast'
    AND v.check_in_at::date BETWEEN start_date AND end_date
    AND v.status = 'completed'
  GROUP BY s.id, s.full_name
  ORDER BY total_sales DESC;
END;
$$ LANGUAGE plpgsql;

-- 月次売上取得関数
CREATE OR REPLACE FUNCTION get_monthly_sales(
  report_year INTEGER,
  report_month INTEGER
)
RETURNS TABLE(
  total_sales NUMERIC,
  total_days BIGINT,
  average_daily_sales NUMERIC,
  best_day JSONB,
  worst_day JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_sales AS (
    SELECT
      v.check_in_at::date AS sale_date,
      COALESCE(SUM(v.total_amount), 0) AS daily_total
    FROM visits v
    WHERE EXTRACT(YEAR FROM v.check_in_at) = report_year
      AND EXTRACT(MONTH FROM v.check_in_at) = report_month
      AND v.status = 'completed'
    GROUP BY v.check_in_at::date
  ),
  stats AS (
    SELECT
      COALESCE(SUM(daily_total), 0) AS total,
      COUNT(DISTINCT sale_date) AS days,
      CASE
        WHEN COUNT(DISTINCT sale_date) > 0 THEN
          SUM(daily_total) / COUNT(DISTINCT sale_date)
        ELSE 0
      END AS avg_daily
    FROM daily_sales
  ),
  best AS (
    SELECT sale_date, daily_total
    FROM daily_sales
    ORDER BY daily_total DESC
    LIMIT 1
  ),
  worst AS (
    SELECT sale_date, daily_total
    FROM daily_sales
    WHERE daily_total > 0
    ORDER BY daily_total ASC
    LIMIT 1
  )
  SELECT
    stats.total::NUMERIC,
    stats.days::BIGINT,
    stats.avg_daily::NUMERIC,
    COALESCE(
      jsonb_build_object(
        'date', best.sale_date,
        'amount', best.daily_total
      ),
      '{}'::jsonb
    ) AS best_day,
    COALESCE(
      jsonb_build_object(
        'date', worst.sale_date,
        'amount', worst.daily_total
      ),
      '{}'::jsonb
    ) AS worst_day
  FROM stats
  LEFT JOIN best ON true
  LEFT JOIN worst ON true;
END;
$$ LANGUAGE plpgsql;

-- キャストランキング取得関数
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

-- 在庫ページデータ取得関数
CREATE OR REPLACE FUNCTION get_inventory_page_data(
  p_category TEXT DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- 全データを一度のクエリで取得してJSON形式で返す
  WITH filtered_products AS (
    SELECT * FROM products
    WHERE is_active = true
      AND (p_category IS NULL OR category = p_category)
      AND (p_search_term IS NULL OR name ILIKE '%' || p_search_term || '%')
    ORDER BY name
  ),
  stats AS (
    SELECT
      COUNT(*)::INTEGER AS total_products,
      COUNT(CASE WHEN stock_quantity <= low_stock_threshold AND stock_quantity > 0 THEN 1 END)::INTEGER AS low_stock_items,
      COUNT(CASE WHEN stock_quantity = 0 THEN 1 END)::INTEGER AS out_of_stock_items,
      COALESCE(SUM(stock_quantity * cost), 0)::NUMERIC AS total_value
    FROM products
    WHERE is_active = true
  ),
  alerts AS (
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
      stock_quantity
  ),
  categories AS (
    SELECT DISTINCT category
    FROM products
    WHERE is_active = true
    ORDER BY category
  )
  SELECT json_build_object(
    'products', COALESCE((SELECT json_agg(p.*) FROM filtered_products p), '[]'::JSON),
    'stats', (SELECT row_to_json(s.*) FROM stats s),
    'alerts', COALESCE((SELECT json_agg(a.*) FROM alerts a), '[]'::JSON),
    'categories', COALESCE((SELECT json_agg(c.category) FROM categories c), '[]'::JSON)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. Row Level Security (RLS) ポリシーの設定 (改善版)
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
ALTER TABLE cast_performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE id_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;

-- RLSヘルパー関数
CREATE OR REPLACE FUNCTION get_current_user_staff_id()
RETURNS UUID AS $$
DECLARE
  staff_id_val UUID;
BEGIN
  SELECT id INTO staff_id_val FROM public.staffs WHERE user_id = auth.uid() LIMIT 1;
  RETURN staff_id_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role FROM public.staffs WHERE user_id = auth.uid() LIMIT 1
  ) IN ('admin', 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ポリシー削除 (再定義のため)
DROP POLICY IF EXISTS "Allow authenticated users to read data" ON staffs;
DROP POLICY IF EXISTS "Allow admin/manager modification" ON staffs;
-- ... 他のテーブルのポリシーも同様に削除 ...
DROP POLICY IF EXISTS "Allow authenticated users to read data" ON compliance_reports;
DROP POLICY IF EXISTS "Allow admin/manager modification" ON compliance_reports;


-- staffs テーブルのポリシー
CREATE POLICY "Allow admin/manager to read all staff" ON staffs FOR SELECT USING (is_admin_or_manager());
CREATE POLICY "Allow staff to read their own data" ON staffs FOR SELECT USING (id = get_current_user_staff_id());
CREATE POLICY "Allow admin/manager to update staff" ON staffs FOR UPDATE USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Allow staff to update their own data" ON staffs FOR UPDATE USING (id = get_current_user_staff_id()) WITH CHECK (id = get_current_user_staff_id());
CREATE POLICY "Allow admin/manager to insert/delete staff" ON staffs FOR INSERT WITH CHECK (is_admin_or_manager());
CREATE POLICY "Allow admin/manager to delete staff" ON staffs FOR DELETE USING (is_admin_or_manager());

-- casts_profile テーブルのポリシー
CREATE POLICY "Allow all authenticated to read cast profiles" ON casts_profile FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/manager to manage cast profiles" ON casts_profile FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Allow cast to update their own profile" ON casts_profile FOR UPDATE USING (staff_id = get_current_user_staff_id()) WITH CHECK (staff_id = get_current_user_staff_id());

-- attendance_records & shift_requests テーブルのポリシー
CREATE POLICY "Admin/Manager can read all records" ON attendance_records FOR SELECT USING (is_admin_or_manager());
CREATE POLICY "Staff can read their own records" ON attendance_records FOR SELECT USING (staff_id = get_current_user_staff_id());
CREATE POLICY "Admin/Manager can write all records" ON attendance_records FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Staff can create their own records" ON attendance_records FOR INSERT WITH CHECK (staff_id = get_current_user_staff_id());

CREATE POLICY "Admin/Manager can read all requests" ON shift_requests FOR SELECT USING (is_admin_or_manager());
CREATE POLICY "Staff can read their own requests" ON shift_requests FOR SELECT USING (staff_id = get_current_user_staff_id());
CREATE POLICY "Admin/Manager can write all requests" ON shift_requests FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Staff can create their own requests" ON shift_requests FOR INSERT WITH CHECK (staff_id = get_current_user_staff_id());

-- その他のテーブルに対するデフォルトポリシー
CREATE POLICY "Allow read access for all authenticated users" ON customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/manager write access" ON customers FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Allow read access for all authenticated users" ON visits FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/manager write access" ON visits FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Allow read access for all authenticated users" ON tables FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/manager write access" ON tables FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Allow read access for all authenticated users" ON reservations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/manager write access" ON reservations FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Allow read access for all authenticated users" ON products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/manager write access" ON products FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Allow read access for all authenticated users" ON order_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/manager write access" ON order_items FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Allow read access for all authenticated users" ON confirmed_shifts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/manager write access" ON confirmed_shifts FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Allow read access for all authenticated users" ON bottle_keeps FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/manager write access" ON bottle_keeps FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Allow read access for all authenticated users" ON daily_closings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/manager write access" ON daily_closings FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Allow read access for all authenticated users" ON notification_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/manager write access" ON notification_logs FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Allow read access for all authenticated users" ON cast_performances FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/manager write access" ON cast_performances FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Allow read access for all authenticated users" ON inventory_movements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/manager write access" ON inventory_movements FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Allow read access for all authenticated users" ON qr_codes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/manager write access" ON qr_codes FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Allow read access for all authenticated users" ON qr_attendance_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/manager write access" ON qr_attendance_logs FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Allow read access for all authenticated users" ON id_verifications FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/manager write access" ON id_verifications FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "Allow read access for all authenticated users" ON compliance_reports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin/manager write access" ON compliance_reports FOR ALL USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());


-- =============================================================================
-- 7. テーブルとインデックスへのコメント追加
-- =============================================================================
COMMENT ON COLUMN tables.is_active IS 'テーブルが運用中かどうか（撤去されていないか）';
COMMENT ON COLUMN tables.is_available IS 'テーブルが現在利用可能かどうか（空席か）';
COMMENT ON INDEX idx_customers_search IS 'GIN index for fast partial match searches on customer data';
COMMENT ON INDEX idx_staffs_search IS 'GIN index for fast partial match searches on staff names';
COMMENT ON INDEX idx_visits_date_range IS 'B-tree index for date range queries on visits';
COMMENT ON INDEX idx_attendance_date_range IS 'B-tree index for date range queries on attendance records';
COMMENT ON FUNCTION search_customers_optimized IS 'Optimized customer search using Trigram similarity for fast partial matching';
COMMENT ON FUNCTION search_staffs_optimized IS 'Optimized staff search using Trigram similarity for fast partial matching';
COMMENT ON FUNCTION get_optimized_dashboard_stats IS 'Optimized dashboard statistics calculation including all required metrics';

-- =============================================================================
-- 8. 権限の付与
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =============================================================================
-- 9. サンプルデータの挿入
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