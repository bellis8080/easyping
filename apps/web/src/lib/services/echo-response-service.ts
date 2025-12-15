/**
 * Echo Response Service
 *
 * Generates AI-suggested responses for agents when viewing pings.
 * Supports OpenAI and Anthropic providers via dynamic imports.
 *
 * @see Story 3.7: Echo - AI Response Suggestions
 */

import type { PingMessage, PingStatus, PingPriority } from '@easyping/types';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Configuration for the AI provider
 */
export interface EchoResponseConfig {
  provider: 'openai' | 'anthropic' | 'azure';
  model: string;
  apiKey: string;
  temperature?: number;
}

/**
 * Context needed to generate a response suggestion
 */
export interface EchoResponseContext {
  /** Conversation messages in chronological order */
  messages: PingMessage[];
  /** Current ping status */
  status: PingStatus;
  /** Ping category (e.g., "Hardware", "Software") */
  category: string | null;
  /** Ping priority */
  priority: PingPriority;
  /** Optional AI-generated summary of the ping */
  summary?: string | null;
  /** Organization name for context */
  organizationName?: string;
}

/**
 * Result from response suggestion generation
 */
export interface EchoResponseResult {
  suggestion: string;
  generatedAt: Date;
}

// =============================================================================
// Constants
// =============================================================================

const RESPONSE_TIMEOUT_MS = 5000; // 5 second max timeout
const MAX_TOKENS = 500;
const DEFAULT_TEMPERATURE = 0.7;

// =============================================================================
// System Prompt
// =============================================================================

function buildSystemPrompt(organizationName?: string): string {
  const orgContext = organizationName
    ? `You are an AI assistant helping support agents at ${organizationName}.`
    : 'You are an AI assistant helping support agents.';

  return `${orgContext}

Your task is to draft a helpful, professional response that the agent can use or modify.

Guidelines:
- Be concise and professional
- Address the user's specific issue based on the conversation
- Suggest concrete next steps or solutions when possible
- Use a friendly but professional tone
- Do not make up information - if something is unclear, acknowledge it
- Keep responses under 200 words unless the situation requires more detail
- Do not include greetings like "Dear user" or signatures - the agent will add those`;
}

// =============================================================================
// Prompt Builder
// =============================================================================

function buildPrompt(context: EchoResponseContext): string {
  const { messages, status, category, priority, summary } = context;

  // Build conversation history
  const conversationHistory = messages
    .map((msg) => {
      const role = msg.message_type === 'user' ? 'End User' : 'Agent';
      const timestamp = new Date(msg.created_at).toLocaleString();
      return `[${role} - ${timestamp}]:\n${msg.content}`;
    })
    .join('\n\n');

  // Build context section
  const contextParts: string[] = [];
  if (category) contextParts.push(`Category: ${category}`);
  if (priority) contextParts.push(`Priority: ${priority}`);
  if (status) contextParts.push(`Status: ${status}`);
  if (summary) contextParts.push(`Summary: ${summary}`);

  const contextSection =
    contextParts.length > 0
      ? `Ping Context:\n${contextParts.join('\n')}\n\n`
      : '';

  return `${contextSection}Conversation History:
${conversationHistory}

Based on this conversation, draft a helpful response for the support agent to send to the end user. The response should address the user's issue and provide helpful next steps.`;
}

// =============================================================================
// AI Provider Implementations
// =============================================================================

async function generateWithOpenAI(
  prompt: string,
  systemPrompt: string,
  config: EchoResponseConfig
): Promise<string> {
  const OpenAI = (await import('openai')).default;

  const client = new OpenAI({
    apiKey: config.apiKey,
    timeout: RESPONSE_TIMEOUT_MS,
  });

  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: config.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens: MAX_TOKENS,
  });

  return response.choices[0]?.message?.content || '';
}

async function generateWithAnthropic(
  prompt: string,
  systemPrompt: string,
  config: EchoResponseConfig
): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;

  const client = new Anthropic({
    apiKey: config.apiKey,
  });

  const response = await client.messages.create({
    model: config.model,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
    system: systemPrompt,
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock && 'text' in textBlock ? textBlock.text : '';
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Generates an AI-suggested response for an agent to use when replying to a ping.
 *
 * @param context - The ping context including messages, status, category, etc.
 * @param config - AI provider configuration
 * @returns The suggested response, or null if generation fails
 *
 * @example
 * ```typescript
 * const suggestion = await generateResponseSuggestion(
 *   {
 *     messages: pingMessages,
 *     status: 'in_progress',
 *     category: 'Software',
 *     priority: 'medium',
 *   },
 *   {
 *     provider: 'openai',
 *     model: 'gpt-4o-mini',
 *     apiKey: process.env.OPENAI_API_KEY,
 *   }
 * );
 * ```
 */
export async function generateResponseSuggestion(
  context: EchoResponseContext,
  config: EchoResponseConfig
): Promise<EchoResponseResult | null> {
  // Validate we have messages to work with
  if (!context.messages || context.messages.length === 0) {
    console.warn('[Echo] No messages provided for response suggestion');
    return null;
  }

  try {
    const systemPrompt = buildSystemPrompt(context.organizationName);
    const prompt = buildPrompt(context);

    let suggestion: string;

    if (config.provider === 'openai' || config.provider === 'azure') {
      suggestion = await generateWithOpenAI(prompt, systemPrompt, config);
    } else if (config.provider === 'anthropic') {
      suggestion = await generateWithAnthropic(prompt, systemPrompt, config);
    } else {
      throw new Error(`Unsupported AI provider: ${config.provider}`);
    }

    if (!suggestion || suggestion.trim() === '') {
      console.warn('[Echo] AI returned empty response suggestion');
      return null;
    }

    return {
      suggestion: suggestion.trim(),
      generatedAt: new Date(),
    };
  } catch (error) {
    // Log error but don't throw - graceful degradation
    console.error('[Echo] Failed to generate response suggestion:', error);
    return null;
  }
}

/**
 * Generates an alternative response suggestion.
 * Uses a slightly higher temperature for variety.
 */
export async function generateAlternativeResponse(
  context: EchoResponseContext,
  config: EchoResponseConfig
): Promise<EchoResponseResult | null> {
  // Increase temperature for variety
  const alternativeConfig: EchoResponseConfig = {
    ...config,
    temperature: Math.min(
      (config.temperature ?? DEFAULT_TEMPERATURE) + 0.2,
      1.0
    ),
  };

  return generateResponseSuggestion(context, alternativeConfig);
}
