/**
 * GET /api/teams/[teamId]/pings
 * Story 3.5: Team Inbox Pings
 *
 * Returns list of pings assigned to this team with filters.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteParams {
  params: Promise<{ teamId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const supabase = await createClient();

    // Parse query params
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const sortBy = url.searchParams.get('sort_by') || 'created_at';
    const sortOrder = url.searchParams.get('sort_order') || 'desc';

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

    // Build query
    let query = adminClient
      .from('pings')
      .select(
        `
        *,
        created_by_user:users!pings_created_by_fkey(id, full_name, email, avatar_url),
        assigned_to_user:users!pings_assigned_to_fkey(id, full_name, email, avatar_url),
        category:categories(id, name, color, icon)
      `
      )
      .eq('team_id', teamId)
      .neq('status', 'draft'); // Exclude drafts

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    // Apply sorting
    const validSortFields = [
      'created_at',
      'updated_at',
      'priority',
      'status',
      'ping_number',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const ascending = sortOrder === 'asc';

    query = query.order(sortField, { ascending });

    const { data: pings, error: pingsError } = await query;

    if (pingsError) {
      console.error('Error fetching team pings:', pingsError);
      return NextResponse.json(
        { error: 'Failed to fetch pings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      team,
      pings,
    });
  } catch (error) {
    console.error('Unexpected error fetching team pings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
