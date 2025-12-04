import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const markReadSchema = z.object({
  lastReadMessageId: z.string().uuid().optional(),
});

export async function POST(
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

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate request body
    const body = await req.json();
    const validationResult = markReadSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error },
        { status: 400 }
      );
    }

    const { lastReadMessageId } = validationResult.data;

    // Fetch ping
    const { pingNumber } = await params;
    const supabaseAdmin = createAdminClient();
    const { data: ping, error: pingError } = await supabaseAdmin
      .from('pings')
      .select('id')
      .eq('ping_number', parseInt(pingNumber))
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (pingError || !ping) {
      return NextResponse.json({ error: 'Ping not found' }, { status: 404 });
    }

    // Upsert ping_reads record
    const { error: upsertError } = await supabaseAdmin
      .from('ping_reads')
      .upsert(
        {
          ping_id: ping.id,
          user_id: userProfile.id,
          last_read_at: new Date().toISOString(),
          last_read_message_id: lastReadMessageId || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'ping_id,user_id',
        }
      );

    if (upsertError) {
      console.error('Error upserting ping_reads:', upsertError);
      return NextResponse.json(
        { error: 'Failed to mark ping as read' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in mark ping as read endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
