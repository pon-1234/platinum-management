-- Create tables enum for table status
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
  EXECUTE FUNCTION update_table_status_from_reservation();