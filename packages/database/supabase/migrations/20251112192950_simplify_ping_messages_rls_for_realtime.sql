-- Simplify ping_messages RLS policy to work better with Supabase Realtime
-- The existing policy has nested subqueries that may cause issues with Realtime's RLS evaluation

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view messages for pings in their tenant" ON ping_messages;

-- Create a simpler SELECT policy that Realtime can evaluate more efficiently
-- This uses a direct join to pings table and checks tenant_id matches user's tenant_id
CREATE POLICY "Users can view messages for pings in their tenant" ON ping_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM pings p
      INNER JOIN users u ON u.tenant_id = p.tenant_id
      WHERE p.id = ping_messages.ping_id
        AND u.id = auth.uid()
    )
  );

-- Ensure the policy is enabled
ALTER TABLE ping_messages ENABLE ROW LEVEL SECURITY;
