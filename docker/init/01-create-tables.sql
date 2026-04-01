-- Pre-migration prerequisites for EasyPing Docker deployment
-- Runs after 00-init-schemas.sql (which creates roles, schemas, and extensions).
--
-- TABLE CREATION IS INTENTIONALLY ABSENT from this file.
-- All tables are created by the migration runner (docker/scripts/run-migrations.sh)
-- which replays supabase/migrations/ in filename order after the container starts.
--
-- This file only creates objects that must exist BEFORE migrations run:
--   1. supabase_realtime publication (vanilla Postgres doesn't have it)
--   2. auth.uid() stub (GoTrue provides this in hosted Supabase; we need it for RLS policies)

-- ---------------------------------------------------------------------------
-- 1. supabase_realtime publication
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. auth.uid() stub
-- GoTrue sets the JWT claim at runtime; the function must exist for RLS policy
-- creation even before GoTrue is running.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb->>'sub')
  )::uuid
$$;
