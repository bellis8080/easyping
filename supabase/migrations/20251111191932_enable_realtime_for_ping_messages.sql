-- Enable Realtime for ping_messages table
-- This allows Supabase Realtime to broadcast INSERT/UPDATE/DELETE events

ALTER PUBLICATION supabase_realtime ADD TABLE ping_messages;

-- Note: Realtime Presence doesn't require table publications
-- Presence API works at the channel level and doesn't depend on database tables
