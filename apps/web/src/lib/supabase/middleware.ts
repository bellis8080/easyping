import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  // Use NEXT_PUBLIC_SUPABASE_URL for cookie storage key consistency
  // Browser client uses this URL, so middleware must use the same URL to read cookies
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const internalUrl = process.env.SUPABASE_URL || publicUrl;

  const supabase = createServerClient(
    publicUrl, // Use public URL for cookie key consistency
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
      global: {
        fetch: async (url, options) => {
          // Rewrite public URL to internal URL for Docker networking
          const urlStr = url.toString();
          const rewrittenUrl = urlStr.replace(publicUrl, internalUrl);

          // Ensure Accept header is set for PostgREST
          const headers = new Headers(options?.headers);
          if (!headers.has('Accept')) {
            headers.set('Accept', 'application/json');
          }

          return fetch(rewrittenUrl, {
            ...options,
            headers,
          });
        },
      },
    }
  );

  // Refresh session automatically - this also validates the session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // If authenticated, set tenant context for RLS policies
  if (user && !authError) {
    // Always set x-user-id from the GoTrue identity so that protected-route
    // checks in the outer middleware work even when the public.users profile
    // lookup below fails (e.g. right after a partial setup).
    response.headers.set('x-user-id', user.id);

    try {
      // Create admin client to bypass RLS for initial tenant_id lookup
      // This is necessary because we need the tenant_id to SET the tenant context
      // Use internal URL for server-to-server API calls
      const adminClient = createClient(
        internalUrl,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      // Fetch user's tenant_id and role from users table using admin client
      const { data: userProfile, error: profileError } = await adminClient
        .from('users')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

      if (!profileError && userProfile) {
        // Set tenant context for RLS policies
        await supabase.rpc('set_tenant_context', {
          tenant_uuid: userProfile.tenant_id,
        });

        // Add tenant ID and role to response headers for middleware consumption
        response.headers.set('x-tenant-id', userProfile.tenant_id);
        response.headers.set('x-user-role', userProfile.role);
      }
    } catch (error) {
      console.error('Error setting tenant context:', error);
    }
  }

  return response;
}
