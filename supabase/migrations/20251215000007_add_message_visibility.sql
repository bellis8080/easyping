-- Add visibility column to ping_messages for agent private notes
-- Story 4.2.1: Agent Private Notes
--
-- This enables agents to create internal notes that are only visible to other agents.
-- End users will never see private messages or know they exist.
--
-- Values:
--   'public'  - Visible to all users (default, existing behavior)
--   'private' - Only visible to agents/admins

-- Add the visibility column with default 'public' for backward compatibility
ALTER TABLE ping_messages
ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';

-- Add CHECK constraint to ensure only valid values
ALTER TABLE ping_messages
ADD CONSTRAINT ping_messages_visibility_check
CHECK (visibility IN ('public', 'private'));

-- Add index for efficient filtering by visibility within a ping
-- This enables fast queries like: SELECT * FROM ping_messages WHERE ping_id = ? AND visibility = 'public'
CREATE INDEX idx_ping_messages_visibility
ON ping_messages(ping_id, visibility);

-- Add comment for documentation
COMMENT ON COLUMN ping_messages.visibility IS
  'Message visibility: public (visible to all) or private (agents only)';
