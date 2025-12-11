-- Migration: Add 'draft' status and AI fields to pings table
-- Story 3.3: Auto-Categorization of Pings with Conversational Clarification
-- Purpose: Support Echo conversation flow before ping becomes visible to agents

-- Step 1: Update pings table status enum to include 'draft'
ALTER TABLE pings DROP CONSTRAINT IF EXISTS pings_status_valid;
ALTER TABLE pings ADD CONSTRAINT pings_status_valid
  CHECK (status IN ('draft', 'new', 'in_progress', 'waiting_on_user', 'resolved', 'closed'));

-- Step 2: Add AI-related columns to pings table
ALTER TABLE pings ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE pings ADD COLUMN IF NOT EXISTS category_confidence DECIMAL(3,2);
ALTER TABLE pings ADD COLUMN IF NOT EXISTS clarification_count INTEGER DEFAULT 0;
ALTER TABLE pings ADD COLUMN IF NOT EXISTS echo_introduced BOOLEAN DEFAULT false;
ALTER TABLE pings ADD COLUMN IF NOT EXISTS problem_statement_confirmed BOOLEAN DEFAULT false;

-- Step 3: Add index for draft pings (used to filter out from agent inbox)
CREATE INDEX IF NOT EXISTS idx_pings_draft ON pings(tenant_id, status) WHERE status = 'draft';

-- Step 4: Add comments for documentation
COMMENT ON COLUMN pings.ai_summary IS 'AI-generated problem statement pinned at top of ping detail view';
COMMENT ON COLUMN pings.category_confidence IS 'Confidence score (0.00-1.00) for AI category assignment';
COMMENT ON COLUMN pings.clarification_count IS 'Number of clarifying questions Echo asked during problem discovery';
COMMENT ON COLUMN pings.echo_introduced IS 'Tracks if Echo has introduced himself to the user';
COMMENT ON COLUMN pings.problem_statement_confirmed IS 'Tracks if user confirmed the AI-generated problem statement';
