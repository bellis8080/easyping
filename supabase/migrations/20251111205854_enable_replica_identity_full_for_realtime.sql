-- Enable REPLICA IDENTITY FULL for Realtime broadcasts with filters
-- This is required for Supabase Realtime to broadcast INSERT events with column filters like tenant_id=eq.xxx
-- Without FULL replica identity, filtered subscriptions don't receive events

-- Set REPLICA IDENTITY FULL for pings table
ALTER TABLE pings REPLICA IDENTITY FULL;

-- Set REPLICA IDENTITY FULL for ping_messages table
ALTER TABLE ping_messages REPLICA IDENTITY FULL;
