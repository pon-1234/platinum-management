-- Enable Trigram extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for customer search optimization
-- This enables fast partial match searches on customer data
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers
USING gin (
  name gin_trgm_ops, 
  name_kana gin_trgm_ops, 
  phone_number gin_trgm_ops, 
  line_id gin_trgm_ops
);

-- Create GIN index for staff search optimization
-- This enables fast partial match searches on staff names
CREATE INDEX IF NOT EXISTS idx_staffs_search ON staffs
USING gin (
  full_name gin_trgm_ops, 
  full_name_kana gin_trgm_ops
);

-- Create indexes for date range queries on visits table
-- This optimizes queries filtering by check-in date and status
CREATE INDEX IF NOT EXISTS idx_visits_date_range ON visits (check_in_at, status);

-- Create indexes for date range queries on attendance_records table
-- This optimizes queries filtering by work date and staff
CREATE INDEX IF NOT EXISTS idx_attendance_date_range ON attendance_records (work_date, staff_id);

-- Add comments to explain the indexes
COMMENT ON INDEX idx_customers_search IS 'GIN index for fast partial match searches on customer data';
COMMENT ON INDEX idx_staffs_search IS 'GIN index for fast partial match searches on staff names';
COMMENT ON INDEX idx_visits_date_range IS 'B-tree index for date range queries on visits';
COMMENT ON INDEX idx_attendance_date_range IS 'B-tree index for date range queries on attendance records';