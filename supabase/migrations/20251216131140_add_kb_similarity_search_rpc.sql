-- Add RPC function for KB article similarity search
-- Story 4.2.3: KB Article Comparison & Enhancement
--
-- Uses PostgreSQL full-text search with ts_rank for scoring.
-- This is a pre-pgvector implementation that will be enhanced in Story 4.4.

-- Create the similarity search function
CREATE OR REPLACE FUNCTION search_similar_kb_articles(
  p_search_terms TEXT,
  p_tenant_id UUID,
  p_category_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  content TEXT,
  category_id UUID,
  category_name TEXT,
  similarity_score REAL,
  view_count INTEGER,
  helpful_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ka.id,
    ka.title,
    ka.slug,
    ka.content,
    ka.category_id,
    c.name AS category_name,
    ts_rank(
      setweight(to_tsvector('english', ka.title), 'A') ||
      setweight(to_tsvector('english', ka.content), 'B'),
      plainto_tsquery('english', p_search_terms)
    ) AS similarity_score,
    ka.view_count,
    ka.helpful_count
  FROM kb_articles ka
  LEFT JOIN categories c ON c.id = ka.category_id
  WHERE ka.tenant_id = p_tenant_id
    AND ka.status = 'published'
    AND ka.deleted_at IS NULL
    AND (
      to_tsvector('english', ka.title) || to_tsvector('english', ka.content)
    ) @@ plainto_tsquery('english', p_search_terms)
    AND (p_category_id IS NULL OR ka.category_id = p_category_id)
  ORDER BY similarity_score DESC
  LIMIT p_limit;
END;
$$;

-- Add GIN index for full-text search performance
CREATE INDEX IF NOT EXISTS idx_kb_articles_fts
ON kb_articles
USING GIN (
  (to_tsvector('english', title) || to_tsvector('english', content))
)
WHERE status = 'published' AND deleted_at IS NULL;

-- Comment explaining the function
COMMENT ON FUNCTION search_similar_kb_articles IS
  'Searches for KB articles similar to the given search terms using full-text search. Returns articles ranked by similarity score. Used by Story 4.2.3 KB Article Comparison & Enhancement.';
