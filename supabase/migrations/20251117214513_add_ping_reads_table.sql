-- Create ping_reads table to track when users last read each ping
CREATE TABLE ping_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ping_id UUID NOT NULL REFERENCES pings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_message_id UUID REFERENCES ping_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ping_id, user_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_ping_reads_user_id ON ping_reads(user_id);
CREATE INDEX idx_ping_reads_ping_id ON ping_reads(ping_id);

-- Add settings column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'settings'
  ) THEN
    ALTER TABLE users ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON TABLE ping_reads IS 'Tracks when each user last read each ping for unread count calculation';
COMMENT ON COLUMN ping_reads.last_read_at IS 'Timestamp when user last viewed the ping';
COMMENT ON COLUMN ping_reads.last_read_message_id IS 'ID of the last message the user read';
COMMENT ON COLUMN users.settings IS 'User preferences including notification settings';
