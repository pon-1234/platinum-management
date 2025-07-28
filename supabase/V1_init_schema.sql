-- =============================================================================
-- Platinum Management System - Complete Database Schema (Version 1.0)
-- =============================================================================
-- このファイルは完全なデータベーススキーマを定義します。
-- 新規セットアップ時は、このファイルのみを実行してください。

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE table_status AS ENUM ('available', 'reserved', 'occupied', 'cleaning');
CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show');

-- =============================================================================
-- TABLES
-- =============================================================================

-- Staffs table (スタッフテーブル)
CREATE TABLE IF NOT EXISTS staffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'hall', 'cashier', 'cast')),
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cast profiles table (キャストプロフィールテーブル)
CREATE TABLE IF NOT EXISTS casts_profile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID UNIQUE NOT NULL REFERENCES staffs(id) ON DELETE CASCADE,
  stage_name VARCHAR(50) NOT NULL,
  birthday DATE,
  blood_type VARCHAR(2) CHECK (blood_type IN ('A', 'B', 'O', 'AB')),
  height INTEGER CHECK (height > 0 AND height < 300),
  three_size VARCHAR(20),
  hobby TEXT,
  special_skill TEXT,
  self_introduction TEXT,
  profile_image_url TEXT,
  hourly_rate INTEGER NOT NULL DEFAULT 0 CHECK (hourly_rate >= 0),
  back_percentage DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (back_percentage >= 0 AND back_percentage <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES staffs(id),
  updated_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cast performances table (キャスト実績テーブル)
CREATE TABLE IF NOT EXISTS cast_performances (
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

-- Customers table (顧客テーブル)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_kana TEXT,
  phone_number TEXT,
  line_id TEXT,
  birthday DATE,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'vip', 'caution', 'blacklisted')),
  created_by UUID REFERENCES staffs(id),
  updated_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Visits table (来店履歴テーブル)
CREATE TABLE IF NOT EXISTS visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id),
  table_id INTEGER NOT NULL,
  check_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out_at TIMESTAMPTZ,
  num_guests INTEGER NOT NULL CHECK (num_guests > 0),
  subtotal INTEGER,
  service_charge INTEGER,
  tax_amount INTEGER,
  total_amount INTEGER,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'cancelled')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES staffs(id),
  updated_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tables table (テーブル管理テーブル)
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(50) NOT NULL UNIQUE,
  capacity INT NOT NULL CHECK (capacity > 0 AND capacity <= 50),
  location VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  current_status table_status DEFAULT 'available',
  current_visit_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reservations table (予約テーブル)
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  number_of_guests INT NOT NULL CHECK (number_of_guests > 0 AND number_of_guests <= 20),
  assigned_cast_id UUID REFERENCES staffs(id) ON DELETE SET NULL,
  special_requests TEXT,
  status reservation_status DEFAULT 'pending',
  checked_in_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_by UUID REFERENCES staffs(id),
  updated_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Products table (商品テーブル)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  cost INTEGER NOT NULL DEFAULT 0 CHECK (cost >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES staffs(id),
  updated_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order items table (注文アイテムテーブル)
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

-- Shift templates table (シフトテンプレートテーブル)
CREATE TABLE IF NOT EXISTS shift_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INTEGER[] NOT NULL CHECK (array_length(days_of_week, 1) > 0),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES staffs(id),
  updated_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Shift requests table (シフト希望テーブル)
CREATE TABLE IF NOT EXISTS shift_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cast_id UUID NOT NULL REFERENCES staffs(id),
  request_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  approved_by UUID REFERENCES staffs(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cast_id, request_date)
);

-- Confirmed shifts table (確定シフトテーブル)
CREATE TABLE IF NOT EXISTS confirmed_shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staffs(id),
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  shift_type TEXT DEFAULT 'regular' CHECK (shift_type IN ('regular', 'overtime', 'holiday')),
  notes TEXT,
  created_by UUID REFERENCES staffs(id),
  updated_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, shift_date)
);

