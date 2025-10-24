-- Development Seed Data
-- This file is automatically loaded by Supabase on database reset

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

-- Test Users for Development
-- NOTE: Supabase Auth manages the auth.users table, so test users must be created
-- via the signup UI or using the Supabase Auth API. User profiles are automatically
-- created via the /api/auth/create-profile endpoint after successful signup.
--
-- To create test users for development:
-- 1. Navigate to http://localhost:3000/signup
-- 2. Create accounts with the following emails:
--    - owner@test.com (first user - automatically gets 'owner' role)
--    - admin@test.com (manually promote to 'admin' role after creation)
--    - agent@test.com (manually promote to 'agent' role after creation)
--    - user@test.com (default 'end_user' role)
--
-- OR use Supabase Auth API:
-- See: https://supabase.com/docs/reference/javascript/auth-signup
--
-- Example role promotion (run after user signup):
-- UPDATE users SET role = 'admin' WHERE email = 'admin@test.com';
-- UPDATE users SET role = 'agent' WHERE email = 'agent@test.com';
