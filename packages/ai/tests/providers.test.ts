/**
 * AI Provider Unit Tests
 *
 * Tests all provider implementations with mocked API responses.
 * Target coverage: 90%+ lines, branches, functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PingMessage } from '@easyping/types';

// Mock modules before imports
vi.mock('openai');
vi.mock('@anthropic-ai/sdk');

import { OpenAIProvider } from '../src/providers/openai';
import { AnthropicProvider } from '../src/providers/anthropic';
import { AzureOpenAIProvider } from '../src/providers/azure';
import { createAIProvider, validateProviderConfig } from '../src/factory';
import {
  withFallback,
  shouldDisableAI,
  resetFailureCount,
  getFailureCount,
} from '../src/error-handler';

describe('OpenAI Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error without API key', () => {
    expect(() => {
      new OpenAIProvider({
        apiKey: '',
        model: 'gpt-4o-mini',
      });
    }).toThrow('OpenAI API key is required');
  });

  it('should validate provider instantiation', () => {
    expect(() => {
      new OpenAIProvider({
        apiKey: 'sk-test-key',
        model: 'gpt-4o-mini',
      });
    }).not.toThrow();
  });
});

describe('Anthropic Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error without API key', () => {
    expect(() => {
      new AnthropicProvider({
        apiKey: '',
        model: 'claude-3-haiku-20240307',
      });
    }).toThrow('Anthropic API key is required');
  });

  it('should validate provider instantiation', () => {
    expect(() => {
      new AnthropicProvider({
        apiKey: 'sk-ant-test-key',
        model: 'claude-3-haiku-20240307',
      });
    }).not.toThrow();
  });

  it('should throw EMBEDDING_NOT_SUPPORTED error', async () => {
    const provider = new AnthropicProvider({
      apiKey: 'sk-ant-test-key',
      model: 'claude-3-haiku-20240307',
    });

    await expect(provider.generateEmbedding('Test text')).rejects.toThrow(
      'Anthropic does not provide embeddings API'
    );
  });
});

describe('Azure OpenAI Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error without API key', () => {
    expect(() => {
      new AzureOpenAIProvider({
        apiKey: '',
        endpoint: 'https://example.openai.azure.com',
        deployment: 'gpt-4-deployment',
        model: 'gpt-4',
      });
    }).toThrow('Azure OpenAI API key is required');
  });

  it('should throw error without endpoint', () => {
    expect(() => {
      new AzureOpenAIProvider({
        apiKey: 'azure-key',
        endpoint: '',
        deployment: 'gpt-4-deployment',
        model: 'gpt-4',
      } as any);
    }).toThrow('Azure OpenAI endpoint is required');
  });

  it('should throw error without deployment', () => {
    expect(() => {
      new AzureOpenAIProvider({
        apiKey: 'azure-key',
        endpoint: 'https://example.openai.azure.com',
        deployment: '',
        model: 'gpt-4',
      } as any);
    }).toThrow('Azure OpenAI deployment name is required');
  });

  it('should validate provider instantiation', () => {
    expect(() => {
      new AzureOpenAIProvider({
        apiKey: 'azure-key',
        endpoint: 'https://example.openai.azure.com',
        deployment: 'gpt-4-deployment',
        model: 'gpt-4',
      });
    }).not.toThrow();
  });
});

describe('Provider Factory', () => {
  it('should create correct provider from factory for OpenAI', () => {
    const provider = createAIProvider('openai', {
      apiKey: 'sk-test-key',
      model: 'gpt-4o-mini',
    });

    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('should create correct provider from factory for Anthropic', () => {
    const provider = createAIProvider('anthropic', {
      apiKey: 'sk-ant-test-key',
      model: 'claude-3-haiku-20240307',
    });

    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it('should create correct provider from factory for Azure', () => {
    const provider = createAIProvider('azure', {
      apiKey: 'azure-key',
      endpoint: 'https://example.openai.azure.com',
      deployment: 'gpt-4-deployment',
      model: 'gpt-4',
    });

    expect(provider).toBeInstanceOf(AzureOpenAIProvider);
  });

  it('should throw error for invalid provider type', () => {
    expect(() => {
      createAIProvider('invalid' as any, {
        apiKey: 'test-key',
        model: 'test-model',
      });
    }).toThrow('Unsupported AI provider type: invalid');
  });

  it('should throw error for empty API key', () => {
    expect(() => {
      createAIProvider('openai', {
        apiKey: '',
        model: 'gpt-4o-mini',
      });
    }).toThrow('API key is required');
  });

  it('should throw error for empty API key (trimmed)', () => {
    expect(() => {
      createAIProvider('openai', {
        apiKey: '   ',
        model: 'gpt-4o-mini',
      });
    }).toThrow('API key is required');
  });

  it('should validate Azure requires endpoint', () => {
    expect(() => {
      createAIProvider('azure', {
        apiKey: 'azure-key',
        model: 'gpt-4',
      } as any);
    }).toThrow('Azure OpenAI requires endpoint and deployment name');
  });

  it('should validate Azure requires deployment', () => {
    expect(() => {
      createAIProvider('azure', {
        apiKey: 'azure-key',
        endpoint: 'https://example.openai.azure.com',
        model: 'gpt-4',
      } as any);
    }).toThrow('Azure OpenAI requires endpoint and deployment name');
  });
});

describe('Provider Config Validation', () => {
  it('should validate provider config correctly', () => {
    const valid = validateProviderConfig('openai', {
      apiKey: 'sk-test-key',
      model: 'gpt-4o-mini',
    });

    expect(valid.valid).toBe(true);
    expect(valid.error).toBeUndefined();
  });

  it('should return error for invalid config - empty key', () => {
    const invalid = validateProviderConfig('openai', {
      apiKey: '',
      model: 'gpt-4o-mini',
    });

    expect(invalid.valid).toBe(false);
    expect(invalid.error).toBe('API key is required');
  });

  it('should return error for invalid config - whitespace key', () => {
    const invalid = validateProviderConfig('openai', {
      apiKey: '   ',
      model: 'gpt-4o-mini',
    });

    expect(invalid.valid).toBe(false);
    expect(invalid.error).toBe('API key is required');
  });

  it('should validate Azure-specific config - missing endpoint', () => {
    const invalidAzure = validateProviderConfig('azure', {
      apiKey: 'azure-key',
      model: 'gpt-4',
    } as any);

    expect(invalidAzure.valid).toBe(false);
    expect(invalidAzure.error).toBe('Azure endpoint is required');
  });

  it('should validate Azure-specific config - missing deployment', () => {
    const invalidAzure = validateProviderConfig('azure', {
      apiKey: 'azure-key',
      endpoint: 'https://example.openai.azure.com',
      model: 'gpt-4',
    } as any);

    expect(invalidAzure.valid).toBe(false);
    expect(invalidAzure.error).toBe('Azure deployment name is required');
  });

  it('should validate complete Azure config', () => {
    const validAzure = validateProviderConfig('azure', {
      apiKey: 'azure-key',
      endpoint: 'https://example.openai.azure.com',
      deployment: 'gpt-4-deployment',
      model: 'gpt-4',
    });

    expect(validAzure.valid).toBe(true);
    expect(validAzure.error).toBeUndefined();
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    // Reset failure counts before each test
    resetFailureCount('test-org-1');
    resetFailureCount('test-org-2');
  });

  it('should use fallback on AI provider failure', async () => {
    const failingFn = async () => {
      throw new Error('API error');
    };

    const result = await withFallback(failingFn, {
      category: 'Other',
      confidence: 0,
    });

    expect(result.category).toBe('Other');
    expect(result.confidence).toBe(0);
  });

  it('should return success value when function succeeds', async () => {
    const successFn = async () => ({ category: 'Hardware', confidence: 0.95 });

    const result = await withFallback(successFn, {
      category: 'Other',
      confidence: 0,
    });

    expect(result.category).toBe('Hardware');
    expect(result.confidence).toBe(0.95);
  });

  it('should track failure count for organization', async () => {
    const orgId = 'test-org-1';
    resetFailureCount(orgId);

    const failingFn = async () => {
      throw new Error('API error');
    };

    // Initial failure count should be 0
    expect(getFailureCount(orgId)).toBe(0);
    expect(shouldDisableAI(orgId)).toBe(false);

    // Trigger 5 failures
    for (let i = 0; i < 5; i++) {
      await withFallback(failingFn, null, orgId);
    }

    expect(getFailureCount(orgId)).toBe(5);
    expect(shouldDisableAI(orgId)).toBe(true);
  });

  it('should reset failure count on success', async () => {
    const orgId = 'test-org-2';
    resetFailureCount(orgId);

    // Fail 3 times
    const failingFn = async () => {
      throw new Error('Error');
    };
    for (let i = 0; i < 3; i++) {
      await withFallback(failingFn, null, orgId);
    }

    expect(getFailureCount(orgId)).toBe(3);

    // Then succeed
    await withFallback(async () => 'success', 'fallback', orgId);

    expect(getFailureCount(orgId)).toBe(0);
    expect(shouldDisableAI(orgId)).toBe(false);
  });

  it('should manually reset failure count', () => {
    const orgId = 'test-org-3';

    // Simulate some failures
    for (let i = 0; i < 3; i++) {
      withFallback(
        async () => {
          throw new Error('test');
        },
        null,
        orgId
      );
    }

    // Manually reset
    resetFailureCount(orgId);

    expect(getFailureCount(orgId)).toBe(0);
    expect(shouldDisableAI(orgId)).toBe(false);
  });

  it('should not disable AI with fewer than 5 failures', async () => {
    const orgId = 'test-org-4';
    resetFailureCount(orgId);

    const failingFn = async () => {
      throw new Error('API error');
    };

    // Trigger 4 failures (below threshold)
    for (let i = 0; i < 4; i++) {
      await withFallback(failingFn, null, orgId);
    }

    expect(getFailureCount(orgId)).toBe(4);
    expect(shouldDisableAI(orgId)).toBe(false);
  });

  it('should track failures independently per organization', async () => {
    const org1 = 'test-org-5';
    const org2 = 'test-org-6';
    resetFailureCount(org1);
    resetFailureCount(org2);

    const failingFn = async () => {
      throw new Error('API error');
    };

    // Org 1: 5 failures
    for (let i = 0; i < 5; i++) {
      await withFallback(failingFn, null, org1);
    }

    // Org 2: 2 failures
    for (let i = 0; i < 2; i++) {
      await withFallback(failingFn, null, org2);
    }

    expect(getFailureCount(org1)).toBe(5);
    expect(shouldDisableAI(org1)).toBe(true);

    expect(getFailureCount(org2)).toBe(2);
    expect(shouldDisableAI(org2)).toBe(false);
  });
});
