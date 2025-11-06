import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with service role privileges
 * This bypasses Row Level Security (RLS) policies
 *
 * ⚠️ SECURITY WARNING:
 * Only use this in secure server-side contexts (API routes, Server Actions)
 * Never expose the service role key to the client
 * Always validate user authentication before using this client
 */
export function createAdminClient() {
  // Use internal SUPABASE_URL for server-side requests (Docker environment)
  // Falls back to NEXT_PUBLIC_SUPABASE_URL for local development
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables. Ensure SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
