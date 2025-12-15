-- Performance indexes for KB articles
-- Optimized for common query patterns: listing, filtering, searching

-- Index for filtering by status (excludes soft-deleted)
CREATE INDEX idx_kb_articles_status ON kb_articles(tenant_id, status)
  WHERE deleted_at IS NULL;

-- Index for listing published articles (most common query)
CREATE INDEX idx_kb_articles_published ON kb_articles(tenant_id, published_at DESC)
  WHERE status = 'published' AND deleted_at IS NULL;

-- Index for filtering by category
CREATE INDEX idx_kb_articles_category ON kb_articles(tenant_id, category_id)
  WHERE deleted_at IS NULL;

-- Index for finding articles created from a specific ping
CREATE INDEX idx_kb_articles_source_ping ON kb_articles(source_ping_id)
  WHERE source_ping_id IS NOT NULL;

-- IVFFlat index for vector similarity search (semantic search)
-- lists=100 is suitable for datasets up to ~1M records
-- Note: This index requires data to build properly, so it may need reindexing after initial data load
CREATE INDEX idx_kb_articles_embedding ON kb_articles
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

COMMENT ON INDEX idx_kb_articles_embedding IS 'IVFFlat index for semantic search. May need REINDEX after significant data changes.';
