import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const prioritySchema = z.object({
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pingNumber: string }> }
): Promise<NextResponse> {
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

    // Only agents/managers/owners can update priority
    if (userProfile.role === 'end_user') {
      return NextResponse.json(
        { error: 'Forbidden: Only agents can update priority' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await req.json();
    const validationResult = prioritySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error },
        { status: 400 }
      );
    }

    const { priority } = validationResult.data;

    // Fetch ping
    const supabaseAdmin = createAdminClient();
    const { data: ping, error: pingError } = await supabaseAdmin
      .from('pings')
      .select('*')
      .eq('ping_number', parseInt(pingNumber))
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (pingError || !ping) {
      return NextResponse.json({ error: 'Ping not found' }, { status: 404 });
    }

    // If priority is the same as current, no-op
    if (priority === ping.priority) {
      return NextResponse.json(
        { error: 'Ping already has this priority' },
        { status: 400 }
      );
    }

    // Update ping priority
    const { data: updatedPing, error: updateError } = await supabaseAdmin
      .from('pings')
      .update({ priority })
      .eq('id', ping.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating ping priority:', updateError);
      return NextResponse.json(
        { error: 'Failed to update priority' },
        { status: 500 }
      );
    }

    // Create system message
    const systemMessage = `Priority changed to ${priority}`;

    await supabaseAdmin.from('ping_messages').insert({
      ping_id: ping.id,
      sender_id: user.id,
      content: systemMessage,
      message_type: 'system',
    });

    return NextResponse.json({ ping: updatedPing }, { status: 200 });
  } catch (error) {
    console.error('Error in priority update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
