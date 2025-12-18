/**
 * PATCH /api/pings/[pingNumber]/team
 * Story 3.5: Ping Team Reassignment
 *
 * Allows agents/managers/owners to reassign a ping to a different team.
 * Can also unassign from team by passing null.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const reassignTeamSchema = z.object({
  teamId: z.string().uuid().or(z.null()), // null to remove from team
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pingNumber: string }> }
) {
  const { pingNumber } = await params;

  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile and verify role
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, full_name, role, tenant_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Only agents/managers/owners can reassign teams
    if (userProfile.role === 'end_user') {
      return NextResponse.json(
        { error: 'Forbidden: Only agents can reassign teams' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await req.json();
    const validationResult = reassignTeamSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error },
        { status: 400 }
      );
    }

    const { teamId } = validationResult.data;

    // Fetch ping
    const supabaseAdmin = createAdminClient();
    const { data: ping, error: pingError } = await supabaseAdmin
      .from('pings')
      .select('*, current_team:agent_teams!pings_team_id_fkey(name)')
      .eq('ping_number', parseInt(pingNumber))
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (pingError || !ping) {
      return NextResponse.json({ error: 'Ping not found' }, { status: 404 });
    }

    // If teamId is the same as current, no-op
    if (teamId === ping.team_id) {
      return NextResponse.json(
        { error: 'Ping already assigned to this team' },
        { status: 400 }
      );
    }

    // Fetch new team details if assigning (not unassigning)
    let newTeamName = null;
    if (teamId) {
      const { data: team } = await supabaseAdmin
        .from('agent_teams')
        .select('name')
        .eq('id', teamId)
        .eq('tenant_id', userProfile.tenant_id)
        .single();

      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      newTeamName = team.name;
    }

    // Update ping team
    const { data: updatedPing, error: updateError } = await supabaseAdmin
      .from('pings')
      .update({ team_id: teamId })
      .eq('id', ping.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating ping team:', updateError);
      return NextResponse.json(
        { error: 'Failed to update team' },
        { status: 500 }
      );
    }

    // Create system message
    let systemMessage = '';
    const oldTeamName = (ping.current_team as { name: string } | null)?.name;

    if (teamId && oldTeamName) {
      systemMessage = `Ping moved from ${oldTeamName} to ${newTeamName}`;
    } else if (teamId) {
      systemMessage = `Ping assigned to ${newTeamName} team`;
    } else if (oldTeamName) {
      systemMessage = `Ping removed from ${oldTeamName} team`;
    }

    if (systemMessage) {
      await supabaseAdmin.from('ping_messages').insert({
        ping_id: ping.id,
        sender_id: user.id,
        content: systemMessage,
        message_type: 'system',
        visibility: 'public',
      });
    }

    return NextResponse.json({ ping: updatedPing }, { status: 200 });
  } catch (error) {
    console.error('Error in team reassignment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
