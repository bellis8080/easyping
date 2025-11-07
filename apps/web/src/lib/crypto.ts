import { createClient } from '@supabase/supabase-js';

/**
 * Encrypts plaintext using PostgreSQL pgcrypto AES-256 symmetric encryption.
 *
 * @param plaintext - The text to encrypt
 * @returns Promise<string> - Base64 encoded encrypted data
 * @throws Error if ENCRYPTION_KEY is not set or encryption fails
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }

  // Use internal URL for server-side operations, fall back to public URL for client-side
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase.rpc('encrypt_data', {
    data: plaintext,
    key: key,
  });

  if (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }

  return data as string;
}

/**
 * Decrypts encrypted data using PostgreSQL pgcrypto.
 *
 * @param encryptedData - Base64 encoded encrypted data
 * @returns Promise<string> - Decrypted plaintext
 * @throws Error if ENCRYPTION_KEY is not set or decryption fails
 */
export async function decrypt(encryptedData: string): Promise<string> {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }

  // Use internal URL for server-side operations, fall back to public URL for client-side
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase.rpc('decrypt_data', {
    encrypted_data: encryptedData,
    key: key,
  });

  if (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }

  return data as string;
}
