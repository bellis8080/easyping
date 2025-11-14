import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const assignPingSchema = z.object({
  assignedTo: z.string().uuid().or(z.null()), // null to unassign
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

    // Only agents/managers/owners can assign pings
    if (userProfile.role === 'end_user') {
      return NextResponse.json(
        { error: 'Forbidden: Only agents can assign pings' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await req.json();
    const validationResult = assignPingSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error },
        { status: 400 }
      );
    }

    const { assignedTo } = validationResult.data;

    // Fetch ping
    const supabaseAdmin = createAdminClient();
    const { data: ping, error: pingError } = await supabaseAdmin
      .from('pings')
      .select('*, assigned_to_user:users!pings_assigned_to_fkey(full_name)')
      .eq('ping_number', parseInt(pingNumber))
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (pingError || !ping) {
      return NextResponse.json({ error: 'Ping not found' }, { status: 404 });
    }

    // If assignedTo is the same as current, no-op
    if (assignedTo === ping.assigned_to) {
      return NextResponse.json(
        { error: 'Ping already assigned to this agent' },
        { status: 400 }
      );
    }

    // Fetch assignee details if assigning (not unassigning)
    let assigneeName = null;
    if (assignedTo) {
      const { data: assignee } = await supabaseAdmin
        .from('users')
        .select('full_name')
        .eq('id', assignedTo)
        .eq('tenant_id', userProfile.tenant_id)
        .single();

      if (!assignee) {
        return NextResponse.json(
          { error: 'Assigned agent not found' },
          { status: 404 }
        );
      }
      assigneeName = assignee.full_name;
    }

    // Update ping assignment
    const { data: updatedPing, error: updateError } = await supabaseAdmin
      .from('pings')
      .update({ assigned_to: assignedTo })
      .eq('id', ping.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating ping assignment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update assignment' },
        { status: 500 }
      );
    }

    // Create system message
    let systemMessage = '';
    if (assignedTo) {
      systemMessage = `Ping assigned to ${assigneeName}`;
    } else {
      systemMessage = `Ping unassigned`;
    }

    await supabaseAdmin.from('ping_messages').insert({
      ping_id: ping.id,
      sender_id: user.id,
      content: systemMessage,
      message_type: 'system',
    });

    return NextResponse.json({ ping: updatedPing }, { status: 200 });
  } catch (error) {
    console.error('Error in assignment update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
