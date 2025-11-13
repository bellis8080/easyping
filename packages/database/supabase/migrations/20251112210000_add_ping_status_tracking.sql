-- Add status tracking columns to pings table
-- Story 2.4: Ping Status Management

-- Add timestamp columns for status transitions
ALTER TABLE pings
ADD COLUMN first_response_at TIMESTAMPTZ,
ADD COLUMN last_user_reply_at TIMESTAMPTZ,
ADD COLUMN last_agent_reply_at TIMESTAMPTZ,
ADD COLUMN status_changed_at TIMESTAMPTZ;

-- Create index for status filtering (optimized for tenant + status + timestamp queries)
CREATE INDEX idx_pings_status_changed ON pings(tenant_id, status, status_changed_at DESC);
