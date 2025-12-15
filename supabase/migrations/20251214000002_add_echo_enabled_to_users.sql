-- Migration: Add echo_enabled column to users table
-- Story 3.7: Echo - AI Response Suggestions
-- Allows agents to disable Echo suggestions in their personal settings

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS echo_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.users.echo_enabled IS 'Whether Echo AI response suggestions are enabled for this user';
