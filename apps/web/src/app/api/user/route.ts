import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getUserProfile } from '@/lib/auth/helpers';

/**
 * GET /api/user - Get current user profile
 *
 * Uses the admin client (via getUserProfile) to bypass RLS and retrieve the
 * full user row, including echo_enabled and avatar_url.  A previous version
 * made a second PostgREST query with the user-scoped SSR client to fetch those
 * two extra columns; that extra hop was both unnecessary (getUserProfile already
 * selects '*') and a potential failure point when the SSR client's cookie-based
 * auth wasn't recognised by PostgREST (e.g. right after setup before the
 * session cookie is fully established).
 */
export async function GET() {
  try {
    const userProfile = await getUserProfile();

    if (!userProfile) {
      console.warn('GET /api/user: No user profile found (unauthenticated or profile missing)');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({
      id: userProfile.id,
      email: userProfile.email,
      full_name: userProfile.full_name,
      role: userProfile.role,
      tenant_id: userProfile.tenant_id,
      avatar_url: userProfile.avatar_url || null,
      echo_enabled: userProfile.echo_enabled ?? true,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user - Update current user profile
 * Story 3.7: Allows users to update their echo_enabled preference
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { echo_enabled, full_name } = body;

    // Build update object with only provided fields
    const updates: Record<string, any> = {};
    if (typeof echo_enabled === 'boolean') {
      updates.echo_enabled = echo_enabled;
    }
    if (typeof full_name === 'string' && full_name.trim()) {
      updates.full_name = full_name.trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Use service client to update user (admin client bypasses RLS)
    const supabaseAdmin = createServiceClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select('id, email, full_name, role, tenant_id, avatar_url, echo_enabled')
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
