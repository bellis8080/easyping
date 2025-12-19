/**
 * Public KB Popular Articles API Endpoint
 * Story 4.3.5: KB Browse Page & Category Filtering
 *
 * GET /api/kb/public/popular - List top popular articles by view count
 *
 * This is a PUBLIC endpoint (accessible to all authenticated users).
 * No role check required - any authenticated user can browse popular KB articles.
 * Tenant isolation enforced at API layer (RLS disabled for Realtime compatibility).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface PopularKBArticle {
  id: string;
  title: string;
  slug: string;
  viewCount: number;
}

interface ListPopularArticlesResponse {
  articles: PopularKBArticle[];
  success: boolean;
  error?: string;
}

/**
 * GET /api/kb/public/popular
 * List top popular articles by view count
 *
 * Query params:
 * - limit: Number of articles to return (default: 5, max: 10)
 */
export async function GET(
  req: NextRequest
): Promise<NextResponse<ListPopularArticlesResponse>> {
  try {
    // Authenticate user (any role can access)
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { articles: [], success: false, error: 'Unauthorized' },
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
        { articles: [], success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      10,
      Math.max(1, parseInt(searchParams.get('limit') || '5', 10))
    );

    const supabaseAdmin = createAdminClient();

    // Get top articles by view count
    const { data, error } = await supabaseAdmin
      .from('kb_articles')
      .select('id, title, slug, view_count')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('view_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching popular articles:', error);
      return NextResponse.json(
        {
          articles: [],
          success: false,
          error: 'Failed to fetch popular articles',
        },
        { status: 500 }
      );
    }

    // Transform data
    const articles: PopularKBArticle[] = (data || []).map((article: any) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      viewCount: article.view_count || 0,
    }));

    return NextResponse.json({
      articles,
      success: true,
    });
  } catch (error) {
    console.error('Error in popular articles endpoint:', error);
    return NextResponse.json(
      { articles: [], success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
