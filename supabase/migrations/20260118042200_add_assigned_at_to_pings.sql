-- Add assigned_at column to pings table for agent performance metrics
-- This tracks when a ping was assigned to an agent, enabling accurate
-- resolution time calculations (from assignment, not creation)

-- Add the column
ALTER TABLE pings ADD COLUMN assigned_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN pings.assigned_at IS 'Timestamp when ping was assigned to an agent. Used for calculating resolution time from assignment.';

-- Backfill: Set assigned_at = created_at for already-assigned pings
-- This is a reasonable default since we don't have historical assignment data
UPDATE pings
SET assigned_at = created_at
WHERE assigned_to IS NOT NULL AND assigned_at IS NULL;

-- Create trigger function to auto-set assigned_at when assigned_to changes
CREATE OR REPLACE FUNCTION set_assigned_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Set assigned_at when:
  -- 1. assigned_to is being set (was NULL, now has value)
  -- 2. assigned_to is changing to a different agent
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    NEW.assigned_at = NOW();
  END IF;
  -- If assigned_to is being cleared, also clear assigned_at
  IF NEW.assigned_to IS NULL AND OLD.assigned_to IS NOT NULL THEN
    NEW.assigned_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on pings table
CREATE TRIGGER trigger_set_assigned_at
  BEFORE UPDATE ON pings
  FOR EACH ROW
  EXECUTE FUNCTION set_assigned_at();

-- Also handle INSERT case - if ping is created with assigned_to already set
CREATE OR REPLACE FUNCTION set_assigned_at_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_at IS NULL THEN
    NEW.assigned_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_assigned_at_insert
  BEFORE INSERT ON pings
  FOR EACH ROW
  EXECUTE FUNCTION set_assigned_at_on_insert();
