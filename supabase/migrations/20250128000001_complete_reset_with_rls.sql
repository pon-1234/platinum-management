-- Complete database reset with proper RLS policies
-- WARNING: This will drop and recreate all tables

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

-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_cast_ranking(DATE, DATE, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS generate_customer_summary_report(DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS generate_cast_performance_report(DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS generate_sales_report(DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS count_low_stock_products() CASCADE;
DROP FUNCTION IF EXISTS get_low_stock_products() CASCADE;

-- Create tables
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

CREATE TABLE IF NOT EXISTS shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staffs(id),
  qr_data TEXT NOT NULL,
  signature TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS bottle_keep_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bottle_keep_id UUID NOT NULL REFERENCES bottle_keeps(id),
  visit_id UUID NOT NULL REFERENCES visits(id),
  used_percentage INTEGER NOT NULL CHECK (used_percentage > 0 AND used_percentage <= 100),
  notes TEXT,
  created_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

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

-- Create indexes
CREATE INDEX idx_staffs_user_id ON staffs(user_id);
CREATE INDEX idx_staffs_role ON staffs(role);
CREATE INDEX idx_staffs_is_active ON staffs(is_active);
CREATE INDEX idx_casts_profile_staff_id ON casts_profile(staff_id);
CREATE INDEX idx_casts_profile_is_active ON casts_profile(is_active);
CREATE INDEX idx_cast_performances_cast_id ON cast_performances(cast_id);
CREATE INDEX idx_cast_performances_date ON cast_performances(date);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_name_kana ON customers(name_kana);
CREATE INDEX idx_customers_phone_number ON customers(phone_number);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_created_at ON customers(created_at);
CREATE UNIQUE INDEX idx_customers_phone_unique ON customers(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_visits_customer_id ON visits(customer_id);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_check_in_at ON visits(check_in_at);
CREATE INDEX idx_visits_created_at ON visits(created_at);
CREATE INDEX idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX idx_reservations_table_id ON reservations(table_id);
CREATE INDEX idx_reservations_assigned_cast_id ON reservations(assigned_cast_id);
CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_attendance_records_staff_id ON attendance_records(staff_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(attendance_date);
CREATE INDEX idx_attendance_corrections_attendance_record_id ON attendance_corrections(attendance_record_id);
CREATE INDEX idx_qr_codes_staff_id ON qr_codes(staff_id);
CREATE INDEX idx_qr_attendance_logs_staff_id ON qr_attendance_logs(staff_id);
CREATE INDEX idx_qr_attendance_logs_scanned_at ON qr_attendance_logs(scanned_at);
CREATE INDEX idx_inventory_movements_product_date ON inventory_movements(product_id, created_at);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_bottle_keeps_customer ON bottle_keeps(customer_id, status);
CREATE INDEX idx_bottle_keeps_expiry ON bottle_keeps(expiry_date) WHERE status = 'active';
CREATE INDEX idx_bottle_keep_usage_bottle_keep_id ON bottle_keep_usage(bottle_keep_id);
CREATE INDEX idx_daily_closings_date ON daily_closings(closing_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
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

-- Enable RLS on all tables
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

-- Create RLS policies (allow all users to select)
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

-- Create policies for authenticated users
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

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Create RPC functions
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

CREATE OR REPLACE FUNCTION generate_cast_performance_report(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  cast_id UUID,
  cast_name VARCHAR,
  shimei_count BIGINT,
  dohan_count BIGINT,
  sales_amount NUMERIC,
  drink_count BIGINT,
  working_days BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id as cast_id,
    cp.stage_name as cast_name,
    COALESCE(SUM(perf.shimei_count), 0) as shimei_count,
    COALESCE(SUM(perf.dohan_count), 0) as dohan_count,
    COALESCE(SUM(perf.sales_amount), 0)::NUMERIC as sales_amount,
    COALESCE(SUM(perf.drink_count), 0) as drink_count,
    COUNT(DISTINCT perf.date) as working_days
  FROM casts_profile cp
  LEFT JOIN cast_performances perf ON cp.id = perf.cast_id
    AND perf.date BETWEEN start_date AND end_date
  WHERE cp.is_active = true
  GROUP BY cp.id, cp.stage_name
  ORDER BY sales_amount DESC;
END;
$$ LANGUAGE plpgsql;

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

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_cast_ranking(DATE, DATE, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION generate_customer_summary_report(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION generate_cast_performance_report(DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION generate_sales_report(DATE, DATE) TO anon;

-- Insert sample data
-- Sample staff
INSERT INTO staffs (id, full_name, email, phone, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Admin User', 'admin@example.com', '090-1234-5678', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'Manager User', 'manager@example.com', '090-2345-6789', 'manager'),
  ('00000000-0000-0000-0000-000000000003', 'Cast User 1', 'cast1@example.com', '090-3456-7890', 'cast'),
  ('00000000-0000-0000-0000-000000000004', 'Cast User 2', 'cast2@example.com', '090-4567-8901', 'cast'),
  ('00000000-0000-0000-0000-000000000005', 'Hall Staff', 'hall@example.com', '090-5678-9012', 'hall');

-- Sample tables
INSERT INTO tables (table_number, capacity, location) VALUES
  ('VIP-1', 4, 'VIPルーム'),
  ('VIP-2', 6, 'VIPルーム'),
  ('A-1', 4, 'メインフロア'),
  ('A-2', 4, 'メインフロア'),
  ('B-1', 6, 'メインフロア'),
  ('B-2', 6, 'メインフロア');

-- Sample shifts
INSERT INTO shifts (name, start_time, end_time) VALUES
  ('早番', '18:00', '23:00'),
  ('遅番', '21:00', '03:00');

-- Sample casts profile
INSERT INTO casts_profile (staff_id, stage_name) VALUES
  ('00000000-0000-0000-0000-000000000003', 'ゆい'),
  ('00000000-0000-0000-0000-000000000004', 'みく');

-- Sample customers
INSERT INTO customers (name, name_kana, phone_number, email, status) VALUES
  ('田中太郎', 'タナカタロウ', '090-1111-2222', 'tanaka@example.com', 'vip'),
  ('鈴木花子', 'スズキハナコ', '090-3333-4444', 'suzuki@example.com', 'active'),
  ('佐藤次郎', 'サトウジロウ', '090-5555-6666', 'sato@example.com', 'active');

-- Sample products
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

-- Verify setup
SELECT 
  tablename,
  has_table_privilege('anon', tablename, 'SELECT') as anon_can_select
FROM (
  SELECT tablename FROM pg_tables WHERE schemaname = 'public'
) t
ORDER BY tablename;