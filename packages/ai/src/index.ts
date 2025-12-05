/**
 * AI Provider Abstraction Layer
 *
 * Public API for EasyPing AI integration.
 * Provides unified interface to multiple AI providers (OpenAI, Anthropic, Azure).
 */

// Export provider interfaces and types
export type {
  AIProvider,
  AIProviderConfig,
  AzureAIProviderConfig,
  CategoryResult,
  PingContext,
  AIProviderError,
} from './providers/base';

export { createAIProviderError } from './providers/base';

// Export provider implementations
export { OpenAIProvider } from './providers/openai';
export { AnthropicProvider } from './providers/anthropic';
export { AzureOpenAIProvider } from './providers/azure';

// Export factory function
export { createAIProvider, validateProviderConfig } from './factory';
export type { AIProviderType } from './factory';

// Export error handling utilities
export {
  withFallback,
  shouldDisableAI,
  resetFailureCount,
  getFailureCount,
} from './error-handler';