-- Attendance records table (出退勤記録テーブル)
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staffs(id),
  date DATE NOT NULL,
  clock_in_time TIMESTAMPTZ,
  clock_out_time TIMESTAMPTZ,
  break_start_time TIMESTAMPTZ,
  break_end_time TIMESTAMPTZ,
  total_work_minutes INTEGER,
  overtime_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_by UUID REFERENCES staffs(id),
  updated_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, date)
);

-- Attendance corrections table (出退勤修正テーブル)
CREATE TABLE IF NOT EXISTS attendance_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES staffs(id),
  original_clock_in TIMESTAMPTZ,
  original_clock_out TIMESTAMPTZ,
  corrected_clock_in TIMESTAMPTZ,
  corrected_clock_out TIMESTAMPTZ,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES staffs(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- QR codes table (QRコードテーブル)
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staffs(id),
  qr_data TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- QR attendance logs table (QR出退勤ログテーブル)
CREATE TABLE IF NOT EXISTS qr_attendance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_code_id UUID NOT NULL REFERENCES qr_codes(id),
  staff_id UUID NOT NULL REFERENCES staffs(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
  scanned_at TIMESTAMPTZ DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Inventory movements table (在庫変動履歴テーブル)
CREATE TABLE IF NOT EXISTS inventory_movements (
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

-- Bottle keeps table (ボトルキープテーブル)
CREATE TABLE IF NOT EXISTS bottle_keeps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT,
  opened_date DATE NOT NULL,
  expiry_date DATE,
  remaining_amount DECIMAL(3,2) DEFAULT 1.0 CHECK (remaining_amount >= 0.0 AND remaining_amount <= 1.0),
  bottle_number VARCHAR(20) UNIQUE,
  storage_location VARCHAR(50),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bottle keep usage table (ボトルキープ使用履歴テーブル)
CREATE TABLE IF NOT EXISTS bottle_keep_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bottle_keep_id UUID REFERENCES bottle_keeps(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
  amount_used DECIMAL(3,2) NOT NULL CHECK (amount_used > 0.0 AND amount_used <= 1.0),
  notes TEXT,
  created_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ID verifications table (身分証確認記録テーブル)
CREATE TABLE IF NOT EXISTS id_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  id_type VARCHAR(20) NOT NULL CHECK (id_type IN ('license', 'passport', 'mynumber', 'residence_card')),
  id_image_url TEXT,
  birth_date DATE,
  verification_date TIMESTAMPTZ DEFAULT NOW(),
  verified_by UUID REFERENCES staffs(id),
  ocr_result JSONB,
  is_verified BOOLEAN DEFAULT false,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance reports table (法定帳簿出力履歴テーブル)
CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('employee_list', 'complaint_log', 'business_report', 'tax_report')),
  generated_by UUID REFERENCES staffs(id),
  file_path TEXT,
  period_start DATE,
  period_end DATE,
  status VARCHAR(20) DEFAULT 'generated' CHECK (status IN ('generated', 'submitted', 'approved')),
  notes TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Staffs indexes
CREATE INDEX idx_staffs_user_id ON staffs(user_id);
CREATE INDEX idx_staffs_role ON staffs(role);
CREATE INDEX idx_staffs_is_active ON staffs(is_active);

-- Cast profiles indexes
CREATE INDEX idx_casts_profile_staff_id ON casts_profile(staff_id);
CREATE INDEX idx_casts_profile_is_active ON casts_profile(is_active);

-- Cast performances indexes
CREATE INDEX idx_cast_performances_cast_id ON cast_performances(cast_id);
CREATE INDEX idx_cast_performances_date ON cast_performances(date);

-- Customers indexes
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_name_kana ON customers(name_kana);
CREATE INDEX idx_customers_phone_number ON customers(phone_number);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_created_at ON customers(created_at);
CREATE UNIQUE INDEX idx_customers_phone_unique ON customers(phone_number) WHERE phone_number IS NOT NULL;

-- Visits indexes
CREATE INDEX idx_visits_customer_id ON visits(customer_id);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_check_in_at ON visits(check_in_at);
CREATE INDEX idx_visits_created_at ON visits(created_at);

-- Reservations indexes
CREATE INDEX idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX idx_reservations_table_id ON reservations(table_id);
CREATE INDEX idx_reservations_assigned_cast_id ON reservations(assigned_cast_id);
CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_reservations_status ON reservations(status);

-- Attendance records indexes
CREATE INDEX idx_attendance_records_staff_id ON attendance_records(staff_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(date);
CREATE INDEX idx_attendance_corrections_attendance_record_id ON attendance_corrections(attendance_record_id);

-- QR codes indexes
CREATE INDEX idx_qr_codes_staff_id ON qr_codes(staff_id);
CREATE INDEX idx_qr_attendance_logs_staff_id ON qr_attendance_logs(staff_id);
CREATE INDEX idx_qr_attendance_logs_scanned_at ON qr_attendance_logs(scanned_at);

-- Inventory indexes
CREATE INDEX idx_inventory_movements_product_date ON inventory_movements(product_id, created_at);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);

-- Bottle keep indexes
CREATE INDEX idx_bottle_keeps_customer ON bottle_keeps(customer_id, status);
CREATE INDEX idx_bottle_keeps_expiry ON bottle_keeps(expiry_date) WHERE status = 'active';
CREATE INDEX idx_bottle_keep_usage_bottle_keep_id ON bottle_keep_usage(bottle_keep_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Cast ranking function
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

-- Safe RLS functions (SECURITY DEFINER to bypass RLS recursion)
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
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT role INTO user_role
  FROM staffs
  WHERE user_id = current_user_id 
    AND is_active = true;
  
  RETURN user_role;
END;
$$;

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

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_staffs_updated_at BEFORE UPDATE ON staffs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_casts_profile_updated_at BEFORE UPDATE ON casts_profile
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cast_performances_updated_at BEFORE UPDATE ON cast_performances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_templates_updated_at BEFORE UPDATE ON shift_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_requests_updated_at BEFORE UPDATE ON shift_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_confirmed_shifts_updated_at BEFORE UPDATE ON confirmed_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_corrections_updated_at BEFORE UPDATE ON attendance_corrections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bottle_keeps_updated_at BEFORE UPDATE ON bottle_keeps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_id_verifications_updated_at BEFORE UPDATE ON id_verifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE casts_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE cast_performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmed_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_keeps ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_keep_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE id_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Staffs policies
CREATE POLICY "staff_can_view_own_record" ON staffs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "managers_can_view_all_staff" ON staffs
  FOR SELECT
  USING (current_user_is_manager_or_admin());

CREATE POLICY "service_role_full_access" ON staffs
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "managers_can_insert_staff" ON staffs
  FOR INSERT
  WITH CHECK (current_user_is_manager_or_admin() OR auth.role() = 'service_role');

CREATE POLICY "managers_can_update_staff" ON staffs
  FOR UPDATE
  USING (current_user_is_manager_or_admin() OR auth.role() = 'service_role');

CREATE POLICY "staff_can_update_own_basic_info" ON staffs
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins_can_delete_staff" ON staffs
  FOR DELETE
  USING (current_user_is_admin() OR auth.role() = 'service_role');

-- Casts profile policies
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
  );

CREATE POLICY "managers_can_manage_cast_profiles" ON casts_profile
  FOR ALL
  USING (current_user_is_manager_or_admin() OR auth.role() = 'service_role');

-- Cast performances policies
CREATE POLICY "Admin, Manager, and Cast can view performances" ON cast_performances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND (
        staffs.role IN ('admin', 'manager')
        OR staffs.id IN (
          SELECT staff_id FROM casts_profile
          WHERE casts_profile.id = cast_performances.cast_id
        )
      )
    )
  );

CREATE POLICY "Admin and Manager can manage performances" ON cast_performances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- Customers policies
CREATE POLICY "authorized_staff_can_view_customers" ON customers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager', 'hall', 'cashier')
      AND s.is_active = true
    )
  );

