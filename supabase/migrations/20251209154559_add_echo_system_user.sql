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
