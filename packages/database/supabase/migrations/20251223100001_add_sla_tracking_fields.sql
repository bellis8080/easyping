-- Story 5.2: Add SLA time tracking fields to pings table
-- Tracks when key events occur for SLA compliance measurement

-- Add SLA tracking columns to pings table
ALTER TABLE pings
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_paused_duration_minutes INTEGER NOT NULL DEFAULT 0;

-- Index on first_response_at for finding pings awaiting first response
CREATE INDEX IF NOT EXISTS idx_pings_first_response_at
  ON pings(first_response_at)
  WHERE first_response_at IS NULL;

-- Index on resolved_at for analytics queries
CREATE INDEX IF NOT EXISTS idx_pings_resolved_at
  ON pings(resolved_at);

-- Add comments explaining the fields
COMMENT ON COLUMN pings.first_response_at IS 'Timestamp when first agent response was posted (NULL until responded)';
COMMENT ON COLUMN pings.resolved_at IS 'Timestamp when ping was marked as resolved (NULL if not resolved, cleared on re-open)';
COMMENT ON COLUMN pings.sla_paused_at IS 'Timestamp when resolution SLA timer was paused (NULL when not paused, set when Waiting on User)';
COMMENT ON COLUMN pings.sla_paused_duration_minutes IS 'Accumulated pause time in minutes (does not include current pause if active)';

-- Note: RLS is intentionally disabled on pings table for realtime compatibility
-- Authentication is enforced at the API layer
