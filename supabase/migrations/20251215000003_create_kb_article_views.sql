-- Create kb_article_views table for tracking article usage
-- RLS is intentionally DISABLED - tenant isolation enforced at API layer

CREATE TABLE kb_article_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying views by article and time (for analytics)
CREATE INDEX idx_kb_article_views_article_time ON kb_article_views(article_id, viewed_at);

-- Index for querying views by user (for "recently viewed" feature)
CREATE INDEX idx_kb_article_views_user ON kb_article_views(user_id) WHERE user_id IS NOT NULL;

-- Add comment
COMMENT ON TABLE kb_article_views IS 'Tracks KB article views for analytics and view count updates.';
