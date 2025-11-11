import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message too long'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pingNumber: string }> }
) {
  const supabase = await createClient();
  const { pingNumber } = await params;

  // Authenticate
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user profile to determine role
  // Use auth.uid() in the query to bypass RLS and avoid chicken-egg problem
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, role, tenant_id, full_name, avatar_url')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile) {
    console.error('Error fetching user profile:', profileError);
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Validate request
  const body = await request.json();
  const validation = sendMessageSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0].message },
      { status: 400 }
    );
  }

  // Fetch ping by ping_number
  const { data: ping } = await supabase
    .from('pings')
    .select('id, tenant_id')
    .eq('ping_number', parseInt(pingNumber))
    .eq('tenant_id', userProfile.tenant_id)
    .single();

  if (!ping) {
    return NextResponse.json({ error: 'Ping not found' }, { status: 404 });
  }

  // Determine message_type based on user role
  const messageType = userProfile.role === 'end_user' ? 'user' : 'agent';

  // Create message
  const { data: message, error } = await supabase
    .from('ping_messages')
    .insert({
      ping_id: ping.id,
      sender_id: user.id,
      content: validation.data.content,
      message_type: messageType,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }

  // Manually construct the response with sender info (already fetched userProfile)
  const messageWithSender = {
    ...message,
    sender: {
      id: userProfile.id,
      full_name: userProfile.full_name || '',
      avatar_url: userProfile.avatar_url || null,
      role: userProfile.role,
    },
  };

  // Update ping updated_at timestamp
  await supabase
    .from('pings')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', ping.id);

  return NextResponse.json({ message: messageWithSender }, { status: 201 });
}
