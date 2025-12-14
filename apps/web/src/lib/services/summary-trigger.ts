/**
 * Summary Trigger Helper
 * Story 3.6: AI-Pinned Ping Summaries
 *
 * Helper to trigger summary regeneration in fire-and-forget mode.
 * Used by messages and status routes to avoid blocking the response.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  generatePingSummary,
  type SummaryMessage,
  type PingSummaryConfig,
  type PingSummaryContext,
} from './ping-summary-service';

/**
 * Checks if summary should be regenerated based on message count
 * Returns true if 3+ messages have been added since last summary update
 */
export async function shouldRegenerateSummary(
  supabase: SupabaseClient,
  pingId: string,
  summaryUpdatedAt: string | null
): Promise<boolean> {
  // Count messages added after summary_updated_at
  let query = supabase
    .from('ping_messages')
    .select('id', { count: 'exact', head: true })
    .eq('ping_id', pingId);

  if (summaryUpdatedAt) {
    query = query.gt('created_at', summaryUpdatedAt);
  }

  const { count } = await query;

  return (count || 0) >= 3;
}

/**
 * Triggers summary regeneration in fire-and-forget mode
 * Does not block - errors are logged but not thrown
 */
export function triggerSummaryRegeneration(
  supabaseAdmin: SupabaseClient,
  pingId: string,
  tenantId: string
): void {
  // Fire and forget - don't await
  regenerateSummaryAsync(supabaseAdmin, pingId, tenantId).catch((error) => {
    console.error('Background summary regeneration failed:', error);
  });
}

/**
 * Async implementation of summary regeneration
 */
async function regenerateSummaryAsync(
  supabaseAdmin: SupabaseClient,
  pingId: string,
  tenantId: string
): Promise<void> {
  try {
    // Fetch ping with category
    const { data: ping, error: pingError } = await supabaseAdmin
      .from('pings')
      .select('*, category:categories(name)')
      .eq('id', pingId)
      .single();

    if (pingError || !ping) {
      console.error('Failed to fetch ping for summary:', pingError);
      return;
    }

    // Skip draft pings (handled by Echo)
    if (ping.status === 'draft') {
      return;
    }

    // Fetch all messages
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('ping_messages')
      .select('content, message_type, created_at')
      .eq('ping_id', pingId)
      .order('created_at', { ascending: true });

    if (messagesError || !messages || messages.length === 0) {
      return;
    }

    // Load organization AI config
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('ai_config')
      .eq('id', tenantId)
      .single();

    if (!orgData?.ai_config) {
      return;
    }

    const aiConfig = orgData.ai_config as {
      provider?: string;
      encrypted_api_key?: string;
      model?: string;
    };

    if (!aiConfig.provider || !aiConfig.encrypted_api_key) {
      return;
    }

    // Decrypt API key using RPC
    const { data: decryptedKey, error: decryptError } = await supabaseAdmin.rpc(
      'decrypt_api_key',
      { encrypted_key: aiConfig.encrypted_api_key, org_id: tenantId }
    );

    if (decryptError || !decryptedKey) {
      console.error('Failed to decrypt API key for summary:', decryptError);
      return;
    }

    // Convert messages
    const summaryMessages: SummaryMessage[] = messages
      .filter((msg) => msg.content)
      .map((msg) => ({
        role: mapMessageType(msg.message_type),
        content: msg.content,
      }));

    // Build config and context
    const config: PingSummaryConfig = {
      provider: aiConfig.provider,
      model: aiConfig.model || 'gpt-4o-mini',
      apiKey: decryptedKey,
    };

    const categoryName = Array.isArray(ping.category)
      ? ping.category[0]?.name
      : (ping.category as { name: string } | null)?.name;

    const context: PingSummaryContext = {
      pingId: ping.id,
      status: ping.status,
      category: categoryName || null,
      priority: ping.priority,
    };

    // Generate summary
    const result = await generatePingSummary(summaryMessages, context, config);

    if (!result.success || !result.summary) {
      console.error('Summary generation failed:', result.error);
      return;
    }

    // Update ping - also update updated_at to trigger realtime subscription
    const now = new Date().toISOString();
    await supabaseAdmin
      .from('pings')
      .update({
        ai_summary: result.summary,
        summary_updated_at: now,
        updated_at: now,
      })
      .eq('id', pingId);

    console.log('Summary regenerated for ping:', pingId);
  } catch (error) {
    console.error('Error in regenerateSummaryAsync:', error);
  }
}

/**
 * Maps database message_type to SummaryMessage role
 */
function mapMessageType(
  messageType: string
): 'user' | 'agent' | 'echo' | 'system' {
  switch (messageType) {
    case 'user':
      return 'user';
    case 'agent':
      return 'agent';
    case 'system':
      return 'system';
    default:
      return 'agent';
  }
}
