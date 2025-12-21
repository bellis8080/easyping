/**
 * Public KB Articles API Endpoint
 * Story 4.3.5: KB Browse Page & Category Filtering
 * Story 4.4: Semantic Search with pgvector
 *
 * GET /api/kb/public/articles - List published KB articles for end users
 *
 * This is a PUBLIC endpoint (accessible to all authenticated users).
 * No role check required - any authenticated user can browse published KB articles.
 * Tenant isolation enforced at API layer (RLS disabled for Realtime compatibility).
 *
 * When search query provided, uses hybrid semantic+fulltext search for better results.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAIProvider, AIProviderType } from '@easyping/ai';

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
  searchType?: 'semantic' | 'fulltext' | 'none';
  success: boolean;
  error?: string;
}

/**
 * Generate excerpt from content (first 150 characters)
 * Optionally highlights search terms using <mark> tags
 */
function generateExcerpt(
  content: string,
  maxLength: number = 150,
  searchQuery?: string
): string {
  if (!content) return '';
  const plainText = content.replace(/[#*_`~\[\]]/g, '').trim(); // Remove markdown

  let excerpt: string;
  if (plainText.length <= maxLength) {
    excerpt = plainText;
  } else {
    excerpt = plainText.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }

  // Highlight search terms if provided
  if (searchQuery && searchQuery.length >= 2) {
    const words = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 2);
    for (const word of words) {
      // Case-insensitive replace with <mark> tags
      const regex = new RegExp(
        `(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
        'gi'
      );
      excerpt = excerpt.replace(regex, '<mark>$1</mark>');
    }
  }

  return excerpt;
}

/**
 * Attempts hybrid semantic+fulltext search
 * Returns null if semantic search is unavailable
 */
async function performHybridSearch(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  search: string,
  categoryId: string | null,
  page: number,
  limit: number
): Promise<{
  articles: PublicKBArticle[];
  total: number;
  searchType: 'semantic' | 'fulltext';
} | null> {
  try {
    // Get AI configuration
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('ai_config')
      .eq('id', tenantId)
      .single();

    if (!org?.ai_config) {
      return null;
    }

    const aiConfig = org.ai_config as {
      enabled?: boolean;
      encrypted_api_key?: string;
      provider?: string;
      model?: string;
      embedding_model?: string;
    };

    if (!aiConfig.enabled || !aiConfig.encrypted_api_key) {
      return null;
    }

    // Decrypt API key
    const { data: decryptedKey, error: decryptError } = await supabaseAdmin.rpc(
      'decrypt_api_key',
      {
        encrypted_key: aiConfig.encrypted_api_key,
        org_id: tenantId,
      }
    );

    if (decryptError || !decryptedKey) {
      return null;
    }

    // Create AI provider and generate query embedding
    const embeddingModel = aiConfig.embedding_model || 'text-embedding-3-small';
    const provider = createAIProvider(
      (aiConfig.provider || 'openai') as AIProviderType,
      {
        apiKey: decryptedKey,
        model: aiConfig.model || 'gpt-4o-mini',
        embeddingModel,
      }
    );

    const queryEmbedding = await provider.generateEmbedding(search);

    if (!queryEmbedding || queryEmbedding.length === 0) {
      return null;
    }

    // Format embedding for pgvector
    const embeddingString = `[${queryEmbedding.join(',')}]`;

    // Perform hybrid search - get more results to handle pagination
    const { data: results, error: searchError } = await supabaseAdmin.rpc(
      'search_kb_articles_hybrid',
      {
        query_embedding: embeddingString,
        search_text: search,
        p_tenant_id: tenantId,
        p_limit: 100, // Get more for pagination
      }
    );

    if (searchError || !results) {
      console.warn('[kb-public-articles] Hybrid search error:', searchError);
      return null;
    }

    // Filter by category if specified
    let filteredResults = results;
    if (categoryId) {
      filteredResults = results.filter(
        (r: { category_id: string | null }) => r.category_id === categoryId
      );
    }

    // Apply pagination
    const total = filteredResults.length;
    const from = (page - 1) * limit;
    const pagedResults = filteredResults.slice(from, from + limit);

    // Transform to API response format
    const articles: PublicKBArticle[] = pagedResults.map(
      (article: {
        id: string;
        title: string;
        slug: string;
        content_excerpt: string;
        category_id: string | null;
        category_name: string | null;
        view_count: number;
        helpful_count: number;
        not_helpful_count: number;
      }) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: generateExcerpt(article.content_excerpt, 150, search),
        categoryId: article.category_id,
        categoryName: article.category_name,
        viewCount: article.view_count || 0,
        helpfulCount: article.helpful_count || 0,
        notHelpfulCount: article.not_helpful_count || 0,
        updatedAt: new Date().toISOString(), // Hybrid search doesn't return updated_at
      })
    );

    return {
      articles,
      total,
      searchType: 'semantic',
    };
  } catch (error) {
    console.error('[kb-public-articles] Hybrid search error:', error);
    return null;
  }
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

    // Try hybrid semantic+fulltext search if there's a search query
    if (search && search.length >= 2) {
      const hybridResult = await performHybridSearch(
        supabaseAdmin,
        userProfile.tenant_id,
        search,
        categoryId,
        page,
        limit
      );

      if (hybridResult) {
        const hasMore =
          (page - 1) * limit + hybridResult.articles.length <
          hybridResult.total;

        return NextResponse.json({
          articles: hybridResult.articles,
          pagination: {
            page,
            limit,
            total: hybridResult.total,
            hasMore,
          },
          searchType: hybridResult.searchType,
          success: true,
        });
      }
      // Fall through to ilike search if hybrid search failed
    }

    // Build query for published articles only (fallback or no search)
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

    // Transform data (exclude agent_content, generate excerpt with highlighting)
    const articles: PublicKBArticle[] = (data || []).map((article: any) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: generateExcerpt(article.content, 150, search || undefined),
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
      searchType: search ? 'fulltext' : 'none',
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
