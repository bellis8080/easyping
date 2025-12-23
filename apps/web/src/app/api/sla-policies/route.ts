/**
 * GET/POST /api/sla-policies
 * Story 5.1: SLA Policy Configuration
 *
 * GET: Returns list of SLA policies for the current organization.
 * POST: Creates a new SLA policy (manager+ only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SlaPolicyPriority } from '@easyping/types';

const VALID_PRIORITIES: SlaPolicyPriority[] = [
  'low',
  'normal',
  'high',
  'urgent',
];

export async function GET() {
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
    const adminClient = createAdminClient();
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch SLA policies for this organization
    const { data: policies, error: policiesError } = await adminClient
      .from('sla_policies')
      .select('*')
      .eq('tenant_id', userData.tenant_id)
      .order('priority');

    if (policiesError) {
      console.error('Error fetching SLA policies:', policiesError);
      return NextResponse.json(
        { error: 'Failed to fetch SLA policies' },
        { status: 500 }
      );
    }

    return NextResponse.json(policies);
  } catch (error) {
    console.error('Unexpected error fetching SLA policies:', error);
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

    // Only managers and owners can create SLA policies
    if (userData.role !== 'owner' && userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only managers and owners can create SLA policies' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, priority, first_response_minutes, resolution_minutes } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Policy name is required' },
        { status: 400 }
      );
    }

    if (!priority || !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        {
          error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (
      typeof first_response_minutes !== 'number' ||
      first_response_minutes <= 0
    ) {
      return NextResponse.json(
        { error: 'First response time must be a positive number' },
        { status: 400 }
      );
    }

    if (typeof resolution_minutes !== 'number' || resolution_minutes <= 0) {
      return NextResponse.json(
        { error: 'Resolution time must be a positive number' },
        { status: 400 }
      );
    }

    if (resolution_minutes < first_response_minutes) {
      return NextResponse.json(
        {
          error:
            'Resolution time must be greater than or equal to first response time',
        },
        { status: 400 }
      );
    }

    // Check if there's already an active policy for this priority
    const { data: existingPolicy, error: checkError } = await adminClient
      .from('sla_policies')
      .select('id')
      .eq('tenant_id', userData.tenant_id)
      .eq('priority', priority)
      .eq('is_active', true)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing policy:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing policies' },
        { status: 500 }
      );
    }

    if (existingPolicy) {
      return NextResponse.json(
        {
          error: `An active SLA policy for ${priority} priority already exists. Deactivate it first or update it.`,
        },
        { status: 409 }
      );
    }

    // Create SLA policy
    const { data: policy, error: createError } = await adminClient
      .from('sla_policies')
      .insert({
        tenant_id: userData.tenant_id,
        name: name.trim(),
        priority,
        first_response_minutes,
        resolution_minutes,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating SLA policy:', createError);
      return NextResponse.json(
        { error: 'Failed to create SLA policy' },
        { status: 500 }
      );
    }

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    console.error('Unexpected error creating SLA policy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
