-- Disable RLS on pings table to enable Supabase Realtime
--
-- BACKGROUND:
-- Supabase Realtime does NOT work properly with RLS enabled.
-- Ping updates (status changes, new pings appearing) were not propagating
-- to the Agent Inbox in real-time because RLS was filtering them out.
--
-- SECURITY MODEL (when RLS is disabled):
-- - Authentication is enforced at the API layer via Supabase Auth
-- - Tenant isolation is enforced in API routes by checking tenant_id
-- - Admin client (service role) is used only AFTER validation passes
-- - This matches the pattern already used for ping_messages table
--
-- See: CLAUDE.md "Supabase Realtime and RLS Incompatibility" section

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view pings in their tenant" ON pings;
DROP POLICY IF EXISTS "Users can create pings in their tenant" ON pings;
DROP POLICY IF EXISTS "Users can update pings in their tenant" ON pings;
DROP POLICY IF EXISTS "Agents can view all pings in their tenant" ON pings;
DROP POLICY IF EXISTS "End users can view their own pings" ON pings;

-- Disable RLS
ALTER TABLE pings DISABLE ROW LEVEL SECURITY;

-- Add comment documenting why RLS is disabled
COMMENT ON TABLE pings IS 'Support tickets (called "pings" in EasyPing). RLS is disabled to enable Supabase Realtime. Security is enforced at API layer.';
