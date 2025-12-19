/**
 * Public KB Categories API Endpoint
 * Story 4.3.5: KB Browse Page & Category Filtering
 *
 * GET /api/kb/public/categories - List categories with published article counts
 *
 * This is a PUBLIC endpoint (accessible to all authenticated users).
 * No role check required - any authenticated user can browse KB categories.
 * Tenant isolation enforced at API layer (RLS disabled for Realtime compatibility).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface PublicKBCategory {
  id: string;
  name: string;
  articleCount: number;
}

interface ListPublicCategoriesResponse {
  categories: PublicKBCategory[];
  totalArticles: number;
  success: boolean;
  error?: string;
}

/**
 * GET /api/kb/public/categories
 * List categories with published article counts for end users
 *
 * Only returns categories that have at least one published article.
 * Counts only published articles (status = 'published', deleted_at IS NULL).
 */
export async function GET(): Promise<
  NextResponse<ListPublicCategoriesResponse>
> {
  try {
    // Authenticate user (any role can access)
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          categories: [],
          totalArticles: 0,
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Get user profile to get tenant_id
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        {
          categories: [],
          totalArticles: 0,
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Get all published articles with their categories
    const { data: articles, error: articlesError } = await supabaseAdmin
      .from('kb_articles')
      .select('category_id, categories(id, name)')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('status', 'published')
      .is('deleted_at', null);

    if (articlesError) {
      console.error('Error fetching articles for categories:', articlesError);
      return NextResponse.json(
        {
          categories: [],
          totalArticles: 0,
          success: false,
          error: 'Failed to fetch categories',
        },
        { status: 500 }
      );
    }

    // Count articles per category
    const categoryCounts: Record<string, { name: string; count: number }> = {};
    let totalArticles = 0;

    (articles || []).forEach((article: any) => {
      totalArticles++;
      if (article.category_id && article.categories) {
        const catId = article.category_id;
        if (!categoryCounts[catId]) {
          categoryCounts[catId] = {
            name: article.categories.name,
            count: 0,
          };
        }
        categoryCounts[catId].count++;
      }
    });

    // Transform to array and sort by name
    const categories: PublicKBCategory[] = Object.entries(categoryCounts)
      .map(([id, data]) => ({
        id,
        name: data.name,
        articleCount: data.count,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      categories,
      totalArticles,
      success: true,
    });
  } catch (error) {
    console.error('Error in public categories endpoint:', error);
    return NextResponse.json(
      {
        categories: [],
        totalArticles: 0,
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
