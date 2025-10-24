-- Main seed file for Supabase
-- This file is automatically run by `supabase db reset`

-- Development Seed Data
-- Insert default organization for local development
INSERT INTO organizations (id, name, domain, created_at, settings)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',  -- Fixed UUID for development
  'Default Organization',
  'localhost',
  NOW(),
  '{"features": {"ai_enabled": true, "max_agents": 10}}'::JSONB
)
ON CONFLICT (id) DO NOTHING;

-- Note: Test users will be created in Story 1.3 after Supabase Auth is configured
