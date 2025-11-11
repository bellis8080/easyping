-- Add encryption functions using pgcrypto for AI API key storage
-- Story 1.6: First-Run Setup Wizard

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt data using AES-256 symmetric encryption
CREATE OR REPLACE FUNCTION public.encrypt_data(data TEXT, key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(pgp_sym_encrypt(data, key), 'base64');
END;
$$;

-- Decrypt data
CREATE OR REPLACE FUNCTION public.decrypt_data(encrypted_data TEXT, key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN pgp_sym_decrypt(decode(encrypted_data, 'base64'), key);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Decryption failed: %', SQLERRM;
END;
$$;

-- Grant execute permissions to roles
GRANT EXECUTE ON FUNCTION public.encrypt_data(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_data(TEXT, TEXT) TO authenticated, service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.encrypt_data IS 'Encrypts sensitive data using AES-256 symmetric encryption via pgcrypto';
COMMENT ON FUNCTION public.decrypt_data IS 'Decrypts data encrypted with encrypt_data function';
