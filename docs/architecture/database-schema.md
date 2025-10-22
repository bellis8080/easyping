# Database Schema

This section defines the concrete PostgreSQL schema with Row Level Security (RLS) policies for multi-tenant isolation. All migrations are managed via Supabase CLI in the `packages/database/migrations` directory.

## Extensions and Setup

```sql
-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Encryption functions
CREATE EXTENSION IF NOT EXISTS "vector";         -- pgvector for embeddings

-- Enable Row Level Security on all tables (enforced below)
```

## Core Tables

### Organizations Table

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::JSONB,

  CONSTRAINT organizations_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE INDEX idx_organizations_domain ON organizations(domain) WHERE domain IS NOT NULL;

-- No RLS on organizations table (managed by application layer)
```

### Users Table

```sql
-- Extends Supabase auth.users with application-specific fields
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'end_user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,

  CONSTRAINT users_role_valid CHECK (role IN ('end_user', 'agent', 'manager', 'owner')),
  CONSTRAINT users_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(tenant_id, email);
CREATE INDEX idx_users_role ON users(tenant_id, role) WHERE role IN ('agent', 'manager', 'owner');

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

CREATE POLICY users_select_own_org ON users
  FOR SELECT
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
```

### Categories Table

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT categories_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT categories_color_hex CHECK (color ~* '^#[0-9A-Fa-f]{6}$')
);

-- Indexes
CREATE INDEX idx_categories_tenant_id ON categories(tenant_id);
CREATE INDEX idx_categories_active ON categories(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_categories_sort_order ON categories(tenant_id, sort_order);

-- RLS Policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON categories
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
```

### Tickets Table

```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_number SERIAL NOT NULL,
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

  CONSTRAINT tickets_status_valid CHECK (status IN ('new', 'in_progress', 'waiting_on_user', 'resolved', 'closed')),
  CONSTRAINT tickets_priority_valid CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT tickets_title_not_empty CHECK (length(trim(title)) > 0)
);

-- Indexes
CREATE INDEX idx_tickets_tenant_id ON tickets(tenant_id);
CREATE INDEX idx_tickets_status ON tickets(tenant_id, status);
CREATE INDEX idx_tickets_created_by ON tickets(tenant_id, created_by);
CREATE INDEX idx_tickets_assigned_to ON tickets(tenant_id, assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_tickets_category ON tickets(tenant_id, category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_tickets_created_at ON tickets(tenant_id, created_at DESC);
CREATE INDEX idx_tickets_sla_due ON tickets(tenant_id, sla_due_at) WHERE sla_due_at IS NOT NULL AND status NOT IN ('resolved', 'closed');

-- RLS Policies
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON tickets
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- End users can only see their own tickets
CREATE POLICY users_select_own_tickets ON tickets
  FOR SELECT
  USING (
    tenant_id = current_setting('app.tenant_id', true)::UUID
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('agent', 'manager', 'owner')
      )
    )
  );

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Ticket Messages Table

```sql
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,

  CONSTRAINT ticket_messages_type_valid CHECK (message_type IN ('user', 'agent', 'system')),
  CONSTRAINT ticket_messages_content_not_empty CHECK (length(trim(content)) > 0)
);

-- Indexes
CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id, created_at);
CREATE INDEX idx_ticket_messages_sender_id ON ticket_messages(sender_id);

-- RLS Policies
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY ticket_messages_select ON ticket_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = ticket_messages.ticket_id
      AND tickets.tenant_id = current_setting('app.tenant_id', true)::UUID
    )
  );
```

### Knowledge Base Articles Table

```sql
CREATE TABLE knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  slug TEXT NOT NULL,
  source_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimension
  view_count INTEGER NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT kb_articles_status_valid CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT kb_articles_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT kb_articles_slug_format CHECK (slug ~* '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  UNIQUE (tenant_id, slug)
);

-- Indexes
CREATE INDEX idx_kb_articles_tenant_id ON knowledge_base_articles(tenant_id);
CREATE INDEX idx_kb_articles_status ON knowledge_base_articles(tenant_id, status);
CREATE INDEX idx_kb_articles_author ON knowledge_base_articles(tenant_id, author_id);
CREATE INDEX idx_kb_articles_published ON knowledge_base_articles(tenant_id, published_at DESC) WHERE status = 'published';

