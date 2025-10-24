import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Default organization UUID from Story 1.2
const DEFAULT_ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

export async function POST(request: NextRequest) {
  try {
    // Use regular client to validate authentication
    const supabase = await createClient();

    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use admin client for database operations (bypasses RLS)
    const adminClient = createAdminClient();

    // Check if user profile already exists
    const { data: existingProfile } = await adminClient
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Profile already exists' },
        { status: 400 }
      );
    }

    // Get request body (optional - can override defaults)
    const body = await request.json().catch(() => ({}));
    const { full_name, avatar_url } = body;

    // Check if this is the first user in the organization (becomes owner)
    const { count } = await adminClient
      .from('users')
      .select('*', { count: 'exact', head: true });

    const role = count === 0 ? 'owner' : 'end_user';

    // Create user profile
    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .insert({
        id: user.id,
        tenant_id: DEFAULT_ORG_ID,
        email: user.email!,
        full_name: full_name || user.user_metadata.full_name || user.email!.split('@')[0],
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
