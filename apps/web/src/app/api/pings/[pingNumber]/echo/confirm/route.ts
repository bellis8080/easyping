/**
 * POST /api/pings/[pingNumber]/echo/confirm
 * Story 3.3: Auto-Categorization of Pings with Conversational Clarification
 *
 * Handles user confirmation of the problem statement.
 * Uses AI to understand user intent (confirm, deny, or provide new info).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import {
  generateProblemStatement,
  analyzeUserConfirmation,
  type EchoConfig,
  type ConversationMessage,
} from '@/lib/services/echo-conversation-service';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ pingNumber: string }> }
) {
  try {
    const { pingNumber } = await params;
    const supabase = await createClient();

    // Create service role client for inserting Echo messages (bypass RLS)
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const tenantId = userData.tenant_id;

    // Get the ping with all messages
    const { data: ping, error: pingError } = await supabase
      .from('pings')
      .select('*, ping_messages(id, content, message_type, created_at)')
      .eq('ping_number', parseInt(pingNumber))
      .eq('tenant_id', tenantId)
      .single();

    if (pingError || !ping) {
      return NextResponse.json({ error: 'Ping not found' }, { status: 404 });
    }

    // Verify ping is in draft status and awaiting confirmation
    if (ping.status !== 'draft') {
      return NextResponse.json(
        { error: 'Ping is not in draft status' },
        { status: 400 }
      );
    }

    // Get the user's last message
    const sortedMessages = (ping.ping_messages as any[])
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .filter((msg: any) => msg.message_type === 'user');

    if (sortedMessages.length === 0) {
      return NextResponse.json(
        { error: 'No user message found' },
        { status: 400 }
      );
    }

    const lastUserMessage = sortedMessages[0].content;
    const currentProblemStatement = ping.ai_summary || '';

    // Get AI configuration for understanding user intent
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('ai_config')
      .eq('id', tenantId)
      .single();

    if (orgError || !orgData?.ai_config) {
      return NextResponse.json(
        { error: 'AI configuration not found' },
        { status: 400 }
      );
    }

    const aiConfig = orgData.ai_config as any;

    // Decrypt API key
    const { data: decryptedKey, error: decryptError } = await supabase.rpc(
      'decrypt_api_key',
      { encrypted_key: aiConfig.encrypted_api_key, org_id: tenantId }
    );

    if (decryptError || !decryptedKey) {
      return NextResponse.json(
        { error: 'Failed to decrypt API key' },
        { status: 500 }
      );
    }

    // Get Echo user ID
    const { data: echoUserId, error: echoError } = await supabase.rpc(
      'get_echo_user',
      { org_id: tenantId }
    );

    if (echoError || !echoUserId) {
      return NextResponse.json(
        { error: 'Failed to get Echo user' },
        { status: 500 }
      );
    }

    const echoConfig: EchoConfig = {
      provider: aiConfig.provider,
      model: aiConfig.model,
      apiKey: decryptedKey,
    };

    // Use AI to understand user's response
    const confirmation = await analyzeUserConfirmation(
      lastUserMessage,
      currentProblemStatement,
      echoConfig
    );

    if (confirmation.intent === 'confirm') {
      // User confirmed - mark as confirmed and return status
      await supabaseAdmin
        .from('pings')
        .update({ problem_statement_confirmed: true })
        .eq('id', ping.id);

      return NextResponse.json({
        status: 'confirmed',
        message: 'Problem statement confirmed, proceeding to finalization',
      });
    } else if (confirmation.intent === 'deny') {
      // User said No without explanation - ask what's wrong
      const clarificationMessage = `I understand that's not quite right. Can you tell me what I got wrong or what's missing? That will help me understand your issue better.`;

      await supabaseAdmin.from('ping_messages').insert({
        ping_id: ping.id,
        sender_id: echoUserId,
        content: clarificationMessage,
        message_type: 'agent',
        visibility: 'public',
      });

      // Clear the problem statement confirmation flag and increment clarification count
      // so next response goes through continue route with proper count
      const currentCount = ping.clarification_count || 0;
      await supabaseAdmin
        .from('pings')
        .update({
          problem_statement_confirmed: null,
          clarification_count: currentCount + 1,
        })
        .eq('id', ping.id);

      return NextResponse.json({
        status: 'asking_for_correction',
        message: 'Asking user what was wrong with the problem statement',
      });
    } else if (confirmation.intent === 'clarify') {
      // User provided corrections/clarifications - regenerate with new info
      // Build full conversation with roles so AI has complete context
      const fullConversation: ConversationMessage[] = (
        ping.ping_messages as any[]
      )
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        .filter((msg: any) => msg.content)
        .map(
          (msg: any) =>
            ({
              role:
                msg.message_type === 'user'
                  ? 'user'
                  : msg.message_type === 'system'
                    ? 'system'
                    : 'echo',
              content: msg.content,
            }) as ConversationMessage
        );

      const updatedProblemStatement = await generateProblemStatement(
        fullConversation,
        echoConfig
      );

      // ALWAYS show the problem statement with explicit yes/no - don't use AI's soft response
      // The AI's echoResponse often doesn't include the problem statement clearly
      const confirmationMessage = `Thanks for that information. Here's what I understand:\n\n**${updatedProblemStatement}**\n\nIs this correct? Please reply **Yes** to confirm or **No** if I got something wrong.`;

      const { error: confirmError } = await supabaseAdmin
        .from('ping_messages')
        .insert({
          ping_id: ping.id,
          sender_id: echoUserId,
          content: confirmationMessage,
          message_type: 'agent',
          visibility: 'public',
        });

      if (confirmError) {
        console.error('Error sending updated confirmation:', confirmError);
        return NextResponse.json(
          { error: 'Failed to send confirmation' },
          { status: 500 }
        );
      }

      // Update stored problem statement
      await supabaseAdmin
        .from('pings')
        .update({ ai_summary: updatedProblemStatement })
        .eq('id', ping.id);

      return NextResponse.json({
        status: 'reconfirming',
        updatedProblemStatement,
      });
    } else {
      // Unclear response - Echo will ask a contextual follow-up question
      const followUpMessage =
        confirmation.echoResponse ||
        `I want to make sure I help you correctly. You mentioned "${lastUserMessage}" - does that mean the issue I described is correct, or is there something different going on?`;

      await supabaseAdmin.from('ping_messages').insert({
        ping_id: ping.id,
        sender_id: echoUserId,
        content: followUpMessage,
        message_type: 'agent',
        visibility: 'public',
      });

      return NextResponse.json({
        status: 'awaiting_clarification',
        message: 'Asking user for clearer confirmation',
      });
    }
  } catch (error) {
    console.error('Error in Echo confirm:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
