-- Add KB Semantic and Hybrid Search Functions
-- Story 4.4: Semantic Search with pgvector
--
-- Creates functions for semantic search using pgvector embeddings
-- and hybrid search combining semantic + full-text scores.

-- Function: Semantic search using pgvector cosine similarity
-- Returns articles ordered by similarity to query embedding
CREATE OR REPLACE FUNCTION search_kb_semantic(
  query_embedding TEXT,
  p_tenant_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  content TEXT,
  category_id UUID,
  category_name TEXT,
  view_count INTEGER,
  helpful_count INTEGER,
  not_helpful_count INTEGER,
  similarity REAL
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
    ka.view_count,
    ka.helpful_count,
    ka.not_helpful_count,
    -- Cosine similarity: 1 - cosine_distance
    -- <=> operator returns cosine distance (0-2 range)
    (1 - (ka.embedding <=> query_embedding::vector))::REAL AS similarity
  FROM kb_articles ka
  LEFT JOIN categories c ON c.id = ka.category_id
  WHERE ka.tenant_id = p_tenant_id
    AND ka.status = 'published'
    AND ka.deleted_at IS NULL
    AND ka.embedding IS NOT NULL
  ORDER BY ka.embedding <=> query_embedding::vector
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION search_kb_semantic IS
  'Semantic search for KB articles using pgvector cosine similarity. Returns articles ranked by embedding similarity to query.';

-- Function: Hybrid search combining semantic + full-text
-- Uses weighted scoring: 0.7 * semantic_score + 0.3 * text_score
CREATE OR REPLACE FUNCTION search_kb_articles_hybrid(
  query_embedding TEXT,
  search_text TEXT,
  p_tenant_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  content_excerpt TEXT,
  category_id UUID,
  category_name TEXT,
  view_count INTEGER,
  helpful_count INTEGER,
  not_helpful_count INTEGER,
  similarity_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_embedding BOOLEAN := query_embedding IS NOT NULL AND query_embedding != '';
  search_query tsquery := plainto_tsquery('english', search_text);
BEGIN
  RETURN QUERY
  SELECT
    ka.id,
    ka.title,
    ka.slug,
    -- Return first 300 chars as excerpt
    LEFT(ka.content, 300) AS content_excerpt,
    ka.category_id,
    c.name AS category_name,
    ka.view_count,
    ka.helpful_count,
    ka.not_helpful_count,
    -- Compute hybrid score
    CASE
      WHEN has_embedding AND ka.embedding IS NOT NULL THEN
        -- Hybrid: 0.7 * semantic + 0.3 * text
        (
          0.7 * (1 - (ka.embedding <=> query_embedding::vector)) +
          0.3 * ts_rank(
            setweight(to_tsvector('english', ka.title), 'A') ||
            setweight(to_tsvector('english', ka.content), 'B'),
            search_query
          )
        )::REAL
      ELSE
        -- Text-only fallback
        ts_rank(
          setweight(to_tsvector('english', ka.title), 'A') ||
          setweight(to_tsvector('english', ka.content), 'B'),
          search_query
        )::REAL
    END AS similarity_score
  FROM kb_articles ka
  LEFT JOIN categories c ON c.id = ka.category_id
  WHERE ka.tenant_id = p_tenant_id
    AND ka.status = 'published'
    AND ka.deleted_at IS NULL
    AND (
      -- Match if: has embedding similarity OR matches text search
      (has_embedding AND ka.embedding IS NOT NULL) OR
      (
        to_tsvector('english', ka.title) || to_tsvector('english', ka.content)
      ) @@ search_query
    )
  ORDER BY
    CASE
      WHEN has_embedding AND ka.embedding IS NOT NULL THEN
        (
          0.7 * (1 - (ka.embedding <=> query_embedding::vector)) +
          0.3 * ts_rank(
            setweight(to_tsvector('english', ka.title), 'A') ||
            setweight(to_tsvector('english', ka.content), 'B'),
            search_query
          )
        )
      ELSE
        ts_rank(
          setweight(to_tsvector('english', ka.title), 'A') ||
          setweight(to_tsvector('english', ka.content), 'B'),
          search_query
        )
    END DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION search_kb_articles_hybrid IS
  'Hybrid search combining semantic similarity (0.7 weight) with full-text search (0.3 weight). Falls back to text-only when embeddings unavailable.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_kb_semantic(TEXT, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_kb_articles_hybrid(TEXT, TEXT, UUID, INTEGER) TO authenticated;
