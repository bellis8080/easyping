/**
 * Unit Tests for Echo Conversation Service
 * Story 3.3: Auto-Categorization of Pings with Conversational Clarification
 *
 * Tests the problem-first conversation logic for Echo AI assistant.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  analyzeConversation,
  generateProblemStatement,
  determineWhenToEscalate,
  type EchoConfig,
} from './echo-conversation-service';
import type { AIProvider } from '@easyping/ai';

// Mock the AI provider factory
vi.mock('@easyping/ai', () => ({
  createAIProvider: vi.fn(),
}));

describe('echo-conversation-service', () => {
  let mockProvider: AIProvider;
  let config: EchoConfig;

  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Create mock AI provider
    mockProvider = {
      categorize: vi.fn(),
      generateEmbeddings: vi.fn(),
    } as unknown as AIProvider;

    // Mock createAIProvider to return our mock
    const { createAIProvider } = await import('@easyping/ai');
    vi.mocked(createAIProvider).mockResolvedValue(mockProvider);

    config = {
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'test-api-key',
    };
  });

  describe('analyzeConversation', () => {
    it('should identify when problem is not understood (early conversation)', async () => {
      // Mock AI response for unclear problem
      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'test',
        confidence: 0.4,
        reasoning: JSON.stringify({
          problemUnderstood: false,
          nextQuestion: 'What exactly happens when you try to log in?',
          confidence: 0.4,
        }),
      });

      const conversation = ['My email is broken'];
      const result = await analyzeConversation(conversation, config);

      expect(result.problemUnderstood).toBe(false);
      expect(result.nextQuestion).toBe(
        'What exactly happens when you try to log in?'
      );
      expect(result.confidence).toBe(0.4);
    });

    it('should identify when problem is understood (sufficient info)', async () => {
      // Mock AI response for clear problem
      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'test',
        confidence: 0.92,
        reasoning: JSON.stringify({
          problemUnderstood: true,
          problemStatement:
            'User unable to log into email since this morning. Error: Credentials incorrect.',
          confidence: 0.92,
        }),
      });

      const conversation = [
        'My email is broken',
        'I cannot log in',
        'It says credentials incorrect',
        'This started this morning',
      ];
      const result = await analyzeConversation(conversation, config);

      expect(result.problemUnderstood).toBe(true);
      expect(result.problemStatement).toContain('unable to log into email');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should generate problem-focused questions (not category-focused)', async () => {
      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'test',
        confidence: 0.5,
        reasoning: JSON.stringify({
          problemUnderstood: false,
          nextQuestion: 'What error message do you see?',
          confidence: 0.5,
        }),
      });

      const conversation = ['My computer is not working'];
      const result = await analyzeConversation(conversation, config);

      // Question should be about understanding the problem, not categorizing
      expect(result.nextQuestion).not.toContain('hardware or software');
      expect(result.nextQuestion).not.toContain('category');
      expect(result.nextQuestion).toBeTruthy();
    });

    it('should handle AI failures gracefully with fallback question', async () => {
      // Mock AI failure
      vi.mocked(mockProvider.categorize).mockRejectedValue(
        new Error('AI service unavailable')
      );

      const conversation = ['Help!'];
      const result = await analyzeConversation(conversation, config);

      // Should return fallback question
      expect(result.problemUnderstood).toBe(false);
      expect(result.nextQuestion).toBeTruthy();
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should escalate when AI fails with sufficient conversation', async () => {
      // Mock AI failure
      vi.mocked(mockProvider.categorize).mockRejectedValue(
        new Error('AI timeout')
      );

      const conversation = [
        'Issue 1',
        'Response 1',
        'Issue 2',
        'Response 2',
        'Issue 3',
      ];
      const result = await analyzeConversation(conversation, config);

      // With enough conversation but AI failed, should mark as understood for escalation
      expect(result.problemUnderstood).toBe(true);
      expect(result.problemStatement).toBeTruthy();
    });
  });

  describe('generateProblemStatement', () => {
    it('should generate 2-3 sentence summary from conversation', async () => {
      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'test',
        confidence: 0.9,
        reasoning:
          'User unable to log into email since this morning. Outlook shows credentials incorrect error. User tried resetting password but issue persists.',
      });

      const conversation = [
        'Cannot log into email',
        'Started this morning',
        'Credentials incorrect error in Outlook',
        'Already tried password reset',
      ];
      const result = await generateProblemStatement(conversation, config);

      expect(result).toBeTruthy();
      expect(result.length).toBeLessThanOrEqual(500);
      expect(result).toContain('email');
    });

    it('should handle AI failure with conversation fallback', async () => {
      vi.mocked(mockProvider.categorize).mockRejectedValue(
        new Error('AI error')
      );

      const conversation = ['Problem A', 'Problem B', 'Problem C'];
      const result = await generateProblemStatement(conversation, config);

      // Should return joined conversation truncated to 500 chars
      expect(result).toBeTruthy();
      expect(result.length).toBeLessThanOrEqual(500);
    });

    it('should truncate long conversations to 500 characters', async () => {
      const longReasoning = 'A'.repeat(600);
      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'test',
        confidence: 0.9,
        reasoning: longReasoning,
      });

      const conversation = ['Long problem description'];
      const result = await generateProblemStatement(conversation, config);

      expect(result.length).toBeLessThanOrEqual(500);
    });
  });

  describe('determineWhenToEscalate', () => {
    it('should not escalate early in conversation', async () => {
      const conversation = ['Issue', 'Response 1', 'Response 2'];
      const clarificationCount = 2;

      const result = await determineWhenToEscalate(
        conversation,
        clarificationCount,
        config
      );

      expect(result).toBe(false);
    });

    it('should enforce hard limit at 12 questions', async () => {
      const conversation = Array(12).fill('message');
      const clarificationCount = 12;

      const result = await determineWhenToEscalate(
        conversation,
        clarificationCount,
        config
      );

      expect(result).toBe(true);
    });

    it('should detect explicit requests for human help', async () => {
      const conversation = ['I want to talk to a person'];
      const clarificationCount = 3;

      const result = await determineWhenToEscalate(
        conversation,
        clarificationCount,
        config
      );

      expect(result).toBe(true);
    });

    it('should detect various human help keywords', async () => {
      const testCases = [
        'Can I speak to someone?',
        'I need a human agent',
        'Talk to a real person',
      ];

      for (const message of testCases) {
        const result = await determineWhenToEscalate([message], 3, config);
        expect(result).toBe(true);
      }
    });

    it('should use AI decision when approaching soft limit (8+ questions)', async () => {
      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'test',
        confidence: 0.8,
        reasoning: JSON.stringify({
          shouldEscalate: true,
          reason:
            'User responses are vague and conversation is not progressing',
        }),
      });

      const conversation = Array(9).fill('vague response');
      const clarificationCount = 9;

      const result = await determineWhenToEscalate(
        conversation,
        clarificationCount,
        config
      );

      expect(result).toBe(true);
    });

    it('should continue when AI determines progress is being made', async () => {
      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'test',
        confidence: 0.8,
        reasoning: JSON.stringify({
          shouldEscalate: false,
          reason: 'Conversation is progressing toward understanding',
        }),
      });

      const conversation = Array(8).fill('detailed response');
      const clarificationCount = 8;

      const result = await determineWhenToEscalate(
        conversation,
        clarificationCount,
        config
      );

      expect(result).toBe(false);
    });

    it('should escalate on AI error when near limit', async () => {
      vi.mocked(mockProvider.categorize).mockRejectedValue(
        new Error('AI timeout')
      );

      const conversation = Array(10).fill('message');
      const clarificationCount = 10;

      const result = await determineWhenToEscalate(
        conversation,
        clarificationCount,
        config
      );

      // Should escalate cautiously when AI fails and near limit
      expect(result).toBe(true);
    });

    it('should continue on AI error when well below limit', async () => {
      vi.mocked(mockProvider.categorize).mockRejectedValue(
        new Error('AI error')
      );

      const conversation = Array(5).fill('message');
      const clarificationCount = 5;

      const result = await determineWhenToEscalate(
        conversation,
        clarificationCount,
        config
      );

      // Below escalation threshold, should continue
      expect(result).toBe(false);
    });
  });
});
