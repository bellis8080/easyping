/**
 * AI Provider Abstraction Layer
 *
 * Base interfaces and types for AI provider implementations.
 * All providers (OpenAI, Anthropic, Azure) must implement the AIProvider interface.
 */

import type { Ping, PingMessage } from '@easyping/types';

/**
 * Result of AI categorization with confidence score
 */
export interface CategoryResult {
  category: string;
  confidence: number;
  reasoning?: string;
}

/**
 * Category type (will be imported from @easyping/types in Story 3.4)
 * For now, using string type as a placeholder
 */
export interface Category {
  id: string;
  name: string;
  description?: string;
}

/**
 * Context for AI response suggestions
 */
export interface PingContext {
  ping: Ping;
  messages: PingMessage[];
  category?: Category;
}

/**
 * AI provider error with retry information
 */
export interface AIProviderError extends Error {
  code: string;
  message: string;
  retryable: boolean;
  provider: string;
}

/**
 * Configuration for AI provider instances
 */
export interface AIProviderConfig {
  apiKey: string;
  model: string;
  embeddingModel?: string; // OpenAI embedding model for semantic search
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Extended configuration for Azure OpenAI provider
 */
export interface AzureAIProviderConfig extends AIProviderConfig {
  endpoint: string;
  deployment: string;
  apiVersion?: string;
}

/**
 * Base AI provider interface
 *
 * All AI providers must implement these methods to ensure consistent API
 * across different providers (OpenAI, Anthropic, Azure).
 */
export interface AIProvider {
  /**
   * Analyzes conversation and returns category with confidence score
   *
   * @param conversation - Array of message strings from the ping
   * @returns Category result with confidence score and optional reasoning
   * @throws AIProviderError on API failure
   */
  categorize(conversation: string[]): Promise<CategoryResult>;

  /**
   * Generates 2-3 sentence summary of ping conversation
   *
   * @param messages - Array of ping messages
   * @returns Summary text (max 500 characters)
   * @throws AIProviderError on API failure
   */
  summarize(messages: PingMessage[]): Promise<string>;

  /**
   * Suggests response draft for agent based on context
   *
   * @param context - Ping context including messages and category
   * @returns Suggested response text
   * @throws AIProviderError on API failure
   */
  suggestResponse(context: PingContext): Promise<string>;

  /**
   * Generates vector embedding for semantic search
   *
   * @param text - Text to generate embedding for
   * @returns Embedding vector (array of floats)
   * @throws AIProviderError on API failure or if embeddings not supported
   */
  generateEmbedding(text: string): Promise<number[]>;
}

/**
 * Creates a custom AIProviderError
 *
 * @param code - Error code (e.g., 'API_ERROR', 'INVALID_CONFIG')
 * @param message - Human-readable error message
 * @param retryable - Whether the operation can be retried
 * @param provider - Provider name (e.g., 'openai', 'anthropic')
 * @returns AIProviderError instance
 */
export function createAIProviderError(
  code: string,
  message: string,
  retryable: boolean,
  provider: string
): AIProviderError {
  const error = new Error(message) as AIProviderError;
  error.code = code;
  error.retryable = retryable;
  error.provider = provider;
  return error;
}
