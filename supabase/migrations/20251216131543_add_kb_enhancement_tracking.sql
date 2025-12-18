-- Add enhancement tracking to kb_articles
-- Story 4.2.3: KB Article Comparison & Enhancement
--
-- This field links enhancement drafts to their original articles.
-- When an enhancement draft is approved, it replaces the original article.

-- Add column to track which article this draft enhances
ALTER TABLE kb_articles
ADD COLUMN enhances_article_id UUID REFERENCES kb_articles(id) ON DELETE SET NULL;

-- Index for finding enhancement drafts efficiently
-- Partial index since most articles won't be enhancement drafts
CREATE INDEX idx_kb_articles_enhances ON kb_articles(enhances_article_id)
WHERE enhances_article_id IS NOT NULL;

-- Comment explaining the field
COMMENT ON COLUMN kb_articles.enhances_article_id IS
  'When this draft is approved, it will replace the referenced article. The original article is archived and this draft becomes the canonical version.';
