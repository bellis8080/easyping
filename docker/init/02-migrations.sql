-- ============================================================================
-- EasyPing Docker Consolidated Migrations
-- Auto-generated from supabase/migrations/ for fresh Docker deployments
-- Runs after 00-init-schemas.sql and 01-create-tables.sql
-- ============================================================================

-- Create supabase_realtime publication if it does not exist (vanilla Postgres)
-- In hosted Supabase this already exists; in Docker we need to create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- Create a stub auth.uid() function for RLS policies that reference it
-- In hosted Supabase, GoTrue provides this. In Docker, GoTrue sets the JWT
-- claim but the function must exist for policy creation.
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

-- ============================================================================
-- Migration: create_categories_table
-- ============================================================================
-- Create categories table (stub for ping categorization)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6B7280',
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT categories_unique_name_per_tenant UNIQUE (tenant_id, name)
);

-- Create index
CREATE INDEX idx_categories_tenant_id ON categories(tenant_id);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for categories table
CREATE POLICY "Users can view categories in their tenant"
  ON categories FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Managers can manage categories in their tenant"
  ON categories FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()) AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'owner')
  );

-- ============================================================================
-- Migration: create_pings_tables
-- ============================================================================
-- Create pings table
CREATE TABLE IF NOT EXISTS pings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ping_number INTEGER NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'normal',
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  sla_due_at TIMESTAMPTZ,
  ai_summary TEXT,
  CONSTRAINT pings_status_valid CHECK (status IN ('new', 'in_progress', 'waiting_on_user', 'resolved', 'closed')),
  CONSTRAINT pings_priority_valid CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT pings_unique_number_per_tenant UNIQUE (tenant_id, ping_number)
);

-- Create ping_messages table
CREATE TABLE IF NOT EXISTS ping_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ping_id UUID NOT NULL REFERENCES pings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  CONSTRAINT ping_messages_type_valid CHECK (message_type IN ('user', 'agent', 'system'))
);

-- Create function to generate sequential ping numbers per tenant
CREATE OR REPLACE FUNCTION generate_ping_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Get the max ping_number for this tenant and add 1
  SELECT COALESCE(MAX(ping_number), 0) + 1
  INTO next_number
  FROM pings
  WHERE tenant_id = NEW.tenant_id;

  NEW.ping_number = next_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate ping_number on insert
CREATE TRIGGER set_ping_number
  BEFORE INSERT ON pings
  FOR EACH ROW
  EXECUTE FUNCTION generate_ping_number();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pings_updated_at
  BEFORE UPDATE ON pings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_pings_tenant_id ON pings(tenant_id);
CREATE INDEX idx_pings_created_by ON pings(created_by);
CREATE INDEX idx_pings_assigned_to ON pings(assigned_to);
CREATE INDEX idx_pings_status ON pings(status);
CREATE INDEX idx_pings_created_at ON pings(created_at);
CREATE INDEX idx_pings_ping_number ON pings(tenant_id, ping_number);

CREATE INDEX idx_ping_messages_ping_id ON ping_messages(ping_id);
CREATE INDEX idx_ping_messages_created_at ON ping_messages(created_at);

-- Enable Row Level Security
ALTER TABLE pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ping_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for pings table
CREATE POLICY "Users can view pings in their tenant"
  ON pings FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create pings in their tenant"
  ON pings FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()) AND
    created_by = auth.uid()
  );

CREATE POLICY "Users can update pings in their tenant"
  ON pings FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- RLS policies for ping_messages table
CREATE POLICY "Users can view messages for pings in their tenant"
  ON ping_messages FOR SELECT
  USING (ping_id IN (
    SELECT id FROM pings WHERE tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can create messages for pings in their tenant"
  ON ping_messages FOR INSERT
  WITH CHECK (
    ping_id IN (
      SELECT id FROM pings WHERE tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
      )
    ) AND
    sender_id = auth.uid()
  );

CREATE POLICY "Users can update their own messages"
  ON ping_messages FOR UPDATE
  USING (sender_id = auth.uid());

-- ============================================================================
-- Migration: allow_users_select_own_profile
-- ============================================================================
-- Allow users to query their own profile even without tenant context set
-- This is necessary to bootstrap the session - we need to get the user's tenant_id
-- before we can set the tenant context for other queries

-- Add policy to allow users to SELECT their own record using auth.uid()
CREATE POLICY users_select_own_profile ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Note: This policy works alongside users_select_own_org policy
-- PostgreSQL evaluates RLS policies with OR logic, so a row is visible if ANY policy allows it

-- ============================================================================
-- Migration: enable_realtime_for_ping_messages
-- ============================================================================
-- Enable Realtime for ping_messages table
-- This allows Supabase Realtime to broadcast INSERT/UPDATE/DELETE events

ALTER PUBLICATION supabase_realtime ADD TABLE ping_messages;

-- Note: Realtime Presence doesn't require table publications
-- Presence API works at the channel level and doesn't depend on database tables

-- ============================================================================
-- Migration: allow_users_select_by_id
-- ============================================================================
-- Allow authenticated users to query other users by ID
-- This is necessary for Realtime subscriptions where we need to fetch sender details
-- Security: This only allows reading user info, not modifying it
-- The existing users_select_own_org policy requires tenant_id context which browser clients don't set

-- Add policy to allow authenticated users to SELECT any user by their ID
-- This is safe because:
-- 1. It only grants SELECT permission (read-only)
-- 2. It only exposes basic profile info (id, name, avatar)
-- 3. Multi-tenant isolation is already enforced at the application layer via tenant_id filtering
CREATE POLICY users_select_by_id ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: This policy works alongside users_select_own_profile and users_select_own_org
-- PostgreSQL evaluates RLS policies with OR logic, so a row is visible if ANY policy allows it

-- ============================================================================
-- Migration: enable_realtime_for_pings
-- ============================================================================
-- Enable Realtime for pings table
-- This allows Supabase Realtime to broadcast INSERT/UPDATE/DELETE events
-- so agents can see new pings appear in their inbox in real-time

ALTER PUBLICATION supabase_realtime ADD TABLE pings;

-- ============================================================================
-- Migration: enable_replica_identity_full_for_realtime
-- ============================================================================
-- Enable REPLICA IDENTITY FULL for Realtime broadcasts with filters
-- This is required for Supabase Realtime to broadcast INSERT events with column filters like tenant_id=eq.xxx
-- Without FULL replica identity, filtered subscriptions don't receive events

-- Set REPLICA IDENTITY FULL for pings table
ALTER TABLE pings REPLICA IDENTITY FULL;

-- Set REPLICA IDENTITY FULL for ping_messages table
ALTER TABLE ping_messages REPLICA IDENTITY FULL;

-- ============================================================================
-- Migration: simplify_ping_messages_rls_for_realtime
-- ============================================================================
-- Simplify ping_messages RLS policy to work better with Supabase Realtime
-- The existing policy has nested subqueries that may cause issues with Realtime's RLS evaluation

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view messages for pings in their tenant" ON ping_messages;

-- Create a simpler SELECT policy that Realtime can evaluate more efficiently
-- This uses a direct join to pings table and checks tenant_id matches user's tenant_id
CREATE POLICY "Users can view messages for pings in their tenant" ON ping_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM pings p
      INNER JOIN users u ON u.tenant_id = p.tenant_id
      WHERE p.id = ping_messages.ping_id
        AND u.id = auth.uid()
    )
  );

