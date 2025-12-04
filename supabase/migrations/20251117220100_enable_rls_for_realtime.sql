-- Enable RLS for Realtime compatibility
-- Note: This doesn't change application-level security (tenant isolation via app code)
-- but allows Supabase Realtime postgres_changes to work

-- Enable RLS on tables used for realtime subscriptions
ALTER TABLE pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ping_messages ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users
-- (Application-level tenant filtering remains in place)

CREATE POLICY "Allow authenticated users to read pings"
  ON pings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read ping messages"
  ON ping_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: We only enable SELECT policies since Realtime only needs read access
-- All INSERT/UPDATE/DELETE operations still go through the application API
-- which enforces tenant isolation at the application level
