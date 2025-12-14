/**
 * Ping Summary Service
 * Story 3.6: AI-Pinned Ping Summaries
 *
 * Generates and updates AI summaries for pings as conversations evolve.
 * Summaries provide agents and end users with quick context about the issue,
 * progress made, and suggested next steps.
 */

/**
 * Configuration for AI provider
 */
export interface PingSummaryConfig {
  provider: string;
  model: string;
  apiKey: string;
  temperature?: number;
}

/**
 * Context about the ping for summary generation
 */
export interface PingSummaryContext {
  pingId: string;
  status: string;
  category: string | null;
  priority: string;
}

/**
 * A message in the conversation
 */
export interface SummaryMessage {
  role: 'user' | 'agent' | 'echo' | 'system';
  content: string;
}

/**
 * Result of summary generation
 */
export interface SummaryResult {
  summary: string | null;
  success: boolean;
  error?: string;
}

/**
 * Generates a ping summary from conversation messages
 *
 * @param messages - Full conversation history
 * @param context - Ping context (status, category, priority)
 * @param config - AI provider configuration
 * @returns Summary result with the generated text or null on failure
 */
export async function generatePingSummary(
  messages: SummaryMessage[],
  context: PingSummaryContext,
  config: PingSummaryConfig
): Promise<SummaryResult> {
  // Need at least some messages to generate a meaningful summary
  if (messages.length === 0) {
    return {
      summary: null,
      success: false,
      error: 'No messages to summarize',
    };
  }

  // Format conversation history
  const conversationText = messages
    .map((msg) => {
      const speaker = getSpeakerLabel(msg.role);
      return `${speaker}: ${msg.content}`;
    })
    .join('\n');

  // Build the summary prompt
  const prompt = buildSummaryPrompt(conversationText, context);
  const systemPrompt =
    'You are a support conversation summarizer. Generate concise, actionable summaries for support agents and users. Respond with ONLY the summary text, no labels or formatting.';

  try {
    const rawSummary = await generateTextCompletion(
      prompt,
      config,
      systemPrompt
    );

    // Enforce character limit
    const summary = enforceCharacterLimit(rawSummary, 500);

    return {
      summary,
      success: true,
    };
  } catch (error) {
    console.error('Error generating ping summary:', error);
    return {
      summary: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Gets a human-readable label for the message role
 */
function getSpeakerLabel(role: SummaryMessage['role']): string {
  switch (role) {
    case 'user':
      return 'User';
    case 'agent':
      return 'Agent';
    case 'echo':
      return 'Echo (AI)';
    case 'system':
      return 'System';
    default:
      return 'Unknown';
  }
}

/**
 * Builds the summary generation prompt
 */
function buildSummaryPrompt(
  conversationText: string,
  context: PingSummaryContext
): string {
  return `You are summarizing an ongoing support conversation for both agents and end users.

Conversation:
${conversationText}

Ping Context:
- Status: ${context.status}
- Category: ${context.category || 'Uncategorized'}
- Priority: ${context.priority}

Generate a concise summary (max 500 chars) with these sections:

**Issue:** What the user needs help with (1-2 sentences)
**Progress:** What's been discussed or tried (1-2 sentences)
**Status:** Current state and suggested next steps

Keep it factual and actionable. Focus on information needed to quickly understand the situation.
Do NOT include any labels like "Issue:", "Progress:", "Status:" in your response - just write the summary as flowing text.`;
}

/**
 * Enforces character limit on summary, truncating intelligently if needed
 */
function enforceCharacterLimit(text: string, limit: number): string {
  if (!text) return '';

  const trimmed = text.trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }

  // Try to truncate at a sentence boundary
  const truncated = trimmed.substring(0, limit);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastExclamation = truncated.lastIndexOf('!');

  const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);

  if (lastSentenceEnd > limit * 0.7) {
    // If we can keep at least 70% of content at a sentence boundary
    return truncated.substring(0, lastSentenceEnd + 1);
  }

  // Otherwise truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > limit * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Generates a text completion using the configured AI provider
 * Follows the pattern from echo-conversation-service.ts
 */
async function generateTextCompletion(
  prompt: string,
  config: PingSummaryConfig,
  systemPrompt: string
): Promise<string> {
  if (config.provider === 'openai' || config.provider === 'azure') {
    const OpenAI = (await import('openai')).default;

    const client = new OpenAI({
      apiKey: config.apiKey,
      timeout: 15000,
    });

    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: config.temperature ?? 0.5, // Lower temp for more consistent summaries
      max_tokens: 300, // Summaries don't need many tokens
    });

    return response.choices[0]?.message?.content || '';
  } else if (config.provider === 'anthropic') {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;

    const client = new Anthropic({
      apiKey: config.apiKey,
    });

    const response = await client.messages.create({
      model: config.model,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
      system: systemPrompt,
    });

    const textBlock = response.content.find(
      (block: { type: string }) => block.type === 'text'
    );
    return textBlock && 'text' in textBlock
      ? (textBlock as { text: string }).text
      : '';
  }

  throw new Error(`Unsupported provider: ${config.provider}`);
}
