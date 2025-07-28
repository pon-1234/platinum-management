#!/bin/bash

# Load production environment variables
source .env.production

# Add missing columns to staffs table
cat > /tmp/fix_staff_columns.sql << 'EOF'
-- Add missing columns to staffs table for profile compatibility
ALTER TABLE staffs 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update email from auth.users if not set
UPDATE staffs s
SET email = u.email
FROM auth.users u
WHERE s.user_id = u.id
AND s.email IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staffs_email ON staffs(email);
CREATE INDEX IF NOT EXISTS idx_staffs_phone ON staffs(phone);
EOF

echo "Adding missing columns to staffs table..."

# Apply the fixes
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DATABASE -f /tmp/fix_staff_columns.sql

# Clean up
rm /tmp/fix_staff_columns.sql

echo "Columns added successfully!"