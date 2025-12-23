import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generatePingTitle } from '@/lib/utils';
import { createRoutingService } from '@/lib/services/routing-service';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

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

    const tenantId = userProfile.tenant_id;

    // Check if AI is configured for this organization
    const { data: orgData } = await supabase
      .from('organizations')
      .select('ai_config')
      .eq('id', tenantId)
      .single();

    console.log('Organization AI config check:', {
      orgData,
      hasProvider: !!(orgData?.ai_config as any)?.provider,
      hasKey: !!(orgData?.ai_config as any)?.encrypted_api_key,
    });

    const hasAI =
      orgData?.ai_config &&
      (orgData.ai_config as any).provider &&
      (orgData.ai_config as any).encrypted_api_key;

    if (!hasAI) {
      // Fallback: No AI configured - create ping with status='new' immediately
      const title = generatePingTitle(message, 50);
      const adminClient = createAdminClient();
      const defaultPriority = 'normal';

      // Get "Needs Review" category
      const { data: needsReviewCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', 'Needs Review')
        .single();

      // Apply routing if category has a routing rule
      const routingService = createRoutingService(adminClient, tenantId);
      const routingResult = await routingService.routePing(
        needsReviewCategory?.id || null
      );
      const routingUpdates = routingService.applyRoutingToUpdate(routingResult);

      // Lookup SLA policy for this priority
      const slaFields = await getSlaForPing(
        adminClient,
        tenantId,
        defaultPriority
      );

      const { data: ping, error: pingError } = await adminClient
        .from('pings')
        .insert({
          tenant_id: tenantId,
          created_by: user.id,
          title,
          status: 'new',
          priority: defaultPriority,
          category_id: needsReviewCategory?.id || null,
          ...routingUpdates,
          ...slaFields,
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

      // Create first ping message (user messages are always public)
      await adminClient.from('ping_messages').insert({
        ping_id: ping.id,
        sender_id: user.id,
        content: message,
        message_type: 'user',
        visibility: 'public',
      });

      // Add routing system message if routing was applied
      if (routingResult.routed && routingResult.routedTo) {
        const routingMessage =
          routingResult.routedTo.type === 'team'
            ? `Automatically routed to ${routingResult.routedTo.name} team`
            : `Automatically assigned to ${routingResult.routedTo.name}`;

        await adminClient.from('ping_messages').insert({
          ping_id: ping.id,
          sender_id: null,
          content: routingMessage,
          message_type: 'system',
          visibility: 'public',
        });
      }

      return NextResponse.json(
        {
          ping: {
            ...ping,
            ping_number: ping.ping_number,
          },
          echoAvailable: false,
          notice:
            'AI assistant unavailable. Your ping has been sent to our team for review.',
        },
        { status: 201 }
      );
    }

    // AI is configured - create draft ping and trigger Echo conversation
    const { data: ping, error: pingError } = await supabase
      .from('pings')
      .insert({
        tenant_id: tenantId,
        created_by: user.id,
        title: null, // Will be generated by AI after problem statement
        status: 'draft', // Hidden from agents during Echo conversation
        priority: 'normal',
        clarification_count: 0,
        echo_introduced: false,
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

    // Create first ping message (user messages are always public)
    const { error: messageError } = await supabase
      .from('ping_messages')
      .insert({
        ping_id: ping.id,
        sender_id: user.id,
        content: message,
        message_type: 'user',
        visibility: 'public',
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

    // Note: Echo conversation is triggered client-side when the user
    // is redirected to the ping detail page (see PingDetail component)

    // Return ping immediately
    return NextResponse.json(
      {
        ping: {
          ...ping,
          ping_number: ping.ping_number,
        },
        echoAvailable: true,
        status: 'draft',
        notice: 'Echo is analyzing your issue...',
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
