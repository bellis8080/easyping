/**
 * GET/PUT/DELETE /api/sla-policies/[policyId]
 * Story 5.1: SLA Policy Configuration
 *
 * GET: Returns a single SLA policy.
 * PUT: Updates an SLA policy (manager+ only).
 * DELETE: Deletes an SLA policy (manager+ only).
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ policyId: string }> }
) {
  try {
    const { policyId } = await params;
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

    // Fetch SLA policy
    const { data: policy, error: policyError } = await adminClient
      .from('sla_policies')
      .select('*')
      .eq('id', policyId)
      .eq('tenant_id', userData.tenant_id)
      .single();

    if (policyError || !policy) {
      return NextResponse.json(
        { error: 'SLA policy not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error('Unexpected error fetching SLA policy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ policyId: string }> }
) {
  try {
    const { policyId } = await params;
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

    // Only managers and owners can update SLA policies
    if (userData.role !== 'owner' && userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only managers and owners can update SLA policies' },
        { status: 403 }
      );
    }

    // Check policy exists and belongs to tenant
    const { data: existingPolicy, error: existingError } = await adminClient
      .from('sla_policies')
      .select('*')
      .eq('id', policyId)
      .eq('tenant_id', userData.tenant_id)
      .single();

    if (existingError || !existingPolicy) {
      return NextResponse.json(
        { error: 'SLA policy not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      priority,
      first_response_minutes,
      resolution_minutes,
      is_active,
    } = body;

    // Build update object
    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: 'Policy name cannot be empty' },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (priority !== undefined) {
      if (!VALID_PRIORITIES.includes(priority)) {
        return NextResponse.json(
          {
            error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`,
          },
          { status: 400 }
        );
      }

      // If changing priority and activating, check for conflicts
      if (
        priority !== existingPolicy.priority &&
        (is_active === true ||
          (is_active === undefined && existingPolicy.is_active))
      ) {
        const { data: conflictPolicy } = await adminClient
          .from('sla_policies')
          .select('id')
          .eq('tenant_id', userData.tenant_id)
          .eq('priority', priority)
          .eq('is_active', true)
          .neq('id', policyId)
          .maybeSingle();

        if (conflictPolicy) {
          return NextResponse.json(
            {
              error: `An active SLA policy for ${priority} priority already exists`,
            },
            { status: 409 }
          );
        }
      }
      updates.priority = priority;
    }

    if (first_response_minutes !== undefined) {
      if (
        typeof first_response_minutes !== 'number' ||
        first_response_minutes <= 0
      ) {
        return NextResponse.json(
          { error: 'First response time must be a positive number' },
          { status: 400 }
        );
      }
      updates.first_response_minutes = first_response_minutes;
    }

    if (resolution_minutes !== undefined) {
      if (typeof resolution_minutes !== 'number' || resolution_minutes <= 0) {
        return NextResponse.json(
          { error: 'Resolution time must be a positive number' },
          { status: 400 }
        );
      }
      updates.resolution_minutes = resolution_minutes;
    }

    // Validate resolution >= first_response with potentially updated values
    const finalFirstResponse =
      (updates.first_response_minutes as number) ??
      existingPolicy.first_response_minutes;
    const finalResolution =
      (updates.resolution_minutes as number) ??
      existingPolicy.resolution_minutes;

    if (finalResolution < finalFirstResponse) {
      return NextResponse.json(
        {
          error:
            'Resolution time must be greater than or equal to first response time',
        },
        { status: 400 }
      );
    }

    if (is_active !== undefined) {
      // If activating, check for conflicts
      if (is_active === true && !existingPolicy.is_active) {
        const targetPriority =
          (updates.priority as string) ?? existingPolicy.priority;
        const { data: conflictPolicy } = await adminClient
          .from('sla_policies')
          .select('id')
          .eq('tenant_id', userData.tenant_id)
          .eq('priority', targetPriority)
          .eq('is_active', true)
          .neq('id', policyId)
          .maybeSingle();

        if (conflictPolicy) {
          return NextResponse.json(
            {
              error: `An active SLA policy for ${targetPriority} priority already exists`,
            },
            { status: 409 }
          );
        }
      }
      updates.is_active = is_active;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update SLA policy
    const { data: policy, error: updateError } = await adminClient
      .from('sla_policies')
      .update(updates)
      .eq('id', policyId)
      .eq('tenant_id', userData.tenant_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating SLA policy:', updateError);
      return NextResponse.json(
        { error: 'Failed to update SLA policy' },
        { status: 500 }
      );
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error('Unexpected error updating SLA policy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ policyId: string }> }
) {
  try {
    const { policyId } = await params;
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

    // Only managers and owners can delete SLA policies
    if (userData.role !== 'owner' && userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only managers and owners can delete SLA policies' },
        { status: 403 }
      );
    }

    // Check policy exists and belongs to tenant
    const { data: existingPolicy, error: existingError } = await adminClient
      .from('sla_policies')
      .select('*')
      .eq('id', policyId)
      .eq('tenant_id', userData.tenant_id)
      .single();

    if (existingError || !existingPolicy) {
      return NextResponse.json(
        { error: 'SLA policy not found' },
        { status: 404 }
      );
    }

    // Delete the policy
    const { error: deleteError } = await adminClient
      .from('sla_policies')
      .delete()
      .eq('id', policyId)
      .eq('tenant_id', userData.tenant_id);

    if (deleteError) {
      console.error('Error deleting SLA policy:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete SLA policy' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error deleting SLA policy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
