-- Create customers table
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
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();