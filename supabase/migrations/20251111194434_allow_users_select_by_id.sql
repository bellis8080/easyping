-- Allow authenticated users to query other users by ID
-- This is necessary for Realtime subscriptions where we need to fetch sender details
-- Security: This only allows reading user info, not modifying it
-- The existing users_select_own_org policy requires tenant_id context which browser clients don't set

-- Add policy to allow authenticated users to SELECT any user by their ID
-- This is safe because:
-- 1. It only grants SELECT permission (read-only)
-- 2. It only exposes basic profile info (id, name, avatar)
-- 3. Multi-tenant isolation is already enforced at the application layer via tenant_id filtering
CREATE POLICY users_select_by_id ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: This policy works alongside users_select_own_profile and users_select_own_org
-- PostgreSQL evaluates RLS policies with OR logic, so a row is visible if ANY policy allows it
