import { NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/auth/helpers';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/users - Get all users in the organization
 * Only accessible by owners
 */
export async function GET() {
  try {
    const userProfile = await getUserProfile();

    if (!userProfile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only owners can view all users
    if (userProfile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can view users' },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();
    const { data: users, error } = await adminClient
      .from('users')
      .select(
        'id, email, full_name, avatar_url, role, created_at, last_seen_at'
      )
      .eq('tenant_id', userProfile.tenant_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    return NextResponse.json(users || []);
  } catch (error) {
    console.error('Error in GET /api/users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
