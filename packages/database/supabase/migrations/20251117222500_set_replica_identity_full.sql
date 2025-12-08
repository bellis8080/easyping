-- Set REPLICA IDENTITY FULL for Realtime to work properly
-- This ensures Realtime receives full row data for UPDATE/DELETE events
-- Required for Supabase Realtime postgres_changes subscriptions

ALTER TABLE pings REPLICA IDENTITY FULL;
ALTER TABLE ping_messages REPLICA IDENTITY FULL;

COMMENT ON TABLE pings IS 'Replica identity set to FULL for Supabase Realtime compatibility';
COMMENT ON TABLE ping_messages IS 'Replica identity set to FULL for Supabase Realtime compatibility';
