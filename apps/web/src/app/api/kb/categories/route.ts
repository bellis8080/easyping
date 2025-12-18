/**
 * KB Categories API Endpoint
 * Story 4.3.0: KB Article Editor for Agents - Task 8
 *
 * GET /api/kb/categories - List all categories for tenant
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canViewPrivateMessages, UserRole } from '@easyping/types';

interface KBCategory {
  id: string;
  name: string;
  description: string | null;
  articleCount: number;
  sortOrder: number;
}

interface ListCategoriesResponse {
  categories: KBCategory[];
  success: boolean;
  error?: string;
}

/**
 * GET /api/kb/categories
 * List all KB categories for the tenant
 */
export async function GET(): Promise<NextResponse<ListCategoriesResponse>> {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { categories: [], success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile (users.id = auth.users.id)
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { categories: [], success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only agents/managers/owners can access KB categories for management
    if (!canViewPrivateMessages(userProfile.role as UserRole)) {
      return NextResponse.json(
        { categories: [], success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Fetch categories with article counts
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('categories')
      .select('id, name, description, sort_order')
      .eq('tenant_id', userProfile.tenant_id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return NextResponse.json(
        { categories: [], success: false, error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    // Get article counts for each category
    const categoryIds = (categories || []).map((c) => c.id);

    let articleCounts: Record<string, number> = {};
    if (categoryIds.length > 0) {
      const { data: countData } = await supabaseAdmin
        .from('kb_articles')
        .select('category_id')
        .eq('tenant_id', userProfile.tenant_id)
        .in('category_id', categoryIds)
        .is('deleted_at', null);

      if (countData) {
        articleCounts = countData.reduce(
          (
            acc: Record<string, number>,
            item: { category_id: string | null }
          ) => {
            if (item.category_id) {
              acc[item.category_id] = (acc[item.category_id] || 0) + 1;
            }
            return acc;
          },
          {}
        );
      }
    }

    // Transform response
    const transformedCategories: KBCategory[] = (categories || []).map(
      (cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        articleCount: articleCounts[cat.id] || 0,
        sortOrder: cat.sort_order || 0,
      })
    );

    return NextResponse.json({
      categories: transformedCategories,
      success: true,
    });
  } catch (error) {
    console.error('Error in categories endpoint:', error);
    return NextResponse.json(
      { categories: [], success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
