-- Create kb_glossary_terms table for acronyms, industry, and company-specific terms
-- These terms are auto-linked in KB articles with tooltip definitions
-- RLS is intentionally DISABLED - tenant isolation enforced at API layer

CREATE TABLE kb_glossary_terms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  category TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Category must be one of: acronym, industry, company, general (or null)
  CONSTRAINT kb_glossary_terms_category_check CHECK (
    category IS NULL OR category IN ('acronym', 'industry', 'company', 'general')
  ),

  -- Term cannot be empty
  CONSTRAINT kb_glossary_terms_term_not_empty CHECK (length(trim(term)) > 0),

  -- Definition cannot be empty
  CONSTRAINT kb_glossary_terms_definition_not_empty CHECK (length(trim(definition)) > 0)
);

-- Case-insensitive unique constraint on term per tenant
CREATE UNIQUE INDEX kb_glossary_terms_unique_term ON kb_glossary_terms(tenant_id, LOWER(term));

-- Index for fast term lookups
CREATE INDEX idx_kb_glossary_terms_tenant_term ON kb_glossary_terms(tenant_id, term);

-- Add comment explaining the feature
COMMENT ON TABLE kb_glossary_terms IS 'Glossary of terms (acronyms, jargon) for auto-linking in KB articles with tooltip definitions.';

-- Create trigger to auto-update updated_at timestamp
CREATE TRIGGER update_kb_glossary_terms_updated_at
  BEFORE UPDATE ON kb_glossary_terms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
