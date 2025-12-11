/**
 * Unit Tests for Echo Conversation Service
 * Story 3.3: Auto-Categorization of Pings with Conversational Clarification
 *
 * Tests the problem-first conversation logic for Echo AI assistant.
 * These tests focus on the deterministic logic and fallback behavior
 * that doesn't require mocking the AI SDK.
 */

import { describe, it, expect } from 'vitest';
import {
  determineWhenToEscalate,
  analyzeUserConfirmation,
  type EchoConfig,
  type ConversationMessage,
} from './echo-conversation-service';

// Helper function to create ConversationMessage array from strings
// Assumes odd messages are from user, even messages are from Echo
function createConversation(messages: string[]): ConversationMessage[] {
  return messages.map((content, index) => ({
    role: index % 2 === 0 ? 'user' : 'echo',
    content,
  })) as ConversationMessage[];
}

describe('echo-conversation-service', () => {
  // Use an invalid config that will cause AI calls to fail
  // This allows us to test fallback behavior reliably
  const config: EchoConfig = {
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: 'invalid-test-key-will-fail',
  };

  describe('determineWhenToEscalate', () => {
    it('should not escalate early in conversation', async () => {
      const conversation = createConversation([
        'Issue',
        'Response 1',
        'Response 2',
      ]);
      const clarificationCount = 2;

      const result = await determineWhenToEscalate(
        conversation,
        clarificationCount,
        config
      );

      expect(result).toBe(false);
    });

    it('should enforce hard limit at 5 questions', async () => {
      const conversation = createConversation(Array(5).fill('message'));
      const clarificationCount = 5;

      const result = await determineWhenToEscalate(
        conversation,
        clarificationCount,
        config
      );

      expect(result).toBe(true);
    });

    it('should detect explicit requests for human help', async () => {
      const conversation = createConversation(['I want to talk to a person']);
      const clarificationCount = 3;

      const result = await determineWhenToEscalate(
        conversation,
        clarificationCount,
        config
      );

      expect(result).toBe(true);
    });

    it('should detect "speak to" keyword', async () => {
      const result = await determineWhenToEscalate(
        createConversation(['Can I speak to someone?']),
        3,
        config
      );
      expect(result).toBe(true);
    });

    it('should detect "human" keyword', async () => {
      const result = await determineWhenToEscalate(
        createConversation(['I need a human agent']),
        3,
        config
      );
      expect(result).toBe(true);
    });

    it('should detect "real person" keyword', async () => {
      const result = await determineWhenToEscalate(
        createConversation(['Talk to a real person']),
        3,
        config
      );
      expect(result).toBe(true);
    });

    it('should detect "don\'t understand" keyword', async () => {
      const result = await determineWhenToEscalate(
        createConversation(["I don't understand what you're asking"]),
        3,
        config
      );
      expect(result).toBe(true);
    });

    it('should detect "stop asking" keyword', async () => {
      const result = await determineWhenToEscalate(
        createConversation(['Please stop asking me questions']),
        3,
        config
      );
      expect(result).toBe(true);
    });

    it('should detect "already told you" keyword', async () => {
      const result = await determineWhenToEscalate(
        createConversation(['I already told you the problem']),
        3,
        config
      );
      expect(result).toBe(true);
    });

    it('should continue on AI error when well below limit', async () => {
      const conversation = createConversation(
        Array(2).fill('message') as string[]
      );
      const clarificationCount = 2;

      const result = await determineWhenToEscalate(
        conversation,
        clarificationCount,
        config
      );

      // Below escalation threshold, should continue
      expect(result).toBe(false);
    });

    it('should escalate on AI error when at soft limit', async () => {
      const conversation = createConversation(
        Array(4).fill('message') as string[]
      );
      const clarificationCount = 4;

      // At clarificationCount >= 4, AI error causes escalation
      const result = await determineWhenToEscalate(
        conversation,
        clarificationCount,
        config
      );

      expect(result).toBe(true);
    });
  });

  describe('analyzeUserConfirmation fallback behavior', () => {
    // These tests exercise the fallback keyword matching when AI fails

    it('should recognize "yes" as confirm', async () => {
      const result = await analyzeUserConfirmation(
        'yes',
        'User struggles with VPN connection',
        config
      );

      expect(result.intent).toBe('confirm');
      expect(result.confidence).toBe(0.8);
    });

    it('should recognize "yep" as confirm', async () => {
      const result = await analyzeUserConfirmation(
        'yep',
        'User struggles with VPN connection',
        config
      );

      expect(result.intent).toBe('confirm');
    });

    it('should recognize "correct" as confirm', async () => {
      const result = await analyzeUserConfirmation(
        'correct',
        'User struggles with VPN connection',
        config
      );

      expect(result.intent).toBe('confirm');
    });

    it('should recognize "no" as deny', async () => {
      const result = await analyzeUserConfirmation(
        'no',
        'User struggles with VPN connection',
        config
      );

      expect(result.intent).toBe('deny');
      expect(result.confidence).toBe(0.8);
    });

    it('should recognize "nope" as deny', async () => {
      const result = await analyzeUserConfirmation(
        'nope',
        'User struggles with VPN connection',
        config
      );

      expect(result.intent).toBe('deny');
    });

    it('should recognize "wrong" as deny', async () => {
      const result = await analyzeUserConfirmation(
        'wrong',
        'User struggles with VPN connection',
        config
      );

      expect(result.intent).toBe('deny');
    });

    it('should treat long messages as clarification', async () => {
      const result = await analyzeUserConfirmation(
        'Actually I also have another problem with my printer not working',
        'User struggles with VPN connection',
        config
      );

      expect(result.intent).toBe('clarify');
      expect(result.echoResponse).toBeTruthy();
    });

    it('should treat short ambiguous messages as unclear', async () => {
      const result = await analyzeUserConfirmation(
        'maybe',
        'User struggles with VPN connection',
        config
      );

      expect(result.intent).toBe('unclear');
      expect(result.echoResponse).toBeTruthy();
    });

    it('should treat random short word as unclear', async () => {
      const result = await analyzeUserConfirmation(
        'blue',
        'User struggles with VPN connection',
        config
      );

      expect(result.intent).toBe('unclear');
    });
  });
});
