/**
 * POST /api/categories/reorder
 * Story 3.4: Category Management
 *
 * Reorders categories by updating their sort_order. Manager+ only.
 * Expects an array of category IDs in the desired order.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const reorderSchema = z.object({
  categoryIds: z
    .array(z.string().uuid())
    .min(1, 'At least one category ID required'),
});

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

    // Only managers and owners can reorder categories
    if (userData.role !== 'owner' && userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only managers and owners can reorder categories' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { categoryIds } = parsed.data;

    // Verify all categories exist and belong to this tenant
    const { data: existingCategories, error: fetchError } = await adminClient
      .from('categories')
      .select('id')
      .eq('tenant_id', userData.tenant_id)
      .in('id', categoryIds);

    if (fetchError) {
      console.error('Error fetching categories:', fetchError);
      return NextResponse.json(
        { error: 'Failed to verify categories' },
        { status: 500 }
      );
    }

    const existingIds = new Set(existingCategories?.map((c) => c.id) || []);
    const invalidIds = categoryIds.filter((id) => !existingIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          error:
            'Some categories not found or do not belong to your organization',
        },
        { status: 400 }
      );
    }

    // Update sort_order for each category
    const updates = categoryIds.map((id, index) => ({
      id,
      sort_order: (index + 1) * 10, // 10, 20, 30, etc.
    }));

    // Use a transaction-like approach with individual updates
    for (const update of updates) {
      const { error: updateError } = await adminClient
        .from('categories')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id)
        .eq('tenant_id', userData.tenant_id);

      if (updateError) {
        console.error('Error updating category order:', updateError);
        return NextResponse.json(
          { error: 'Failed to update category order' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error reordering categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
