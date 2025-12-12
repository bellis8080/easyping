-- Add support_profile JSONB column to organizations table
-- This stores AI-generated or manually entered support profile describing what this organization handles

ALTER TABLE organizations
ADD COLUMN support_profile JSONB DEFAULT NULL;

COMMENT ON COLUMN organizations.support_profile IS 'AI-generated or manually entered support profile describing what this organization handles. Contains: support_type, description, typical_users, systems_supported, common_issues, ai_generated, created_at, updated_at';
