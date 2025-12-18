-- Add agent_content column for internal resolution steps (Story 4.2.2)
-- This column stores technical resolution steps visible only to agents.
-- End users should NEVER see this content - it's filtered at the API layer.

ALTER TABLE kb_articles
ADD COLUMN agent_content TEXT;

COMMENT ON COLUMN kb_articles.agent_content IS
  'Internal resolution steps visible only to agents. Contains technical details from private notes. NEVER expose to end users.';