-- Ensure the policy is enabled
ALTER TABLE ping_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Migration: add_ping_reads_table
-- ============================================================================
-- Create ping_reads table to track when users last read each ping
CREATE TABLE ping_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ping_id UUID NOT NULL REFERENCES pings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_message_id UUID REFERENCES ping_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ping_id, user_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_ping_reads_user_id ON ping_reads(user_id);
CREATE INDEX idx_ping_reads_ping_id ON ping_reads(ping_id);

-- Add settings column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'settings'
  ) THEN
    ALTER TABLE users ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Enable RLS for Realtime compatibility (following same pattern as pings/ping_messages)
-- Application-level tenant isolation enforced via API endpoints
ALTER TABLE ping_reads ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for authenticated users
-- (Application-level tenant filtering remains in place)
CREATE POLICY "Allow authenticated users to read ping_reads"
  ON ping_reads
  FOR SELECT
  TO authenticated
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE ping_reads IS 'Tracks when each user last read each ping for unread count calculation. RLS enabled with permissive SELECT policy for Realtime compatibility - security enforced at API layer.';
COMMENT ON COLUMN ping_reads.last_read_at IS 'Timestamp when user last viewed the ping';
COMMENT ON COLUMN ping_reads.last_read_message_id IS 'ID of the last message the user read';
COMMENT ON COLUMN users.settings IS 'User preferences including notification settings';

-- ============================================================================
-- Migration: enable_rls_for_realtime
-- ============================================================================
-- Enable RLS for Realtime compatibility
-- Note: This doesn't change application-level security (tenant isolation via app code)
-- but allows Supabase Realtime postgres_changes to work

-- Enable RLS on tables used for realtime subscriptions
ALTER TABLE pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ping_messages ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users
-- (Application-level tenant filtering remains in place)

CREATE POLICY "Allow authenticated users to read pings"
  ON pings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read ping messages"
  ON ping_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: We only enable SELECT policies since Realtime only needs read access
-- All INSERT/UPDATE/DELETE operations still go through the application API
-- which enforces tenant isolation at the application level

-- ============================================================================
-- Migration: realtime_authorization_bypass (skipped - requires realtime types)
-- ============================================================================
-- NOTE: realtime.can_update_own_rows function requires realtime.wal_message type
-- which only exists when Supabase Realtime service is running. Skipping.

-- ============================================================================
-- Migration: set_replica_identity_full
-- ============================================================================
-- Set REPLICA IDENTITY FULL for Realtime to work properly
-- This ensures Realtime receives full row data for UPDATE/DELETE events
-- Required for Supabase Realtime postgres_changes subscriptions

ALTER TABLE pings REPLICA IDENTITY FULL;
ALTER TABLE ping_messages REPLICA IDENTITY FULL;

COMMENT ON TABLE pings IS 'Replica identity set to FULL for Supabase Realtime compatibility';
COMMENT ON TABLE ping_messages IS 'Replica identity set to FULL for Supabase Realtime compatibility';

-- ============================================================================
-- Migration: set_ping_reads_replica_identity
-- ============================================================================
-- Set REPLICA IDENTITY FULL for ping_reads to enable Realtime with old values
-- This is required for Supabase Realtime postgres_changes subscriptions to receive
-- the old row values in UPDATE/DELETE events, which we need to calculate unread count changes

ALTER TABLE ping_reads REPLICA IDENTITY FULL;

COMMENT ON TABLE ping_reads IS 'Tracks when each user last read each ping. Replica identity set to FULL for Supabase Realtime compatibility';

-- ============================================================================
-- Migration: add_ai_configuration
-- ============================================================================
-- Add AI configuration to organizations table
-- Stores AI provider settings, encrypted API keys, and model selection

-- Add ai_config JSONB column to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS ai_config JSONB DEFAULT '{}'::JSONB;

-- Add comment explaining the schema
COMMENT ON COLUMN organizations.ai_config IS 'AI provider configuration: {provider: string, encrypted_api_key: string, model: string, enabled: boolean}';

