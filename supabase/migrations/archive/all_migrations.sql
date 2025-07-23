-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create staffs table
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

-- Create casts_profile table
CREATE TABLE IF NOT EXISTS casts_profile (
  staff_id UUID PRIMARY KEY REFERENCES staffs(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  profile_image_url TEXT,
  bio TEXT,
  hourly_wage INTEGER NOT NULL DEFAULT 0,
  commission_rate JSONB NOT NULL DEFAULT '{"shimei": 0, "bottlePercent": 0}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_staffs_user_id ON staffs(user_id);
CREATE INDEX idx_staffs_role ON staffs(role);
CREATE INDEX idx_staffs_is_active ON staffs(is_active);

-- Enable Row Level Security
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE casts_profile ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staffs table
-- Policy: Staff can view all staff (for managers and admins)
CREATE POLICY "managers_can_view_all_staff" ON staffs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager')
      AND s.is_active = true
    )
  );

-- Policy: Staff can view own record
CREATE POLICY "staff_can_view_own_record" ON staffs
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Only admins and managers can insert staff
CREATE POLICY "managers_can_insert_staff" ON staffs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager')
      AND s.is_active = true
    )
  );

-- Policy: Only admins and managers can update staff
CREATE POLICY "managers_can_update_staff" ON staffs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager')
      AND s.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager')
      AND s.is_active = true
    )
  );

-- Policy: Staff can update their own basic info (limited fields)
CREATE POLICY "staff_can_update_own_basic_info" ON staffs
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() 
    AND role = OLD.role -- Cannot change own role
    AND is_active = OLD.is_active -- Cannot change own active status
  );

-- Policy: Only admins can delete staff
CREATE POLICY "admins_can_delete_staff" ON staffs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role = 'admin'
      AND s.is_active = true
    )
  );

-- RLS Policies for casts_profile table
-- Policy: Cast can view own profile
CREATE POLICY "cast_can_view_own_profile" ON casts_profile
  FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  );

-- Policy: Managers and admins can view all cast profiles
CREATE POLICY "managers_can_view_all_cast_profiles" ON casts_profile
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager')
      AND s.is_active = true
    )
  );

-- Policy: Hall staff can view cast profiles (for booking purposes)
CREATE POLICY "hall_staff_can_view_cast_profiles" ON casts_profile
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role = 'hall'
      AND s.is_active = true
    )
  );

-- Policy: Cast can update own profile (limited fields)
CREATE POLICY "cast_can_update_own_profile" ON casts_profile
  FOR UPDATE
  USING (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
    AND hourly_wage = OLD.hourly_wage -- Cannot change own wage
    AND commission_rate = OLD.commission_rate -- Cannot change own commission
  );

-- Policy: Only managers and admins can manage cast profiles fully
CREATE POLICY "managers_can_manage_cast_profiles" ON casts_profile
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager')
      AND s.is_active = true
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_staffs_updated_at BEFORE UPDATE ON staffs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_casts_profile_updated_at BEFORE UPDATE ON casts_profile
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();-- Create customers table
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

-- Create indexes
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_name_kana ON customers(name_kana);
CREATE INDEX idx_customers_phone_number ON customers(phone_number);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_created_at ON customers(created_at);

-- Create unique index for phone number (but allow NULL)
CREATE UNIQUE INDEX idx_customers_phone_unique ON customers(phone_number) WHERE phone_number IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers table
-- Policy: Staff with appropriate roles can view customers
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

-- Policy: Staff with appropriate roles can create customers
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

-- Policy: Staff with appropriate roles can update customers
CREATE POLICY "authorized_staff_can_update_customers" ON customers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager', 'hall')
      AND s.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager', 'hall')
      AND s.is_active = true
    )
  );

-- Policy: Only admins and managers can delete customers
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

-- Create trigger for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create visits table (for customer visit history)
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  table_id INTEGER NOT NULL,
  check_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out_at TIMESTAMPTZ,
  num_guests INTEGER NOT NULL DEFAULT 1 CHECK (num_guests > 0),
  total_amount INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by UUID REFERENCES staffs(id),
  updated_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for visits
CREATE INDEX idx_visits_customer_id ON visits(customer_id);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_check_in_at ON visits(check_in_at);
CREATE INDEX idx_visits_created_at ON visits(created_at);

