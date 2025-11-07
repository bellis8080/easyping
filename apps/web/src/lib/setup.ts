import { createClient } from '@supabase/supabase-js';

/**
 * Checks if initial setup has been completed by verifying if any organizations exist.
 *
 * @returns Promise<boolean> - true if setup is complete (org exists), false otherwise
 */
export async function isSetupComplete(): Promise<boolean> {
  // Use internal URL for server-side operations, fall back to public URL for client-side
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables for setup check');
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { count, error } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error checking setup completion:', error);
      return false;
    }

    return (count ?? 0) > 0;
  } catch (error) {
    console.error('Exception checking setup completion:', error);
    return false;
  }
}