CREATE POLICY "authorized_staff_can_create_customers" ON customers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager', 'hall')
      AND s.is_active = true
    )
  );

CREATE POLICY "authorized_staff_can_update_customers" ON customers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager', 'hall')
      AND s.is_active = true
    )
  );

CREATE POLICY "managers_can_delete_customers" ON customers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager')
      AND s.is_active = true
    )
  );

-- Visits policies
CREATE POLICY "authorized_staff_can_view_visits" ON visits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager', 'hall', 'cashier')
      AND s.is_active = true
    )
  );

CREATE POLICY "authorized_staff_can_create_visits" ON visits
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager', 'hall')
      AND s.is_active = true
    )
  );

CREATE POLICY "authorized_staff_can_update_visits" ON visits
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager', 'hall', 'cashier')
      AND s.is_active = true
    )
  );

CREATE POLICY "managers_can_delete_visits" ON visits
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager')
      AND s.is_active = true
    )
  );

-- Reservations policies
CREATE POLICY "Staff can manage reservations" ON reservations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager', 'hall')
      AND staffs.is_active = true
    )
  );

-- Products policies
CREATE POLICY "Staff can view active products" ON products
  FOR SELECT
  USING (is_active = true AND EXISTS (
    SELECT 1 FROM staffs
    WHERE staffs.user_id = auth.uid()
    AND staffs.is_active = true
  ));

