/**
 * GET/PUT/DELETE /api/teams/[teamId]
 * Story 3.5: Team Management
 *
 * GET: Returns single team with members.
 * PUT: Updates team name/description (manager/owner only).
 * DELETE: Deletes team (manager/owner only). Auto-removes members, unassigns pings, deletes routing rules.
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

    // Fetch team
    const { data: team, error: teamError } = await adminClient
      .from('agent_teams')
      .select('*')
      .eq('id', teamId)
      .eq('tenant_id', userData.tenant_id)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check access: agents must be members, managers/owners can access any team
    const isManagerOrOwner =
      userData.role === 'owner' || userData.role === 'manager';

    if (!isManagerOrOwner) {
      const { data: membership, error: memberError } = await adminClient
        .from('agent_team_members')
        .select('team_id')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) {
        console.error('Error checking membership:', memberError);
        return NextResponse.json(
          { error: 'Failed to check team access' },
          { status: 500 }
        );
      }

      if (!membership) {
        return NextResponse.json(
          { error: "You don't have access to this team" },
          { status: 403 }
        );
      }
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

    const teamWithMembers = {
      ...team,
      members: members.map((m) => m.users).filter(Boolean),
      member_count: members.length,
    };

    return NextResponse.json(teamWithMembers);
  } catch (error) {
    console.error('Unexpected error fetching team:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Only managers and owners can update teams
    if (userData.role !== 'owner' && userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only managers and owners can update teams' },
        { status: 403 }
      );
    }

    // Verify team exists and belongs to tenant
    const { data: existingTeam, error: teamError } = await adminClient
      .from('agent_teams')
      .select('id')
      .eq('id', teamId)
      .eq('tenant_id', userData.tenant_id)
      .single();

    if (teamError || !existingTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description } = body;

    // Build update object
    const updates: Record<string, string | null> = {};

    if (name !== undefined) {
      if (!name?.trim()) {
        return NextResponse.json(
          { error: 'Team name is required' },
          { status: 400 }
        );
      }

      if (name.trim().length > 50) {
        return NextResponse.json(
          { error: 'Team name must be 50 characters or less' },
          { status: 400 }
        );
      }

      // Check for duplicate name (exclude current team)
      const { data: duplicate, error: dupError } = await adminClient
        .from('agent_teams')
        .select('id')
        .eq('tenant_id', userData.tenant_id)
        .eq('name', name.trim())
        .neq('id', teamId)
        .maybeSingle();

      if (dupError) {
        console.error('Error checking duplicate name:', dupError);
        return NextResponse.json(
          { error: 'Failed to validate team name' },
          { status: 500 }
        );
      }

      if (duplicate) {
        return NextResponse.json(
          { error: 'A team with this name already exists' },
          { status: 400 }
        );
      }

      updates.name = name.trim();
    }

    if (description !== undefined) {
      if (description && description.length > 200) {
        return NextResponse.json(
          { error: 'Description must be 200 characters or less' },
          { status: 400 }
        );
      }
      updates.description = description?.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update team
    const { data: team, error: updateError } = await adminClient
      .from('agent_teams')
      .update(updates)
      .eq('id', teamId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating team:', updateError);
      return NextResponse.json(
        { error: 'Failed to update team' },
        { status: 500 }
      );
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error('Unexpected error updating team:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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

    // Only managers and owners can delete teams
    if (userData.role !== 'owner' && userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only managers and owners can delete teams' },
        { status: 403 }
      );
    }

    // Verify team exists and belongs to tenant
    const { data: team, error: teamError } = await adminClient
      .from('agent_teams')
      .select('id, name')
      .eq('id', teamId)
      .eq('tenant_id', userData.tenant_id)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // 1. Remove all team members (CASCADE should handle this, but be explicit)
    const { error: membersDeleteError } = await adminClient
      .from('agent_team_members')
      .delete()
      .eq('team_id', teamId);

    if (membersDeleteError) {
      console.error('Error removing team members:', membersDeleteError);
      return NextResponse.json(
        { error: 'Failed to remove team members' },
        { status: 500 }
      );
    }

    // 2. Remove team_id from all pings (set to null)
    const { error: pingsUpdateError } = await adminClient
      .from('pings')
      .update({ team_id: null })
      .eq('team_id', teamId);

    if (pingsUpdateError) {
      console.error('Error unassigning pings from team:', pingsUpdateError);
      return NextResponse.json(
        { error: 'Failed to unassign pings from team' },
        { status: 500 }
      );
    }

    // 3. Delete routing rules for this team (CASCADE should handle this, but be explicit)
    const { error: routingDeleteError } = await adminClient
      .from('routing_rules')
      .delete()
      .eq('destination_team_id', teamId);

    if (routingDeleteError) {
      console.error('Error deleting routing rules:', routingDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete routing rules' },
        { status: 500 }
      );
    }

    // 4. Delete team
    const { error: deleteError } = await adminClient
      .from('agent_teams')
      .delete()
      .eq('id', teamId);

    if (deleteError) {
      console.error('Error deleting team:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete team' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, teamName: team.name });
  } catch (error) {
    console.error('Unexpected error deleting team:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
