/**
 * Generate Embedding API Endpoint
 * Story 4.4: Semantic Search with pgvector
 *
 * POST /api/kb/articles/[articleId]/generate-embedding
 * Generates a vector embedding for a KB article using the configured AI provider.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canViewPrivateMessages, UserRole } from '@easyping/types';
import { createAIProvider, AIProviderType } from '@easyping/ai';

interface RouteParams {
  params: Promise<{ articleId: string }>;
}

interface GenerateEmbeddingResponse {
  success: boolean;
  error?: string;
  embedding?: {
    dimensions: number;
    generatedAt: string;
  };
}

// Maximum characters for embedding input to stay within token limits (~8K tokens)
const MAX_EMBEDDING_CHARS = 8000;

/**
 * Truncates text to stay within embedding token limits
 */
function truncateForEmbedding(title: string, content: string): string {
  const combined = `${title}\n\n${content}`;
  if (combined.length <= MAX_EMBEDDING_CHARS) {
    return combined;
  }
  // Truncate content, keeping full title
  const titleWithSeparator = `${title}\n\n`;
  const remainingChars = MAX_EMBEDDING_CHARS - titleWithSeparator.length;
  const truncatedContent = content.slice(0, remainingChars - 3) + '...';
  return titleWithSeparator + truncatedContent;
}

/**
 * POST /api/kb/articles/[articleId]/generate-embedding
 * Generate and store embedding for a KB article
 */
export async function POST(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<GenerateEmbeddingResponse>> {
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

    const { articleId } = await params;

    // Get user profile with role and tenant
    const adminClient = createAdminClient();
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

    // Check authorization - only agents/managers/owners can generate embeddings
    if (!canViewPrivateMessages(profile.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Fetch the article
    const { data: article, error: articleError } = await adminClient
      .from('kb_articles')
      .select('id, title, content, status, tenant_id')
      .eq('id', articleId)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (articleError || !article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    // Get AI configuration from organization
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
        '[generate-embedding] Failed to decrypt API key:',
        decryptError
      );
      return NextResponse.json(
        { success: false, error: 'Failed to decrypt AI configuration' },
        { status: 500 }
      );
    }

    // Create AI provider
    const provider = createAIProvider(
      (aiConfig.provider || 'openai') as AIProviderType,
      {
        apiKey: decryptedKey,
        model: aiConfig.model || 'gpt-4o-mini',
      }
    );

    // Prepare text for embedding
    const textForEmbedding = truncateForEmbedding(
      article.title,
      article.content
    );

    // Generate embedding
    let embedding: number[];
    try {
      embedding = await provider.generateEmbedding(textForEmbedding);
    } catch (aiError) {
      console.error('[generate-embedding] AI provider error:', aiError);
      return NextResponse.json(
        {
          success: false,
          error:
            aiError instanceof Error
              ? aiError.message
              : 'Failed to generate embedding',
        },
        { status: 500 }
      );
    }

    if (!embedding || embedding.length === 0) {
      return NextResponse.json(
        { success: false, error: 'AI provider returned empty embedding' },
        { status: 500 }
      );
    }

    // Store embedding in database
    // pgvector expects the embedding as a string formatted like '[0.1, 0.2, ...]'
    const embeddingString = `[${embedding.join(',')}]`;
    const generatedAt = new Date().toISOString();

    const { error: updateError } = await adminClient
      .from('kb_articles')
      .update({
        embedding: embeddingString,
        embedding_generated_at: generatedAt,
        updated_at: generatedAt,
      })
      .eq('id', articleId);

    if (updateError) {
      console.error(
        '[generate-embedding] Failed to store embedding:',
        updateError
      );
      return NextResponse.json(
        { success: false, error: 'Failed to store embedding' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      embedding: {
        dimensions: embedding.length,
        generatedAt,
      },
    });
  } catch (error) {
    console.error('[generate-embedding] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
