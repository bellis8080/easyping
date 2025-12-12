/**
 * GET/PUT /api/organization/profile
 * Story 3.4: Organization Profile & Category Management
 *
 * Gets or updates the organization's support profile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to find tenant
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get organization
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .select('id, name, support_profile')
      .eq('id', profile.tenant_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      organization_id: org.id,
      organization_name: org.name,
      support_profile: org.support_profile,
    });
  } catch (error) {
    console.error('Error fetching organization profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only owners can update the support profile
    if (profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can update the support profile' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { support_profile } = body;

    if (!support_profile) {
      return NextResponse.json(
        { error: 'support_profile is required' },
        { status: 400 }
      );
    }

    // Update organization
    const { error: updateError } = await adminClient
      .from('organizations')
      .update({
        support_profile: {
          ...support_profile,
          updated_at: new Date().toISOString(),
          created_at: support_profile.created_at || new Date().toISOString(),
        },
      })
      .eq('id', profile.tenant_id);

    if (updateError) {
      console.error('Error updating organization profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update organization profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating organization profile:', error);
    return NextResponse.json(
      { error: 'Failed to update organization profile' },
      { status: 500 }
    );
  }
}