-- Enable Row Level Security for visits
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for visits table
-- Policy: Staff with appropriate roles can view visits
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

-- Policy: Staff with appropriate roles can create visits
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

-- Policy: Staff with appropriate roles can update visits
CREATE POLICY "authorized_staff_can_update_visits" ON visits
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager', 'hall', 'cashier')
      AND s.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staffs s 
      WHERE s.user_id = auth.uid() 
      AND s.role IN ('admin', 'manager', 'hall', 'cashier')
      AND s.is_active = true
    )
  );

-- Policy: Only admins and managers can delete visits
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

-- Create trigger for visits updated_at
CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();-- Drop existing casts_profile table if it exists
DROP TABLE IF EXISTS public.casts_profile CASCADE;

-- Create casts_profile table with proper structure
CREATE TABLE public.casts_profile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID UNIQUE NOT NULL REFERENCES public.staffs(id) ON DELETE CASCADE,
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
  created_by UUID REFERENCES public.staffs(id),
  updated_by UUID REFERENCES public.staffs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create cast_performances table
CREATE TABLE public.cast_performances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cast_id UUID NOT NULL REFERENCES public.casts_profile(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shimei_count INTEGER NOT NULL DEFAULT 0 CHECK (shimei_count >= 0),
  dohan_count INTEGER NOT NULL DEFAULT 0 CHECK (dohan_count >= 0),
  sales_amount INTEGER NOT NULL DEFAULT 0 CHECK (sales_amount >= 0),
  drink_count INTEGER NOT NULL DEFAULT 0 CHECK (drink_count >= 0),
  created_by UUID REFERENCES public.staffs(id),
  updated_by UUID REFERENCES public.staffs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cast_id, date)
);

-- Create indexes
CREATE INDEX idx_casts_profile_staff_id ON public.casts_profile(staff_id);
CREATE INDEX idx_casts_profile_is_active ON public.casts_profile(is_active);
CREATE INDEX idx_cast_performances_cast_id ON public.cast_performances(cast_id);
CREATE INDEX idx_cast_performances_date ON public.cast_performances(date);

-- Enable RLS
ALTER TABLE public.casts_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cast_performances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for casts_profile
-- Admin and Manager can view all casts
CREATE POLICY "Admin and Manager can view all casts" ON public.casts_profile
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- Cast can view and update their own profile
CREATE POLICY "Cast can view own profile" ON public.casts_profile
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM public.staffs
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Cast can update own profile" ON public.casts_profile
  FOR UPDATE USING (
    staff_id IN (
      SELECT id FROM public.staffs
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    staff_id IN (
      SELECT id FROM public.staffs
      WHERE user_id = auth.uid()
    )
  );

-- Admin can create and update any cast profile
CREATE POLICY "Admin can create casts" ON public.casts_profile
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role = 'admin'
    )
  );

CREATE POLICY "Admin can update any cast" ON public.casts_profile
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role = 'admin'
    )
  );

-- RLS Policies for cast_performances
-- Admin, Manager, and the cast themselves can view performances
CREATE POLICY "Admin, Manager, and Cast can view performances" ON public.cast_performances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.staffs
      WHERE staffs.user_id = auth.uid()
      AND (
        staffs.role IN ('admin', 'manager')
        OR staffs.id IN (
          SELECT staff_id FROM public.casts_profile
          WHERE casts_profile.id = cast_performances.cast_id
        )
      )
    )
  );

-- Only Admin and Manager can create/update performances
CREATE POLICY "Admin and Manager can manage performances" ON public.cast_performances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- Create function to calculate cast ranking
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
  FROM public.casts_profile cp
  LEFT JOIN public.cast_performances perf ON cp.id = perf.cast_id
    AND perf.date >= start_date
    AND perf.date <= end_date
  WHERE cp.is_active = true
  GROUP BY cp.id, cp.stage_name
  ORDER BY total_sales DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_casts_profile_updated_at BEFORE UPDATE ON public.casts_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cast_performances_updated_at BEFORE UPDATE ON public.cast_performances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();-- Create tables enum for table status
CREATE TYPE table_status AS ENUM ('available', 'reserved', 'occupied', 'cleaning');

-- Create reservation status enum
CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show');

-- Create tables table
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(50) NOT NULL UNIQUE,
  capacity INT NOT NULL CHECK (capacity > 0 AND capacity <= 50),
  location VARCHAR(100),
  is_vip BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  current_status table_status DEFAULT 'available',
  current_visit_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create reservations table
