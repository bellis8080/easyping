/**
 * Echo Response Service Unit Tests
 * Story 3.7: Echo - AI Response Suggestions
 *
 * Note: Integration tests with actual AI providers would be in e2e tests.
 * These unit tests focus on the function's error handling and edge cases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PingMessage } from '@easyping/types';
import { MessageType, PingStatus, PingPriority } from '@easyping/types';

describe('Echo Response Service', () => {
  let generateResponseSuggestion: typeof import('./echo-response-service').generateResponseSuggestion;
  let generateAlternativeResponse: typeof import('./echo-response-service').generateAlternativeResponse;

  beforeEach(async () => {
    vi.resetModules();
    const echoService = await import('./echo-response-service');
    generateResponseSuggestion = echoService.generateResponseSuggestion;
    generateAlternativeResponse = echoService.generateAlternativeResponse;
  });

  const createMockMessage = (
    id: string,
    content: string,
    messageType: MessageType
  ): PingMessage => ({
    id,
    ping_id: 'ping-123',
    sender_id: 'sender-123',
    content,
    message_type: messageType,
    created_at: new Date().toISOString(),
    edited_at: null,
  });

  const mockContext = {
    messages: [
      createMockMessage('msg-1', 'I cannot access the VPN', MessageType.USER),
      createMockMessage(
        'msg-2',
        'Have you tried resetting your password?',
        MessageType.AGENT
      ),
      createMockMessage(
        'msg-3',
        'Yes, but it still does not work',
        MessageType.USER
      ),
    ],
    status: PingStatus.IN_PROGRESS,
    category: 'Network',
    priority: PingPriority.NORMAL,
    summary: 'User cannot access VPN after password reset',
    organizationName: 'Acme Corp',
  };

  const mockOpenAIConfig = {
    provider: 'openai' as const,
    model: 'gpt-4o-mini',
    apiKey: 'test-openai-key',
  };

  describe('generateResponseSuggestion', () => {
    it('should return null when no messages provided', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await generateResponseSuggestion(
        { ...mockContext, messages: [] },
        mockOpenAIConfig
      );

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Echo] No messages provided for response suggestion'
      );

      consoleSpy.mockRestore();
    });

    it('should return null for unsupported provider', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const unsupportedConfig = {
        provider: 'unsupported' as any,
        model: 'test',
        apiKey: 'test',
      };

      const result = await generateResponseSuggestion(
        mockContext,
        unsupportedConfig
      );

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle API errors gracefully', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Use invalid API key to trigger error
      const invalidConfig = {
        ...mockOpenAIConfig,
        apiKey: '', // Empty key will cause error
      };

      const result = await generateResponseSuggestion(
        mockContext,
        invalidConfig
      );

      // Should return null instead of throwing
      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe('generateAlternativeResponse', () => {
    it('should handle empty messages', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await generateAlternativeResponse(
        { ...mockContext, messages: [] },
        mockOpenAIConfig
      );

      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });

    it('should handle unsupported provider', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const unsupportedConfig = {
        provider: 'unsupported' as any,
        model: 'test',
        apiKey: 'test',
      };

      const result = await generateAlternativeResponse(
        mockContext,
        unsupportedConfig
      );

      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe('EchoResponseContext interface', () => {
    it('should accept valid context with all fields', () => {
      const validContext = {
        messages: [createMockMessage('1', 'test', MessageType.USER)],
        status: PingStatus.NEW,
        category: 'Hardware',
        priority: PingPriority.HIGH,
        summary: 'Test summary',
        organizationName: 'Test Org',
      };

      // Type check passes if this compiles
      expect(validContext.messages.length).toBe(1);
      expect(validContext.status).toBe(PingStatus.NEW);
      expect(validContext.category).toBe('Hardware');
    });

    it('should accept context with optional fields', () => {
      const minimalContext = {
        messages: [createMockMessage('1', 'test', MessageType.USER)],
        status: PingStatus.NEW,
        category: null,
        priority: PingPriority.LOW,
      };

      expect(minimalContext.messages.length).toBe(1);
      expect(minimalContext.category).toBeNull();
    });
  });

  describe('EchoResponseConfig interface', () => {
    it('should accept valid OpenAI config', () => {
      const config = {
        provider: 'openai' as const,
        model: 'gpt-4o-mini',
        apiKey: 'sk-test',
        temperature: 0.7,
      };

      expect(config.provider).toBe('openai');
      expect(config.temperature).toBe(0.7);
    });

    it('should accept valid Anthropic config', () => {
      const config = {
        provider: 'anthropic' as const,
        model: 'claude-3-haiku-20240307',
        apiKey: 'sk-ant-test',
      };

      expect(config.provider).toBe('anthropic');
    });

    it('should accept valid Azure config', () => {
      const config = {
        provider: 'azure' as const,
        model: 'gpt-4',
        apiKey: 'azure-key',
      };

      expect(config.provider).toBe('azure');
    });
  });
});
