-- Allow users to query their own profile even without tenant context set
-- This is necessary to bootstrap the session - we need to get the user's tenant_id
-- before we can set the tenant context for other queries

-- Add policy to allow users to SELECT their own record using auth.uid()
CREATE POLICY users_select_own_profile ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Note: This policy works alongside users_select_own_org policy
-- PostgreSQL evaluates RLS policies with OR logic, so a row is visible if ANY policy allows it
