/**
 * SLA Status API Endpoint (Story 5.2 Task 8)
 *
 * GET /api/pings/[pingNumber]/sla
 *
 * Returns current SLA state for a ping, including both first response
 * and resolution timers with their status, time remaining, and pause info.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Ping } from '@easyping/types';
import {
  getFirstResponseSlaState,
  getResolutionSlaState,
} from '@/lib/sla/calculations';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pingNumber: string }> }
) {
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

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch ping with SLA fields
    const { pingNumber } = await params;
    const supabaseAdmin = createAdminClient();
    const { data: ping, error: pingError } = await supabaseAdmin
      .from('pings')
      .select(
        `
        id,
        created_at,
        first_response_at,
        resolved_at,
        sla_policy_id,
        sla_first_response_due,
        sla_resolution_due,
        sla_paused_at,
        sla_paused_duration_minutes
      `
      )
      .eq('ping_number', parseInt(pingNumber))
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (pingError || !ping) {
      return NextResponse.json({ error: 'Ping not found' }, { status: 404 });
    }

    // Calculate SLA states using utility functions
    const firstResponseState = getFirstResponseSlaState(ping as Ping);
    const resolutionState = getResolutionSlaState(ping as Ping);

    // Return SLA status
    return NextResponse.json({
      first_response: {
        status: firstResponseState.status,
        due_at: firstResponseState.due_at,
        completed_at: firstResponseState.completed_at,
        time_remaining_minutes: firstResponseState.time_remaining_minutes,
        time_taken_minutes: firstResponseState.time_taken_minutes,
        time_over_minutes: firstResponseState.time_over_minutes,
      },
      resolution: {
        status: resolutionState.status,
        due_at: resolutionState.due_at,
        completed_at: resolutionState.completed_at,
        time_remaining_minutes: resolutionState.time_remaining_minutes,
        time_taken_minutes: resolutionState.time_taken_minutes,
        time_over_minutes: resolutionState.time_over_minutes,
        is_paused: resolutionState.is_paused,
        paused_duration_minutes: ping.sla_paused_duration_minutes || 0,
      },
      policy_id: ping.sla_policy_id,
    });
  } catch (error) {
    console.error('Error fetching SLA status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
