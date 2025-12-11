-- Disable RLS on ping_messages for Supabase Realtime compatibility
--
-- SECURITY MODEL:
-- RLS is disabled because Supabase Realtime cannot properly evaluate RLS policies,
-- which breaks real-time message updates. Security is enforced at the application layer:
--   1. API routes validate user authentication via Supabase Auth
--   2. API routes verify user belongs to the same tenant as the ping
--   3. Admin client (service role) is used only after validation passes
--
-- This is the same pattern used for other realtime-dependent tables.

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can create messages for pings in their tenant" ON ping_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON ping_messages;
DROP POLICY IF EXISTS "Users can view messages for pings in their tenant" ON ping_messages;
DROP POLICY IF EXISTS "Allow authenticated users to read ping messages" ON ping_messages;

-- Disable RLS
ALTER TABLE ping_messages DISABLE ROW LEVEL SECURITY;
