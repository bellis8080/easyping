import { NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/auth/helpers';

/**
 * GET /api/user - Get current user profile
 */
export async function GET() {
  try {
    const userProfile = await getUserProfile();

    if (!userProfile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({
      id: userProfile.id,
      email: userProfile.email,
      full_name: userProfile.full_name,
      role: userProfile.role,
      tenant_id: userProfile.tenant_id,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}