-- Vector similarity search index (IVFFlat for speed, adjust lists based on dataset size)
CREATE INDEX idx_kb_articles_embedding ON knowledge_base_articles
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RLS Policies
ALTER TABLE knowledge_base_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON knowledge_base_articles
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_kb_articles_updated_at
  BEFORE UPDATE ON knowledge_base_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### SLA Policies Table

```sql
CREATE TABLE sla_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority TEXT NOT NULL,
  response_time_hours INTEGER NOT NULL,
  resolution_time_hours INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT sla_policies_priority_valid CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT sla_policies_response_time_positive CHECK (response_time_hours > 0),
  CONSTRAINT sla_policies_resolution_time_positive CHECK (resolution_time_hours > 0),
  UNIQUE (tenant_id, priority, is_active)
);

-- Indexes
CREATE INDEX idx_sla_policies_tenant_id ON sla_policies(tenant_id);
CREATE INDEX idx_sla_policies_active ON sla_policies(tenant_id, is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON sla_policies
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
```

### Plugins Table

```sql
CREATE TABLE plugins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}'::JSONB,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT plugins_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT plugins_version_semver CHECK (version ~* '^\d+\.\d+\.\d+'),
  UNIQUE (tenant_id, name)
);

-- Indexes
CREATE INDEX idx_plugins_tenant_id ON plugins(tenant_id);
CREATE INDEX idx_plugins_enabled ON plugins(tenant_id, is_enabled) WHERE is_enabled = true;

-- RLS Policies
ALTER TABLE plugins ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON plugins
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
```

### Known Issues Table

```sql
CREATE TABLE known_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'investigating',
  severity TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  follower_count INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT known_issues_status_valid CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  CONSTRAINT known_issues_severity_valid CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT known_issues_title_not_empty CHECK (length(trim(title)) > 0)
);

-- Indexes
CREATE INDEX idx_known_issues_tenant_id ON known_issues(tenant_id);
CREATE INDEX idx_known_issues_status ON known_issues(tenant_id, status);
CREATE INDEX idx_known_issues_severity ON known_issues(tenant_id, severity);
CREATE INDEX idx_known_issues_created ON known_issues(tenant_id, created_at DESC);

-- RLS Policies
ALTER TABLE known_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON known_issues
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
```

## Join Tables

### Issue Followers (Many-to-Many)

```sql
CREATE TABLE issue_followers (
  issue_id UUID NOT NULL REFERENCES known_issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (issue_id, user_id)
);

-- Indexes
CREATE INDEX idx_issue_followers_user_id ON issue_followers(user_id);
CREATE INDEX idx_issue_followers_issue_id ON issue_followers(issue_id);

-- RLS Policies
ALTER TABLE issue_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY issue_followers_own_records ON issue_followers
  FOR ALL
  USING (user_id = auth.uid());
```

## Helper Functions

### Set Tenant Context

```sql
-- Helper function to set tenant context for RLS policies
-- Called by application middleware before database queries
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.tenant_id', tenant_uuid::TEXT, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Generate Ticket Number

```sql
-- Auto-generate sequential ticket numbers per tenant
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(ticket_number), 0) + 1
  INTO next_number
  FROM tickets
  WHERE tenant_id = NEW.tenant_id;

  NEW.ticket_number := next_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_number();
```

## Migration Strategy

**Migration Files Location:** `packages/database/migrations/`

**Example Migration Naming:**
- `20250121000001_create_organizations.sql`
- `20250121000002_create_users.sql`
- `20250121000003_create_categories.sql`
- etc.

**Supabase CLI Commands:**
```bash
# Create new migration
supabase migration new <migration_name>

# Apply migrations locally
supabase db reset

# Generate TypeScript types from schema
supabase gen types typescript --local > packages/types/src/supabase.ts

# Apply migrations to remote (production)
supabase db push
```

**Rollback Strategy:**
- Each migration includes `UP` (changes) and `DOWN` (rollback) SQL
- Critical migrations tested on staging before production
- Database backups taken before major schema changes

---