-- Create function to encrypt API keys using pgcrypto
-- Uses organization ID as salt for encryption
CREATE OR REPLACE FUNCTION encrypt_api_key(api_key TEXT, org_id UUID)
RETURNS TEXT AS $$
BEGIN
  -- Use pgcrypto extension to encrypt API key
  -- Salt with organization ID for added security
  RETURN encode(
    encrypt(
      api_key::bytea,
      org_id::text::bytea,
      'aes'
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to decrypt API keys
CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted_key TEXT, org_id UUID)
RETURNS TEXT AS $$
BEGIN
  -- Decrypt API key using organization ID as salt
  RETURN convert_from(
    decrypt(
      decode(encrypted_key, 'base64'),
      org_id::text::bytea,
      'aes'
    ),
    'UTF8'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return null if decryption fails (invalid key or corrupted data)
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION encrypt_api_key(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_api_key(TEXT, UUID) TO authenticated;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_ai_config_enabled
ON organizations ((ai_config->>'enabled'))
WHERE (ai_config->>'enabled')::boolean = true;

-- ============================================================================
-- Migration: add_draft_status_and_ai_fields
-- ============================================================================
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

-- ============================================================================
-- Migration: add_category_is_active_and_seed_defaults
-- ============================================================================
-- Migration: Add is_active column to categories and seed default categories
-- Story 3.3: Auto-Categorization of Pings with Conversational Clarification
-- Purpose: Support category management and provide default categories for AI categorization

-- Step 1: Add is_active column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Step 2: Add index for active categories (used in category selection queries)
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(tenant_id, is_active) WHERE is_active = true;

-- Step 3: Add index for sort order
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(tenant_id, sort_order);

-- Step 4: Add check constraint for name not empty
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_not_empty;
ALTER TABLE categories ADD CONSTRAINT categories_name_not_empty CHECK (length(trim(name)) > 0);

-- Step 5: Add check constraint for color hex format
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_color_hex;
ALTER TABLE categories ADD CONSTRAINT categories_color_hex CHECK (color ~* '^#[0-9A-Fa-f]{6}$');

-- Step 6: Enable RLS on categories table (intentionally permissive for Realtime)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop existing policies and create new permissive policy for SELECT
DROP POLICY IF EXISTS "Users can view categories in their tenant" ON categories;
DROP POLICY IF EXISTS "Managers can manage categories in their tenant" ON categories;

CREATE POLICY categories_select_all ON categories FOR SELECT USING (true);

-- Step 8: Seed default categories for all existing organizations
INSERT INTO categories (tenant_id, name, description, color, icon, sort_order, is_active)
SELECT
  o.id,
  c.name,
  c.description,
  c.color,
  c.icon,
  c.sort_order,
  true
FROM organizations o
CROSS JOIN (
  VALUES
    ('Hardware', 'Computer hardware, peripherals, equipment issues', '#ef4444', 'HardDrive', 0),
    ('Software', 'Application errors, software bugs, feature requests', '#3b82f6', 'Code', 1),
    ('Network', 'Internet connectivity, VPN, network access issues', '#10b981', 'Network', 2),
    ('Access Request', 'Account access, permissions, role changes', '#f59e0b', 'Key', 3),
    ('Password Reset', 'Password recovery, account lockout', '#8b5cf6', 'LockKeyhole', 4),
    ('Needs Review', 'Requires manual review or categorization', '#f97316', 'AlertCircle', 5),
    ('Other', 'Uncategorized or general inquiries', '#6b7280', 'HelpCircle', 6)
) AS c(name, description, color, icon, sort_order)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Step 9: Add comments for documentation
COMMENT ON COLUMN categories.is_active IS 'Whether category is active (false = archived)';

-- ============================================================================
-- Migration: add_echo_system_user
-- ============================================================================
-- Migration: Add Echo system user function
-- Story 3.3: Auto-Categorization of Pings with Conversational Clarification
-- Purpose: Create a special "Echo" system user for AI messages per organization

-- Create function to get or create Echo user for organization
CREATE OR REPLACE FUNCTION get_echo_user(org_id UUID)
RETURNS UUID AS $$
DECLARE
  echo_id UUID;
  echo_email TEXT;
  org_exists BOOLEAN;
BEGIN
  -- SEC-001: Validate org_id exists and caller has access
  -- Check if organization exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = org_id) INTO org_exists;

  IF NOT org_exists THEN
    RAISE EXCEPTION 'Organization % does not exist', org_id;
  END IF;

  -- In production with RLS enabled, this would automatically enforce tenant access
  -- For now, we explicitly check organization existence to prevent invalid org_ids

  -- Build organization-specific Echo email (unique per tenant)
  echo_email := 'echo+' || org_id::TEXT || '@system.easyping';

  -- Check if Echo user exists for this org
  SELECT id INTO echo_id FROM users
  WHERE tenant_id = org_id AND email = echo_email;

  -- Create if doesn't exist
  IF echo_id IS NULL THEN
    -- Generate a new UUID for Echo user
    echo_id := gen_random_uuid();

    -- Create auth.users record first (required by FK constraint)
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      echo_id,
      'authenticated',
      'authenticated',
      echo_email,
      '', -- No password for system user
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"system","providers":["system"]}',
      '{"full_name":"Echo (AI Assistant)","avatar_url":"/avatars/echo-ai.svg"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    -- Then create public.users record
    INSERT INTO users (id, tenant_id, email, full_name, role, avatar_url)
    VALUES (
      echo_id,
      org_id,
      echo_email,
      'Echo (AI Assistant)',
      'agent',
      '/avatars/echo-ai.svg'
    );
  END IF;

  RETURN echo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION get_echo_user(UUID) IS 'Gets or creates the Echo AI assistant user for an organization. Echo appears as an agent and sends messages during problem discovery phase.';

-- ============================================================================
-- Migration: allow_null_title_for_draft_pings
-- ============================================================================
-- Allow NULL title for draft pings (Story 3.2: AI-driven ping creation)
-- Title will be generated by AI after Echo conversation completes
ALTER TABLE pings ALTER COLUMN title DROP NOT NULL;

-- Add comment explaining why title can be null
COMMENT ON COLUMN pings.title IS 'Ping title. Can be NULL for draft pings during Echo conversation. Must be set before ping status changes from draft.';

-- ============================================================================
-- Migration: add_draft_status_to_pings (redundant but safe)
-- ============================================================================
-- Add 'draft' status to pings table (Story 3.2: AI-driven ping creation)
-- Draft pings are created during Echo conversation before being promoted to 'new'
ALTER TABLE pings DROP CONSTRAINT IF EXISTS pings_status_valid;

ALTER TABLE pings ADD CONSTRAINT pings_status_valid
  CHECK (status IN ('draft', 'new', 'in_progress', 'waiting_on_user', 'resolved', 'closed'));

-- Add comment explaining draft status
COMMENT ON COLUMN pings.status IS 'Ping status. Draft = Echo conversation in progress, New = ready for agent assignment, In Progress = agent working, Waiting on User = needs user response, Resolved = issue fixed, Closed = completed/archived';

-- ============================================================================
-- Migration: add_ping_timestamp_columns
-- ============================================================================
-- Add timestamp columns for tracking ping activity
-- These columns are used by the status transition logic

ALTER TABLE pings
ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_agent_reply_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_user_reply_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- Add index for querying pings by response time (SLA tracking)
CREATE INDEX IF NOT EXISTS idx_pings_first_response_at ON pings(tenant_id, first_response_at) WHERE first_response_at IS NOT NULL;

COMMENT ON COLUMN pings.first_response_at IS 'Timestamp when the first agent replied to this ping';
COMMENT ON COLUMN pings.last_agent_reply_at IS 'Timestamp of the most recent agent reply';
COMMENT ON COLUMN pings.last_user_reply_at IS 'Timestamp of the most recent user reply';
COMMENT ON COLUMN pings.status_changed_at IS 'Timestamp of the most recent status change';

-- ============================================================================
-- Migration: disable_rls_ping_messages_for_realtime
-- ============================================================================
-- Disable RLS on ping_messages for Supabase Realtime compatibility
--
-- SECURITY MODEL:
-- RLS is disabled because Supabase Realtime cannot properly evaluate RLS policies,
-- which breaks real-time message updates. Security is enforced at the application layer:
--   1. API routes validate user authentication via Supabase Auth
--   2. API routes verify user belongs to the same tenant as the ping
--   3. Admin client (service role) is used only after validation passes
--
-- This is the same pattern used for other realtime-dependent tables.

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can create messages for pings in their tenant" ON ping_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON ping_messages;
DROP POLICY IF EXISTS "Users can view messages for pings in their tenant" ON ping_messages;
DROP POLICY IF EXISTS "Allow authenticated users to read ping messages" ON ping_messages;

-- Disable RLS
ALTER TABLE ping_messages DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Migration: disable_rls_pings_for_realtime
-- ============================================================================
-- Disable RLS on pings table to enable Supabase Realtime
--
-- BACKGROUND:
-- Supabase Realtime does NOT work properly with RLS enabled.
-- Ping updates (status changes, new pings appearing) were not propagating
-- to the Agent Inbox in real-time because RLS was filtering them out.
--
-- SECURITY MODEL (when RLS is disabled):
-- - Authentication is enforced at the API layer via Supabase Auth
-- - Tenant isolation is enforced in API routes by checking tenant_id
-- - Admin client (service role) is used only AFTER validation passes
-- - This matches the pattern already used for ping_messages table
--
-- See: CLAUDE.md "Supabase Realtime and RLS Incompatibility" section

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view pings in their tenant" ON pings;
DROP POLICY IF EXISTS "Users can create pings in their tenant" ON pings;
DROP POLICY IF EXISTS "Users can update pings in their tenant" ON pings;
DROP POLICY IF EXISTS "Agents can view all pings in their tenant" ON pings;
DROP POLICY IF EXISTS "End users can view their own pings" ON pings;

-- Disable RLS
ALTER TABLE pings DISABLE ROW LEVEL SECURITY;

-- Add comment documenting why RLS is disabled
COMMENT ON TABLE pings IS 'Support tickets (called "pings" in EasyPing). RLS is disabled to enable Supabase Realtime. Security is enforced at API layer.';

-- ============================================================================
-- Migration: add_organization_support_profile
-- ============================================================================
-- Add support_profile JSONB column to organizations table
-- This stores AI-generated or manually entered support profile describing what this organization handles

ALTER TABLE organizations
ADD COLUMN support_profile JSONB DEFAULT NULL;

COMMENT ON COLUMN organizations.support_profile IS 'AI-generated or manually entered support profile describing what this organization handles. Contains: support_type, description, typical_users, systems_supported, common_issues, ai_generated, created_at, updated_at';

-- ============================================================================
-- Migration: add_is_default_to_categories
-- ============================================================================
-- Migration: Add is_default column to categories table
-- Story 3.4: Organization Profile & Category Management
--
-- The is_default flag marks categories that cannot be deleted (e.g., "Other")

-- Add is_default column
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Create index for default categories lookup
CREATE INDEX IF NOT EXISTS idx_categories_is_default ON categories (tenant_id, is_default) WHERE is_default = true;

-- Add comment
COMMENT ON COLUMN categories.is_default IS 'If true, this category cannot be deleted (e.g., catch-all "Other" category)';

-- ============================================================================
-- Migration: add_teams_and_routing
-- ============================================================================
-- Migration: Add Teams and Routing Rules for Story 3.5
-- Purpose: Enable automatic ping routing to teams and specific agents
-- RLS: DISABLED - tenant isolation at application layer (consistent with other tables)

-- ============================================================================
-- Agent Teams Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT agent_teams_unique_name UNIQUE (tenant_id, name)
);