CREATE TABLE reservations (
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
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure reservation date and time are in the future on creation
  CONSTRAINT future_reservation CHECK (
    reservation_date > CURRENT_DATE OR 
    (reservation_date = CURRENT_DATE AND reservation_time > CURRENT_TIME)
  )
);

-- Create indexes for better query performance
CREATE INDEX idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX idx_reservations_table_id ON reservations(table_id);
CREATE INDEX idx_reservations_assigned_cast_id ON reservations(assigned_cast_id);
CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_tables_status ON tables(current_status);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Tables policies
-- Anyone authenticated can view active tables
CREATE POLICY "Authenticated users can view active tables" ON tables
  FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

-- Managers and admins can manage all tables
CREATE POLICY "Managers can manage tables" ON tables
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- Reservations policies
-- Customers can view their own reservations
CREATE POLICY "Customers can view own reservations" ON reservations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = reservations.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- Staff can view reservations based on their role
CREATE POLICY "Staff can view reservations" ON reservations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND (
        staffs.role IN ('admin', 'manager', 'hall', 'cashier') OR
        (staffs.role = 'cast' AND staffs.id = reservations.assigned_cast_id)
      )
    )
  );

-- Managers and hall staff can manage reservations
CREATE POLICY "Staff can manage reservations" ON reservations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager', 'hall')
    )
  );

-- Function to check table availability
CREATE OR REPLACE FUNCTION check_table_availability(
  p_table_id UUID,
  p_reservation_date DATE,
  p_reservation_time TIME,
  p_exclude_reservation_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_available BOOLEAN;
BEGIN
  -- Check if table exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM tables 
    WHERE id = p_table_id AND is_active = true
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Check for conflicting reservations (within 2 hours window)
  SELECT NOT EXISTS (
    SELECT 1 FROM reservations
    WHERE table_id = p_table_id
    AND reservation_date = p_reservation_date
    AND status IN ('confirmed', 'checked_in')
    AND id != COALESCE(p_exclude_reservation_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (reservation_time >= p_reservation_time AND reservation_time < p_reservation_time + INTERVAL '2 hours') OR
      (p_reservation_time >= reservation_time AND p_reservation_time < reservation_time + INTERVAL '2 hours')
    )
  ) INTO v_is_available;
  
  RETURN v_is_available;
END;
$$ LANGUAGE plpgsql;

-- Function to update table status based on reservations
CREATE OR REPLACE FUNCTION update_table_status_from_reservation()
RETURNS TRIGGER AS $$
BEGIN
  -- When a reservation is checked in
  IF NEW.status = 'checked_in' AND OLD.status != 'checked_in' AND NEW.table_id IS NOT NULL THEN
    UPDATE tables 
    SET current_status = 'occupied'
    WHERE id = NEW.table_id;
  END IF;
  
  -- When a reservation is completed or cancelled
  IF (NEW.status IN ('completed', 'cancelled', 'no_show')) AND 
     OLD.status = 'checked_in' AND 
     NEW.table_id IS NOT NULL THEN
    UPDATE tables 
    SET current_status = 'cleaning'
    WHERE id = NEW.table_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_table_status_trigger
  AFTER UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_table_status_from_reservation();-- Create products table
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

-- Create visits table
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

-- Create order_items table
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

-- Create indexes
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_stock_quantity ON products(stock_quantity);

CREATE INDEX idx_visits_customer_id ON visits(customer_id);
CREATE INDEX idx_visits_check_in_at ON visits(check_in_at);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_payment_status ON visits(payment_status);

CREATE INDEX idx_order_items_visit_id ON order_items(visit_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_cast_id ON order_items(cast_id);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products table
-- All staff can view active products
CREATE POLICY "Staff can view active products" ON products
  FOR SELECT USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.is_active = true
    )
  );

-- Only managers and admins can manage products
CREATE POLICY "Managers can manage products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
      AND staffs.is_active = true
    )
  );

-- RLS Policies for visits table
-- Staff can view and manage visits
CREATE POLICY "Staff can manage visits" ON visits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager', 'hall', 'cashier')
      AND staffs.is_active = true
    )
  );

-- RLS Policies for order_items table
-- Staff can view and manage order items
CREATE POLICY "Staff can manage order items" ON order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager', 'hall', 'cashier')
      AND staffs.is_active = true
    )
  );

