-- Story 3.6: AI-Pinned Ping Summaries
-- Add summary_updated_at column to track when AI summary was last generated/updated

-- Add summary_updated_at column to pings table
ALTER TABLE pings ADD COLUMN IF NOT EXISTS summary_updated_at TIMESTAMPTZ;

-- Backfill existing pings that have an ai_summary
-- Set summary_updated_at to updated_at for pings that already have a summary
UPDATE pings
SET summary_updated_at = updated_at
WHERE ai_summary IS NOT NULL AND summary_updated_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN pings.summary_updated_at IS 'Timestamp when the AI summary was last generated or updated';
