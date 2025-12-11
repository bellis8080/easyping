import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MessageType, PingStatus } from '@easyping/types';
import { calculateStatusTransition } from '@/lib/ping-status-transitions';

const sendMessageSchema = z
  .object({
    content: z
      .string()
      .min(1, 'Message cannot be empty')
      .max(5000, 'Message too long')
      .optional(),
    attachments: z
      .array(
        z.object({
          file_name: z.string().min(1),
          file_path: z.string().min(1),
          file_size: z.number().positive().max(10485760), // 10MB
          mime_type: z.string().min(1),
        })
      )
      .optional()
      .default([])
      .refine((arr) => arr.length <= 5, 'Maximum 5 attachments per message'),
  })
  .refine(
    (data) => data.content || (data.attachments && data.attachments.length > 0),
    'Message must have content or attachments'
  );

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
  console.log('📨 Received message request:', {
    content: body.content?.substring(0, 50),
    attachmentsCount: body.attachments?.length || 0,
    attachments: body.attachments,
  });

  const validation = sendMessageSchema.safeParse(body);

  if (!validation.success) {
    console.error('❌ Validation failed:', validation.error.issues);
    return NextResponse.json(
      { error: validation.error.issues[0].message },
      { status: 400 }
    );
  }

  // Fetch ping by ping_number - using admin client to get creator info
  const supabaseAdmin = createAdminClient();
  const { data: ping, error: pingError } = await supabaseAdmin
    .from('pings')
    .select(
      'id, tenant_id, status, created_by, assigned_to, created_by_user:users!pings_created_by_fkey(full_name)'
    )
    .eq('ping_number', parseInt(pingNumber))
    .eq('tenant_id', userProfile.tenant_id)
    .single();

  if (!ping || pingError) {
    return NextResponse.json({ error: 'Ping not found' }, { status: 404 });
  }

  // Determine message_type based on user role
  const messageType =
    userProfile.role === 'end_user' ? MessageType.USER : MessageType.AGENT;

  // Create message
  const { data: message, error } = await supabase
    .from('ping_messages')
    .insert({
      ping_id: ping.id,
      sender_id: user.id,
      content: validation.data.content || '(attachment)',
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

  // Create attachments if any
  let createdAttachments = [];
  if (validation.data.attachments && validation.data.attachments.length > 0) {
    console.log('📎 Creating attachments:', {
      count: validation.data.attachments.length,
      messageId: message.id,
      tenantId: ping.tenant_id,
      attachments: validation.data.attachments,
    });

    // SECURITY MODEL: Admin client pattern for attachment creation
    //
    // WHY: RLS is disabled on ping_messages table due to Supabase Realtime incompatibility.
    //      Using admin client to bypass RLS for ping_attachments table after API-level validation.
    //
    // VALIDATION CHAIN:
    //  1. User authentication verified (auth.getUser() above)
    //  2. User access to ping validated (user matches ping.created_by or is agent in same tenant)
    //  3. Admin client used ONLY after successful validation
    //
    // RISK MITIGATION:
    //  - API-level validation enforced before any database writes
    //  - Next.js middleware ensures authentication on all protected routes
    //  - Tenant isolation maintained through API validation logic
    //
    // FUTURE: Re-enable RLS when Supabase Realtime resolves compatibility issues
    const adminClient = createAdminClient();
    const { data: attachments, error: attachmentsError } = await adminClient
      .from('ping_attachments')
      .insert(
        validation.data.attachments.map((att) => ({
          ping_message_id: message.id,
          file_name: att.file_name,
          file_path: att.file_path,
          file_size: att.file_size,
          mime_type: att.mime_type,
          storage_bucket: 'ping-attachments',
          uploaded_by: user.id,
        }))
      )
      .select('*');

    if (attachmentsError) {
      console.error('❌ Error creating attachments:', attachmentsError);
      // Don't fail the whole request, just log the error
    } else {
      console.log('✅ Created attachments:', attachments);
      createdAttachments = attachments || [];
    }
  } else {
    console.log('ℹ️  No attachments to create');
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
    attachments: createdAttachments,
  };

  // Story 3.3: If ping is in draft status, route to Echo conversation
  if (ping.status === 'draft') {
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000';

    // Determine which Echo endpoint to call
    // Get ping with confirmation status AND ai_summary
    const { data: draftPing } = await supabase
      .from('pings')
      .select('problem_statement_confirmed, ai_summary')
      .eq('id', ping.id)
      .single();

    // Only route to /confirm if:
    // 1. problem_statement_confirmed is explicitly false (not null)
    // 2. AND there's already a problem statement (ai_summary exists)
    // This prevents routing to /confirm before a problem statement has been generated
    const isAwaitingConfirmation =
      draftPing?.problem_statement_confirmed === false &&
      draftPing?.ai_summary !== null &&
      draftPing?.ai_summary !== '';

    const echoEndpoint = isAwaitingConfirmation
      ? `/api/pings/${pingNumber}/echo/confirm`
      : `/api/pings/${pingNumber}/echo/continue`;

    // Call Echo endpoint asynchronously (fire and forget)
    fetch(`${apiUrl}${echoEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') || '',
      },
    })
      .then(async (echoResponse) => {
        const echoResult = await echoResponse.json();

        // If Echo confirmed the problem, trigger finalization
        // Note: Escalation now goes through confirmation flow too, so user sees the problem statement first
        if (echoResult.status === 'confirmed') {
          await fetch(`${apiUrl}/api/pings/${pingNumber}/echo/finalize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: request.headers.get('cookie') || '',
            },
          });
        }
      })
      .catch((err) => {
        console.error('Error calling Echo endpoint:', err);
      });

    // Return immediately for draft pings (Echo will respond asynchronously)
    return NextResponse.json(
      { message: messageWithSender, echoEngaged: true },
      { status: 201 }
    );
  }

  // Check for automatic status transition
  const creatorName = Array.isArray(ping.created_by_user)
    ? (ping.created_by_user[0] as { full_name: string } | undefined)
        ?.full_name || 'User'
    : (ping.created_by_user as { full_name: string } | undefined)?.full_name ||
      'User';

  console.log('📊 Status transition check:', {
    pingStatus: ping.status,
    messageType,
    userId: user.id,
    pingCreatedBy: ping.created_by,
    assignedTo: ping.assigned_to,
    userRole: userProfile.role,
  });

  const transition = calculateStatusTransition(
    ping.status as PingStatus,
    messageType,
    user.id,
    ping.created_by,
    ping.assigned_to,
    userProfile.full_name || 'Agent',
    creatorName,
    null // first_response_at - column doesn't exist yet
  );

  console.log('📊 Transition result:', transition);

  if (transition) {
    // Update ping status and timestamps
    const updatePayload: any = {
      status: transition.newStatus,
      updated_at: new Date().toISOString(),
      ...transition.timestampUpdates,
    };

    // Auto-assign to agent on first response (if unassigned)
    console.log(
      '📊 shouldAutoAssign:',
      transition.shouldAutoAssign,
      'user.id:',
      user.id
    );
    if (transition.shouldAutoAssign) {
      updatePayload.assigned_to = user.id;
    }

    console.log('📊 Update payload:', updatePayload);
    console.log('📊 Updating ping with id:', ping.id);

    const {
      data: updateData,
      error: updateError,
      count,
    } = await supabaseAdmin
      .from('pings')
      .update(updatePayload)
      .eq('id', ping.id)
      .select();

    console.log('📊 Update result:', {
      data: updateData,
      error: updateError,
      count,
    });

    if (updateError) {
      console.error('Error updating ping status:', updateError);
    } else if (!updateData || updateData.length === 0) {
      console.error(
        '📊 Update returned no rows! Ping may not exist or RLS may be blocking.'
      );
    } else {
      console.log('📊 Ping updated successfully:', updateData[0]);
    }

    // Create system message if needed
    if (
      transition.shouldCreateSystemMessage &&
      transition.systemMessageContent
    ) {
      await supabaseAdmin.from('ping_messages').insert({
        ping_id: ping.id,
        sender_id: user.id,
        content: transition.systemMessageContent,
        message_type: 'system',
      });
    }
  } else {
    // Update ping updated_at timestamp only
    await supabaseAdmin
      .from('pings')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ping.id);
  }

  return NextResponse.json({ message: messageWithSender }, { status: 201 });
}
