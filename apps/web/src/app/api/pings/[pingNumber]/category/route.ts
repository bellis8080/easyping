/**
 * PUT /api/pings/[pingNumber]/category
 * Updates the category of a ping
 *
 * Only agents can update ping categories
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ pingNumber: string }> }
) {
  try {
    const { pingNumber } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only agents can update categories
    if (userProfile.role === 'end_user') {
      return NextResponse.json(
        { error: 'Only agents can update categories' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { categoryId } = body;

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // Verify category exists and belongs to the same tenant
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, color, icon')
      .eq('id', categoryId)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Get the ping
    const { data: ping, error: pingError } = await supabase
      .from('pings')
      .select('id')
      .eq('ping_number', parseInt(pingNumber))
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (pingError || !ping) {
      return NextResponse.json({ error: 'Ping not found' }, { status: 404 });
    }

    // Update the ping category using admin client (bypass RLS)
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: updateError } = await supabaseAdmin
      .from('pings')
      .update({
        category_id: categoryId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ping.id);

    if (updateError) {
      console.error('Error updating ping category:', updateError);
      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      category: {
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
      },
    });
  } catch (error) {
    console.error('Error in category update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
