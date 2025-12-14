/**
 * GET/POST /api/teams
 * Story 3.5: Team Management
 *
 * GET: Returns list of teams for the current organization.
 *      - Agents see only teams they belong to
 *      - Managers/owners see all teams
 * POST: Creates a new team (manager/owner only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_TEAMS = 20;

export async function GET() {
  try {
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

    // Fetch teams based on role
    const isManagerOrOwner =
      userData.role === 'owner' || userData.role === 'manager';

    if (isManagerOrOwner) {
      // Managers/owners see all teams in the organization
      const { data: teams, error: teamsError } = await adminClient
        .from('agent_teams')
        .select(
          `
          *,
          agent_team_members(user_id)
        `
        )
        .eq('tenant_id', userData.tenant_id)
        .order('name');

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        return NextResponse.json(
          { error: 'Failed to fetch teams' },
          { status: 500 }
        );
      }

      // Transform to include member_count
      const teamsWithCount = teams.map((team) => ({
        ...team,
        member_count: team.agent_team_members?.length || 0,
        agent_team_members: undefined, // Remove raw join data
      }));

      return NextResponse.json(teamsWithCount);
    } else {
      // Agents only see teams they belong to
      const { data: memberTeams, error: memberError } = await adminClient
        .from('agent_team_members')
        .select(
          `
          team_id,
          agent_teams(
            *,
            agent_team_members(user_id)
          )
        `
        )
        .eq('user_id', user.id);

      if (memberError) {
        console.error('Error fetching agent teams:', memberError);
        return NextResponse.json(
          { error: 'Failed to fetch teams' },
          { status: 500 }
        );
      }

      // Extract and transform teams
      const teams = memberTeams
        .map((m) => m.agent_teams)
        .filter((t): t is NonNullable<typeof t> => t !== null)
        .map((team) => ({
          ...team,
          member_count:
            (team as { agent_team_members?: { user_id: string }[] })
              .agent_team_members?.length || 0,
          agent_team_members: undefined,
        }));

      return NextResponse.json(teams);
    }
  } catch (error) {
    console.error('Unexpected error fetching teams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Only managers and owners can create teams
    if (userData.role !== 'owner' && userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only managers and owners can create teams' },
        { status: 403 }
      );
    }

    // Check current team count
    const { count, error: countError } = await adminClient
      .from('agent_teams')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', userData.tenant_id);

    if (countError) {
      console.error('Error counting teams:', countError);
      return NextResponse.json(
        { error: 'Failed to check team count' },
        { status: 500 }
      );
    }

    if (count !== null && count >= MAX_TEAMS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_TEAMS} teams allowed` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, memberIds } = body;

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

    if (description && description.length > 200) {
      return NextResponse.json(
        { error: 'Description must be 200 characters or less' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const { data: existing, error: existingError } = await adminClient
      .from('agent_teams')
      .select('id')
      .eq('tenant_id', userData.tenant_id)
      .eq('name', name.trim())
      .maybeSingle();

    if (existingError) {
      console.error('Error checking team name:', existingError);
      return NextResponse.json(
        { error: 'Failed to validate team name' },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: 'A team with this name already exists' },
        { status: 400 }
      );
    }

    // Create team
    const { data: team, error: createError } = await adminClient
      .from('agent_teams')
      .insert({
        tenant_id: userData.tenant_id,
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating team:', createError);
      return NextResponse.json(
        { error: 'Failed to create team' },
        { status: 500 }
      );
    }

    // Add team members if provided
    let memberCount = 0;
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      const memberInserts = memberIds.map((userId: string) => ({
        team_id: team.id,
        user_id: userId,
      }));

      const { error: membersError } = await adminClient
        .from('agent_team_members')
        .insert(memberInserts);

      if (membersError) {
        console.error('Error adding team members:', membersError);
        // Team was created but members failed - log but don't fail the request
      } else {
        memberCount = memberIds.length;
      }
    }

    return NextResponse.json(
      { ...team, member_count: memberCount },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error creating team:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
