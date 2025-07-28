#!/bin/bash

# Load production environment variables
source .env.production

# Create daily_closings table
cat > /tmp/create_daily_closings.sql << 'EOF'
-- Create daily_closings table for tracking daily closing records
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_closings_date ON daily_closings(closing_date);

-- Enable RLS
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Select policy: Allow authenticated users to read daily closings
CREATE POLICY "daily_closings_select_policy" 
ON daily_closings 
FOR SELECT 
TO authenticated 
USING (true);

-- Insert policy: Allow authenticated users to insert daily closings
CREATE POLICY "daily_closings_insert_policy" 
ON daily_closings 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Update policy: Allow authenticated users to update daily closings
CREATE POLICY "daily_closings_update_policy" 
ON daily_closings 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON daily_closings TO authenticated;
GRANT ALL ON daily_closings TO service_role;
GRANT SELECT ON daily_closings TO anon;

-- Test the table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'daily_closings';
EOF

echo "Creating daily_closings table in production..."

# Apply the migration
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DATABASE -f /tmp/create_daily_closings.sql

# Clean up
rm /tmp/create_daily_closings.sql

echo "Table created successfully!"