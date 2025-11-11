-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- Encryption
CREATE EXTENSION IF NOT EXISTS "vector";     -- pgvector (for future embeddings)

-- Create organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::JSONB,

  CONSTRAINT organizations_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Create index on domain
CREATE INDEX idx_organizations_domain ON organizations(domain) WHERE domain IS NOT NULL;
