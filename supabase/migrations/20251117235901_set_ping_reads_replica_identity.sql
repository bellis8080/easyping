-- Set REPLICA IDENTITY FULL for ping_reads to enable Realtime with old values
-- This is required for Supabase Realtime postgres_changes subscriptions to receive
-- the old row values in UPDATE/DELETE events, which we need to calculate unread count changes

ALTER TABLE ping_reads REPLICA IDENTITY FULL;

COMMENT ON TABLE ping_reads IS 'Tracks when each user last read each ping. Replica identity set to FULL for Supabase Realtime compatibility';