-- Create updated_at trigger for products
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create updated_at trigger for visits
CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically update stock when order items are added
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE products 
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products 
    SET stock_quantity = stock_quantity + OLD.quantity
    WHERE id = OLD.product_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE products 
    SET stock_quantity = stock_quantity + OLD.quantity - NEW.quantity
    WHERE id = NEW.product_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update stock when order items change
CREATE TRIGGER update_stock_on_order_items
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();

-- Create function to calculate visit totals
CREATE OR REPLACE FUNCTION calculate_visit_totals(visit_id_param UUID)
RETURNS TABLE (
  subtotal INTEGER,
  service_charge INTEGER,
  tax_amount INTEGER,
  total_amount INTEGER
) AS $$
DECLARE
  subtotal_value INTEGER;
  service_rate DECIMAL := 0.10; -- 10% service charge
  tax_rate DECIMAL := 0.10; -- 10% tax
BEGIN
  -- Calculate subtotal from order items
  SELECT COALESCE(SUM(total_price), 0)
  INTO subtotal_value
  FROM order_items
  WHERE visit_id = visit_id_param;

  -- Calculate service charge and tax
  RETURN QUERY SELECT 
    subtotal_value,
    (subtotal_value * service_rate)::INTEGER,
    ((subtotal_value + (subtotal_value * service_rate)::INTEGER) * tax_rate)::INTEGER,
    (subtotal_value + (subtotal_value * service_rate)::INTEGER + ((subtotal_value + (subtotal_value * service_rate)::INTEGER) * tax_rate)::INTEGER)::INTEGER;
END;
$$ LANGUAGE plpgsql;-- Create shift_templates table for recurring shifts
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

-- Create shift_requests table for cast shift hopes/requests
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

-- Create confirmed_shifts table for finalized shift schedule
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

-- Create attendance_records table for actual clock-in/out
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staffs(id),
  attendance_date DATE NOT NULL,
  clock_in_time TIMESTAMPTZ,
  clock_out_time TIMESTAMPTZ,
  scheduled_start_time TIME,
  scheduled_end_time TIME,
  break_start_time TIMESTAMPTZ,
  break_end_time TIMESTAMPTZ,
  total_work_minutes INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN clock_in_time IS NOT NULL AND clock_out_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM (clock_out_time - clock_in_time - 
          COALESCE(break_end_time - break_start_time, INTERVAL '0'))) / 60
      ELSE NULL
    END
  ) STORED,
  overtime_minutes INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN clock_in_time IS NOT NULL AND clock_out_time IS NOT NULL AND scheduled_start_time IS NOT NULL AND scheduled_end_time IS NOT NULL THEN
        GREATEST(0, 
          EXTRACT(EPOCH FROM (clock_out_time - clock_in_time - 
            COALESCE(break_end_time - break_start_time, INTERVAL '0'))) / 60 -
          EXTRACT(EPOCH FROM (scheduled_end_time - scheduled_start_time)) / 60
        )
      ELSE 0
    END
  ) STORED,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'early_leave')),
  notes TEXT,
  approved_by UUID REFERENCES staffs(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, attendance_date)
);

-- Create attendance_corrections table for manual adjustments
CREATE TABLE IF NOT EXISTS attendance_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_record_id UUID NOT NULL REFERENCES attendance_records(id),
  correction_type TEXT NOT NULL CHECK (correction_type IN ('clock_in', 'clock_out', 'break_start', 'break_end', 'manual_hours')),
  original_value TIMESTAMPTZ,
  corrected_value TIMESTAMPTZ,
  reason TEXT NOT NULL,
  requested_by UUID NOT NULL REFERENCES staffs(id),
  approved_by UUID REFERENCES staffs(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_shift_requests_cast_id ON shift_requests(cast_id);
CREATE INDEX idx_shift_requests_request_date ON shift_requests(request_date);
CREATE INDEX idx_shift_requests_status ON shift_requests(status);

CREATE INDEX idx_confirmed_shifts_staff_id ON confirmed_shifts(staff_id);
CREATE INDEX idx_confirmed_shifts_shift_date ON confirmed_shifts(shift_date);

CREATE INDEX idx_attendance_records_staff_id ON attendance_records(staff_id);
CREATE INDEX idx_attendance_records_attendance_date ON attendance_records(attendance_date);
CREATE INDEX idx_attendance_records_status ON attendance_records(status);

CREATE INDEX idx_attendance_corrections_attendance_record_id ON attendance_corrections(attendance_record_id);
CREATE INDEX idx_attendance_corrections_status ON attendance_corrections(status);

-- Enable RLS
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmed_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shift_templates
-- Only managers and admins can manage shift templates
CREATE POLICY "Managers can manage shift templates" ON shift_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
      AND staffs.is_active = true
    )
  );

