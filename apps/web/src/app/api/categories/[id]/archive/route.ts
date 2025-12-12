/**
 * POST /api/categories/[id]/archive
 * Story 3.4: Category Management
 *
 * Archives a category (soft delete). Manager+ only.
 * Cannot archive the default category.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Only managers and owners can archive categories
    if (userData.role !== 'owner' && userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only managers and owners can archive categories' },
        { status: 403 }
      );
    }

    // Get category to verify it exists and check if default
    const { data: category, error: categoryError } = await adminClient
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', userData.tenant_id)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Cannot archive the default category
    if (category.is_default) {
      return NextResponse.json(
        { error: 'Cannot archive the default category' },
        { status: 400 }
      );
    }

    // Already archived
    if (!category.is_active) {
      return NextResponse.json(
        { error: 'Category is already archived' },
        { status: 400 }
      );
    }

    // Archive the category
    const { data: updatedCategory, error: updateError } = await adminClient
      .from('categories')
      .update({ is_active: false })
      .eq('id', id)
      .eq('tenant_id', userData.tenant_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error archiving category:', updateError);
      return NextResponse.json(
        { error: 'Failed to archive category' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Unexpected error archiving category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
