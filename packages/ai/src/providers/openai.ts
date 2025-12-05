/**
 * OpenAI Provider Implementation
 *
 * Implements AIProvider interface using OpenAI's GPT models.
 * Default: GPT-4o mini (cost-optimized at $0.15/$0.60 per M tokens)
 * Optional: GPT-4 for higher quality responses
 */

import OpenAI from 'openai';
import type { PingMessage } from '@easyping/types';
import type {
  AIProvider,
  AIProviderConfig,
  CategoryResult,
  PingContext,
} from './base';
import { createAIProviderError } from './base';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: AIProviderConfig) {
    if (!config.apiKey) {
      throw createAIProviderError(
        'INVALID_CONFIG',
        'OpenAI API key is required',
        false,
        'openai'
      );
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 2,
    });

    // Default to GPT-4o mini (cost-optimized)
    this.model = config.model || 'gpt-4o-mini';
    this.maxTokens = config.maxTokens || 1000;
    this.temperature =
      config.temperature !== undefined ? config.temperature : 0.7;
  }

  async categorize(conversation: string[]): Promise<CategoryResult> {
    try {
      const conversationText = conversation.join('\n');

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a support ticket categorization system. Categorize this support ping into one of: Hardware, Software, Network, Access Request, Password Reset, Other. Return ONLY valid JSON with no markdown formatting: {category, confidence, reasoning}. Confidence must be between 0 and 1.',
          },
          {
            role: 'user',
            content: conversationText,
          },
        ],
        temperature: 0.3, // Low temperature for consistent categorization
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw createAIProviderError(
          'EMPTY_RESPONSE',
          'OpenAI returned empty response',
          true,
          'openai'
        );
      }

      const result = JSON.parse(content) as CategoryResult;

      // Validate response structure
      if (
        typeof result.category !== 'string' ||
        typeof result.confidence !== 'number'
      ) {
        throw createAIProviderError(
          'INVALID_RESPONSE',
          'OpenAI returned invalid category result format',
          true,
          'openai'
        );
      }

      return result;
    } catch (error) {
      if ((error as any).provider === 'openai') {
        throw error; // Re-throw our custom errors
      }

      // Handle OpenAI SDK errors
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw createAIProviderError(
        'API_ERROR',
        `OpenAI categorization failed: ${message}`,
        true,
        'openai'
      );
    }
  }

  async summarize(messages: PingMessage[]): Promise<string> {
    try {
      // Format messages as conversation
      const conversation = messages
        .map((msg) => `${msg.sender?.full_name || 'Unknown'}: ${msg.content}`)
        .join('\n');

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a support ticket summarization system. Summarize this support conversation in 2-3 sentences focusing on the issue and current status. Be concise and factual.',
          },
          {
            role: 'user',
            content: conversation,
          },
        ],
        temperature: 0.5,
        max_tokens: 200,
      });

      const summary = response.choices[0]?.message?.content;
      if (!summary) {
        throw createAIProviderError(
          'EMPTY_RESPONSE',
          'OpenAI returned empty summary',
          true,
          'openai'
        );
      }

      // Truncate if exceeds 500 characters
      return summary.length > 500 ? summary.slice(0, 497) + '...' : summary;
    } catch (error) {
      if ((error as any).provider === 'openai') {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw createAIProviderError(
        'API_ERROR',
        `OpenAI summarization failed: ${message}`,
        true,
        'openai'
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

      const prompt = `${categoryInfo}Ping Title: ${context.ping.title}\n\nConversation:\n${conversation}`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful support agent assistant. Suggest a professional, empathetic response to this support ping based on the conversation history. Keep it concise and actionable.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      });

      const suggestion = response.choices[0]?.message?.content;
      if (!suggestion) {
        throw createAIProviderError(
          'EMPTY_RESPONSE',
          'OpenAI returned empty suggestion',
          true,
          'openai'
        );
      }

      return suggestion;
    } catch (error) {
      if ((error as any).provider === 'openai') {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw createAIProviderError(
        'API_ERROR',
        `OpenAI response suggestion failed: ${message}`,
        true,
        'openai'
      );
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding || !Array.isArray(embedding)) {
        throw createAIProviderError(
          'INVALID_RESPONSE',
          'OpenAI returned invalid embedding format',
          true,
          'openai'
        );
      }

      return embedding;
    } catch (error) {
      if ((error as any).provider === 'openai') {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';

      // Log warning but return empty array on failure (graceful degradation)
      console.warn(
        `OpenAI embedding generation failed: ${message}. Semantic search will not work for this content.`
      );

      throw createAIProviderError(
        'API_ERROR',
        `OpenAI embedding generation failed: ${message}`,
        true,
        'openai'
      );
    }
  }
}
