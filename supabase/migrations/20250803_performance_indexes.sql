-- Performance optimization indexes
-- This migration creates indexes to improve query performance

-- Attendance Records indexes
CREATE INDEX IF NOT EXISTS idx_attendance_records_staff_date 
ON attendance_records(staff_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_records_date 
ON attendance_records(date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_records_needs_correction 
ON attendance_records(needs_correction) 
WHERE needs_correction = true;

-- Shift Requests indexes
CREATE INDEX IF NOT EXISTS idx_shift_requests_status 
ON shift_requests(status);

CREATE INDEX IF NOT EXISTS idx_shift_requests_staff_status 
ON shift_requests(staff_id, status);

CREATE INDEX IF NOT EXISTS idx_shift_requests_date 
ON shift_requests(request_date DESC);

-- Bottle Keeps indexes
CREATE INDEX IF NOT EXISTS idx_bottle_keeps_status 
ON bottle_keeps(status);

CREATE INDEX IF NOT EXISTS idx_bottle_keeps_customer_status 
ON bottle_keeps(customer_id, status);

CREATE INDEX IF NOT EXISTS idx_bottle_keeps_expiry 
ON bottle_keeps(expiry_date) 
WHERE status = 'active';

-- QR Code related indexes
CREATE INDEX IF NOT EXISTS idx_qr_attendance_logs_created 
ON qr_attendance_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qr_attendance_logs_staff_date 
ON qr_attendance_logs(staff_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qr_codes_active 
ON qr_codes(is_active, expires_at) 
WHERE is_active = true;

-- Tables indexes for real-time updates
CREATE INDEX IF NOT EXISTS idx_tables_location_status 
ON tables(location, status);

CREATE INDEX IF NOT EXISTS idx_tables_active 
ON tables(is_active) 
WHERE is_active = true;

-- Visits indexes
CREATE INDEX IF NOT EXISTS idx_visits_customer 
ON visits(customer_id);

CREATE INDEX IF NOT EXISTS idx_visits_table 
ON visits(table_id);

CREATE INDEX IF NOT EXISTS idx_visits_check_in 
ON visits(check_in_at DESC);

CREATE INDEX IF NOT EXISTS idx_visits_status 
ON visits(status);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_category 
ON products(category);

CREATE INDEX IF NOT EXISTS idx_products_active 
ON products(is_active) 
WHERE is_active = true;

-- Inventory movements indexes
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product 
ON inventory_movements(product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_created 
ON inventory_movements(created_at DESC);

-- Casts profile indexes
CREATE INDEX IF NOT EXISTS idx_casts_profile_staff 
ON casts_profile(staff_id);

-- Comments for documentation
COMMENT ON INDEX idx_attendance_records_staff_date IS 'Optimizes queries for staff attendance history';
COMMENT ON INDEX idx_attendance_records_date IS 'Optimizes queries for daily attendance reports';
COMMENT ON INDEX idx_attendance_records_needs_correction IS 'Optimizes queries for correction requests';
COMMENT ON INDEX idx_shift_requests_status IS 'Optimizes queries for pending shift requests';
COMMENT ON INDEX idx_bottle_keeps_status IS 'Optimizes bottle keep statistics queries';
COMMENT ON INDEX idx_bottle_keeps_expiry IS 'Optimizes queries for expiring bottles';
COMMENT ON INDEX idx_qr_attendance_logs_created IS 'Optimizes QR code statistics queries';
COMMENT ON INDEX idx_tables_active IS 'Optimizes real-time table status queries';

-- Analyze tables to update statistics after creating indexes
ANALYZE attendance_records;
ANALYZE shift_requests;
ANALYZE bottle_keeps;
ANALYZE qr_attendance_logs;
ANALYZE qr_codes;
ANALYZE tables;
ANALYZE visits;
ANALYZE products;
ANALYZE inventory_movements;
ANALYZE casts_profile;