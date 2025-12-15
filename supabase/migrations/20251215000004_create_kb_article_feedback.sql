-- Create kb_article_feedback table for "Was this helpful?" feature
-- RLS is intentionally DISABLED - tenant isolation enforced at API layer

CREATE TABLE kb_article_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Each user can only provide feedback once per article
CREATE UNIQUE INDEX kb_article_feedback_unique_user ON kb_article_feedback(article_id, user_id)
  WHERE user_id IS NOT NULL;

-- Index for aggregating feedback by article
CREATE INDEX idx_kb_article_feedback_article ON kb_article_feedback(article_id);

-- Add comment
COMMENT ON TABLE kb_article_feedback IS 'User feedback on KB articles ("Was this helpful?" yes/no).';

-- Function to update helpful/not_helpful counts on kb_articles
CREATE OR REPLACE FUNCTION update_kb_article_feedback_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_helpful THEN
      UPDATE kb_articles SET helpful_count = helpful_count + 1 WHERE id = NEW.article_id;
    ELSE
      UPDATE kb_articles SET not_helpful_count = not_helpful_count + 1 WHERE id = NEW.article_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_helpful THEN
      UPDATE kb_articles SET helpful_count = helpful_count - 1 WHERE id = OLD.article_id;
    ELSE
      UPDATE kb_articles SET not_helpful_count = not_helpful_count - 1 WHERE id = OLD.article_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_helpful != NEW.is_helpful THEN
    -- User changed their feedback
    IF NEW.is_helpful THEN
      UPDATE kb_articles SET helpful_count = helpful_count + 1, not_helpful_count = not_helpful_count - 1 WHERE id = NEW.article_id;
    ELSE
      UPDATE kb_articles SET helpful_count = helpful_count - 1, not_helpful_count = not_helpful_count + 1 WHERE id = NEW.article_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update counts on feedback changes
CREATE TRIGGER update_kb_article_feedback_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON kb_article_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_kb_article_feedback_counts();
