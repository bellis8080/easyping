/**
 * GET/PUT/DELETE /api/routing-rules/[ruleId]
 * Story 3.5: Routing Rules Management
 *
 * GET: Get single routing rule with details.
 * PUT: Update routing rule (manager/owner only).
 * DELETE: Delete routing rule (manager/owner only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteParams {
  params: Promise<{ ruleId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { ruleId } = await params;
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id and role
    const adminClient = createAdminClient();
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only managers and owners can view routing rules
    if (userData.role !== 'owner' && userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only managers and owners can view routing rules' },
        { status: 403 }
      );
    }

    // Fetch routing rule
    const { data: rule, error: ruleError } = await adminClient
      .from('routing_rules')
      .select(
        `
        *,
        category:categories(id, name, color, icon),
        destination_agent:users!routing_rules_destination_agent_id_fkey(id, full_name, email, avatar_url),
        destination_team:agent_teams!routing_rules_destination_team_id_fkey(id, name, description)
      `
      )
      .eq('id', ruleId)
      .eq('tenant_id', userData.tenant_id)
      .single();

    if (ruleError || !rule) {
      return NextResponse.json(
        { error: 'Routing rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(rule);
  } catch (error) {
    console.error('Unexpected error fetching routing rule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { ruleId } = await params;
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id and role
    const adminClient = createAdminClient();
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only managers and owners can update routing rules
    if (userData.role !== 'owner' && userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only managers and owners can update routing rules' },
        { status: 403 }
      );
    }

    // Verify rule exists and belongs to tenant
    const { data: existingRule, error: existingError } = await adminClient
      .from('routing_rules')
      .select('id, category_id')
      .eq('id', ruleId)
      .eq('tenant_id', userData.tenant_id)
      .single();

    if (existingError || !existingRule) {
      return NextResponse.json(
        { error: 'Routing rule not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      rule_type,
      destination_agent_id,
      destination_team_id,
      priority,
      is_active,
    } = body;

    // Build update object
    const updates: Record<string, unknown> = {};

    // Handle rule_type change with destination validation
    if (rule_type !== undefined) {
      if (!['agent', 'team'].includes(rule_type)) {
        return NextResponse.json(
          { error: "rule_type must be 'agent' or 'team'" },
          { status: 400 }
        );
      }

      updates.rule_type = rule_type;

      if (rule_type === 'agent') {
        if (!destination_agent_id) {
          return NextResponse.json(
            { error: "destination_agent_id is required for 'agent' rule type" },
            { status: 400 }
          );
        }

        // Verify agent exists
        const { data: agent, error: agentError } = await adminClient
          .from('users')
          .select('id')
          .eq('id', destination_agent_id)
          .eq('tenant_id', userData.tenant_id)
          .single();

        if (agentError || !agent) {
          return NextResponse.json(
            { error: 'Destination agent not found' },
            { status: 404 }
          );
        }

        updates.destination_agent_id = destination_agent_id;
        updates.destination_team_id = null;
      } else if (rule_type === 'team') {
        if (!destination_team_id) {
          return NextResponse.json(
            { error: "destination_team_id is required for 'team' rule type" },
            { status: 400 }
          );
        }

        // Verify team exists
        const { data: team, error: teamError } = await adminClient
          .from('agent_teams')
          .select('id')
          .eq('id', destination_team_id)
          .eq('tenant_id', userData.tenant_id)
          .single();

        if (teamError || !team) {
          return NextResponse.json(
            { error: 'Destination team not found' },
            { status: 404 }
          );
        }

        updates.destination_team_id = destination_team_id;
        updates.destination_agent_id = null;
      }
    } else {
      // If not changing rule_type, still allow updating destination within same type
      if (destination_agent_id !== undefined) {
        const { data: agent, error: agentError } = await adminClient
          .from('users')
          .select('id')
          .eq('id', destination_agent_id)
          .eq('tenant_id', userData.tenant_id)
          .single();

        if (agentError || !agent) {
          return NextResponse.json(
            { error: 'Destination agent not found' },
            { status: 404 }
          );
        }

        updates.destination_agent_id = destination_agent_id;
      }

      if (destination_team_id !== undefined) {
        const { data: team, error: teamError } = await adminClient
          .from('agent_teams')
          .select('id')
          .eq('id', destination_team_id)
          .eq('tenant_id', userData.tenant_id)
          .single();

        if (teamError || !team) {
          return NextResponse.json(
            { error: 'Destination team not found' },
            { status: 404 }
          );
        }

        updates.destination_team_id = destination_team_id;
      }
    }

    if (priority !== undefined) {
      updates.priority = priority;
    }

    if (is_active !== undefined) {
      updates.is_active = is_active;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update routing rule
    const { data: rule, error: updateError } = await adminClient
      .from('routing_rules')
      .update(updates)
      .eq('id', ruleId)
      .select(
        `
        *,
        category:categories(id, name, color, icon),
        destination_agent:users!routing_rules_destination_agent_id_fkey(id, full_name, email, avatar_url),
        destination_team:agent_teams!routing_rules_destination_team_id_fkey(id, name, description)
      `
      )
      .single();

    if (updateError) {
      console.error('Error updating routing rule:', updateError);
      return NextResponse.json(
        { error: 'Failed to update routing rule' },
        { status: 500 }
      );
    }

    return NextResponse.json(rule);
  } catch (error) {
    console.error('Unexpected error updating routing rule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { ruleId } = await params;
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id and role
    const adminClient = createAdminClient();
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only managers and owners can delete routing rules
    if (userData.role !== 'owner' && userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only managers and owners can delete routing rules' },
        { status: 403 }
      );
    }

    // Verify rule exists and belongs to tenant
    const { data: existingRule, error: existingError } = await adminClient
      .from('routing_rules')
      .select('id')
      .eq('id', ruleId)
      .eq('tenant_id', userData.tenant_id)
      .single();

    if (existingError || !existingRule) {
      return NextResponse.json(
        { error: 'Routing rule not found' },
        { status: 404 }
      );
    }

    // Delete routing rule
    const { error: deleteError } = await adminClient
      .from('routing_rules')
      .delete()
      .eq('id', ruleId);

    if (deleteError) {
      console.error('Error deleting routing rule:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete routing rule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error deleting routing rule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
