/**
 * AI Provider Factory
 *
 * Creates AI provider instances based on provider type and configuration.
 * Supports OpenAI, Anthropic, and Azure OpenAI providers.
 */

import type {
  AIProvider,
  AIProviderConfig,
  AzureAIProviderConfig,
} from './providers/base';
import { createAIProviderError } from './providers/base';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { AzureOpenAIProvider } from './providers/azure';

/**
 * Supported AI provider types
 */
export type AIProviderType = 'openai' | 'anthropic' | 'azure';

/**
 * Creates an AI provider instance based on provider type
 *
 * @param providerType - Type of provider to create ('openai', 'anthropic', 'azure')
 * @param config - Provider configuration (API key, model, etc.)
 * @returns AIProvider instance
 * @throws AIProviderError if provider type is invalid or configuration is invalid
 *
 * @example
 * ```typescript
 * const provider = createAIProvider('openai', {
 *   apiKey: 'sk-...',
 *   model: 'gpt-4o-mini'
 * });
 *
 * const category = await provider.categorize(['User needs password reset']);
 * ```
 */
export function createAIProvider(
  providerType: AIProviderType,
  config: AIProviderConfig | AzureAIProviderConfig
): AIProvider {
  // Validate API key
  if (!config.apiKey || config.apiKey.trim() === '') {
    throw createAIProviderError(
      'INVALID_CONFIG',
      'API key is required and cannot be empty',
      false,
      providerType
    );
  }

  // Create provider based on type
  switch (providerType) {
    case 'openai':
      return new OpenAIProvider(config);

    case 'anthropic':
      return new AnthropicProvider(config);

    case 'azure':
      // Validate Azure-specific config
      const azureConfig = config as AzureAIProviderConfig;
      if (!azureConfig.endpoint || !azureConfig.deployment) {
        throw createAIProviderError(
          'INVALID_CONFIG',
          'Azure OpenAI requires endpoint and deployment name',
          false,
          'azure'
        );
      }
      return new AzureOpenAIProvider(azureConfig);

    default:
      throw createAIProviderError(
        'UNSUPPORTED_PROVIDER',
        `Unsupported AI provider type: ${providerType}. Supported types: openai, anthropic, azure`,
        false,
        'unknown'
      );
  }
}

/**
 * Validates provider configuration without creating an instance
 *
 * @param providerType - Type of provider to validate
 * @param config - Provider configuration
 * @returns Validation result with error message if invalid
 */
export function validateProviderConfig(
  providerType: AIProviderType,
  config: AIProviderConfig | AzureAIProviderConfig
): { valid: boolean; error?: string } {
  try {
    // Basic validation
    if (!config.apiKey || config.apiKey.trim() === '') {
      return { valid: false, error: 'API key is required' };
    }

    // Provider-specific validation
    if (providerType === 'azure') {
      const azureConfig = config as AzureAIProviderConfig;
      if (!azureConfig.endpoint) {
        return { valid: false, error: 'Azure endpoint is required' };
      }
      if (!azureConfig.deployment) {
        return { valid: false, error: 'Azure deployment name is required' };
      }
    }

    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, error: message };
  }
}
