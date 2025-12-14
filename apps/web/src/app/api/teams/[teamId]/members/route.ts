/**
 * GET/POST/DELETE /api/teams/[teamId]/members
 * Story 3.5: Team Member Management
 *
 * GET: List team members.
 * POST: Add agent to team (manager/owner only).
 * DELETE: Remove agent from team (manager/owner only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteParams {
  params: Promise<{ teamId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id
    const adminClient = createAdminClient();
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify team exists and belongs to tenant
    const { data: team, error: teamError } = await adminClient
      .from('agent_teams')
      .select('id')
      .eq('id', teamId)
      .eq('tenant_id', userData.tenant_id)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Fetch members
    const { data: members, error: membersError } = await adminClient
      .from('agent_team_members')
      .select(
        `
        user_id,
        added_at,
        users(id, full_name, email, avatar_url, role)
      `
      )
      .eq('team_id', teamId);

    if (membersError) {
      console.error('Error fetching team members:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      );
    }

    // Format response
    const formattedMembers = members.map((m) => ({
      ...m.users,
      added_at: m.added_at,
    }));

    return NextResponse.json(formattedMembers);
  } catch (error) {
    console.error('Unexpected error fetching team members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id and role
    const adminClient = createAdminClient();
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only managers and owners can add members
    if (userData.role !== 'owner' && userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only managers and owners can manage team members' },
        { status: 403 }
      );
    }

    // Verify team exists and belongs to tenant
    const { data: team, error: teamError } = await adminClient
      .from('agent_teams')
      .select('id')
      .eq('id', teamId)
      .eq('tenant_id', userData.tenant_id)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Verify user exists and is an agent in the same tenant
    const { data: targetUser, error: targetUserError } = await adminClient
      .from('users')
      .select('id, full_name, email, avatar_url, role')
      .eq('id', user_id)
      .eq('tenant_id', userData.tenant_id)
      .single();

    if (targetUserError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is already a member
    const { data: existingMember, error: existingError } = await adminClient
      .from('agent_team_members')
      .select('team_id')
      .eq('team_id', teamId)
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing member:', existingError);
      return NextResponse.json(
        { error: 'Failed to check membership' },
        { status: 500 }
      );
    }

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this team' },
        { status: 400 }
      );
    }

    // Add member
    const { error: insertError } = await adminClient
      .from('agent_team_members')
      .insert({
        team_id: teamId,
        user_id: user_id,
      });

    if (insertError) {
      console.error('Error adding team member:', insertError);
      return NextResponse.json(
        { error: 'Failed to add team member' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ...targetUser, added_at: new Date().toISOString() },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error adding team member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const supabase = await createClient();

    // Get user_id from query params
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id query parameter is required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id and role
    const adminClient = createAdminClient();
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only managers and owners can remove members
    if (userData.role !== 'owner' && userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only managers and owners can manage team members' },
        { status: 403 }
      );
    }

    // Verify team exists and belongs to tenant
    const { data: team, error: teamError } = await adminClient
      .from('agent_teams')
      .select('id')
      .eq('id', teamId)
      .eq('tenant_id', userData.tenant_id)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if membership exists
    const { data: membership, error: membershipError } = await adminClient
      .from('agent_team_members')
      .select('team_id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .maybeSingle();

    if (membershipError) {
      console.error('Error checking membership:', membershipError);
      return NextResponse.json(
        { error: 'Failed to check membership' },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: 'User is not a member of this team' },
        { status: 404 }
      );
    }

    // Remove member
    const { error: deleteError } = await adminClient
      .from('agent_team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error removing team member:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove team member' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error removing team member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
