-- Add 'draft' status to pings table (Story 3.2: AI-driven ping creation)
-- Draft pings are created during Echo conversation before being promoted to 'new'
ALTER TABLE pings DROP CONSTRAINT IF EXISTS pings_status_valid;

ALTER TABLE pings ADD CONSTRAINT pings_status_valid
  CHECK (status IN ('draft', 'new', 'in_progress', 'waiting_on_user', 'resolved', 'closed'));

-- Add comment explaining draft status
COMMENT ON COLUMN pings.status IS 'Ping status. Draft = Echo conversation in progress, New = ready for agent assignment, In Progress = agent working, Waiting on User = needs user response, Resolved = issue fixed, Closed = completed/archived';
