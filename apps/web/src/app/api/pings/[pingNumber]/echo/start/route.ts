/**
 * POST /api/pings/[pingNumber]/echo/start
 * Story 3.3: Auto-Categorization of Pings with Conversational Clarification
 *
 * Starts Echo conversation for a draft ping.
 * Sends introduction message (first encounter) and begins problem discovery.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import {
  analyzeConversation,
  type ConversationMessage,
} from '@/lib/services/echo-conversation-service';

const ECHO_INTRODUCTION =
  "Hi! I'm Echo, your AI assistant. I'll ask a few quick questions to understand your issue, then connect you to the right person.";

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

    // Get the ping
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

    // Get Echo user ID
    const { data: echoUserId, error: echoError } = await supabase.rpc(
      'get_echo_user',
      { org_id: tenantId }
    );

    if (echoError || !echoUserId) {
      console.error('Error getting Echo user:', echoError);
      return NextResponse.json(
        { error: 'Failed to initialize Echo' },
        { status: 500 }
      );
    }

    // Check if Echo has been introduced to this user
    const needsIntroduction = !ping.echo_introduced;

    // Send introduction if needed
    if (needsIntroduction) {
      const { error: introError } = await supabaseAdmin
        .from('ping_messages')
        .insert({
          ping_id: ping.id,
          sender_id: echoUserId,
          content: ECHO_INTRODUCTION,
          message_type: 'agent',
        });

      if (introError) {
        console.error('Error sending introduction:', introError);
        return NextResponse.json(
          { error: 'Failed to send introduction' },
          { status: 500 }
        );
      }

      // Mark Echo as introduced
      await supabaseAdmin
        .from('pings')
        .update({ echo_introduced: true })
        .eq('id', ping.id);
    }

    // Get AI configuration
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
      console.error('Error decrypting API key:', decryptError);
      return NextResponse.json(
        { error: 'Failed to decrypt API key' },
        { status: 500 }
      );
    }

    // Get conversation history with proper role structure
    const conversation: ConversationMessage[] = (ping.ping_messages as any[])
      .filter((msg: any) => msg.content)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
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

    // Analyze conversation and generate first question
    const analysis = await analyzeConversation(conversation, {
      provider: aiConfig.provider,
      model: aiConfig.model,
      apiKey: decryptedKey,
    });

    // Handle out-of-scope requests from the very first message
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
        introduced: needsIntroduction,
        message: 'Request redirected - waiting for IT-related issue',
      });
    }

    // Send first clarifying question
    const firstQuestion =
      analysis.nextQuestion || 'Can you tell me more about what is happening?';

    const { error: questionError } = await supabaseAdmin
      .from('ping_messages')
      .insert({
        ping_id: ping.id,
        sender_id: echoUserId,
        content: firstQuestion,
        message_type: 'agent',
      });

    if (questionError) {
      console.error('Error sending first question:', questionError);
      return NextResponse.json(
        { error: 'Failed to send question' },
        { status: 500 }
      );
    }

    // Update clarification count
    await supabaseAdmin
      .from('pings')
      .update({ clarification_count: 1 })
      .eq('id', ping.id);

    return NextResponse.json({
      status: 'discovering',
      introduced: needsIntroduction,
      question: firstQuestion,
    });
  } catch (error) {
    console.error('Error in Echo start:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
