/**
 * POST /api/categories/[id]/restore
 * Story 3.4: Category Management
 *
 * Restores an archived category. Manager+ only.
 * Enforces maximum 20 active categories.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_CATEGORIES = 20;

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

    // Only managers and owners can restore categories
    if (userData.role !== 'owner' && userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only managers and owners can restore categories' },
        { status: 403 }
      );
    }

    // Get category to verify it exists and is archived
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

    // Already active
    if (category.is_active) {
      return NextResponse.json(
        { error: 'Category is not archived' },
        { status: 400 }
      );
    }

    // Check active category count
    const { count: activeCount, error: countError } = await adminClient
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', userData.tenant_id)
      .eq('is_active', true);

    if (countError) {
      console.error('Error counting categories:', countError);
      return NextResponse.json(
        { error: 'Failed to check category count' },
        { status: 500 }
      );
    }

    if (activeCount && activeCount >= MAX_CATEGORIES) {
      return NextResponse.json(
        {
          error: `Maximum ${MAX_CATEGORIES} active categories allowed. Archive another category first.`,
        },
        { status: 400 }
      );
    }

    // Restore the category
    const { data: updatedCategory, error: updateError } = await adminClient
      .from('categories')
      .update({ is_active: true })
      .eq('id', id)
      .eq('tenant_id', userData.tenant_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error restoring category:', updateError);
      return NextResponse.json(
        { error: 'Failed to restore category' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Unexpected error restoring category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