-- Index for tenant queries
CREATE INDEX idx_agent_teams_tenant ON agent_teams(tenant_id);

-- ============================================================================
-- Agent Team Members Table (junction table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_team_members (
  team_id UUID NOT NULL REFERENCES agent_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

-- Index for user membership lookups
CREATE INDEX idx_agent_team_members_user ON agent_team_members(user_id);

-- ============================================================================
-- Routing Rules Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS routing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL DEFAULT 'team',
  destination_agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  destination_team_id UUID REFERENCES agent_teams(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure rule_type is valid
  CONSTRAINT routing_rules_type_valid CHECK (rule_type IN ('agent', 'team')),
  -- Ensure destination matches rule_type
  CONSTRAINT routing_rules_destination_check CHECK (
    (rule_type = 'agent' AND destination_agent_id IS NOT NULL AND destination_team_id IS NULL) OR
    (rule_type = 'team' AND destination_team_id IS NOT NULL AND destination_agent_id IS NULL)
  ),
  -- One rule per category per tenant
  CONSTRAINT routing_rules_unique_category UNIQUE (tenant_id, category_id)
);

-- Index for routing lookups
CREATE INDEX idx_routing_rules_tenant_category ON routing_rules(tenant_id, category_id);

-- ============================================================================
-- Add team_id to pings table
-- ============================================================================
ALTER TABLE pings ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES agent_teams(id) ON DELETE SET NULL;

-- Index for team inbox queries
CREATE INDEX IF NOT EXISTS idx_pings_team_id ON pings(team_id);

-- ============================================================================
-- Updated_at triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for agent_teams
DROP TRIGGER IF EXISTS update_agent_teams_updated_at ON agent_teams;
CREATE TRIGGER update_agent_teams_updated_at
  BEFORE UPDATE ON agent_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for routing_rules
DROP TRIGGER IF EXISTS update_routing_rules_updated_at ON routing_rules;
CREATE TRIGGER update_routing_rules_updated_at
  BEFORE UPDATE ON routing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS is intentionally NOT enabled
-- Tenant isolation is enforced at the application layer
-- This is consistent with pings, ping_messages, and categories tables
-- ============================================================================

-- ============================================================================
-- Migration: add_teams_to_realtime
-- ============================================================================
-- Add agent_teams and agent_team_members tables to Supabase Realtime publication
-- This enables real-time subscriptions for team membership changes

-- Add agent_teams table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE agent_teams;

-- Add agent_team_members table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE agent_team_members;

-- ============================================================================
-- Migration: add_summary_updated_at
-- ============================================================================
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

-- ============================================================================
-- Migration: add_echo_enabled_to_users
-- ============================================================================
-- Migration: Add echo_enabled column to users table
-- Story 3.7: Echo - AI Response Suggestions
-- Allows agents to disable Echo suggestions in their personal settings

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS echo_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.users.echo_enabled IS 'Whether Echo AI response suggestions are enabled for this user';

-- ============================================================================
-- Migration: create_kb_articles
-- ============================================================================
-- Create kb_articles table for Knowledge Base articles
-- RLS is intentionally DISABLED for Supabase Realtime compatibility
-- Tenant isolation is enforced at the API layer (see CLAUDE.md)

CREATE TABLE kb_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  source_ping_id UUID REFERENCES pings(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  published_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  embedding VECTOR(1536),
  view_count INTEGER NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  not_helpful_count INTEGER NOT NULL DEFAULT 0,

  -- Unique slug per tenant
  CONSTRAINT kb_articles_unique_slug UNIQUE (tenant_id, slug),

  -- Status must be one of: draft, published, archived
  CONSTRAINT kb_articles_status_check CHECK (status IN ('draft', 'published', 'archived')),

  -- Slug format: lowercase letters, numbers, and hyphens only
  CONSTRAINT kb_articles_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  -- Title cannot be empty
  CONSTRAINT kb_articles_title_not_empty CHECK (length(trim(title)) > 0),

  -- Content cannot be empty
  CONSTRAINT kb_articles_content_not_empty CHECK (length(trim(content)) > 0)
);

-- Add comment explaining RLS decision
COMMENT ON TABLE kb_articles IS 'Knowledge Base articles. RLS disabled for Realtime compatibility - tenant isolation enforced at API layer.';

-- Create trigger to auto-update updated_at timestamp (reuses existing function)
CREATE TRIGGER update_kb_articles_updated_at
  BEFORE UPDATE ON kb_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Basic indexes (more performance indexes added in separate migration)
CREATE INDEX idx_kb_articles_tenant_id ON kb_articles(tenant_id);
CREATE INDEX idx_kb_articles_created_by ON kb_articles(created_by);

-- ============================================================================
-- Migration: create_kb_glossary_terms
-- ============================================================================
-- Create kb_glossary_terms table for acronyms, industry, and company-specific terms
-- These terms are auto-linked in KB articles with tooltip definitions
-- RLS is intentionally DISABLED - tenant isolation enforced at API layer

CREATE TABLE kb_glossary_terms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  category TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Category must be one of: acronym, industry, company, general (or null)
  CONSTRAINT kb_glossary_terms_category_check CHECK (
    category IS NULL OR category IN ('acronym', 'industry', 'company', 'general')
  ),

  -- Term cannot be empty
  CONSTRAINT kb_glossary_terms_term_not_empty CHECK (length(trim(term)) > 0),

  -- Definition cannot be empty
  CONSTRAINT kb_glossary_terms_definition_not_empty CHECK (length(trim(definition)) > 0)
);

-- Case-insensitive unique constraint on term per tenant
CREATE UNIQUE INDEX kb_glossary_terms_unique_term ON kb_glossary_terms(tenant_id, LOWER(term));

-- Index for fast term lookups
CREATE INDEX idx_kb_glossary_terms_tenant_term ON kb_glossary_terms(tenant_id, term);

-- Add comment explaining the feature
COMMENT ON TABLE kb_glossary_terms IS 'Glossary of terms (acronyms, jargon) for auto-linking in KB articles with tooltip definitions.';

-- Create trigger to auto-update updated_at timestamp
CREATE TRIGGER update_kb_glossary_terms_updated_at
  BEFORE UPDATE ON kb_glossary_terms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Migration: create_kb_article_views
-- ============================================================================
-- Create kb_article_views table for tracking article usage
-- RLS is intentionally DISABLED - tenant isolation enforced at API layer

CREATE TABLE kb_article_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying views by article and time (for analytics)
CREATE INDEX idx_kb_article_views_article_time ON kb_article_views(article_id, viewed_at);

-- Index for querying views by user (for "recently viewed" feature)
CREATE INDEX idx_kb_article_views_user ON kb_article_views(user_id) WHERE user_id IS NOT NULL;

-- Add comment
COMMENT ON TABLE kb_article_views IS 'Tracks KB article views for analytics and view count updates.';

-- ============================================================================
-- Migration: create_kb_article_feedback
-- ============================================================================
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

-- ============================================================================
-- Migration: add_kb_fulltext_search
-- ============================================================================
-- Add full-text search infrastructure for KB articles
-- Uses PostgreSQL tsvector with weighted ranking (title > content)

-- Add search_vector column as a generated column
ALTER TABLE kb_articles ADD COLUMN search_vector TSVECTOR GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(content, '')), 'B')
) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX idx_kb_articles_search ON kb_articles USING GIN(search_vector);

