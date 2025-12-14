-- Migration: Add Teams and Routing Rules for Story 3.5
-- Purpose: Enable automatic ping routing to teams and specific agents
-- RLS: DISABLED - tenant isolation at application layer (consistent with other tables)

-- ============================================================================
-- Agent Teams Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT agent_teams_unique_name UNIQUE (tenant_id, name)
);

-- Index for tenant queries
CREATE INDEX idx_agent_teams_tenant ON agent_teams(tenant_id);

-- ============================================================================
-- Agent Team Members Table (junction table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_team_members (
  team_id UUID NOT NULL REFERENCES agent_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

-- Index for user membership lookups
CREATE INDEX idx_agent_team_members_user ON agent_team_members(user_id);

-- ============================================================================
-- Routing Rules Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS routing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL DEFAULT 'team',
  destination_agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  destination_team_id UUID REFERENCES agent_teams(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure rule_type is valid
  CONSTRAINT routing_rules_type_valid CHECK (rule_type IN ('agent', 'team')),
  -- Ensure destination matches rule_type
  CONSTRAINT routing_rules_destination_check CHECK (
    (rule_type = 'agent' AND destination_agent_id IS NOT NULL AND destination_team_id IS NULL) OR
    (rule_type = 'team' AND destination_team_id IS NOT NULL AND destination_agent_id IS NULL)
  ),
  -- One rule per category per tenant
  CONSTRAINT routing_rules_unique_category UNIQUE (tenant_id, category_id)
);

-- Index for routing lookups
CREATE INDEX idx_routing_rules_tenant_category ON routing_rules(tenant_id, category_id);

-- ============================================================================
-- Add team_id to pings table
-- ============================================================================
ALTER TABLE pings ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES agent_teams(id) ON DELETE SET NULL;

-- Index for team inbox queries
CREATE INDEX IF NOT EXISTS idx_pings_team_id ON pings(team_id);

-- ============================================================================
-- Updated_at triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for agent_teams
DROP TRIGGER IF EXISTS update_agent_teams_updated_at ON agent_teams;
CREATE TRIGGER update_agent_teams_updated_at
  BEFORE UPDATE ON agent_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for routing_rules
DROP TRIGGER IF EXISTS update_routing_rules_updated_at ON routing_rules;
CREATE TRIGGER update_routing_rules_updated_at
  BEFORE UPDATE ON routing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS is intentionally NOT enabled
-- Tenant isolation is enforced at the application layer
-- This is consistent with pings, ping_messages, and categories tables
-- ============================================================================
