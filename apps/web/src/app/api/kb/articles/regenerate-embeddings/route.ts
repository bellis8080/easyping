/**
 * Regenerate Embeddings API Endpoint
 * Story 4.4: Semantic Search with pgvector
 *
 * POST /api/kb/articles/regenerate-embeddings
 * Batch processes published articles without embeddings.
 * Rate limited to avoid API throttling.
 *
 * Owner role required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserRole } from '@easyping/types';
import { createAIProvider, AIProviderType } from '@easyping/ai';

interface RegenerateEmbeddingsResponse {
  success: boolean;
  error?: string;
  progress?: {
    processed: number;
    failed: number;
    remaining: number;
    total: number;
  };
  failedArticles?: Array<{ id: string; title: string; error: string }>;
}

// Maximum characters for embedding input
const MAX_EMBEDDING_CHARS = 8000;

// Rate limit: process articles per batch (keep low to avoid API throttling)
const BATCH_SIZE = 5;

/**
 * Truncates text for embedding generation
 */
function truncateForEmbedding(title: string, content: string): string {
  const combined = `${title}\n\n${content}`;
  if (combined.length <= MAX_EMBEDDING_CHARS) {
    return combined;
  }
  const titleWithSeparator = `${title}\n\n`;
  const remainingChars = MAX_EMBEDDING_CHARS - titleWithSeparator.length;
  const truncatedContent = content.slice(0, remainingChars - 3) + '...';
  return titleWithSeparator + truncatedContent;
}

/**
 * POST /api/kb/articles/regenerate-embeddings
 * Batch regenerate embeddings for published articles
 *
 * Query params:
 * - force: If true, regenerate embeddings even for articles that have them
 * - limit: Maximum number of articles to process (default: BATCH_SIZE)
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<RegenerateEmbeddingsResponse>> {
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

    const adminClient = createAdminClient();

    // Get user profile with role
    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('id, tenant_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Require owner role for batch operations
    if (profile.role !== UserRole.OWNER) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - owner role required' },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    const limit = Math.min(
      20,
      Math.max(1, parseInt(searchParams.get('limit') || String(BATCH_SIZE), 10))
    );

    // Get AI configuration
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .select('ai_config')
      .eq('id', profile.tenant_id)
      .single();

    if (orgError || !org?.ai_config) {
      return NextResponse.json(
        { success: false, error: 'AI configuration not found' },
        { status: 400 }
      );
    }

    const aiConfig = org.ai_config as {
      enabled?: boolean;
      encrypted_api_key?: string;
      provider?: string;
      model?: string;
    };

    if (!aiConfig.enabled || !aiConfig.encrypted_api_key) {
      return NextResponse.json(
        { success: false, error: 'AI is not configured for this organization' },
        { status: 400 }
      );
    }

    // Decrypt API key
    const { data: decryptedKey, error: decryptError } = await adminClient.rpc(
      'decrypt_api_key',
      {
        encrypted_key: aiConfig.encrypted_api_key,
        org_id: profile.tenant_id,
      }
    );

    if (decryptError || !decryptedKey) {
      console.error(
        '[regenerate-embeddings] Failed to decrypt API key:',
        decryptError
      );
      return NextResponse.json(
        { success: false, error: 'Failed to decrypt AI configuration' },
        { status: 500 }
      );
    }

    // Build query for articles needing embeddings
    let articlesQuery = adminClient
      .from('kb_articles')
      .select('id, title, content')
      .eq('tenant_id', profile.tenant_id)
      .eq('status', 'published')
      .is('deleted_at', null);

    // If not forcing, only get articles without embeddings
    if (!force) {
      articlesQuery = articlesQuery.is('embedding', null);
    }

    articlesQuery = articlesQuery.limit(limit);

    const { data: articles, error: articlesError } = await articlesQuery;

    if (articlesError) {
      console.error(
        '[regenerate-embeddings] Error fetching articles:',
        articlesError
      );
      return NextResponse.json(
        { success: false, error: 'Failed to fetch articles' },
        { status: 500 }
      );
    }

    if (!articles || articles.length === 0) {
      // Count total articles to provide progress
      const { count: totalCount } = await adminClient
        .from('kb_articles')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'published')
        .is('deleted_at', null);

      return NextResponse.json({
        success: true,
        progress: {
          processed: 0,
          failed: 0,
          remaining: 0,
          total: totalCount || 0,
        },
      });
    }

    // Create AI provider
    const provider = createAIProvider(
      (aiConfig.provider || 'openai') as AIProviderType,
      {
        apiKey: decryptedKey,
        model: aiConfig.model || 'gpt-4o-mini',
      }
    );

    // Process articles
    let processed = 0;
    let failed = 0;
    const failedArticles: Array<{ id: string; title: string; error: string }> =
      [];

    for (const article of articles) {
      try {
        // Prepare text for embedding
        const textForEmbedding = truncateForEmbedding(
          article.title,
          article.content
        );

        // Generate embedding
        const embedding = await provider.generateEmbedding(textForEmbedding);

        if (!embedding || embedding.length === 0) {
          throw new Error('Empty embedding returned');
        }

        // Store embedding
        const embeddingString = `[${embedding.join(',')}]`;
        const generatedAt = new Date().toISOString();

        const { error: updateError } = await adminClient
          .from('kb_articles')
          .update({
            embedding: embeddingString,
            embedding_generated_at: generatedAt,
            updated_at: generatedAt,
          })
          .eq('id', article.id);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        processed++;
      } catch (error) {
        failed++;
        failedArticles.push({
          id: article.id,
          title: article.title,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.warn(
          `[regenerate-embeddings] Failed for article ${article.id}:`,
          error
        );
      }
    }

    // Count remaining articles without embeddings
    const { count: remainingCount } = await adminClient
      .from('kb_articles')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id)
      .eq('status', 'published')
      .is('deleted_at', null)
      .is('embedding', null);

    // Count total published articles
    const { count: totalCount } = await adminClient
      .from('kb_articles')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id)
      .eq('status', 'published')
      .is('deleted_at', null);

    return NextResponse.json({
      success: true,
      progress: {
        processed,
        failed,
        remaining: remainingCount || 0,
        total: totalCount || 0,
      },
      ...(failedArticles.length > 0 && { failedArticles }),
    });
  } catch (error) {
    console.error('[regenerate-embeddings] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