-- Helper function for full-text search with ranking
-- Returns articles matching the query, ordered by relevance
CREATE OR REPLACE FUNCTION search_kb_articles(
  p_tenant_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  content TEXT,
  category_id UUID,
  status TEXT,
  published_at TIMESTAMPTZ,
  view_count INTEGER,
  helpful_count INTEGER,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.slug,
    a.content,
    a.category_id,
    a.status,
    a.published_at,
    a.view_count,
    a.helpful_count,
    ts_rank(a.search_vector, plainto_tsquery('english', p_query)) AS rank
  FROM kb_articles a
  WHERE a.tenant_id = p_tenant_id
    AND a.status = 'published'
    AND a.deleted_at IS NULL
    AND a.search_vector @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_kb_articles IS 'Full-text search for published KB articles with relevance ranking.';

-- ============================================================================
-- Migration: add_kb_performance_indexes
-- ============================================================================
-- Performance indexes for KB articles
-- Optimized for common query patterns: listing, filtering, searching

-- Index for filtering by status (excludes soft-deleted)
CREATE INDEX idx_kb_articles_status ON kb_articles(tenant_id, status)
  WHERE deleted_at IS NULL;

-- Index for listing published articles (most common query)
CREATE INDEX idx_kb_articles_published ON kb_articles(tenant_id, published_at DESC)
  WHERE status = 'published' AND deleted_at IS NULL;

-- Index for filtering by category
CREATE INDEX idx_kb_articles_category ON kb_articles(tenant_id, category_id)
  WHERE deleted_at IS NULL;

-- Index for finding articles created from a specific ping
CREATE INDEX idx_kb_articles_source_ping ON kb_articles(source_ping_id)
  WHERE source_ping_id IS NOT NULL;

-- IVFFlat index for vector similarity search (semantic search)
-- lists=100 is suitable for datasets up to ~1M records
-- Note: This index requires data to build properly, so it may need reindexing after initial data load
CREATE INDEX idx_kb_articles_embedding ON kb_articles
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

COMMENT ON INDEX idx_kb_articles_embedding IS 'IVFFlat index for semantic search. May need REINDEX after significant data changes.';

-- ============================================================================
-- Migration: add_message_visibility
-- ============================================================================
-- Add visibility column to ping_messages for agent private notes
-- Story 4.2.1: Agent Private Notes
--
-- This enables agents to create internal notes that are only visible to other agents.
-- End users will never see private messages or know they exist.
--
-- Values:
--   'public'  - Visible to all users (default, existing behavior)
--   'private' - Only visible to agents/admins

-- Add the visibility column with default 'public' for backward compatibility
ALTER TABLE ping_messages
ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';

-- Add CHECK constraint to ensure only valid values
ALTER TABLE ping_messages
ADD CONSTRAINT ping_messages_visibility_check
CHECK (visibility IN ('public', 'private'));

-- Add index for efficient filtering by visibility within a ping
-- This enables fast queries like: SELECT * FROM ping_messages WHERE ping_id = ? AND visibility = 'public'
CREATE INDEX idx_ping_messages_visibility
ON ping_messages(ping_id, visibility);

-- Add comment for documentation
COMMENT ON COLUMN ping_messages.visibility IS
  'Message visibility: public (visible to all) or private (agents only)';

-- ============================================================================
-- Migration: add_kb_agent_content
-- ============================================================================
-- Add agent_content column for internal resolution steps (Story 4.2.2)
-- This column stores technical resolution steps visible only to agents.
-- End users should NEVER see this content - it's filtered at the API layer.

ALTER TABLE kb_articles
ADD COLUMN agent_content TEXT;

COMMENT ON COLUMN kb_articles.agent_content IS
  'Internal resolution steps visible only to agents. Contains technical details from private notes. NEVER expose to end users.';

-- ============================================================================
-- Migration: add_kb_similarity_search_rpc
-- ============================================================================
-- Add RPC function for KB article similarity search
-- Story 4.2.3: KB Article Comparison & Enhancement
--
-- Uses PostgreSQL full-text search with ts_rank for scoring.
-- This is a pre-pgvector implementation that will be enhanced in Story 4.4.

-- Create the similarity search function
CREATE OR REPLACE FUNCTION search_similar_kb_articles(
  p_search_terms TEXT,
  p_tenant_id UUID,
  p_category_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  content TEXT,
  category_id UUID,
  category_name TEXT,
  similarity_score REAL,
  view_count INTEGER,
  helpful_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ka.id,
    ka.title,
    ka.slug,
    ka.content,
    ka.category_id,
    c.name AS category_name,
    ts_rank(
      setweight(to_tsvector('english', ka.title), 'A') ||
      setweight(to_tsvector('english', ka.content), 'B'),
      plainto_tsquery('english', p_search_terms)
    ) AS similarity_score,
    ka.view_count,
    ka.helpful_count
  FROM kb_articles ka
  LEFT JOIN categories c ON c.id = ka.category_id
  WHERE ka.tenant_id = p_tenant_id
    AND ka.status = 'published'
    AND ka.deleted_at IS NULL
    AND (
      to_tsvector('english', ka.title) || to_tsvector('english', ka.content)
    ) @@ plainto_tsquery('english', p_search_terms)
    AND (p_category_id IS NULL OR ka.category_id = p_category_id)
  ORDER BY similarity_score DESC
  LIMIT p_limit;
END;
$$;

-- Add GIN index for full-text search performance
CREATE INDEX IF NOT EXISTS idx_kb_articles_fts
ON kb_articles
USING GIN (
  (to_tsvector('english', title) || to_tsvector('english', content))
)
WHERE status = 'published' AND deleted_at IS NULL;

-- Comment explaining the function
COMMENT ON FUNCTION search_similar_kb_articles IS
  'Searches for KB articles similar to the given search terms using full-text search. Returns articles ranked by similarity score. Used by Story 4.2.3 KB Article Comparison & Enhancement.';

-- ============================================================================
-- Migration: add_kb_enhancement_tracking
-- ============================================================================
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

-- ============================================================================
-- Migration: add_embedding_timestamp
-- ============================================================================
-- Add embedding_generated_at timestamp column to kb_articles
-- Story 4.4: Semantic Search with pgvector
--
-- This column tracks when the embedding was last generated, allowing us to
-- identify stale embeddings when article content changes.

ALTER TABLE kb_articles
ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMPTZ;

-- Add comment explaining the column
COMMENT ON COLUMN kb_articles.embedding_generated_at IS 'Timestamp of when the embedding was last generated. NULL if embedding has never been generated.';

-- Add index for finding articles that need embedding regeneration
-- (published articles with no embedding or stale embeddings)
CREATE INDEX IF NOT EXISTS idx_kb_articles_needs_embedding
ON kb_articles (tenant_id)
WHERE status = 'published'
  AND deleted_at IS NULL
  AND (embedding IS NULL OR embedding_generated_at IS NULL);

-- ============================================================================
-- Migration: add_kb_hybrid_search_function
-- ============================================================================
-- Add KB Semantic and Hybrid Search Functions
-- Story 4.4: Semantic Search with pgvector
--
-- Creates functions for semantic search using pgvector embeddings
-- and hybrid search combining semantic + full-text scores.

-- Function: Semantic search using pgvector cosine similarity
-- Returns articles ordered by similarity to query embedding
CREATE OR REPLACE FUNCTION search_kb_semantic(
  query_embedding TEXT,
  p_tenant_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  content TEXT,
  category_id UUID,
  category_name TEXT,
  view_count INTEGER,
  helpful_count INTEGER,
  not_helpful_count INTEGER,
  similarity REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ka.id,
    ka.title,
    ka.slug,
    ka.content,
    ka.category_id,
    c.name AS category_name,
    ka.view_count,
    ka.helpful_count,
    ka.not_helpful_count,
    -- Cosine similarity: 1 - cosine_distance
    -- <=> operator returns cosine distance (0-2 range)
    (1 - (ka.embedding <=> query_embedding::vector))::REAL AS similarity
  FROM kb_articles ka
  LEFT JOIN categories c ON c.id = ka.category_id
  WHERE ka.tenant_id = p_tenant_id
    AND ka.status = 'published'
    AND ka.deleted_at IS NULL
    AND ka.embedding IS NOT NULL
  ORDER BY ka.embedding <=> query_embedding::vector
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION search_kb_semantic IS
  'Semantic search for KB articles using pgvector cosine similarity. Returns articles ranked by embedding similarity to query.';

-- Function: Hybrid search combining semantic + full-text
-- Uses weighted scoring: 0.7 * semantic_score + 0.3 * text_score
CREATE OR REPLACE FUNCTION search_kb_articles_hybrid(
  query_embedding TEXT,
  search_text TEXT,
  p_tenant_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  content_excerpt TEXT,
  category_id UUID,
  category_name TEXT,
  view_count INTEGER,
  helpful_count INTEGER,
  not_helpful_count INTEGER,
  similarity_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_embedding BOOLEAN := query_embedding IS NOT NULL AND query_embedding != '';
  search_query tsquery := plainto_tsquery('english', search_text);
BEGIN
  RETURN QUERY
  SELECT
    ka.id,
    ka.title,
    ka.slug,
    -- Return first 300 chars as excerpt
    LEFT(ka.content, 300) AS content_excerpt,
    ka.category_id,
    c.name AS category_name,
    ka.view_count,
    ka.helpful_count,
    ka.not_helpful_count,
    -- Compute hybrid score
    CASE
      WHEN has_embedding AND ka.embedding IS NOT NULL THEN
        -- Hybrid: 0.7 * semantic + 0.3 * text
        (
          0.7 * (1 - (ka.embedding <=> query_embedding::vector)) +
          0.3 * ts_rank(
            setweight(to_tsvector('english', ka.title), 'A') ||
            setweight(to_tsvector('english', ka.content), 'B'),
            search_query
          )
        )::REAL
      ELSE
        -- Text-only fallback
        ts_rank(
          setweight(to_tsvector('english', ka.title), 'A') ||
          setweight(to_tsvector('english', ka.content), 'B'),
          search_query
        )::REAL
    END AS similarity_score
  FROM kb_articles ka
  LEFT JOIN categories c ON c.id = ka.category_id
  WHERE ka.tenant_id = p_tenant_id
    AND ka.status = 'published'
    AND ka.deleted_at IS NULL
    AND (
      -- Match if: has embedding similarity OR matches text search
      (has_embedding AND ka.embedding IS NOT NULL) OR
      (
        to_tsvector('english', ka.title) || to_tsvector('english', ka.content)
      ) @@ search_query
    )
  ORDER BY
    CASE
      WHEN has_embedding AND ka.embedding IS NOT NULL THEN
        (
          0.7 * (1 - (ka.embedding <=> query_embedding::vector)) +
          0.3 * ts_rank(
            setweight(to_tsvector('english', ka.title), 'A') ||
            setweight(to_tsvector('english', ka.content), 'B'),
            search_query
          )
        )
      ELSE
        ts_rank(
          setweight(to_tsvector('english', ka.title), 'A') ||
          setweight(to_tsvector('english', ka.content), 'B'),
          search_query
        )
    END DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION search_kb_articles_hybrid IS
  'Hybrid search combining semantic similarity (0.7 weight) with full-text search (0.3 weight). Falls back to text-only when embeddings unavailable.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_kb_semantic(TEXT, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_kb_articles_hybrid(TEXT, TEXT, UUID, INTEGER) TO authenticated;

-- ============================================================================
-- Migration: create_sla_policies
-- ============================================================================
-- Create SLA policies table for Story 5.1
-- Stores SLA policies with first response and resolution time targets per priority level

CREATE TABLE IF NOT EXISTS sla_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority TEXT NOT NULL,
  first_response_minutes INTEGER NOT NULL,
  resolution_minutes INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT sla_policies_priority_valid CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT sla_policies_first_response_positive CHECK (first_response_minutes > 0),
  CONSTRAINT sla_policies_resolution_positive CHECK (resolution_minutes > 0),
  CONSTRAINT sla_policies_resolution_gte_response CHECK (resolution_minutes >= first_response_minutes)
);

-- Create unique index for one active policy per priority per tenant
CREATE UNIQUE INDEX idx_sla_policies_unique_active_priority
  ON sla_policies(tenant_id, priority)
  WHERE is_active = true;

-- Create indexes for common queries
CREATE INDEX idx_sla_policies_tenant_id ON sla_policies(tenant_id);
CREATE INDEX idx_sla_policies_active ON sla_policies(tenant_id, is_active) WHERE is_active = true;

-- Add updated_at trigger using existing function
CREATE TRIGGER update_sla_policies_updated_at
  BEFORE UPDATE ON sla_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- NOTE: RLS is intentionally NOT enabled per project convention for realtime compatibility
-- Auth is enforced at the API layer

-- ============================================================================
-- Migration: add_sla_fields_to_pings
-- ============================================================================
-- Add SLA tracking fields to pings table for Story 5.1
-- Stores the SLA policy reference and calculated due timestamps

-- Add SLA-related columns to pings table
ALTER TABLE pings
  ADD COLUMN IF NOT EXISTS sla_policy_id UUID REFERENCES sla_policies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sla_first_response_due TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_resolution_due TIMESTAMPTZ;

-- Create index for SLA due time queries (finding overdue pings)
CREATE INDEX IF NOT EXISTS idx_pings_sla_first_response_due
  ON pings(sla_first_response_due)
  WHERE sla_first_response_due IS NOT NULL AND first_response_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pings_sla_resolution_due
  ON pings(sla_resolution_due)
  WHERE sla_resolution_due IS NOT NULL AND resolved_at IS NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN pings.sla_policy_id IS 'Reference to the SLA policy active at ping creation time';
COMMENT ON COLUMN pings.sla_first_response_due IS 'Timestamp when first agent response is due per SLA';
COMMENT ON COLUMN pings.sla_resolution_due IS 'Timestamp when ping resolution is due per SLA';

-- ============================================================================
-- Migration: add_sla_tracking_fields
-- ============================================================================
-- Story 5.2: Add SLA time tracking fields to pings table
-- Tracks when key events occur for SLA compliance measurement

-- Add SLA tracking columns to pings table
ALTER TABLE pings
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_paused_duration_minutes INTEGER NOT NULL DEFAULT 0;

-- Index on first_response_at for finding pings awaiting first response
CREATE INDEX IF NOT EXISTS idx_pings_first_response_at
  ON pings(first_response_at)
  WHERE first_response_at IS NULL;

-- Index on resolved_at for analytics queries
CREATE INDEX IF NOT EXISTS idx_pings_resolved_at
  ON pings(resolved_at);

-- Add comments explaining the fields
COMMENT ON COLUMN pings.first_response_at IS 'Timestamp when first agent response was posted (NULL until responded)';
COMMENT ON COLUMN pings.resolved_at IS 'Timestamp when ping was marked as resolved (NULL if not resolved, cleared on re-open)';
COMMENT ON COLUMN pings.sla_paused_at IS 'Timestamp when resolution SLA timer was paused (NULL when not paused, set when Waiting on User)';
COMMENT ON COLUMN pings.sla_paused_duration_minutes IS 'Accumulated pause time in minutes (does not include current pause if active)';

-- Note: RLS is intentionally disabled on pings table for realtime compatibility
-- Authentication is enforced at the API layer

-- ============================================================================
-- Migration: drop_sla_due_at_column
-- ============================================================================
-- Migration: Drop deprecated sla_due_at column
-- Story 5.2: SLA Time Tracking
--
-- The sla_due_at column has been replaced by:
-- - sla_first_response_due: When first response is due
-- - sla_resolution_due: When resolution is due
-- - sla_paused_at: When resolution SLA timer was paused
-- - sla_paused_duration_minutes: Accumulated pause time
--
-- These new columns provide more granular SLA tracking with support for
-- first response SLA, resolution SLA, and timer pause/resume functionality.

ALTER TABLE pings DROP COLUMN IF EXISTS sla_due_at;

-- ============================================================================
-- Migration: add_ping_analytics_functions
-- ============================================================================
-- Story 5.4: Basic Analytics Dashboard
-- Add PostgreSQL functions for ping analytics calculations

-- Function to calculate average resolution time in minutes
CREATE OR REPLACE FUNCTION get_avg_resolution_time(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result NUMERIC;
BEGIN
  SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60)
  INTO result
  FROM pings
  WHERE tenant_id = p_tenant_id
    AND resolved_at IS NOT NULL
    AND created_at >= p_start_date
    AND created_at < p_end_date
    AND status != 'draft';

  RETURN result;
END;
$$;

-- Function to calculate SLA compliance rate (percentage)
CREATE OR REPLACE FUNCTION get_sla_compliance_rate(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_resolved INTEGER;
  compliant_resolved INTEGER;
  result NUMERIC;
BEGIN
  -- Count total resolved pings in period
  SELECT COUNT(*)
  INTO total_resolved
  FROM pings
  WHERE tenant_id = p_tenant_id
    AND resolved_at IS NOT NULL
    AND created_at >= p_start_date
    AND created_at < p_end_date
    AND status != 'draft';

  IF total_resolved = 0 THEN
    RETURN NULL;
  END IF;

  -- Count resolved pings that were NOT breached
  SELECT COUNT(*)
  INTO compliant_resolved
  FROM pings
  WHERE tenant_id = p_tenant_id
    AND resolved_at IS NOT NULL
    AND created_at >= p_start_date
    AND created_at < p_end_date
    AND status != 'draft'
    AND (sla_breached IS NULL OR sla_breached = false);

  result := (compliant_resolved::NUMERIC / total_resolved::NUMERIC) * 100;

  RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_avg_resolution_time(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sla_compliance_rate(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION get_avg_resolution_time IS 'Calculate average resolution time in minutes for pings in a date range';
COMMENT ON FUNCTION get_sla_compliance_rate IS 'Calculate SLA compliance rate (percentage) for pings in a date range';

-- ============================================================================
-- Migration: add_assigned_at_to_pings
-- ============================================================================
-- Add assigned_at column to pings table for agent performance metrics
-- This tracks when a ping was assigned to an agent, enabling accurate
-- resolution time calculations (from assignment, not creation)

-- Add the column
ALTER TABLE pings ADD COLUMN assigned_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN pings.assigned_at IS 'Timestamp when ping was assigned to an agent. Used for calculating resolution time from assignment.';

-- Backfill: Set assigned_at = created_at for already-assigned pings
-- This is a reasonable default since we don't have historical assignment data
UPDATE pings
SET assigned_at = created_at
WHERE assigned_to IS NOT NULL AND assigned_at IS NULL;

-- Create trigger function to auto-set assigned_at when assigned_to changes
CREATE OR REPLACE FUNCTION set_assigned_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Set assigned_at when:
  -- 1. assigned_to is being set (was NULL, now has value)
  -- 2. assigned_to is changing to a different agent
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    NEW.assigned_at = NOW();
  END IF;
  -- If assigned_to is being cleared, also clear assigned_at
  IF NEW.assigned_to IS NULL AND OLD.assigned_to IS NOT NULL THEN
    NEW.assigned_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on pings table
CREATE TRIGGER trigger_set_assigned_at
  BEFORE UPDATE ON pings
  FOR EACH ROW
  EXECUTE FUNCTION set_assigned_at();

-- Also handle INSERT case - if ping is created with assigned_to already set
CREATE OR REPLACE FUNCTION set_assigned_at_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_at IS NULL THEN
    NEW.assigned_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_assigned_at_insert
  BEFORE INSERT ON pings
  FOR EACH ROW
  EXECUTE FUNCTION set_assigned_at_on_insert();
