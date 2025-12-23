/**
 * POST /api/pings/[pingNumber]/echo/finalize
 * Story 3.3: Auto-Categorization of Pings with Conversational Clarification
 *
 * Finalizes the ping after confirmation:
 * - Generates title from problem statement
 * - Categorizes based on problem statement
 * - Changes status from 'draft' to 'new' (makes visible to agents)
 * - Sends confirmation message to user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createClient as createServiceClient,
  SupabaseClient,
} from '@supabase/supabase-js';
import {
  categorizeProblemStatement,
  generateTitle,
  type Category,
} from '@/lib/services/problem-categorization-service';
import {
  generateProblemStatement,
  type ConversationMessage,
} from '@/lib/services/echo-conversation-service';
import { createRoutingService } from '@/lib/services/routing-service';

// Helper to lookup SLA policy and calculate due times
async function getSlaForPing(
  client: SupabaseClient,
  tenantId: string,
  priority: string
): Promise<{
  sla_policy_id: string | null;
  sla_first_response_due: string | null;
  sla_resolution_due: string | null;
}> {
  try {
    const { data: policy } = await client
      .from('sla_policies')
      .select('id, first_response_minutes, resolution_minutes')
      .eq('tenant_id', tenantId)
      .eq('priority', priority)
      .eq('is_active', true)
      .maybeSingle();

    if (!policy) {
      return {
        sla_policy_id: null,
        sla_first_response_due: null,
        sla_resolution_due: null,
      };
    }

    const now = new Date();
    const firstResponseDue = new Date(
      now.getTime() + policy.first_response_minutes * 60 * 1000
    );
    const resolutionDue = new Date(
      now.getTime() + policy.resolution_minutes * 60 * 1000
    );

    return {
      sla_policy_id: policy.id,
      sla_first_response_due: firstResponseDue.toISOString(),
      sla_resolution_due: resolutionDue.toISOString(),
    };
  } catch (error) {
    console.error('Error looking up SLA policy:', error);
    return {
      sla_policy_id: null,
      sla_first_response_due: null,
      sla_resolution_due: null,
    };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pingNumber: string }> }
) {
  try {
    const { pingNumber } = await params;
    const supabase = await createClient();

    // Parse request body for escalation info
    let escalated = false;
    try {
      const body = await request.json();
      escalated = body.escalated === true;
    } catch {
      // No body provided, not an escalation
    }

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
      .select('*')
      .eq('ping_number', parseInt(pingNumber))
      .eq('tenant_id', tenantId)
      .single();

    if (pingError || !ping) {
      return NextResponse.json({ error: 'Ping not found' }, { status: 404 });
    }

    // Verify ping is in draft status and has a problem statement
    if (ping.status !== 'draft') {
      return NextResponse.json(
        { error: 'Ping is not in draft status' },
        { status: 400 }
      );
    }

    // If escalated but no problem statement, we'll generate one from conversation
    let problemStatement = ping.ai_summary;

    if (!problemStatement && !escalated) {
      return NextResponse.json(
        { error: 'Problem statement not generated' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Failed to decrypt API key' },
        { status: 500 }
      );
    }

    const categoryConfig = {
      provider: aiConfig.provider,
      model: aiConfig.model,
      apiKey: decryptedKey,
    };

    // If escalated without a problem statement, generate one from conversation
    if (escalated && !problemStatement) {
      // Get conversation history
      const { data: messages } = await supabase
        .from('ping_messages')
        .select('content, message_type, created_at')
        .eq('ping_id', ping.id)
        .order('created_at', { ascending: true });

      if (messages && messages.length > 0) {
        const conversation: ConversationMessage[] = messages
          .filter((msg) => msg.content)
          .map(
            (msg) =>
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

        problemStatement = await generateProblemStatement(
          conversation,
          categoryConfig
        );

        // Save generated problem statement
        await supabaseAdmin
          .from('pings')
          .update({ ai_summary: problemStatement })
          .eq('id', ping.id);
      } else {
        // Fallback if no messages
        problemStatement = 'User requested to speak with a human agent.';
      }
    }

    // Get available categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('sort_order');

    if (categoriesError || !categories || categories.length === 0) {
      return NextResponse.json(
        { error: 'No active categories found' },
        { status: 400 }
      );
    }

    // Categorize based on problem statement
    const categoryResult = await categorizeProblemStatement(
      problemStatement,
      categories as Category[],
      categoryConfig
    );

    // Find the matching category
    const matchedCategory = categories.find(
      (cat: any) => cat.name === categoryResult.category
    );

    if (!matchedCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 500 }
      );
    }

    // Generate title
    const title = await generateTitle(problemStatement, categoryConfig);

    // Apply automatic routing based on category
    const routingService = createRoutingService(supabaseAdmin, tenantId);
    const routingResult = await routingService.routePing(matchedCategory.id);
    const routingUpdates = routingService.applyRoutingToUpdate(routingResult);

    // Lookup SLA policy for this ping's priority (default is 'normal')
    const pingPriority = ping.priority || 'normal';
    const slaFields = await getSlaForPing(
      supabaseAdmin,
      tenantId,
      pingPriority
    );

    // Update ping to finalize it with routing and SLA
    const { error: updateError } = await supabaseAdmin
      .from('pings')
      .update({
        status: 'new',
        title,
        category_id: matchedCategory.id,
        category_confidence: categoryResult.confidence,
        problem_statement_confirmed: true,
        ...routingUpdates,
        ...slaFields,
      })
      .eq('id', ping.id);

    if (updateError) {
      console.error('Error updating ping:', updateError);
      return NextResponse.json(
        { error: 'Failed to finalize ping' },
        { status: 500 }
      );
    }

    // Get Echo user ID
    const { data: echoUserId } = await supabase.rpc('get_echo_user', {
      org_id: tenantId,
    });

    // Send system message about categorization
    const systemMessage = `Echo categorized as: ${categoryResult.category} (${Math.round(categoryResult.confidence * 100)}% confidence)`;

    await supabaseAdmin.from('ping_messages').insert({
      ping_id: ping.id,
      sender_id: null, // System message
      content: systemMessage,
      message_type: 'system',
      visibility: 'public',
    });

    // Send routing system message if routing was applied
    if (routingResult.routed && routingResult.routedTo) {
      const routingMessage =
        routingResult.routedTo.type === 'team'
          ? `Automatically routed to ${routingResult.routedTo.name} team`
          : `Automatically assigned to ${routingResult.routedTo.name}`;

      await supabaseAdmin.from('ping_messages').insert({
        ping_id: ping.id,
        sender_id: null, // System message
        content: routingMessage,
        message_type: 'system',
        visibility: 'public',
      });
    }

    // Send confirmation to user (different message for escalation)
    const confirmationMessage = escalated
      ? `No problem - I'm connecting you with a human agent right now. I've categorized this as ${categoryResult.category} to help route it to the right person. Someone will be with you shortly!`
      : `Thanks! I've categorized this as ${categoryResult.category} and sent it to our team. An agent will be with you shortly.`;

    await supabaseAdmin.from('ping_messages').insert({
      ping_id: ping.id,
      sender_id: echoUserId,
      content: confirmationMessage,
      message_type: 'agent',
      visibility: 'public',
    });

    return NextResponse.json({
      status: 'finalized',
      ping_number: ping.ping_number,
      title,
      category: categoryResult.category,
      confidence: categoryResult.confidence,
      problemStatement,
      routing: routingResult.routed
        ? {
            type: routingResult.routedTo?.type,
            name: routingResult.routedTo?.name,
          }
        : null,
    });
  } catch (error) {
    console.error('Error in Echo finalize:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
