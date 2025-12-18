/**
 * KB Articles List & Create API Endpoint
 * Story 4.3.0: KB Article Editor for Agents
 *
 * GET /api/kb/articles - List articles by status
 * POST /api/kb/articles - Create new article (Task 13)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserRole, canViewPrivateMessages } from '@easyping/types';

interface KBArticleSummary {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  categoryId: string | null;
  categoryName: string | null;
  sourcePingId: string | null;
  sourcePingNumber: number | null;
  enhancesArticleId: string | null;
  createdAt: string;
  publishedAt: string | null;
  publishedBy: string | null;
  publishedByName: string | null;
  viewCount: number;
}

interface ListArticlesResponse {
  articles: KBArticleSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  success: boolean;
  error?: string;
}

interface CreateArticleResponse {
  article?: {
    id: string;
    title: string;
    slug: string;
    status: string;
  };
  success: boolean;
  error?: string;
}

/**
 * Generate URL-safe slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/-+/g, '-') // Multiple hyphens to single
    .replace(/^-|-$/g, ''); // Trim leading/trailing hyphens
}

/**
 * GET /api/kb/articles
 * List KB articles by status with pagination and search
 */
export async function GET(
  req: NextRequest
): Promise<NextResponse<ListArticlesResponse>> {
  try {
    // Authenticate user
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

    // Get user profile (users.id = auth.users.id)
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, role, tenant_id')
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

    // Only agents/managers/owners can access KB management
    if (!canViewPrivateMessages(userProfile.role as UserRole)) {
      return NextResponse.json(
        {
          articles: [],
          pagination: { page: 1, limit: 10, total: 0, hasMore: false },
          success: false,
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'draft';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '10', 10))
    );
    const search = searchParams.get('search') || '';

    const supabaseAdmin = createAdminClient();

    // Build query for articles
    let query = supabaseAdmin
      .from('kb_articles')
      .select(
        `
        id,
        title,
        slug,
        status,
        category_id,
        source_ping_id,
        enhances_article_id,
        created_at,
        published_at,
        published_by,
        view_count,
        categories(name),
        pings(ping_number),
        publisher:users!kb_articles_published_by_fkey(full_name)
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', userProfile.tenant_id)
      .is('deleted_at', null);

    // Filter by status
    if (status === 'archived') {
      // Archived = soft-deleted (deleted_at IS NOT NULL)
      query = supabaseAdmin
        .from('kb_articles')
        .select(
          `
          id,
          title,
          slug,
          status,
          category_id,
          source_ping_id,
          enhances_article_id,
          created_at,
          published_at,
          published_by,
          view_count,
          categories(name),
          pings(ping_number),
          publisher:users!kb_articles_published_by_fkey(full_name)
        `,
          { count: 'exact' }
        )
        .eq('tenant_id', userProfile.tenant_id)
        .not('deleted_at', 'is', null);
    } else {
      query = query.eq('status', status);
    }

    // Search by title
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Sort order
    if (status === 'published') {
      query = query.order('published_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching articles:', error);
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

    // Transform data
    const articles: KBArticleSummary[] = (data || []).map((article: any) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      status: article.status,
      categoryId: article.category_id,
      categoryName: article.categories?.name || null,
      sourcePingId: article.source_ping_id,
      sourcePingNumber: article.pings?.ping_number || null,
      enhancesArticleId: article.enhances_article_id,
      createdAt: article.created_at,
      publishedAt: article.published_at,
      publishedBy: article.published_by,
      publishedByName: article.publisher?.full_name || null,
      viewCount: article.view_count || 0,
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
    console.error('Error in articles list endpoint:', error);
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

/**
 * POST /api/kb/articles
 * Create a new KB article
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<CreateArticleResponse>> {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
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
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only agents/managers/owners can create KB articles
    if (!canViewPrivateMessages(userProfile.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, content, categoryId, agentContent, slug, status } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    // Content is required if publishing
    if (
      status === 'published' &&
      (!content || typeof content !== 'string' || content.trim().length === 0)
    ) {
      return NextResponse.json(
        { success: false, error: 'Content is required for publishing' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Generate unique slug (use provided slug or generate from title)
    const baseSlug = slug?.trim() ? generateSlug(slug) : generateSlug(title);
    let slugSuffix = 0;
    let uniqueSlug = baseSlug;

    // Check slug uniqueness
    while (true) {
      const { data: existing } = await supabaseAdmin
        .from('kb_articles')
        .select('id')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('slug', uniqueSlug)
        .single();

      if (!existing) break;
      slugSuffix++;
      uniqueSlug = `${baseSlug}-${slugSuffix}`;
    }

    // Determine status and publication fields
    const articleStatus = status === 'published' ? 'published' : 'draft';
    const now = new Date().toISOString();

    // Create article
    const { data: article, error: createError } = await supabaseAdmin
      .from('kb_articles')
      .insert({
        tenant_id: userProfile.tenant_id,
        title: title.trim(),
        slug: uniqueSlug,
        content: content?.trim() || '',
        agent_content: agentContent?.trim() || null,
        category_id: categoryId || null,
        status: articleStatus,
        created_by: userProfile.id,
        published_by: articleStatus === 'published' ? userProfile.id : null,
        published_at: articleStatus === 'published' ? now : null,
      })
      .select('id, title, slug, status')
      .single();

    if (createError || !article) {
      console.error('Error creating article:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create article' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        status: article.status,
      },
      success: true,
    });
  } catch (error) {
    console.error('Error in create article endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
