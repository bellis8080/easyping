-- Create pings table
CREATE TABLE IF NOT EXISTS pings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ping_number INTEGER NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'normal',
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  sla_due_at TIMESTAMPTZ,
  ai_summary TEXT,
  CONSTRAINT pings_status_valid CHECK (status IN ('new', 'in_progress', 'waiting_on_user', 'resolved', 'closed')),
  CONSTRAINT pings_priority_valid CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT pings_unique_number_per_tenant UNIQUE (tenant_id, ping_number)
);

-- Create ping_messages table
CREATE TABLE IF NOT EXISTS ping_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ping_id UUID NOT NULL REFERENCES pings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  CONSTRAINT ping_messages_type_valid CHECK (message_type IN ('user', 'agent', 'system'))
);

-- Create function to generate sequential ping numbers per tenant
CREATE OR REPLACE FUNCTION generate_ping_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Get the max ping_number for this tenant and add 1
  SELECT COALESCE(MAX(ping_number), 0) + 1
  INTO next_number
  FROM pings
  WHERE tenant_id = NEW.tenant_id;

  NEW.ping_number = next_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate ping_number on insert
CREATE TRIGGER set_ping_number
  BEFORE INSERT ON pings
  FOR EACH ROW
  EXECUTE FUNCTION generate_ping_number();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pings_updated_at
  BEFORE UPDATE ON pings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_pings_tenant_id ON pings(tenant_id);
CREATE INDEX idx_pings_created_by ON pings(created_by);
CREATE INDEX idx_pings_assigned_to ON pings(assigned_to);
CREATE INDEX idx_pings_status ON pings(status);
CREATE INDEX idx_pings_created_at ON pings(created_at);
CREATE INDEX idx_pings_ping_number ON pings(tenant_id, ping_number);

CREATE INDEX idx_ping_messages_ping_id ON ping_messages(ping_id);
CREATE INDEX idx_ping_messages_created_at ON ping_messages(created_at);

-- Enable Row Level Security
ALTER TABLE pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ping_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for pings table
CREATE POLICY "Users can view pings in their tenant"
  ON pings FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create pings in their tenant"
  ON pings FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()) AND
    created_by = auth.uid()
  );

CREATE POLICY "Users can update pings in their tenant"
  ON pings FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- RLS policies for ping_messages table
CREATE POLICY "Users can view messages for pings in their tenant"
  ON ping_messages FOR SELECT
  USING (ping_id IN (
    SELECT id FROM pings WHERE tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can create messages for pings in their tenant"
  ON ping_messages FOR INSERT
  WITH CHECK (
    ping_id IN (
      SELECT id FROM pings WHERE tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
      )
    ) AND
    sender_id = auth.uid()
  );

CREATE POLICY "Users can update their own messages"
  ON ping_messages FOR UPDATE
  USING (sender_id = auth.uid());
