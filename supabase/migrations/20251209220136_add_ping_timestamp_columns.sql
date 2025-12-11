-- Add timestamp columns for tracking ping activity
-- These columns are used by the status transition logic

ALTER TABLE pings
ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_agent_reply_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_user_reply_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- Add index for querying pings by response time (SLA tracking)
CREATE INDEX IF NOT EXISTS idx_pings_first_response_at ON pings(tenant_id, first_response_at) WHERE first_response_at IS NOT NULL;

COMMENT ON COLUMN pings.first_response_at IS 'Timestamp when the first agent replied to this ping';
COMMENT ON COLUMN pings.last_agent_reply_at IS 'Timestamp of the most recent agent reply';
COMMENT ON COLUMN pings.last_user_reply_at IS 'Timestamp of the most recent user reply';
COMMENT ON COLUMN pings.status_changed_at IS 'Timestamp of the most recent status change';
