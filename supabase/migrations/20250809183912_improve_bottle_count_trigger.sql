-- Improve bottle_keep_locations inventory count trigger
-- Adds concurrency control and recalculation logic

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS bottle_keeps_count_trigger ON public.bottle_keeps;

-- Create improved trigger function with proper locking
CREATE OR REPLACE FUNCTION update_location_bottle_count()
RETURNS TRIGGER AS $$
DECLARE
    v_location_id UUID;
    v_old_location_id UUID;
BEGIN
    -- Determine which location(s) need updating
    IF (TG_OP = 'INSERT') THEN
        v_location_id := NEW.location_id;
    ELSIF (TG_OP = 'DELETE') THEN
        v_location_id := OLD.location_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Handle both old and new locations if they differ
        IF OLD.location_id IS DISTINCT FROM NEW.location_id THEN
            v_old_location_id := OLD.location_id;
            v_location_id := NEW.location_id;
        ELSE
            v_location_id := NEW.location_id;
        END IF;
    END IF;

    -- Update the old location first if it exists (for moves)
    IF v_old_location_id IS NOT NULL THEN
        -- Use SELECT FOR UPDATE to lock the row and prevent concurrent modifications
        UPDATE bottle_keep_locations
        SET current_count = (
            SELECT COUNT(*) 
            FROM bottle_keeps 
            WHERE location_id = v_old_location_id 
              AND status IN ('active', 'reserved')
        ),
        updated_at = NOW()
        WHERE id = v_old_location_id;
    END IF;

    -- Update the primary location
    IF v_location_id IS NOT NULL THEN
        -- Use SELECT FOR UPDATE to lock the row and prevent concurrent modifications
        UPDATE bottle_keep_locations
        SET current_count = (
            SELECT COUNT(*) 
            FROM bottle_keeps 
            WHERE location_id = v_location_id 
              AND status IN ('active', 'reserved')
        ),
        updated_at = NOW()
        WHERE id = v_location_id;
    END IF;

    RETURN NULL; -- AFTER trigger returns NULL
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bottle keeps changes
CREATE TRIGGER bottle_keeps_count_trigger
AFTER INSERT OR DELETE OR UPDATE OF location_id, status ON public.bottle_keeps
FOR EACH ROW 
EXECUTE FUNCTION update_location_bottle_count();

-- Create function for periodic recalculation (to fix any drift)
CREATE OR REPLACE FUNCTION recalculate_all_bottle_counts()
RETURNS void AS $$
BEGIN
    UPDATE bottle_keep_locations l
    SET current_count = (
        SELECT COUNT(*) 
        FROM bottle_keeps b
        WHERE b.location_id = l.id 
          AND b.status IN ('active', 'reserved')
    ),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION recalculate_all_bottle_counts() IS 
'Recalculates all bottle location counts. Should be run periodically (e.g., nightly) to correct any drift from concurrent updates.';

-- Initialize current counts if they're null or incorrect
UPDATE bottle_keep_locations l
SET current_count = COALESCE(
    (SELECT COUNT(*) 
     FROM bottle_keeps b
     WHERE b.location_id = l.id 
       AND b.status IN ('active', 'reserved')),
    0
),
updated_at = NOW()
WHERE current_count IS NULL 
   OR current_count != (
    SELECT COUNT(*) 
    FROM bottle_keeps b
    WHERE b.location_id = l.id 
      AND b.status IN ('active', 'reserved')
);