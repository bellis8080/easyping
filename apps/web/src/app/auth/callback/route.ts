import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * OAuth Callback Route Handler
 *
 * This route handles the OAuth callback from providers like Google.
 * After the user authorizes the app, the provider redirects here with a code.
 * We exchange the code for a session and create a user profile if needed.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();

    // Create service role client for bypassing RLS when creating user profiles
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Exchange the code for a session
    const { data: sessionData, error: sessionError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error('OAuth session exchange error:', sessionError);
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }

    if (!sessionData.user) {
      console.error('No user in session after OAuth exchange');
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }

    const user = sessionData.user;

    // Check if user profile exists in database (use admin client to bypass RLS)
    const { data: existingProfile, error: profileCheckError } =
      await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

    if (profileCheckError) {
      console.error('Error checking user profile:', profileCheckError);
    }

    // If no profile exists, create one
    if (!existingProfile) {
      // Extract user data from OAuth provider
      const email = user.email || '';
      const full_name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        email.split('@')[0];
      const avatar_url =
        user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

      // Get default organization UUID (use admin client to bypass RLS)
      const { data: defaultOrg, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('domain', 'localhost')
        .single();

      if (orgError || !defaultOrg) {
        console.error('Error fetching default organization:', orgError);
        return NextResponse.redirect(`${origin}/login?error=org_not_found`);
      }

      // Check if this is the first user in the organization (should be owner)
      const { data: existingUsers, error: usersCheckError } =
        await supabaseAdmin
          .from('users')
          .select('id')
          .eq('tenant_id', defaultOrg.id)
          .limit(1);

      if (usersCheckError) {
        console.error('Error checking existing users:', usersCheckError);
      }

      const role =
        existingUsers && existingUsers.length === 0 ? 'owner' : 'end_user';

      // Create user profile (use admin client to bypass RLS)
      const { error: createError } = await supabaseAdmin.from('users').insert({
        id: user.id,
        tenant_id: defaultOrg.id,
        email,
        full_name,
        avatar_url,
        role,
      });

      if (createError) {
        console.error('Error creating user profile:', createError);
        return NextResponse.redirect(
          `${origin}/login?error=profile_creation_failed`
        );
      }
    }

    // Redirect to dashboard after successful OAuth login
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // No code parameter, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=oauth_code_missing`);
}
