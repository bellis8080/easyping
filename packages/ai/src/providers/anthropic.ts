/**
 * Anthropic Provider Implementation
 *
 * Implements AIProvider interface using Anthropic's Claude models.
 * Default: Claude 3 Haiku (cost-optimized at $0.25/$1.25 per M tokens)
 * Optional: Claude 3.5 Sonnet for higher quality responses
 *
 * NOTE: Anthropic does not provide native embeddings API.
 * Embeddings require a separate OpenAI key or will throw EMBEDDING_NOT_SUPPORTED error.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { PingMessage } from '@easyping/types';
import type {
  AIProvider,
  AIProviderConfig,
  CategoryResult,
  PingContext,
} from './base';
import { createAIProviderError } from './base';

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: AIProviderConfig) {
    if (!config.apiKey) {
      throw createAIProviderError(
        'INVALID_CONFIG',
        'Anthropic API key is required',
        false,
        'anthropic'
      );
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 2,
    });

    // Default to Claude 3 Haiku (most cost-effective)
    this.model = config.model || 'claude-3-haiku-20240307';
    this.maxTokens = config.maxTokens || 1000;
    this.temperature =
      config.temperature !== undefined ? config.temperature : 0.7;
  }

  async categorize(conversation: string[]): Promise<CategoryResult> {
    try {
      const conversationText = conversation.join('\n');

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 200,
        temperature: 0.3, // Low temperature for consistent categorization
        messages: [
          {
            role: 'user',
            content: `You are a support ticket categorization system. Categorize this support ping into one of: Hardware, Software, Network, Access Request, Password Reset, Other. Return ONLY valid JSON with no markdown formatting: {category, confidence, reasoning}. Confidence must be between 0 and 1.\n\nConversation:\n${conversationText}`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text' || !content.text) {
        throw createAIProviderError(
          'EMPTY_RESPONSE',
          'Anthropic returned empty response',
          true,
          'anthropic'
        );
      }

      // Parse JSON from response (Anthropic may include markdown formatting)
      let jsonText = content.text.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }

      const result = JSON.parse(jsonText) as CategoryResult;

      // Validate response structure
      if (
        typeof result.category !== 'string' ||
        typeof result.confidence !== 'number'
      ) {
        throw createAIProviderError(
          'INVALID_RESPONSE',
          'Anthropic returned invalid category result format',
          true,
          'anthropic'
        );
      }

      return result;
    } catch (error) {
      if ((error as any).provider === 'anthropic') {
        throw error; // Re-throw our custom errors
      }

      // Handle Anthropic SDK errors
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw createAIProviderError(
        'API_ERROR',
        `Anthropic categorization failed: ${message}`,
        true,
        'anthropic'
      );
    }
  }

  async summarize(messages: PingMessage[]): Promise<string> {
    try {
      // Format messages as conversation
      const conversation = messages
        .map((msg) => `${msg.sender?.full_name || 'Unknown'}: ${msg.content}`)
        .join('\n');

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 200,
        temperature: 0.5,
        messages: [
          {
            role: 'user',
            content: `You are a support ticket summarization system. Summarize this support conversation in 2-3 sentences focusing on the issue and current status. Be concise and factual.\n\nConversation:\n${conversation}`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text' || !content.text) {
        throw createAIProviderError(
          'EMPTY_RESPONSE',
          'Anthropic returned empty summary',
          true,
          'anthropic'
        );
      }

      const summary = content.text.trim();

      // Truncate if exceeds 500 characters
      return summary.length > 500 ? summary.slice(0, 497) + '...' : summary;
    } catch (error) {
      if ((error as any).provider === 'anthropic') {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw createAIProviderError(
        'API_ERROR',
        `Anthropic summarization failed: ${message}`,
        true,
        'anthropic'
      );
    }
  }

  async suggestResponse(context: PingContext): Promise<string> {
    try {
      // Build context prompt
      const conversation = context.messages
        .map((msg) => `${msg.sender?.full_name || 'Unknown'}: ${msg.content}`)
        .join('\n');

      const categoryInfo = context.category
        ? `Category: ${context.category.name}\n`
        : '';

      const prompt = `${categoryInfo}Ping Title: ${context.ping.title}\n\nConversation:\n${conversation}\n\nPlease suggest a professional, empathetic response to this support ping based on the conversation history. Keep it concise and actionable.`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text' || !content.text) {
        throw createAIProviderError(
          'EMPTY_RESPONSE',
          'Anthropic returned empty suggestion',
          true,
          'anthropic'
        );
      }

      return content.text.trim();
    } catch (error) {
      if ((error as any).provider === 'anthropic') {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw createAIProviderError(
        'API_ERROR',
        `Anthropic response suggestion failed: ${message}`,
        true,
        'anthropic'
      );
    }
  }

  async generateEmbedding(_text: string): Promise<number[]> {
    // Anthropic does not provide native embeddings API
    // Users must use OpenAI embeddings or another provider
    throw createAIProviderError(
      'EMBEDDING_NOT_SUPPORTED',
      'Anthropic does not provide embeddings API. Please configure OpenAI for semantic search functionality.',
      false,
      'anthropic'
    );
  }
}
