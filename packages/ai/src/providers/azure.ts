/**
 * Azure OpenAI Provider Implementation
 *
 * Implements AIProvider interface using Azure-hosted OpenAI models.
 * Uses OpenAI SDK with Azure-specific configuration (endpoint, deployment names).
 * Designed for enterprise customers requiring Azure-hosted AI.
 */

import OpenAI from 'openai';
import type { PingMessage } from '@easyping/types';
import type {
  AIProvider,
  AzureAIProviderConfig,
  CategoryResult,
  PingContext,
} from './base';
import { createAIProviderError } from './base';

export class AzureOpenAIProvider implements AIProvider {
  private client: OpenAI;
  private deployment: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: AzureAIProviderConfig) {
    if (!config.apiKey) {
      throw createAIProviderError(
        'INVALID_CONFIG',
        'Azure OpenAI API key is required',
        false,
        'azure'
      );
    }

    if (!config.endpoint) {
      throw createAIProviderError(
        'INVALID_CONFIG',
        'Azure OpenAI endpoint is required',
        false,
        'azure'
      );
    }

    if (!config.deployment) {
      throw createAIProviderError(
        'INVALID_CONFIG',
        'Azure OpenAI deployment name is required',
        false,
        'azure'
      );
    }

    // Configure OpenAI SDK for Azure
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: `${config.endpoint}/openai/deployments/${config.deployment}`,
      defaultQuery: { 'api-version': config.apiVersion || '2024-02-01' },
      defaultHeaders: { 'api-key': config.apiKey },
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 2,
    });

    this.deployment = config.deployment;
    this.maxTokens = config.maxTokens || 1000;
    this.temperature =
      config.temperature !== undefined ? config.temperature : 0.7;
  }

  async categorize(conversation: string[]): Promise<CategoryResult> {
    try {
      const conversationText = conversation.join('\n');

      const response = await this.client.chat.completions.create({
        model: this.deployment, // Azure uses deployment name as model
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
        temperature: 0.3,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw createAIProviderError(
          'EMPTY_RESPONSE',
          'Azure OpenAI returned empty response',
          true,
          'azure'
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
          'Azure OpenAI returned invalid category result format',
          true,
          'azure'
        );
      }

      return result;
    } catch (error) {
      if ((error as any).provider === 'azure') {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw createAIProviderError(
        'API_ERROR',
        `Azure OpenAI categorization failed: ${message}`,
        true,
        'azure'
      );
    }
  }

  async summarize(messages: PingMessage[]): Promise<string> {
    try {
      const conversation = messages
        .map((msg) => `${msg.sender?.full_name || 'Unknown'}: ${msg.content}`)
        .join('\n');

      const response = await this.client.chat.completions.create({
        model: this.deployment,
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
          'Azure OpenAI returned empty summary',
          true,
          'azure'
        );
      }

      return summary.length > 500 ? summary.slice(0, 497) + '...' : summary;
    } catch (error) {
      if ((error as any).provider === 'azure') {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw createAIProviderError(
        'API_ERROR',
        `Azure OpenAI summarization failed: ${message}`,
        true,
        'azure'
      );
    }
  }

  async suggestResponse(context: PingContext): Promise<string> {
    try {
      const conversation = context.messages
        .map((msg) => `${msg.sender?.full_name || 'Unknown'}: ${msg.content}`)
        .join('\n');

      const categoryInfo = context.category
        ? `Category: ${context.category.name}\n`
        : '';

      const prompt = `${categoryInfo}Ping Title: ${context.ping.title}\n\nConversation:\n${conversation}`;

      const response = await this.client.chat.completions.create({
        model: this.deployment,
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
          'Azure OpenAI returned empty suggestion',
          true,
          'azure'
        );
      }

      return suggestion;
    } catch (error) {
      if ((error as any).provider === 'azure') {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw createAIProviderError(
        'API_ERROR',
        `Azure OpenAI response suggestion failed: ${message}`,
        true,
        'azure'
      );
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.deployment, // Azure uses deployment name for embeddings too
        input: text,
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding || !Array.isArray(embedding)) {
        throw createAIProviderError(
          'INVALID_RESPONSE',
          'Azure OpenAI returned invalid embedding format',
          true,
          'azure'
        );
      }

      return embedding;
    } catch (error) {
      if ((error as any).provider === 'azure') {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';

      console.warn(
        `Azure OpenAI embedding generation failed: ${message}. Semantic search will not work for this content.`
      );

      throw createAIProviderError(
        'API_ERROR',
        `Azure OpenAI embedding generation failed: ${message}`,
        true,
        'azure'
      );
    }
  }
}
