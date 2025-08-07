-- Multi-Guest Billing System Migration
-- This migration adds support for managing multiple guests per visit

-- 1. Create visit_guests table for managing multiple guests per visit
CREATE TABLE IF NOT EXISTS visit_guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    guest_type VARCHAR(20) NOT NULL DEFAULT 'main' CHECK (guest_type IN ('main', 'companion', 'additional')),
    seat_position INTEGER,
    relationship_to_main VARCHAR(50),
    is_primary_payer BOOLEAN NOT NULL DEFAULT false,
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    check_out_time TIMESTAMPTZ,
    individual_subtotal INTEGER NOT NULL DEFAULT 0,
    individual_service_charge INTEGER NOT NULL DEFAULT 0,
    individual_tax_amount INTEGER NOT NULL DEFAULT 0,
    individual_total INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for visit_guests
CREATE INDEX idx_visit_guests_visit_id ON visit_guests(visit_id);
CREATE INDEX idx_visit_guests_customer_id ON visit_guests(customer_id);
CREATE INDEX idx_visit_guests_check_in_time ON visit_guests(check_in_time);
CREATE INDEX idx_visit_guests_guest_type ON visit_guests(guest_type);

-- 2. Create guest_orders table for tracking orders per guest
CREATE TABLE IF NOT EXISTS guest_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_guest_id UUID NOT NULL REFERENCES visit_guests(id) ON DELETE CASCADE,
    order_item_id BIGINT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    quantity_for_guest INTEGER NOT NULL DEFAULT 1,
    amount_for_guest INTEGER NOT NULL DEFAULT 0,
    is_shared_item BOOLEAN NOT NULL DEFAULT false,
    shared_percentage DECIMAL(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(visit_guest_id, order_item_id)
);

-- Create indexes for guest_orders
CREATE INDEX idx_guest_orders_visit_guest_id ON guest_orders(visit_guest_id);
CREATE INDEX idx_guest_orders_order_item_id ON guest_orders(order_item_id);

-- 3. Create guest_cast_assignments table for managing cast-guest relationships
CREATE TABLE IF NOT EXISTS guest_cast_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_guest_id UUID NOT NULL REFERENCES visit_guests(id) ON DELETE CASCADE,
    cast_id UUID NOT NULL REFERENCES casts_profile(id),
    assignment_type VARCHAR(20) NOT NULL CHECK (assignment_type IN ('shimei', 'dohan', 'after', 'help')),
    start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_time TIMESTAMPTZ,
    is_primary_assignment BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for guest_cast_assignments
CREATE INDEX idx_guest_cast_assignments_visit_guest_id ON guest_cast_assignments(visit_guest_id);
CREATE INDEX idx_guest_cast_assignments_cast_id ON guest_cast_assignments(cast_id);
CREATE INDEX idx_guest_cast_assignments_start_time ON guest_cast_assignments(start_time);
CREATE INDEX idx_guest_cast_assignments_assignment_type ON guest_cast_assignments(assignment_type);

