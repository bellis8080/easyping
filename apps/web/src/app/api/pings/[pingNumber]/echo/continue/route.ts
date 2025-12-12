/**
 * POST /api/pings/[pingNumber]/echo/continue
 * Story 3.3: Auto-Categorization of Pings with Conversational Clarification
 *
 * Continues Echo conversation after user replies.
 * Determines if problem is understood or if more questions are needed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import {
  analyzeConversation,
  determineWhenToEscalate,
  generateProblemStatement,
  type ConversationMessage,
  type SupportProfileContext,
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

    // Verify ping is in draft status
    if (ping.status !== 'draft') {
      return NextResponse.json(
        { error: 'Ping is not in draft status' },
        { status: 400 }
      );
    }

    // Get AI configuration and support profile
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('ai_config, support_profile')
      .eq('id', tenantId)
      .single();

    if (orgError || !orgData?.ai_config) {
      return NextResponse.json(
        { error: 'AI configuration not found' },
        { status: 400 }
      );
    }

    const aiConfig = orgData.ai_config as any;
    const supportProfile = orgData.support_profile as
      | SupportProfileContext
      | undefined;

    // Decrypt API key
    const { data: decryptedKey, error: decryptError } = await supabase.rpc(
      'decrypt_api_key',
      { encrypted_key: aiConfig.encrypted_api_key, org_id: tenantId }
    );

    if (decryptError || !decryptedKey) {
      console.error('Error decrypting API key:', decryptError);
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

    // Build full conversation history with roles for AI context
    const messages: ConversationMessage[] = (ping.ping_messages as any[])
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

    const echoConfig = {
      provider: aiConfig.provider,
      model: aiConfig.model,
      apiKey: decryptedKey,
      supportProfile,
    };

    const clarificationCount = ping.clarification_count || 0;

    // FIRST: Analyze conversation to see if we have enough info
    // This should run BEFORE escalation check so we don't escalate
    // right when the user finally gives us useful information
    const analysis = await analyzeConversation(messages, echoConfig);

    // If problem is understood, proceed to confirmation (don't escalate)
    // This takes priority over escalation checks
    if (analysis.problemUnderstood && analysis.problemStatement) {
      // Problem is understood - move to confirmation phase
      // Make the confirmation VERY clear with explicit yes/no question
      const confirmationMessage = `Thanks for sharing that. Here's what I understand:\n\n**${analysis.problemStatement}**\n\nIs this correct? Please reply **Yes** to confirm or **No** if I got something wrong.`;

      // Send confirmation message
      const { error: confirmError } = await supabaseAdmin
        .from('ping_messages')
        .insert({
          ping_id: ping.id,
          sender_id: echoUserId,
          content: confirmationMessage,
          message_type: 'agent',
        });

      if (confirmError) {
        console.error('Error sending confirmation:', confirmError);
        return NextResponse.json(
          { error: 'Failed to send confirmation' },
          { status: 500 }
        );
      }

      // Update ping to indicate awaiting confirmation
      await supabaseAdmin
        .from('pings')
        .update({
          problem_statement_confirmed: false,
          ai_summary: analysis.problemStatement,
        })
        .eq('id', ping.id);

      return NextResponse.json({
        status: 'confirming',
        problemStatement: analysis.problemStatement,
        confidence: analysis.confidence,
      });
    }

    // SECOND: Check if should escalate (only if problem NOT understood)
    const shouldEscalate = await determineWhenToEscalate(
      messages,
      clarificationCount,
      echoConfig
    );

    if (shouldEscalate) {
      // Generate problem statement from what we have
      const problemStatement = await generateProblemStatement(
        messages,
        echoConfig
      );

      // Even when escalating, show the user a confirmation so they can see
      // what we understood before handing off to a human agent
      const escalationMessage = `I've gathered enough information to help route your issue. Here's what I understand:\n\n**${problemStatement}**\n\nIs this correct? Please reply **Yes** to confirm and I'll connect you with an agent, or **No** if I got something wrong.`;

      const { error: escalateError } = await supabaseAdmin
        .from('ping_messages')
        .insert({
          ping_id: ping.id,
          sender_id: echoUserId,
          content: escalationMessage,
          message_type: 'agent',
        });

      if (escalateError) {
        console.error('Error sending escalation message:', escalateError);
        return NextResponse.json(
          { error: 'Failed to send message' },
          { status: 500 }
        );
      }

      // Set up for confirmation (same as normal flow)
      await supabaseAdmin
        .from('pings')
        .update({
          problem_statement_confirmed: false,
          ai_summary: problemStatement,
        })
        .eq('id', ping.id);

      return NextResponse.json({
        status: 'confirming',
        problemStatement,
        confidence: 0.6,
        note: 'Escalation pending user confirmation',
      });
    }

    // Handle out-of-scope requests
    if (analysis.outOfScope) {
      const outOfScopeMessage =
        analysis.outOfScopeResponse ||
        "I'm Echo, your IT support assistant. I can help with computer issues, software problems, account access, and other workplace technology needs. Is there an IT issue I can help you with today?";

      const { error: scopeError } = await supabaseAdmin
        .from('ping_messages')
        .insert({
          ping_id: ping.id,
          sender_id: echoUserId,
          content: outOfScopeMessage,
          message_type: 'agent',
        });

      if (scopeError) {
        console.error('Error sending out-of-scope message:', scopeError);
        return NextResponse.json(
          { error: 'Failed to send message' },
          { status: 500 }
        );
      }

      // Don't increment clarification count for out-of-scope - give them a fresh start
      return NextResponse.json({
        status: 'out_of_scope',
        message: 'Request redirected - waiting for IT-related issue',
      });
    }

    // Need more information - ask next question
    {
      const nextQuestion =
        analysis.nextQuestion ||
        'Can you provide more details about what you are experiencing?';

      const { error: questionError } = await supabaseAdmin
        .from('ping_messages')
        .insert({
          ping_id: ping.id,
          sender_id: echoUserId,
          content: nextQuestion,
          message_type: 'agent',
        });

      if (questionError) {
        console.error('Error sending question:', questionError);
        return NextResponse.json(
          { error: 'Failed to send question' },
          { status: 500 }
        );
      }

      // Increment clarification count
      await supabaseAdmin
        .from('pings')
        .update({ clarification_count: clarificationCount + 1 })
        .eq('id', ping.id);

      return NextResponse.json({
        status: 'discovering',
        question: nextQuestion,
        clarificationCount: clarificationCount + 1,
      });
    }
  } catch (error) {
    console.error('Error in Echo continue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