-- RLS Policies for shift_requests
-- Casts can view and create their own shift requests
CREATE POLICY "Casts can manage own shift requests" ON shift_requests
  FOR ALL USING (
    cast_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  );

-- Managers can view and approve all shift requests
CREATE POLICY "Managers can manage all shift requests" ON shift_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
      AND staffs.is_active = true
    )
  );

-- RLS Policies for confirmed_shifts
-- Staff can view their own confirmed shifts
CREATE POLICY "Staff can view own confirmed shifts" ON confirmed_shifts
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  );

-- Managers can manage all confirmed shifts
CREATE POLICY "Managers can manage all confirmed shifts" ON confirmed_shifts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
      AND staffs.is_active = true
    )
  );

-- RLS Policies for attendance_records
-- Staff can view their own attendance records
CREATE POLICY "Staff can view own attendance records" ON attendance_records
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  );

-- Staff can update their own clock-in/out (limited fields)
CREATE POLICY "Staff can clock in/out" ON attendance_records
  FOR UPDATE USING (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  );

-- Staff can create their own attendance records
CREATE POLICY "Staff can create own attendance records" ON attendance_records
  FOR INSERT WITH CHECK (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  );

-- Managers can manage all attendance records
CREATE POLICY "Managers can manage all attendance records" ON attendance_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
      AND staffs.is_active = true
    )
  );

-- RLS Policies for attendance_corrections
-- Staff can request corrections for their own records
CREATE POLICY "Staff can request own corrections" ON attendance_corrections
  FOR INSERT WITH CHECK (
    requested_by IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  );

-- Staff can view corrections for their own records
CREATE POLICY "Staff can view own corrections" ON attendance_corrections
  FOR SELECT USING (
    requested_by IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  );

-- Managers can manage all corrections
CREATE POLICY "Managers can manage all corrections" ON attendance_corrections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
      AND staffs.is_active = true
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_shift_templates_updated_at BEFORE UPDATE ON shift_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_requests_updated_at BEFORE UPDATE ON shift_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_confirmed_shifts_updated_at BEFORE UPDATE ON confirmed_shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to get monthly attendance summary
CREATE OR REPLACE FUNCTION get_monthly_attendance_summary(
  staff_id_param UUID,
  year_param INTEGER,
  month_param INTEGER
)
RETURNS TABLE (
  total_work_days INTEGER,
  total_work_hours DECIMAL,
  total_overtime_hours DECIMAL,
  present_days INTEGER,
  absent_days INTEGER,
  late_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_work_days,
    ROUND(COALESCE(SUM(total_work_minutes), 0) / 60.0, 2) as total_work_hours,
    ROUND(COALESCE(SUM(overtime_minutes), 0) / 60.0, 2) as total_overtime_hours,
    COUNT(CASE WHEN status = 'present' THEN 1 END)::INTEGER as present_days,
    COUNT(CASE WHEN status = 'absent' THEN 1 END)::INTEGER as absent_days,
    COUNT(CASE WHEN status = 'late' THEN 1 END)::INTEGER as late_days
  FROM attendance_records
  WHERE staff_id = staff_id_param
    AND EXTRACT(YEAR FROM attendance_date) = year_param
    AND EXTRACT(MONTH FROM attendance_date) = month_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to check for shift conflicts
CREATE OR REPLACE FUNCTION check_shift_conflict(
  staff_id_param UUID,
  shift_date_param DATE,
  start_time_param TIME,
  end_time_param TIME,
  exclude_shift_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO conflict_count
  FROM confirmed_shifts
  WHERE staff_id = staff_id_param
    AND shift_date = shift_date_param
    AND (
      (start_time <= start_time_param AND end_time > start_time_param) OR
      (start_time < end_time_param AND end_time >= end_time_param) OR
      (start_time >= start_time_param AND end_time <= end_time_param)
    )
    AND (exclude_shift_id IS NULL OR id != exclude_shift_id);
    
  RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;-- 在庫変動履歴テーブル
CREATE TABLE inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2),
  reason VARCHAR(100),
  reference_id UUID, -- 注文ID等の参照
  created_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX idx_inventory_movements_product_date ON inventory_movements(product_id, created_at);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);

