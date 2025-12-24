-- Create SLA policies table for Story 5.1
-- Stores SLA policies with first response and resolution time targets per priority level

CREATE TABLE IF NOT EXISTS sla_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority TEXT NOT NULL,
  first_response_minutes INTEGER NOT NULL,
  resolution_minutes INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT sla_policies_priority_valid CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT sla_policies_first_response_positive CHECK (first_response_minutes > 0),
  CONSTRAINT sla_policies_resolution_positive CHECK (resolution_minutes > 0),
  CONSTRAINT sla_policies_resolution_gte_response CHECK (resolution_minutes >= first_response_minutes)
);

-- Create unique index for one active policy per priority per tenant
CREATE UNIQUE INDEX idx_sla_policies_unique_active_priority
  ON sla_policies(tenant_id, priority)
  WHERE is_active = true;

-- Create indexes for common queries
CREATE INDEX idx_sla_policies_tenant_id ON sla_policies(tenant_id);
CREATE INDEX idx_sla_policies_active ON sla_policies(tenant_id, is_active) WHERE is_active = true;

-- Add updated_at trigger using existing function
CREATE TRIGGER update_sla_policies_updated_at
  BEFORE UPDATE ON sla_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- NOTE: RLS is intentionally NOT enabled per project convention for realtime compatibility
-- Auth is enforced at the API layer
