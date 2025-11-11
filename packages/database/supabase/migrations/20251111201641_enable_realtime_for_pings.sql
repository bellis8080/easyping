-- Enable Realtime for pings table
-- This allows Supabase Realtime to broadcast INSERT/UPDATE/DELETE events
-- so agents can see new pings appear in their inbox in real-time

ALTER PUBLICATION supabase_realtime ADD TABLE pings;
