import { createClient } from '@/lib/supabase/server';
import { generatePingTitle } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Request validation schema
const createPingSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message too long'),
  attachments: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    // Parse and validate request body
    const body = await request.json();
    const validation = createPingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { message } = validation.data;

    // Get user's tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Generate title from first 50 chars of message
    const title = generatePingTitle(message, 50);

    // Create ping record
    const { data: ping, error: pingError } = await supabase
      .from('pings')
      .insert({
        tenant_id: userProfile.tenant_id,
        created_by: user.id,
        title,
        status: 'new',
        priority: 'normal',
      })
      .select('*')
      .single();

    if (pingError) {
      console.error('Error creating ping:', pingError);
      return NextResponse.json(
        { error: 'Failed to create ping' },
        { status: 500 }
      );
    }

    // Create first ping message
    const { error: messageError } = await supabase
      .from('ping_messages')
      .insert({
        ping_id: ping.id,
        sender_id: user.id,
        content: message,
        message_type: 'user',
      });

    if (messageError) {
      console.error('Error creating ping message:', messageError);
      // Rollback ping creation
      await supabase.from('pings').delete().eq('id', ping.id);
      return NextResponse.json(
        { error: 'Failed to create ping message' },
        { status: 500 }
      );
    }

    // Return ping with formatted number
    return NextResponse.json(
      {
        ping: {
          ...ping,
          ping_number: ping.ping_number,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in ping creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
