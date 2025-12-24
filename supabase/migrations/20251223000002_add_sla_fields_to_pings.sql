-- Add SLA tracking fields to pings table for Story 5.1
-- Stores the SLA policy reference and calculated due timestamps

-- Add SLA-related columns to pings table
ALTER TABLE pings
  ADD COLUMN IF NOT EXISTS sla_policy_id UUID REFERENCES sla_policies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sla_first_response_due TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_resolution_due TIMESTAMPTZ;

-- Create index for SLA due time queries (finding overdue pings)
CREATE INDEX IF NOT EXISTS idx_pings_sla_first_response_due
  ON pings(sla_first_response_due)
  WHERE sla_first_response_due IS NOT NULL AND first_response_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pings_sla_resolution_due
  ON pings(sla_resolution_due)
  WHERE sla_resolution_due IS NOT NULL AND resolved_at IS NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN pings.sla_policy_id IS 'Reference to the SLA policy active at ping creation time';
COMMENT ON COLUMN pings.sla_first_response_due IS 'Timestamp when first agent response is due per SLA';
COMMENT ON COLUMN pings.sla_resolution_due IS 'Timestamp when ping resolution is due per SLA';
