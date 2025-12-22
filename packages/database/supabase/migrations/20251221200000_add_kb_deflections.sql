-- Migration: Add KB Deflections Table
-- Story 4.6: KB Suggestions During Ping Creation
--
-- Purpose:
-- - Track when users find articles that solve their issue (deflections)
-- - Add deflection_count to kb_articles for analytics
-- - Create trigger to auto-increment deflection count
--
-- RLS is DISABLED for Supabase Realtime compatibility.
-- Tenant isolation is enforced at the API layer.

-- Add deflection_count column to kb_articles
ALTER TABLE kb_articles
ADD COLUMN IF NOT EXISTS deflection_count INTEGER NOT NULL DEFAULT 0;

-- Add index for deflection analytics
CREATE INDEX IF NOT EXISTS idx_kb_articles_deflection_count
ON kb_articles (tenant_id, deflection_count DESC)
WHERE status = 'published' AND deleted_at IS NULL;

-- Create kb_deflections table to track deflection events
CREATE TABLE IF NOT EXISTS kb_deflections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for kb_deflections
CREATE INDEX IF NOT EXISTS idx_kb_deflections_tenant
ON kb_deflections (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kb_deflections_article
ON kb_deflections (article_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kb_deflections_user
ON kb_deflections (user_id, created_at DESC);

-- Create trigger function to increment deflection_count
CREATE OR REPLACE FUNCTION increment_kb_article_deflection_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE kb_articles
    SET deflection_count = deflection_count + 1
    WHERE id = NEW.article_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-increment deflection_count on insert
DROP TRIGGER IF EXISTS trigger_increment_deflection_count ON kb_deflections;
CREATE TRIGGER trigger_increment_deflection_count
    AFTER INSERT ON kb_deflections
    FOR EACH ROW
    EXECUTE FUNCTION increment_kb_article_deflection_count();

-- RLS is intentionally DISABLED for Supabase Realtime compatibility
-- Tenant isolation is enforced at the API layer
ALTER TABLE kb_deflections DISABLE ROW LEVEL SECURITY;

-- Add comment documenting the intentional RLS disable
COMMENT ON TABLE kb_deflections IS 'Tracks KB article deflections (self-solved issues). RLS disabled for Realtime compatibility - tenant isolation enforced at API layer.';
