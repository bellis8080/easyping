import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = async () => {
  const cookieStore = await cookies();

  // Use NEXT_PUBLIC_SUPABASE_URL for cookie storage key consistency
  // but rewrite fetch requests to use internal SUPABASE_URL for Docker networking
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const internalUrl = process.env.SUPABASE_URL || publicUrl;

  return createServerClient(
    publicUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      global: {
        fetch: async (url, options) => {
          // Rewrite public URL to internal URL for Docker networking
          const urlStr = url.toString();
          const rewrittenUrl = urlStr.replace(publicUrl, internalUrl);
          return fetch(rewrittenUrl, options);
        },
      },
    }
  );
};