-- 4. Create guest_billing_splits table for managing split billing
CREATE TABLE IF NOT EXISTS guest_billing_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    visit_guest_id UUID NOT NULL REFERENCES visit_guests(id),
    split_type VARCHAR(20) NOT NULL CHECK (split_type IN ('individual', 'shared', 'treated')),
    split_amount INTEGER NOT NULL DEFAULT 0,
    payment_method payment_method,
    payment_status payment_status NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    notes TEXT,
    processed_by UUID REFERENCES staffs(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for guest_billing_splits
CREATE INDEX idx_guest_billing_splits_visit_id ON guest_billing_splits(visit_id);
CREATE INDEX idx_guest_billing_splits_visit_guest_id ON guest_billing_splits(visit_guest_id);
CREATE INDEX idx_guest_billing_splits_payment_status ON guest_billing_splits(payment_status);

-- 5. Add columns to visits table
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS total_guests INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS billing_type VARCHAR(20) NOT NULL DEFAULT 'single' CHECK (billing_type IN ('single', 'split', 'mixed')),
ADD COLUMN IF NOT EXISTS primary_customer_id UUID REFERENCES customers(id);

-- 6. Add columns to order_items table
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS is_shared_item BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS target_guest_id UUID REFERENCES visit_guests(id);

-- 7. Create RLS policies for new tables

-- Enable RLS on all new tables
ALTER TABLE visit_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_cast_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_billing_splits ENABLE ROW LEVEL SECURITY;

-- RLS policies for visit_guests
CREATE POLICY "visit_guests_select_policy" ON visit_guests
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "visit_guests_insert_policy" ON visit_guests
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "visit_guests_update_policy" ON visit_guests
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "visit_guests_delete_policy" ON visit_guests
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS policies for guest_orders
CREATE POLICY "guest_orders_select_policy" ON guest_orders
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "guest_orders_insert_policy" ON guest_orders
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "guest_orders_update_policy" ON guest_orders
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "guest_orders_delete_policy" ON guest_orders
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS policies for guest_cast_assignments
CREATE POLICY "guest_cast_assignments_select_policy" ON guest_cast_assignments
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "guest_cast_assignments_insert_policy" ON guest_cast_assignments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "guest_cast_assignments_update_policy" ON guest_cast_assignments
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "guest_cast_assignments_delete_policy" ON guest_cast_assignments
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS policies for guest_billing_splits
CREATE POLICY "guest_billing_splits_select_policy" ON guest_billing_splits
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "guest_billing_splits_insert_policy" ON guest_billing_splits
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "guest_billing_splits_update_policy" ON guest_billing_splits
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "guest_billing_splits_delete_policy" ON guest_billing_splits
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- 8. Create helper functions for multi-guest operations

-- Function to add a guest to a visit
CREATE OR REPLACE FUNCTION add_guest_to_visit(
    p_visit_id UUID,
    p_customer_id UUID,
    p_guest_type VARCHAR DEFAULT 'companion',
    p_seat_position INTEGER DEFAULT NULL,
    p_relationship_to_main VARCHAR DEFAULT NULL,
    p_is_primary_payer BOOLEAN DEFAULT false,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_guest_id UUID;
BEGIN
    INSERT INTO visit_guests (
        visit_id,
        customer_id,
        guest_type,
        seat_position,
        relationship_to_main,
        is_primary_payer,
        created_by
    ) VALUES (
        p_visit_id,
        p_customer_id,
        p_guest_type,
        p_seat_position,
        p_relationship_to_main,
        p_is_primary_payer,
        p_created_by
    ) RETURNING id INTO v_guest_id;
    
    -- Update the total_guests count in visits table
    UPDATE visits 
    SET total_guests = (
        SELECT COUNT(*) FROM visit_guests WHERE visit_id = p_visit_id
    )
    WHERE id = p_visit_id;
    
    RETURN v_guest_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate individual guest bill
CREATE OR REPLACE FUNCTION calculate_guest_bill(p_visit_guest_id UUID)
RETURNS TABLE (
    subtotal INTEGER,
    service_charge INTEGER,
    tax_amount INTEGER,
    total INTEGER
) AS $$
DECLARE
    v_subtotal INTEGER;
    v_service_charge INTEGER;
    v_tax_amount INTEGER;
    v_total INTEGER;
BEGIN
    -- Calculate subtotal from guest_orders
    SELECT COALESCE(SUM(amount_for_guest), 0) INTO v_subtotal
    FROM guest_orders
    WHERE visit_guest_id = p_visit_guest_id;
    
    -- Calculate service charge (10% of subtotal)
    v_service_charge := ROUND(v_subtotal * 0.1);
    
    -- Calculate tax (10% of subtotal + service charge)
    v_tax_amount := ROUND((v_subtotal + v_service_charge) * 0.1);
    
    -- Calculate total
    v_total := v_subtotal + v_service_charge + v_tax_amount;
    
    -- Update the visit_guests table with calculated values
    UPDATE visit_guests
    SET individual_subtotal = v_subtotal,
        individual_service_charge = v_service_charge,
        individual_tax_amount = v_tax_amount,
        individual_total = v_total,
        updated_at = now()
    WHERE id = p_visit_guest_id;
    
    RETURN QUERY SELECT v_subtotal, v_service_charge, v_tax_amount, v_total;
END;
$$ LANGUAGE plpgsql;

-- Function to split a shared order among multiple guests
CREATE OR REPLACE FUNCTION split_shared_order(
    p_order_item_id BIGINT,
    p_guest_splits JSONB -- Array of {guest_id, percentage} objects
)
RETURNS VOID AS $$
DECLARE
    v_order_amount INTEGER;
    v_split JSONB;
BEGIN
    -- Get the order amount
    SELECT total_price INTO v_order_amount
    FROM order_items
    WHERE id = p_order_item_id;
    
    -- Mark the order as shared
    UPDATE order_items
    SET is_shared_item = true
    WHERE id = p_order_item_id;
    
    -- Create guest_orders for each guest
    FOR v_split IN SELECT * FROM jsonb_array_elements(p_guest_splits)
    LOOP
        INSERT INTO guest_orders (
            visit_guest_id,
            order_item_id,
            quantity_for_guest,
            amount_for_guest,
            is_shared_item,
            shared_percentage
        ) VALUES (
            (v_split->>'guest_id')::UUID,
            p_order_item_id,
            1,
            ROUND(v_order_amount * (v_split->>'percentage')::DECIMAL / 100),
            true,
            (v_split->>'percentage')::DECIMAL
        )
        ON CONFLICT (visit_guest_id, order_item_id) 
        DO UPDATE SET
            amount_for_guest = EXCLUDED.amount_for_guest,
            shared_percentage = EXCLUDED.shared_percentage;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_visit_guests_updated_at BEFORE UPDATE ON visit_guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guest_billing_splits_updated_at BEFORE UPDATE ON guest_billing_splits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Data migration for existing visits
-- Create a visit_guest record for each existing visit with the main customer
INSERT INTO visit_guests (
    visit_id,
    customer_id,
    guest_type,
    is_primary_payer,
    check_in_time,
    check_out_time,
    individual_subtotal,
    individual_service_charge,
    individual_tax_amount,
    individual_total
)
SELECT 
    v.id as visit_id,
    v.customer_id,
    'main' as guest_type,
    true as is_primary_payer,
    v.check_in_at as check_in_time,
    v.check_out_at as check_out_time,
    v.subtotal,
    v.service_charge,
    v.tax_amount,
    v.total_amount
FROM visits v
WHERE NOT EXISTS (
    SELECT 1 FROM visit_guests vg WHERE vg.visit_id = v.id
);

-- Update visits table to set primary_customer_id
UPDATE visits v
SET primary_customer_id = v.customer_id
WHERE primary_customer_id IS NULL;

-- Migrate existing order_items to guest_orders for the main guest
INSERT INTO guest_orders (
    visit_guest_id,
    order_item_id,
    quantity_for_guest,
    amount_for_guest,
    is_shared_item
)
SELECT 
    vg.id as visit_guest_id,
    oi.id as order_item_id,
    oi.quantity as quantity_for_guest,
    oi.total_price as amount_for_guest,
    false as is_shared_item
FROM order_items oi
JOIN visits v ON oi.visit_id = v.id
JOIN visit_guests vg ON vg.visit_id = v.id AND vg.guest_type = 'main'
WHERE NOT EXISTS (
    SELECT 1 FROM guest_orders go 
    WHERE go.order_item_id = oi.id
);

-- Grant permissions to authenticated users
GRANT ALL ON visit_guests TO authenticated;
GRANT ALL ON guest_orders TO authenticated;
GRANT ALL ON guest_cast_assignments TO authenticated;
GRANT ALL ON guest_billing_splits TO authenticated;