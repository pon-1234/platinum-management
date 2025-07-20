-- Create products table
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
$$ LANGUAGE plpgsql;