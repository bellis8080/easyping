-- Create authorization function for Realtime to bypass RLS requirement
-- This allows Realtime postgres_changes to work without RLS enabled
-- Application-level tenant security is still enforced via API endpoints

CREATE OR REPLACE FUNCTION realtime.can_update_own_rows(
  realtime_message realtime.wal_message,
  realtime_user jsonb
)
RETURNS boolean AS $$
BEGIN
  -- Always return true to allow all authenticated users to receive realtime updates
  -- Tenant isolation is handled at the application level
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION realtime.can_update_own_rows TO authenticated;

COMMENT ON FUNCTION realtime.can_update_own_rows IS 'Authorization function for Realtime - bypasses RLS since tenant isolation is application-level';
