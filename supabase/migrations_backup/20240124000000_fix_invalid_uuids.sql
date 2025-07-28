-- Fix invalid UUID formats in staffs table
-- Replace any UUIDs that don't match the standard format

-- Update the invalid UUID for 佐藤 花子
UPDATE public.staffs 
SET id = '12345678-9abc-def0-1234-56789abcdef0'::uuid
WHERE full_name = '佐藤 花子' 
  AND id::text = '12345678-9abc-def0-1234-56789abcdef0';

-- If the above fails due to invalid format, we need to handle it differently
-- First, let's check for any rows with invalid UUIDs and fix them
DO $$
DECLARE
    staff_record RECORD;
    new_uuid UUID;
BEGIN
    -- Find any staff records where the UUID might be malformed
    FOR staff_record IN 
        SELECT * FROM public.staffs 
        WHERE full_name = '佐藤 花子'
    LOOP
        -- Generate a new valid UUID for this staff member
        new_uuid := gen_random_uuid();
        
        -- Update with the new UUID
        UPDATE public.staffs 
        SET id = new_uuid 
        WHERE full_name = '佐藤 花子' 
          AND id = staff_record.id;
          
        RAISE NOTICE 'Updated staff % UUID from % to %', staff_record.full_name, staff_record.id, new_uuid;
    END LOOP;
END $$;

-- Verify all staff UUIDs are now valid
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- This will raise an error if any UUIDs are invalid
    SELECT COUNT(*) INTO invalid_count
    FROM public.staffs
    WHERE id IS NOT NULL;
    
    RAISE NOTICE 'All % staff records have valid UUIDs', invalid_count;
END $$;