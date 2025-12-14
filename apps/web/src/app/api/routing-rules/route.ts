/**
 * GET/POST /api/routing-rules
 * Story 3.5: Routing Rules Management
 *
 * GET: List all routing rules for tenant with category and destination details.
 * POST: Create new routing rule (manager/owner only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(_request: NextRequest) {
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

    // Fetch routing rules with category and destination details
    const { data: rules, error: rulesError } = await adminClient
      .from('routing_rules')
      .select(
        `
        *,
        category:categories(id, name, color, icon),
        destination_agent:users!routing_rules_destination_agent_id_fkey(id, full_name, email, avatar_url),
        destination_team:agent_teams!routing_rules_destination_team_id_fkey(id, name, description)
      `
      )
      .eq('tenant_id', userData.tenant_id)
      .order('priority', { ascending: true });

    if (rulesError) {
      console.error('Error fetching routing rules:', rulesError);
      return NextResponse.json(
        { error: 'Failed to fetch routing rules' },
        { status: 500 }
      );
    }

    return NextResponse.json(rules);
  } catch (error) {
    console.error('Unexpected error fetching routing rules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Only managers and owners can create routing rules
    if (userData.role !== 'owner' && userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only managers and owners can create routing rules' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      category_id,
      rule_type,
      destination_agent_id,
      destination_team_id,
      priority,
      is_active,
    } = body;

    // Validate required fields
    if (!category_id) {
      return NextResponse.json(
        { error: 'category_id is required' },
        { status: 400 }
      );
    }

    if (!rule_type || !['agent', 'team'].includes(rule_type)) {
      return NextResponse.json(
        { error: "rule_type must be 'agent' or 'team'" },
        { status: 400 }
      );
    }

    // Validate destination based on rule type
    if (rule_type === 'agent') {
      if (!destination_agent_id) {
        return NextResponse.json(
          { error: "destination_agent_id is required for 'agent' rule type" },
          { status: 400 }
        );
      }

      // Verify agent exists and is in same tenant
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
    } else if (rule_type === 'team') {
      if (!destination_team_id) {
        return NextResponse.json(
          { error: "destination_team_id is required for 'team' rule type" },
          { status: 400 }
        );
      }

      // Verify team exists and is in same tenant
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
    }

    // Verify category exists and is in same tenant
    const { data: category, error: categoryError } = await adminClient
      .from('categories')
      .select('id')
      .eq('id', category_id)
      .eq('tenant_id', userData.tenant_id)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if a rule already exists for this category
    const { data: existingRule, error: existingError } = await adminClient
      .from('routing_rules')
      .select('id')
      .eq('tenant_id', userData.tenant_id)
      .eq('category_id', category_id)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing rule:', existingError);
      return NextResponse.json(
        { error: 'Failed to validate routing rule' },
        { status: 500 }
      );
    }

    if (existingRule) {
      return NextResponse.json(
        { error: 'A routing rule already exists for this category' },
        { status: 400 }
      );
    }

    // Create routing rule
    const { data: rule, error: insertError } = await adminClient
      .from('routing_rules')
      .insert({
        tenant_id: userData.tenant_id,
        category_id,
        rule_type,
        destination_agent_id:
          rule_type === 'agent' ? destination_agent_id : null,
        destination_team_id: rule_type === 'team' ? destination_team_id : null,
        priority: priority ?? 0,
        is_active: is_active ?? true,
      })
      .select(
        `
        *,
        category:categories(id, name, color, icon),
        destination_agent:users!routing_rules_destination_agent_id_fkey(id, full_name, email, avatar_url),
        destination_team:agent_teams!routing_rules_destination_team_id_fkey(id, name, description)
      `
      )
      .single();

    if (insertError) {
      console.error('Error creating routing rule:', insertError);
      return NextResponse.json(
        { error: 'Failed to create routing rule' },
        { status: 500 }
      );
    }

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error('Unexpected error creating routing rule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
