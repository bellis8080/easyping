/**
 * KB Semantic Search API Endpoint
 * Story 4.4: Semantic Search with pgvector
 *
 * GET /api/kb/search?query=...
 * Performs semantic search on KB articles using embeddings.
 * Falls back to full-text search if AI unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAIProvider, AIProviderType } from '@easyping/ai';

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  categoryId: string | null;
  categoryName: string | null;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  similarityScore: number;
  searchType: 'semantic' | 'fulltext';
}

interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  searchType: 'semantic' | 'fulltext';
  error?: string;
}

/**
 * Extracts an excerpt from content around potential keyword matches
 */
function extractExcerpt(
  content: string,
  query: string,
  maxLength = 200
): string {
  // Remove markdown formatting
  const cleanContent = content
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();

  // Try to find a relevant section based on query words
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  let bestStart = 0;
  let bestScore = 0;

  for (let i = 0; i < cleanContent.length - maxLength; i += 20) {
    const section = cleanContent.slice(i, i + maxLength).toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      if (section.includes(word)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }

  // Extract and clean up excerpt
  let excerpt = cleanContent.slice(bestStart, bestStart + maxLength);
  if (bestStart > 0) excerpt = '...' + excerpt;
  if (bestStart + maxLength < cleanContent.length) excerpt = excerpt + '...';

  return excerpt;
}

/**
 * GET /api/kb/search
 * Search KB articles using semantic similarity or full-text search
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<SearchResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        results: [],
        searchType: 'semantic',
      });
    }

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          results: [],
          searchType: 'fulltext',
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // Get user profile
    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          success: false,
          results: [],
          searchType: 'fulltext',
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Try semantic search first
    const semanticResults = await performSemanticSearch(
      adminClient,
      query,
      profile.tenant_id,
      limit
    );

    if (semanticResults) {
      return NextResponse.json({
        success: true,
        results: semanticResults,
        searchType: 'semantic',
      });
    }

    // Fallback to full-text search
    const fulltextResults = await performFulltextSearch(
      adminClient,
      query,
      profile.tenant_id,
      limit
    );

    return NextResponse.json({
      success: true,
      results: fulltextResults,
      searchType: 'fulltext',
    });
  } catch (error) {
    console.error('[kb-search] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        results: [],
        searchType: 'fulltext',
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Performs semantic search using pgvector
 * Returns null if semantic search is unavailable
 */
async function performSemanticSearch(
  adminClient: ReturnType<typeof createAdminClient>,
  query: string,
  tenantId: string,
  limit: number
): Promise<SearchResult[] | null> {
  try {
    // Get AI configuration
    const { data: org } = await adminClient
      .from('organizations')
      .select('ai_config')
      .eq('id', tenantId)
      .single();

    if (!org?.ai_config) {
      console.log('[kb-search] AI not configured, falling back to fulltext');
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
      console.log('[kb-search] AI disabled, falling back to fulltext');
      return null;
    }

    // Decrypt API key
    const { data: decryptedKey, error: decryptError } = await adminClient.rpc(
      'decrypt_api_key',
      {
        encrypted_key: aiConfig.encrypted_api_key,
        org_id: tenantId,
      }
    );

    if (decryptError || !decryptedKey) {
      console.warn(
        '[kb-search] Failed to decrypt API key, falling back to fulltext'
      );
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

    const queryEmbedding = await provider.generateEmbedding(query);

    if (!queryEmbedding || queryEmbedding.length === 0) {
      console.warn(
        '[kb-search] Empty query embedding, falling back to fulltext'
      );
      return null;
    }

    // Format embedding for pgvector
    const embeddingString = `[${queryEmbedding.join(',')}]`;

    // Perform semantic search using RPC function
    console.log(
      `[kb-search] Executing semantic search for query: "${query}" with ${queryEmbedding.length} dimensions`
    );

    const { data: similarArticles, error: rawError } = await adminClient.rpc(
      'search_kb_semantic',
      {
        query_embedding: embeddingString,
        p_tenant_id: tenantId,
        p_limit: limit,
        p_similarity_threshold: 0.1, // Lower threshold to catch more relevant results
      }
    );

    if (rawError) {
      console.log('[kb-search] Semantic search error:', rawError.message);
      return null;
    }

    console.log(
      `[kb-search] Semantic search returned ${similarArticles?.length || 0} results`
    );

    if (!similarArticles || similarArticles.length === 0) {
      return null;
    }

    // Transform results
    return similarArticles.map(
      (article: {
        id: string;
        title: string;
        slug: string;
        content: string;
        category_id: string | null;
        category_name: string | null;
        view_count: number;
        helpful_count: number;
        not_helpful_count: number;
        similarity: number;
      }) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: extractExcerpt(article.content, query),
        categoryId: article.category_id,
        categoryName: article.category_name,
        viewCount: article.view_count,
        helpfulCount: article.helpful_count,
        notHelpfulCount: article.not_helpful_count,
        similarityScore: article.similarity,
        searchType: 'semantic' as const,
      })
    );
  } catch (error) {
    console.error('[kb-search] Semantic search error:', error);
    return null;
  }
}

/**
 * Performs full-text search using PostgreSQL ts_rank
 */
async function performFulltextSearch(
  adminClient: ReturnType<typeof createAdminClient>,
  query: string,
  tenantId: string,
  limit: number
): Promise<SearchResult[]> {
  try {
    // Use the existing RPC function
    const { data: articles, error } = await adminClient.rpc(
      'search_similar_kb_articles',
      {
        p_search_terms: query,
        p_tenant_id: tenantId,
        p_limit: limit,
      }
    );

    if (error) {
      console.error('[kb-search] Fulltext search error:', error);
      return [];
    }

    if (!articles || articles.length === 0) {
      return [];
    }

    return articles.map(
      (article: {
        id: string;
        title: string;
        slug: string;
        content: string;
        category_id: string | null;
        category_name: string | null;
        view_count: number;
        helpful_count: number;
        similarity_score: number;
      }) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: extractExcerpt(article.content, query),
        categoryId: article.category_id,
        categoryName: article.category_name,
        viewCount: article.view_count,
        helpfulCount: article.helpful_count,
        notHelpfulCount: 0,
        similarityScore: article.similarity_score,
        searchType: 'fulltext' as const,
      })
    );
  } catch (error) {
    console.error('[kb-search] Fulltext search error:', error);
    return [];
  }
}
