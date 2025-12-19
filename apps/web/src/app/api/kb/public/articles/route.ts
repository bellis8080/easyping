/**
 * Public KB Articles API Endpoint
 * Story 4.3.5: KB Browse Page & Category Filtering
 *
 * GET /api/kb/public/articles - List published KB articles for end users
 *
 * This is a PUBLIC endpoint (accessible to all authenticated users).
 * No role check required - any authenticated user can browse published KB articles.
 * Tenant isolation enforced at API layer (RLS disabled for Realtime compatibility).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface PublicKBArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  categoryId: string | null;
  categoryName: string | null;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  updatedAt: string;
}

interface ListPublicArticlesResponse {
  articles: PublicKBArticle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  success: boolean;
  error?: string;
}

/**
 * Generate excerpt from content (first 150 characters)
 */
function generateExcerpt(content: string, maxLength: number = 150): string {
  if (!content) return '';
  const plainText = content.replace(/[#*_`~\[\]]/g, '').trim(); // Remove markdown
  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

/**
 * GET /api/kb/public/articles
 * List published KB articles for end users
 *
 * Query params:
 * - search: Search term (matches title or content via ilike)
 * - category: Category ID filter
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 10, max: 50)
 */
export async function GET(
  req: NextRequest
): Promise<NextResponse<ListPublicArticlesResponse>> {
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
          articles: [],
          pagination: { page: 1, limit: 10, total: 0, hasMore: false },
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
          articles: [],
          pagination: { page: 1, limit: 10, total: 0, hasMore: false },
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const categoryId = searchParams.get('category') || null;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get('limit') || '10', 10))
    );

    const supabaseAdmin = createAdminClient();

    // Build query for published articles only
    let query = supabaseAdmin
      .from('kb_articles')
      .select(
        `
        id,
        title,
        slug,
        content,
        category_id,
        view_count,
        helpful_count,
        not_helpful_count,
        updated_at,
        categories(name)
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', userProfile.tenant_id)
      .eq('status', 'published')
      .is('deleted_at', null);

    // Filter by category
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    // Search by title or content (using ilike for full-text search)
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // Order by updated_at DESC
    query = query.order('updated_at', { ascending: false });

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching public articles:', error);
      return NextResponse.json(
        {
          articles: [],
          pagination: { page, limit, total: 0, hasMore: false },
          success: false,
          error: 'Failed to fetch articles',
        },
        { status: 500 }
      );
    }

    // Transform data (exclude agent_content, generate excerpt)
    const articles: PublicKBArticle[] = (data || []).map((article: any) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: generateExcerpt(article.content),
      categoryId: article.category_id,
      categoryName: article.categories?.name || null,
      viewCount: article.view_count || 0,
      helpfulCount: article.helpful_count || 0,
      notHelpfulCount: article.not_helpful_count || 0,
      updatedAt: article.updated_at,
    }));

    const total = count || 0;
    const hasMore = from + articles.length < total;

    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
      success: true,
    });
  } catch (error) {
    console.error('Error in public articles endpoint:', error);
    return NextResponse.json(
      {
        articles: [],
        pagination: { page: 1, limit: 10, total: 0, hasMore: false },
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
