-- Create kb_articles table for Knowledge Base articles
-- RLS is intentionally DISABLED for Supabase Realtime compatibility
-- Tenant isolation is enforced at the API layer (see CLAUDE.md)

CREATE TABLE kb_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  source_ping_id UUID REFERENCES pings(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  published_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  embedding VECTOR(1536),
  view_count INTEGER NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  not_helpful_count INTEGER NOT NULL DEFAULT 0,

  -- Unique slug per tenant
  CONSTRAINT kb_articles_unique_slug UNIQUE (tenant_id, slug),

  -- Status must be one of: draft, published, archived
  CONSTRAINT kb_articles_status_check CHECK (status IN ('draft', 'published', 'archived')),

  -- Slug format: lowercase letters, numbers, and hyphens only
  CONSTRAINT kb_articles_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  -- Title cannot be empty
  CONSTRAINT kb_articles_title_not_empty CHECK (length(trim(title)) > 0),

  -- Content cannot be empty
  CONSTRAINT kb_articles_content_not_empty CHECK (length(trim(content)) > 0)
);

-- Add comment explaining RLS decision
COMMENT ON TABLE kb_articles IS 'Knowledge Base articles. RLS disabled for Realtime compatibility - tenant isolation enforced at API layer.';

-- Create trigger to auto-update updated_at timestamp (reuses existing function)
CREATE TRIGGER update_kb_articles_updated_at
  BEFORE UPDATE ON kb_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Basic indexes (more performance indexes added in separate migration)
CREATE INDEX idx_kb_articles_tenant_id ON kb_articles(tenant_id);
CREATE INDEX idx_kb_articles_created_by ON kb_articles(created_by);
