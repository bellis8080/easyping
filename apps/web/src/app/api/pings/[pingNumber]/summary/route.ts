/**
 * POST /api/pings/[pingNumber]/summary
 * Story 3.6: AI-Pinned Ping Summaries
 *
 * Generates or regenerates the AI summary for a ping.
 * Called manually via refresh button or automatically after messages/status changes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  generatePingSummary,
  type SummaryMessage,
  type PingSummaryConfig,
  type PingSummaryContext,
} from '@/lib/services/ping-summary-service';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ pingNumber: string }> }
): Promise<NextResponse> {
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

    const tenantId = userProfile.tenant_id;
    const { pingNumber } = await params;
    const supabaseAdmin = createAdminClient();

    // Fetch ping with category
    const { data: ping, error: pingError } = await supabaseAdmin
      .from('pings')
      .select('*, category:categories(name)')
      .eq('ping_number', parseInt(pingNumber))
      .eq('tenant_id', tenantId)
      .single();

    if (pingError || !ping) {
      return NextResponse.json({ error: 'Ping not found' }, { status: 404 });
    }

    // Fetch all messages for the ping
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('ping_messages')
      .select('content, message_type, created_at')
      .eq('ping_id', ping.id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Need messages to generate a summary
    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages to summarize' },
        { status: 400 }
      );
    }

    // Load organization AI config
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('ai_config')
      .eq('id', tenantId)
      .single();

    if (orgError || !orgData?.ai_config) {
      // No AI configured - preserve existing summary
      return NextResponse.json(
        {
          summary: ping.ai_summary,
          updated_at: ping.summary_updated_at,
          notice: 'AI not configured',
        },
        { status: 200 }
      );
    }

    const aiConfig = orgData.ai_config as {
      provider?: string;
      encrypted_api_key?: string;
      model?: string;
    };

    if (!aiConfig.provider || !aiConfig.encrypted_api_key) {
      return NextResponse.json(
        {
          summary: ping.ai_summary,
          updated_at: ping.summary_updated_at,
          notice: 'AI not configured',
        },
        { status: 200 }
      );
    }

    // Decrypt API key
    const { data: decryptedKey, error: decryptError } = await supabase.rpc(
      'decrypt_api_key',
      { encrypted_key: aiConfig.encrypted_api_key, org_id: tenantId }
    );

    if (decryptError || !decryptedKey) {
      console.error('Failed to decrypt API key:', decryptError);
      return NextResponse.json(
        {
          summary: ping.ai_summary,
          updated_at: ping.summary_updated_at,
          notice: 'AI configuration error',
        },
        { status: 200 }
      );
    }

    // Convert messages to SummaryMessage format
    const summaryMessages: SummaryMessage[] = messages
      .filter((msg) => msg.content)
      .map((msg) => ({
        role: mapMessageType(msg.message_type),
        content: msg.content,
      }));

    // Build config and context
    const config: PingSummaryConfig = {
      provider: aiConfig.provider,
      model: aiConfig.model || 'gpt-4o-mini',
      apiKey: decryptedKey,
    };

    const categoryName = Array.isArray(ping.category)
      ? ping.category[0]?.name
      : (ping.category as { name: string } | null)?.name;

    const context: PingSummaryContext = {
      pingId: ping.id,
      status: ping.status,
      category: categoryName || null,
      priority: ping.priority,
    };

    // Generate summary
    const result = await generatePingSummary(summaryMessages, context, config);

    if (!result.success || !result.summary) {
      console.error('Summary generation failed:', result.error);
      // Return existing summary on failure
      return NextResponse.json(
        {
          summary: ping.ai_summary,
          updated_at: ping.summary_updated_at,
          notice: 'Summary generation failed, showing previous summary',
        },
        { status: 200 }
      );
    }

    // Update ping with new summary - also update updated_at to trigger realtime subscription
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('pings')
      .update({
        ai_summary: result.summary,
        summary_updated_at: now,
        updated_at: now,
      })
      .eq('id', ping.id);

    if (updateError) {
      console.error('Error updating ping summary:', updateError);
      return NextResponse.json(
        { error: 'Failed to save summary' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        summary: result.summary,
        updated_at: now,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in summary generation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Maps database message_type to SummaryMessage role
 */
function mapMessageType(
  messageType: string
): 'user' | 'agent' | 'echo' | 'system' {
  switch (messageType) {
    case 'user':
      return 'user';
    case 'agent':
      return 'agent';
    case 'system':
      return 'system';
    default:
      // Treat unknown types as agent messages
      return 'agent';
  }
}
