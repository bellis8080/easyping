import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
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
    }
  );

  // Refresh session automatically - this also validates the session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // If authenticated, set tenant context for RLS policies
  if (user && !authError) {
    try {
      // Create admin client to bypass RLS for initial tenant_id lookup
      // This is necessary because we need the tenant_id to SET the tenant context
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
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

        // Add user ID, tenant ID, and role to response headers for middleware consumption
        response.headers.set('x-user-id', user.id);
        response.headers.set('x-tenant-id', userProfile.tenant_id);
        response.headers.set('x-user-role', userProfile.role);
      }
    } catch (error) {
      console.error('Error setting tenant context:', error);
    }
  }

  return response;
}
