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
