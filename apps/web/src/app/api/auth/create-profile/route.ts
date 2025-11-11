import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    // Use regular client to validate authentication
    const supabase = await createClient();

    // Get current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client for database operations (bypasses RLS)
    const adminClient = createAdminClient();

    // Check if user profile already exists
    const { data: existingProfile, error: checkError } = await adminClient
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    // Only treat as error if there's an actual error code (not just empty object)
    if (checkError && checkError.code && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected
      return NextResponse.json(
        { error: `Check failed: ${checkError.message}` },
        { status: 500 }
      );
    }

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Profile already exists' },
        { status: 400 }
      );
    }

    // Get request body (optional - can override defaults)
    const body = await request.json().catch(() => ({}));
    const { full_name, avatar_url } = body;

    // Get the first organization (for multi-user signup after setup)
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'No organization found. Please complete setup first.' },
        { status: 400 }
      );
    }

    // Check if this is the first user in the organization (becomes owner)
    const { count, error: countError } = await adminClient
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json(
        { error: `Count failed: ${countError.message}` },
        { status: 500 }
      );
    }

    const role = count === 0 ? 'owner' : 'end_user';

    // Create user profile
    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .insert({
        id: user.id,
        tenant_id: org.id,
        email: user.email!,
        full_name:
          full_name ||
          user.user_metadata.full_name ||
          user.email!.split('@')[0],
        avatar_url: avatar_url || user.user_metadata.avatar_url || null,
        role,
      })
      .select()
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error('Profile creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
