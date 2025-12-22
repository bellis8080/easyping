/**
 * GET /api/pings/[pingNumber]/kb-suggestions
 * Story 4.8: KB Article Suggestions During Resolution
 *
 * Returns KB article suggestions based on ping title + AI summary.
 * Used by Echo panel to suggest relevant KB articles to agents.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAIProvider, AIProviderType } from '@easyping/ai';

interface KBSuggestion {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  categoryName: string | null;
}

interface KBSuggestionsResponse {
  success: boolean;
  suggestions: KBSuggestion[];
  message?: string;
}

const MAX_SUGGESTIONS = 3;
const SIMILARITY_THRESHOLD = 0.5;

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pingNumber: string }> }
): Promise<NextResponse<KBSuggestionsResponse>> {
  try {
    const { pingNumber } = await params;

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, suggestions: [], message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // Get user profile and role
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, suggestions: [], message: 'User not found' },
        { status: 404 }
      );
    }

    // Only agents, managers, and owners can get KB suggestions
    if (!['agent', 'manager', 'owner'].includes(userData.role)) {
      return NextResponse.json(
        {
          success: false,
          suggestions: [],
          message: 'Only agents can view KB suggestions',
        },
        { status: 403 }
      );
    }

    const tenantId = userData.tenant_id;

    // Fetch ping with title and ai_summary
    const { data: ping, error: pingError } = await adminClient
      .from('pings')
      .select('id, title, ai_summary')
      .eq('ping_number', parseInt(pingNumber))
      .eq('tenant_id', tenantId)
      .single();

    if (pingError || !ping) {
      return NextResponse.json(
        { success: false, suggestions: [], message: 'Ping not found' },
        { status: 404 }
      );
    }

    // If no AI summary yet, return empty with message
    if (!ping.ai_summary) {
      return NextResponse.json({
        success: true,
        suggestions: [],
        message: 'Waiting for AI summary...',
      });
    }

    // Combine title + AI summary for semantic search
    const searchQuery = `${ping.title} ${ping.ai_summary}`.trim();

    // Get AI configuration for embedding generation
    const { data: org } = await adminClient
      .from('organizations')
      .select('ai_config')
      .eq('id', tenantId)
      .single();

    if (!org?.ai_config) {
      return NextResponse.json({
        success: true,
        suggestions: [],
        message: 'AI not configured',
      });
    }

    const aiConfig = org.ai_config as {
      enabled?: boolean;
      encrypted_api_key?: string;
      provider?: string;
      model?: string;
      embedding_model?: string;
    };

    if (!aiConfig.enabled || !aiConfig.encrypted_api_key) {
      return NextResponse.json({
        success: true,
        suggestions: [],
        message: 'AI not enabled',
      });
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
      console.error(
        '[kb-suggestions] Failed to decrypt API key:',
        decryptError
      );
      return NextResponse.json({
        success: true,
        suggestions: [],
        message: 'AI configuration error',
      });
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

    const queryEmbedding = await provider.generateEmbedding(searchQuery);

    if (!queryEmbedding || queryEmbedding.length === 0) {
      return NextResponse.json({
        success: true,
        suggestions: [],
        message: 'Failed to generate embedding',
      });
    }

    // Format embedding for pgvector
    const embeddingString = `[${queryEmbedding.join(',')}]`;

    // Search for similar KB articles
    const { data: results, error: searchError } = await adminClient.rpc(
      'search_kb_semantic',
      {
        query_embedding: embeddingString,
        p_tenant_id: tenantId,
        p_limit: MAX_SUGGESTIONS,
        p_similarity_threshold: SIMILARITY_THRESHOLD,
      }
    );

    if (searchError) {
      console.error('[kb-suggestions] Semantic search error:', searchError);
      return NextResponse.json({
        success: true,
        suggestions: [],
        message: 'Search failed',
      });
    }

    if (!results || results.length === 0) {
      return NextResponse.json({
        success: true,
        suggestions: [],
        message: 'No relevant articles found',
      });
    }

    // Map results to suggestions
    const suggestions: KBSuggestion[] = results.map(
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

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error('[kb-suggestions] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        suggestions: [],
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
