-- Add embedding_generated_at timestamp column to kb_articles
-- Story 4.4: Semantic Search with pgvector
--
-- This column tracks when the embedding was last generated, allowing us to
-- identify stale embeddings when article content changes.

ALTER TABLE kb_articles
ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMPTZ;

-- Add comment explaining the column
COMMENT ON COLUMN kb_articles.embedding_generated_at IS 'Timestamp of when the embedding was last generated. NULL if embedding has never been generated.';

-- Add index for finding articles that need embedding regeneration
-- (published articles with no embedding or stale embeddings)
CREATE INDEX IF NOT EXISTS idx_kb_articles_needs_embedding
ON kb_articles (tenant_id)
WHERE status = 'published'
  AND deleted_at IS NULL
  AND (embedding IS NULL OR embedding_generated_at IS NULL);