-- RLS設定: admin/manager のみアクセス可能
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_policy" ON inventory_movements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staffs 
      WHERE staffs.user_id = auth.uid() 
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- 商品テーブル拡張
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_info JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_stock INTEGER DEFAULT 100;

-- 在庫検索用インデックス
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity, low_stock_threshold);-- ボトルキープテーブル  
CREATE TABLE bottle_keeps (
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

-- ボトルキープ使用履歴テーブル
CREATE TABLE bottle_keep_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bottle_keep_id UUID REFERENCES bottle_keeps(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
  amount_used DECIMAL(3,2) NOT NULL CHECK (amount_used > 0.0 AND amount_used <= 1.0),
  notes TEXT,
  created_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX idx_bottle_keeps_customer ON bottle_keeps(customer_id, status);
CREATE INDEX idx_bottle_keeps_expiry ON bottle_keeps(expiry_date) WHERE status = 'active';
CREATE INDEX idx_bottle_keep_usage_bottle ON bottle_keep_usage(bottle_keep_id);

-- RLS設定
ALTER TABLE bottle_keeps ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_keep_usage ENABLE ROW LEVEL SECURITY;

-- ボトルキープ: 全スタッフがアクセス可能（顧客情報と連動）
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

-- トリガー: updated_at自動更新
CREATE OR REPLACE FUNCTION update_bottle_keeps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bottle_keeps_updated_at
  BEFORE UPDATE ON bottle_keeps
  FOR EACH ROW
  EXECUTE FUNCTION update_bottle_keeps_updated_at();-- 身分証確認記録テーブル
CREATE TABLE id_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  id_type VARCHAR(20) NOT NULL CHECK (id_type IN ('license', 'passport', 'mynumber', 'residence_card')),
  id_image_url TEXT, -- Supabase Storageのファイルパス
  birth_date DATE,
  verification_date TIMESTAMPTZ DEFAULT NOW(),
  verified_by UUID REFERENCES staffs(id),
  ocr_result JSONB, -- OCR抽出データ
  is_verified BOOLEAN DEFAULT false,
  expiry_date DATE, -- 身分証の有効期限
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 法定帳簿出力履歴テーブル
CREATE TABLE compliance_reports (
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

-- QRコード管理テーブル（勤怠打刻用）
CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staffs(id) ON DELETE CASCADE,
  qr_data TEXT NOT NULL,
  signature TEXT NOT NULL, -- セキュリティ署名
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR打刻履歴テーブル
CREATE TABLE qr_attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staffs(id) ON DELETE CASCADE,
  qr_code_id UUID REFERENCES qr_codes(id) ON DELETE SET NULL,
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
  location_data JSONB, -- GPS座標等の位置情報
  device_info JSONB, -- デバイス情報
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX idx_id_verifications_customer ON id_verifications(customer_id);
CREATE INDEX idx_id_verifications_verified_by ON id_verifications(verified_by, verification_date);
CREATE INDEX idx_compliance_reports_type_date ON compliance_reports(report_type, generated_at);
CREATE INDEX idx_qr_codes_staff_active ON qr_codes(staff_id, is_active, expires_at);
CREATE INDEX idx_qr_attendance_logs_staff_date ON qr_attendance_logs(staff_id, created_at);

-- RLS設定: 管理者限定
ALTER TABLE id_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_attendance_logs ENABLE ROW LEVEL SECURITY;

-- 身分証情報: 管理者限定
CREATE POLICY "id_verification_policy" ON id_verifications
  FOR ALL TO authenticated  
  USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- 法定帳簿: 管理者限定
CREATE POLICY "compliance_reports_policy" ON compliance_reports
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- QRコード: 本人または管理者
CREATE POLICY "qr_codes_policy" ON qr_codes
  FOR ALL TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- QR打刻ログ: 本人または管理者
CREATE POLICY "qr_attendance_logs_policy" ON qr_attendance_logs
  FOR ALL TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- 自動更新トリガー
CREATE OR REPLACE FUNCTION update_compliance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_id_verifications_updated_at
  BEFORE UPDATE ON id_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_updated_at();