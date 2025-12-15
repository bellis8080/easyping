/**
 * POST /api/pings/[pingNumber]/echo/suggest
 * Story 3.7: Echo - AI Response Suggestions
 *
 * Generates an AI-suggested response for agents when viewing a ping.
 * Called when agent focuses on the reply input (with Echo panel visible).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import {
  generateResponseSuggestion,
  generateAlternativeResponse,
  type EchoResponseContext,
} from '@/lib/services/echo-response-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pingNumber: string }> }
) {
  try {
    const { pingNumber } = await params;
    const body = await request.json().catch(() => ({}));
    const { alternative = false } = body;

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id and role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only agents, managers, and owners can get response suggestions
    if (!['agent', 'manager', 'owner'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Only agents can get response suggestions' },
        { status: 403 }
      );
    }

    const tenantId = userData.tenant_id;

    // Create admin client for data access
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the ping with messages and category
    const { data: ping, error: pingError } = await supabaseAdmin
      .from('pings')
      .select(
        `
        *,
        ping_messages (
          id,
          content,
          sender_id,
          message_type,
          created_at,
          edited_at
        ),
        categories (
          name
        )
      `
      )
      .eq('ping_number', parseInt(pingNumber))
      .eq('tenant_id', tenantId)
      .single();

    if (pingError || !ping) {
      console.error('[Echo Suggest] Ping not found:', {
        pingNumber,
        tenantId,
        error: pingError,
      });
      return NextResponse.json({ error: 'Ping not found' }, { status: 404 });
    }

    // Ping must not be in draft status for agent response suggestions
    if (ping.status === 'draft') {
      return NextResponse.json(
        { error: 'Cannot suggest responses for draft pings' },
        { status: 400 }
      );
    }

    // Get AI configuration
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name, ai_config')
      .eq('id', tenantId)
      .single();

    if (orgError || !orgData?.ai_config) {
      return NextResponse.json(
        { error: 'AI configuration not found. Please configure AI settings.' },
        { status: 400 }
      );
    }

    const aiConfig = orgData.ai_config as {
      provider: 'openai' | 'anthropic' | 'azure';
      model: string;
      encrypted_api_key: string;
    };

    // Decrypt API key
    const { data: decryptedKey, error: decryptError } = await supabaseAdmin.rpc(
      'decrypt_api_key',
      { encrypted_key: aiConfig.encrypted_api_key, org_id: tenantId }
    );

    if (decryptError || !decryptedKey) {
      console.error('[Echo Suggest] Error decrypting API key:', decryptError);
      return NextResponse.json(
        { error: 'Failed to decrypt API key' },
        { status: 500 }
      );
    }

    // Prepare context for response generation
    const messages = (ping.ping_messages as any[])
      .filter((msg) => msg.content && msg.message_type !== 'system')
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      .map((msg) => ({
        id: msg.id,
        ping_id: ping.id,
        sender_id: msg.sender_id || '',
        content: msg.content,
        message_type: msg.message_type,
        created_at: msg.created_at,
        edited_at: msg.edited_at || null,
      }));

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages to analyze' },
        { status: 400 }
      );
    }

    const context: EchoResponseContext = {
      messages,
      status: ping.status,
      category: (ping.categories as any)?.name || null,
      priority: ping.priority,
      summary: ping.summary,
      organizationName: orgData.name,
    };

    const config = {
      provider: aiConfig.provider,
      model: aiConfig.model,
      apiKey: decryptedKey,
    };

    // Generate response suggestion
    const result = alternative
      ? await generateAlternativeResponse(context, config)
      : await generateResponseSuggestion(context, config);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to generate suggestion. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      suggestion: result.suggestion,
      generatedAt: result.generatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[Echo Suggest] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
