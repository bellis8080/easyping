import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserRole } from '@easyping/types';
import { canAssignRole } from '@/lib/auth/permissions';

// Request body validation schema
const updateRoleSchema = z.object({
  role: z.enum(['end_user', 'agent', 'manager', 'owner']),
});

// Rate limiting map (in-memory for now)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params;

    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    if (!checkRateLimit(currentUser.id)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // 2. Get current user's profile with role and tenant_id
    const adminClient = createAdminClient();
    const { data: currentUserProfile, error: currentProfileError } =
      await adminClient
        .from('users')
        .select('role, tenant_id')
        .eq('id', currentUser.id)
        .single();

    if (currentProfileError || !currentUserProfile) {
      return NextResponse.json(
        { error: 'Failed to load user profile' },
        { status: 500 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const validation = updateRoleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid role value', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { role: newRole } = validation.data;

    // 4. Check if current user can assign this role
    const currentUserRole = currentUserProfile.role as UserRole;
    if (!canAssignRole(currentUserRole, newRole as UserRole)) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions to assign this role',
          details: `Only ${currentUserRole === 'owner' ? 'owners' : 'higher-level users'} can assign this role`,
        },
        { status: 403 }
      );
    }

    // 5. Get target user profile
    const { data: targetUserProfile, error: targetProfileError } =
      await adminClient
        .from('users')
        .select('id, email, full_name, role, tenant_id')
        .eq('id', targetUserId)
        .single();

    if (targetProfileError || !targetUserProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 6. Verify target user belongs to same organization
    if (targetUserProfile.tenant_id !== currentUserProfile.tenant_id) {
      return NextResponse.json(
        { error: 'Cannot modify users from different organizations' },
        { status: 403 }
      );
    }

    // 7. Prevent changing the role of the first user (owner protection)
    // Get the first user in the organization
    const { data: firstUser } = await adminClient
      .from('users')
      .select('id')
      .eq('tenant_id', currentUserProfile.tenant_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (firstUser && firstUser.id === targetUserId) {
      return NextResponse.json(
        {
          error: 'Cannot change the role of the organization owner',
          details:
            'The first user in an organization must remain as owner for security reasons',
        },
        { status: 403 }
      );
    }

    // 8. Update user role in database
    const { data: updatedUser, error: updateError } = await adminClient
      .from('users')
      .update({ role: newRole })
      .eq('id', targetUserId)
      .select(
        'id, email, full_name, avatar_url, role, created_at, last_seen_at'
      )
      .single();

    if (updateError || !updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update user role', details: updateError?.message },
        { status: 500 }
      );
    }

    // 9. Return updated user profile
    return NextResponse.json(
      {
        message: 'Role updated successfully',
        user: updatedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PATCH /api/users/[userId]/role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