CREATE POLICY "Managers can manage products" ON products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
      AND staffs.is_active = true
    )
  );

-- Order items policies
CREATE POLICY "Staff can manage order items" ON order_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager', 'hall', 'cashier')
      AND staffs.is_active = true
    )
  );

-- Shift related policies
CREATE POLICY "Managers can manage all confirmed shifts" ON confirmed_shifts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
      AND staffs.is_active = true
    )
  );

CREATE POLICY "Staff can view own confirmed shifts" ON confirmed_shifts
  FOR SELECT
  USING (
    staff_id IN (SELECT id FROM staffs WHERE user_id = auth.uid())
  );

-- Attendance related policies
CREATE POLICY "Managers can manage all attendance records" ON attendance_records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
      AND staffs.is_active = true
    )
  );

CREATE POLICY "Staff can view own attendance records" ON attendance_records
  FOR SELECT
  USING (
    staff_id IN (SELECT id FROM staffs WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff can create own attendance records" ON attendance_records
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff can clock in/out" ON attendance_records
  FOR UPDATE
  USING (
    staff_id IN (SELECT id FROM staffs WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff can view own corrections" ON attendance_corrections
  FOR SELECT
  USING (
    requested_by IN (SELECT id FROM staffs WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff can request own corrections" ON attendance_corrections
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Managers can manage all corrections" ON attendance_corrections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
      AND staffs.is_active = true
    )
  );

-- QR code policies
CREATE POLICY "qr_codes_policy" ON qr_codes
  FOR ALL TO authenticated
  USING (
    staff_id IN (SELECT id FROM staffs WHERE user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "qr_attendance_logs_policy" ON qr_attendance_logs
  FOR ALL TO authenticated
  USING (
    staff_id IN (SELECT id FROM staffs WHERE user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- Inventory policies
CREATE POLICY "inventory_policy" ON inventory_movements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staffs 
      WHERE staffs.user_id = auth.uid() 
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- Bottle keep policies
CREATE POLICY "bottle_keeps_policy" ON bottle_keeps
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.is_active = true
    )
  );

CREATE POLICY "bottle_keep_usage_policy" ON bottle_keep_usage
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.is_active = true
    )
  );

-- Compliance policies
CREATE POLICY "id_verification_policy" ON id_verifications
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "compliance_reports_policy" ON compliance_reports
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION get_current_user_staff_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION current_user_has_role(TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION current_user_is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION current_user_is_manager_or_admin() TO authenticated, service_role;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION get_current_user_staff_role() IS 'SECURITY DEFINERによりRLSをバイパスして現在ユーザーのロールを安全に取得';
COMMENT ON FUNCTION current_user_has_role(TEXT[]) IS '現在ユーザーが指定されたロールのいずれかを持っているかチェック';
COMMENT ON FUNCTION current_user_is_admin() IS '現在ユーザーが管理者かチェック';
COMMENT ON FUNCTION current_user_is_manager_or_admin() IS '現在ユーザーが管理者またはマネージャーかチェック';