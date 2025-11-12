-- Create ping_attachments table for file attachment metadata
CREATE TABLE ping_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ping_message_id UUID NOT NULL REFERENCES ping_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'ping-attachments',
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ping_attachments_file_name_not_empty CHECK (length(trim(file_name)) > 0),
  CONSTRAINT ping_attachments_file_size_positive CHECK (file_size > 0),
  CONSTRAINT ping_attachments_file_size_max CHECK (file_size <= 10485760) -- 10MB max
);

-- Create indexes for performance
CREATE INDEX idx_ping_attachments_message_id ON ping_attachments(ping_message_id);
CREATE INDEX idx_ping_attachments_uploaded_by ON ping_attachments(uploaded_by);

-- Enable Row Level Security
ALTER TABLE ping_attachments ENABLE ROW LEVEL SECURITY;

-- Allow users to view attachments for pings they have access to
CREATE POLICY ping_attachments_select ON ping_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ping_messages
      JOIN pings ON pings.id = ping_messages.ping_id
      WHERE ping_messages.id = ping_attachments.ping_message_id
      AND pings.tenant_id = current_setting('app.tenant_id', true)::UUID
    )
  );

-- Allow users to insert attachments for messages they can access
CREATE POLICY ping_attachments_insert ON ping_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ping_messages
      JOIN pings ON pings.id = ping_messages.ping_id
      WHERE ping_messages.id = ping_attachments.ping_message_id
      AND pings.tenant_id = current_setting('app.tenant_id', true)::UUID
    )
    AND uploaded_by = auth.uid()
  );
