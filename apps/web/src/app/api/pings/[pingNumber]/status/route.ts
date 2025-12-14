import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { PingStatus } from '@easyping/types';
import { validateManualStatusChange } from '@/lib/ping-status-transitions';
import { triggerSummaryRegeneration } from '@/lib/services/summary-trigger';

const updateStatusSchema = z.object({
  status: z.enum([
    'new',
    'in_progress',
    'waiting_on_user',
    'resolved',
    'closed',
  ]),
});

export async function PATCH(
  req: NextRequest,
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

    // Get user profile and verify role
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, full_name, role, tenant_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only agents/managers/owners can change status
    if (userProfile.role === 'end_user') {
      return NextResponse.json(
        { error: 'Forbidden: Only agents can change ping status' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await req.json();
    const validationResult = updateStatusSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error },
        { status: 400 }
      );
    }

    const { status: newStatus } = validationResult.data;

    // Fetch ping
    const { pingNumber } = await params;
    const supabaseAdmin = createAdminClient();
    const { data: ping, error: pingError } = await supabaseAdmin
      .from('pings')
      .select('*, created_by_user:users!pings_created_by_fkey(full_name)')
      .eq('ping_number', parseInt(pingNumber))
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (pingError || !ping) {
      return NextResponse.json({ error: 'Ping not found' }, { status: 404 });
    }

    // Validate status transition
    const creatorName = Array.isArray(ping.created_by_user)
      ? (ping.created_by_user[0] as { full_name: string } | undefined)
          ?.full_name || 'User'
      : (ping.created_by_user as { full_name: string } | undefined)
          ?.full_name || 'User';

    const validation = validateManualStatusChange(
      ping.status as PingStatus,
      newStatus as PingStatus,
      userProfile.full_name || 'Agent',
      creatorName
    );

    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Update ping status
    const timestampUpdates: Record<string, string | null> = {
      status_changed_at: new Date().toISOString(),
    };

    if (newStatus === 'resolved' && !ping.resolved_at) {
      timestampUpdates.resolved_at = new Date().toISOString();
    }

    if (newStatus === 'closed' && !ping.closed_at) {
      timestampUpdates.closed_at = new Date().toISOString();
    }

    const { data: updatedPing, error: updateError } = await supabaseAdmin
      .from('pings')
      .update({
        status: newStatus,
        ...timestampUpdates,
      })
      .eq('id', ping.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating ping status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      );
    }

    // Create system message
    await supabaseAdmin.from('ping_messages').insert({
      ping_id: ping.id,
      sender_id: user.id,
      content: validation.systemMessageContent,
      message_type: 'system',
    });

    // Story 3.6: Trigger summary regeneration on status change (fire and forget)
    // Skip draft pings (handled by Echo) - note: newStatus can't be 'draft' per schema validation
    if (ping.status !== 'draft') {
      triggerSummaryRegeneration(supabaseAdmin, ping.id, ping.tenant_id);
    }

    return NextResponse.json({ ping: updatedPing }, { status: 200 });
  } catch (error) {
    console.error('Error in status update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
