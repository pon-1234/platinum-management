-- =============================================================================
-- Migration: Security Hardening
-- Date: 2025-08-02
-- Description: Remove excessive permissions from anon role to prevent
--              unauthorized access to sensitive database functions
-- =============================================================================

-- Remove blanket EXECUTE permission for anon role on all functions
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Grant specific permissions only where absolutely necessary
-- Note: Currently, no functions should be accessible to anonymous users
-- If public functions are needed in the future, grant permissions individually:
-- GRANT EXECUTE ON FUNCTION specific_public_function TO anon;

-- Ensure authenticated users still have necessary permissions
-- (They already have appropriate permissions from the initial schema)

-- Add comment to document the security policy
COMMENT ON SCHEMA public IS 'Public schema with restricted access. Anonymous users have no function execution privileges by default.';

-- =============================================================================
-- End of Migration
-- =============================================================================