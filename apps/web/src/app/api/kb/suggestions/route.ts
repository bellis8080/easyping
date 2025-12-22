/**
 * KB Suggestions API Endpoint
 * Story 4.6: KB Suggestions During Ping Creation
 *
 * GET /api/kb/suggestions?query=...
 * Returns top 3 KB articles matching the user's query for ping creation page.
 * Uses semantic search when AI is configured, falls back to fulltext.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAIProvider, AIProviderType } from '@easyping/ai';

interface SuggestionResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  categoryName: string | null;
}

interface SuggestionsResponse {
  success: boolean;
  suggestions: SuggestionResult[];
  totalCount: number;
  error?: string;
}

const MIN_QUERY_LENGTH = 10;
const MAX_SUGGESTIONS = 3;
const SIMILARITY_THRESHOLD = 0.1;

/**
 * Extracts an excerpt from content (first 150 chars)
 */
function extractExcerpt(content: string, maxLength = 150): string {
  // Remove markdown formatting
  const cleanContent = content
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();

  if (cleanContent.length <= maxLength) {
    return cleanContent;
  }

  return cleanContent.slice(0, maxLength).trim() + '...';
}

/**
 * GET /api/kb/suggestions
 * Get KB article suggestions based on user's query
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<SuggestionsResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim();

    // Skip search if query too short
    if (!query || query.length < MIN_QUERY_LENGTH) {
      return NextResponse.json({
        success: true,
        suggestions: [],
        totalCount: 0,
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
          suggestions: [],
          totalCount: 0,
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
          suggestions: [],
          totalCount: 0,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Try semantic search first, fall back to fulltext
    const result = await performSearch(adminClient, query, profile.tenant_id);

    return NextResponse.json({
      success: true,
      suggestions: result.suggestions,
      totalCount: result.totalCount,
    });
  } catch (error) {
    console.error('[kb-suggestions] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        suggestions: [],
        totalCount: 0,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Performs search (semantic with fallback to fulltext)
 */
async function performSearch(
  adminClient: ReturnType<typeof createAdminClient>,
  query: string,
  tenantId: string
): Promise<{ suggestions: SuggestionResult[]; totalCount: number }> {
  // Try semantic search first
  const semanticResults = await performSemanticSearch(
    adminClient,
    query,
    tenantId
  );

  if (semanticResults) {
    return semanticResults;
  }

  // Fallback to fulltext search
  return performFulltextSearch(adminClient, query, tenantId);
}

/**
 * Performs semantic search using pgvector
 */
async function performSemanticSearch(
  adminClient: ReturnType<typeof createAdminClient>,
  query: string,
  tenantId: string
): Promise<{ suggestions: SuggestionResult[]; totalCount: number } | null> {
  try {
    // Get AI configuration
    const { data: org } = await adminClient
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
    const { data: decryptedKey, error: decryptError } = await adminClient.rpc(
      'decrypt_api_key',
      {
        encrypted_key: aiConfig.encrypted_api_key,
        org_id: tenantId,
      }
    );

    if (decryptError || !decryptedKey) {
      console.warn('[kb-suggestions] Failed to decrypt API key');
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
      return null;
    }

    // Format embedding for pgvector
    const embeddingString = `[${queryEmbedding.join(',')}]`;

    // Get total count first (for "View all X results" link)
    const { data: allResults, error: countError } = await adminClient.rpc(
      'search_kb_semantic',
      {
        query_embedding: embeddingString,
        p_tenant_id: tenantId,
        p_limit: 20, // Get more to count total
        p_similarity_threshold: SIMILARITY_THRESHOLD,
      }
    );

    if (countError) {
      console.error('[kb-suggestions] Semantic count error:', countError);
      return null;
    }

    const totalCount = allResults?.length || 0;

    if (totalCount === 0) {
      return { suggestions: [], totalCount: 0 };
    }

    // Return top 3 suggestions
    const topResults = allResults.slice(0, MAX_SUGGESTIONS);

    const suggestions: SuggestionResult[] = topResults.map(
      (article: {
        id: string;
        title: string;
        slug: string;
        content: string;
        category_name: string | null;
      }) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: extractExcerpt(article.content),
        categoryName: article.category_name,
      })
    );

    return { suggestions, totalCount };
  } catch (error) {
    console.error('[kb-suggestions] Semantic search error:', error);
    return null;
  }
}

/**
 * Performs full-text search as fallback
 */
async function performFulltextSearch(
  adminClient: ReturnType<typeof createAdminClient>,
  query: string,
  tenantId: string
): Promise<{ suggestions: SuggestionResult[]; totalCount: number }> {
  try {
    // Get total count
    const { data: allResults, error: countError } = await adminClient.rpc(
      'search_similar_kb_articles',
      {
        p_search_terms: query,
        p_tenant_id: tenantId,
        p_limit: 20,
      }
    );

    if (countError) {
      console.error('[kb-suggestions] Fulltext count error:', countError);
      return { suggestions: [], totalCount: 0 };
    }

    const totalCount = allResults?.length || 0;

    if (totalCount === 0) {
      return { suggestions: [], totalCount: 0 };
    }

    // Return top 3 suggestions
    const topResults = allResults.slice(0, MAX_SUGGESTIONS);

    const suggestions: SuggestionResult[] = topResults.map(
      (article: {
        id: string;
        title: string;
        slug: string;
        content: string;
        category_name: string | null;
      }) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: extractExcerpt(article.content),
        categoryName: article.category_name,
      })
    );

    return { suggestions, totalCount };
  } catch (error) {
    console.error('[kb-suggestions] Fulltext search error:', error);
    return { suggestions: [], totalCount: 0 };
  }
}
