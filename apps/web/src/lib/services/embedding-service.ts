/**
 * Embedding Generation Service
 * Story 4.4: Semantic Search with pgvector
 *
 * Provides async embedding generation for KB articles.
 * Used by the publish workflow to generate embeddings in the background.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { createAIProvider, AIProviderType } from '@easyping/ai';

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
 * Triggers embedding generation for an article (fire-and-forget)
 *
 * @param articleId - UUID of the article
 * @param tenantId - UUID of the tenant/organization
 */
export async function triggerEmbeddingGeneration(
  articleId: string,
  tenantId: string
): Promise<void> {
  console.log(
    `[embedding-service] Starting embedding generation for article ${articleId}`
  );

  const adminClient = createAdminClient();

  try {
    // Fetch the article
    const { data: article, error: articleError } = await adminClient
      .from('kb_articles')
      .select('id, title, content')
      .eq('id', articleId)
      .eq('tenant_id', tenantId)
      .single();

    if (articleError || !article) {
      console.warn(`[embedding-service] Article not found: ${articleId}`);
      return;
    }

    // Get AI configuration from organization
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .select('ai_config')
      .eq('id', tenantId)
      .single();

    if (orgError || !org?.ai_config) {
      console.warn(
        `[embedding-service] AI not configured for tenant ${tenantId}`
      );
      return;
    }

    const aiConfig = org.ai_config as {
      enabled?: boolean;
      encrypted_api_key?: string;
      provider?: string;
      model?: string;
      embedding_model?: string;
    };

    if (!aiConfig.enabled || !aiConfig.encrypted_api_key) {
      console.warn(`[embedding-service] AI not enabled for tenant ${tenantId}`);
      return;
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
        '[embedding-service] Failed to decrypt API key:',
        decryptError
      );
      return;
    }

    // Create AI provider
    const embeddingModel = aiConfig.embedding_model || 'text-embedding-3-small';
    const provider = createAIProvider(
      (aiConfig.provider || 'openai') as AIProviderType,
      {
        apiKey: decryptedKey,
        model: aiConfig.model || 'gpt-4o-mini',
        embeddingModel,
      }
    );

    console.log(`[embedding-service] Using embedding model: ${embeddingModel}`);

    // Prepare text for embedding
    const textForEmbedding = truncateForEmbedding(
      article.title,
      article.content
    );

    // Generate embedding
    const embedding = await provider.generateEmbedding(textForEmbedding);

    if (!embedding || embedding.length === 0) {
      console.warn(
        `[embedding-service] Empty embedding returned for article ${articleId}`
      );
      return;
    }

    // Store embedding in database
    const embeddingString = `[${embedding.join(',')}]`;
    const generatedAt = new Date().toISOString();

    const { error: updateError } = await adminClient
      .from('kb_articles')
      .update({
        embedding: embeddingString,
        embedding_generated_at: generatedAt,
      })
      .eq('id', articleId);

    if (updateError) {
      console.error(
        '[embedding-service] Failed to store embedding:',
        updateError
      );
      return;
    }

    console.log(
      `[embedding-service] Embedding generated for article ${articleId} (${embedding.length} dimensions)`
    );
  } catch (error) {
    console.error(
      `[embedding-service] Error generating embedding for article ${articleId}:`,
      error
    );
    throw error;
  }
}
