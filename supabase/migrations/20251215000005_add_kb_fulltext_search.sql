-- Add full-text search infrastructure for KB articles
-- Uses PostgreSQL tsvector with weighted ranking (title > content)

-- Add search_vector column as a generated column
ALTER TABLE kb_articles ADD COLUMN search_vector TSVECTOR GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(content, '')), 'B')
) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX idx_kb_articles_search ON kb_articles USING GIN(search_vector);

-- Helper function for full-text search with ranking
-- Returns articles matching the query, ordered by relevance
CREATE OR REPLACE FUNCTION search_kb_articles(
  p_tenant_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  content TEXT,
  category_id UUID,
  status TEXT,
  published_at TIMESTAMPTZ,
  view_count INTEGER,
  helpful_count INTEGER,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.slug,
    a.content,
    a.category_id,
    a.status,
    a.published_at,
    a.view_count,
    a.helpful_count,
    ts_rank(a.search_vector, plainto_tsquery('english', p_query)) AS rank
  FROM kb_articles a
  WHERE a.tenant_id = p_tenant_id
    AND a.status = 'published'
    AND a.deleted_at IS NULL
    AND a.search_vector @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_kb_articles IS 'Full-text search for published KB articles with relevance ranking.';
