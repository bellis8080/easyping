-- Add semantic search function for KB articles using pgvector
-- Story 4.4: Semantic Search with pgvector

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION search_kb_semantic(
  query_embedding vector(1536),
  p_tenant_id uuid,
  p_limit integer DEFAULT 10,
  p_similarity_threshold real DEFAULT 0.3
)
RETURNS TABLE(
  id uuid,
  title text,
  slug text,
  content text,
  category_id uuid,
  category_name text,
  view_count integer,
  helpful_count integer,
  not_helpful_count integer,
  similarity real
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
    -- Cosine similarity: 1 - cosine distance
    -- pgvector uses <=> for cosine distance, so similarity = 1 - distance
    (1 - (ka.embedding <=> query_embedding))::real AS similarity
  FROM kb_articles ka
  LEFT JOIN categories c ON c.id = ka.category_id
  WHERE ka.tenant_id = p_tenant_id
    AND ka.status = 'published'
    AND ka.deleted_at IS NULL
    AND ka.embedding IS NOT NULL
    -- Only return results above similarity threshold
    AND (1 - (ka.embedding <=> query_embedding)) >= p_similarity_threshold
  ORDER BY ka.embedding <=> query_embedding ASC
  LIMIT p_limit;
END;
$$;

-- Add index on embedding column for faster similarity search
-- Use HNSW index for better performance with high-dimensional vectors
CREATE INDEX IF NOT EXISTS idx_kb_articles_embedding_hnsw
ON kb_articles
USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

-- Comment on function
COMMENT ON FUNCTION search_kb_semantic IS 'Performs semantic similarity search on KB articles using pgvector cosine distance';

-- Create hybrid search function combining semantic and full-text search
CREATE OR REPLACE FUNCTION search_kb_articles_hybrid(
  query_embedding vector(1536),
  search_text text,
  p_tenant_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  title text,
  slug text,
  content_excerpt text,
  category_id uuid,
  category_name text,
  view_count integer,
  helpful_count integer,
  not_helpful_count integer,
  semantic_score real,
  fulltext_score real,
  combined_score real
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH semantic_results AS (
    -- Semantic search using vector similarity
    SELECT
      ka.id,
      ka.title,
      ka.slug,
      LEFT(ka.content, 500) AS content_excerpt,
      ka.category_id,
      c.name AS category_name,
      ka.view_count,
      ka.helpful_count,
      ka.not_helpful_count,
      CASE
        WHEN ka.embedding IS NOT NULL
        THEN (1 - (ka.embedding <=> query_embedding))::real
        ELSE 0::real
      END AS semantic_score,
      -- Full-text search score
      ts_rank(
        setweight(to_tsvector('english', ka.title), 'A') ||
        setweight(to_tsvector('english', ka.content), 'B'),
        plainto_tsquery('english', search_text)
      )::real AS fulltext_score
    FROM kb_articles ka
    LEFT JOIN categories c ON c.id = ka.category_id
    WHERE ka.tenant_id = p_tenant_id
      AND ka.status = 'published'
      AND ka.deleted_at IS NULL
  )
  SELECT
    sr.id,
    sr.title,
    sr.slug,
    sr.content_excerpt,
    sr.category_id,
    sr.category_name,
    sr.view_count,
    sr.helpful_count,
    sr.not_helpful_count,
    sr.semantic_score,
    sr.fulltext_score,
    -- Combined score: weight semantic higher (0.7) than fulltext (0.3)
    -- Normalize fulltext score to 0-1 range (typical max is ~0.1)
    (sr.semantic_score * 0.7 + LEAST(sr.fulltext_score * 10, 1) * 0.3)::real AS combined_score
  FROM semantic_results sr
  WHERE sr.semantic_score >= 0.2  -- Lower threshold to catch more semantic matches
     OR sr.fulltext_score > 0.001  -- Or any fulltext match
  ORDER BY
    -- Combined score descending
    (sr.semantic_score * 0.7 + LEAST(sr.fulltext_score * 10, 1) * 0.3) DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION search_kb_articles_hybrid IS 'Hybrid search combining semantic similarity and full-text search for KB articles';
