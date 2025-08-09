-- Create staff compatibility view for gradual migration from 'staffs' to 'staff'
-- This allows code to use 'staff' while the underlying table is still 'staffs'

-- Create view that references the staffs table
CREATE OR REPLACE VIEW public.staff AS
SELECT * FROM public.staffs;

-- Grant appropriate permissions
GRANT SELECT ON public.staff TO authenticated;
GRANT SELECT ON public.staff TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.staff TO authenticated;

-- Create INSTEAD OF triggers to handle DML operations on the view
-- This allows INSERT, UPDATE, DELETE operations through the view

-- INSERT trigger
CREATE OR REPLACE FUNCTION staff_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.staffs VALUES (NEW.*);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS staff_insert ON public.staff;
CREATE TRIGGER staff_insert
    INSTEAD OF INSERT ON public.staff
    FOR EACH ROW
    EXECUTE FUNCTION staff_insert_trigger();

-- UPDATE trigger  
CREATE OR REPLACE FUNCTION staff_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.staffs 
    SET ROW = NEW.*
    WHERE id = OLD.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS staff_update ON public.staff;
CREATE TRIGGER staff_update
    INSTEAD OF UPDATE ON public.staff
    FOR EACH ROW
    EXECUTE FUNCTION staff_update_trigger();

-- DELETE trigger
CREATE OR REPLACE FUNCTION staff_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.staffs WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS staff_delete ON public.staff;
CREATE TRIGGER staff_delete
    INSTEAD OF DELETE ON public.staff
    FOR EACH ROW
    EXECUTE FUNCTION staff_delete_trigger();

-- Add comment for documentation
COMMENT ON VIEW public.staff IS 
'Compatibility view for gradual migration from plural table name (staffs) to singular (staff). All operations are forwarded to the underlying staffs table.';