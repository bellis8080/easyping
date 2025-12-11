/**
 * Unit Tests for Problem Categorization Service
 * Story 3.3: Auto-Categorization of Pings with Conversational Clarification
 *
 * Tests categorization from confirmed problem statements (not raw conversation).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  categorizeProblemStatement,
  generateTitle,
  type Category,
  type CategoryConfig,
} from './problem-categorization-service';
import type { AIProvider } from '@easyping/ai';

// Mock the AI provider factory
vi.mock('@easyping/ai', () => ({
  createAIProvider: vi.fn(),
}));

describe('problem-categorization-service', () => {
  let mockProvider: AIProvider;
  let config: CategoryConfig;
  let categories: Category[];

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

    // Sample categories
    categories = [
      {
        id: '1',
        name: 'Hardware',
        description: 'Computer hardware, peripherals, equipment issues',
        color: '#ef4444',
        icon: 'HardDrive',
      },
      {
        id: '2',
        name: 'Software',
        description: 'Application errors, software bugs',
        color: '#3b82f6',
        icon: 'Code',
      },
      {
        id: '3',
        name: 'Network',
        description: 'Internet connectivity, VPN issues',
        color: '#10b981',
        icon: 'Network',
      },
      {
        id: '4',
        name: 'Password Reset',
        description: 'Password recovery, account lockout',
        color: '#8b5cf6',
        icon: 'LockKeyhole',
      },
      {
        id: '5',
        name: 'Needs Review',
        description: 'Requires manual review',
        color: '#f97316',
        icon: 'AlertCircle',
      },
      {
        id: '6',
        name: 'Other',
        description: 'Uncategorized inquiries',
        color: '#6b7280',
        icon: 'HelpCircle',
      },
    ];
  });

  describe('categorizeProblemStatement', () => {
    it('should categorize software problem correctly', async () => {
      const problemStatement =
        'User unable to log into email since this morning. Outlook shows credentials incorrect error.';

      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'Software',
        confidence: 0.85,
        reasoning: 'Email login issue indicates software/application problem',
      });

      const result = await categorizeProblemStatement(
        problemStatement,
        categories,
        config
      );

      expect(result.category).toBe('Software');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.reasoning).toBeTruthy();
    });

    it('should categorize hardware problem correctly', async () => {
      const problemStatement =
        'User laptop will not turn on. Power button is unresponsive. Battery was charging overnight.';

      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'Hardware',
        confidence: 0.92,
        reasoning: 'Physical device not powering on indicates hardware issue',
      });

      const result = await categorizeProblemStatement(
        problemStatement,
        categories,
        config
      );

      expect(result.category).toBe('Hardware');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should categorize password reset requests', async () => {
      const problemStatement =
        'User account is locked after too many failed login attempts. Needs password reset.';

      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'Password Reset',
        confidence: 0.95,
        reasoning: 'Explicit password reset request',
      });

      const result = await categorizeProblemStatement(
        problemStatement,
        categories,
        config
      );

      expect(result.category).toBe('Password Reset');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should categorize network problems correctly', async () => {
      const problemStatement =
        'User cannot connect to VPN from home. Internet connection works for other sites.';

      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'Network',
        confidence: 0.88,
        reasoning: 'VPN connectivity issue indicates network problem',
      });

      const result = await categorizeProblemStatement(
        problemStatement,
        categories,
        config
      );

      expect(result.category).toBe('Network');
    });

    it('should handle exact category name match from AI', async () => {
      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'Software',
        confidence: 0.8,
        reasoning: 'Software issue identified',
      });

      const result = await categorizeProblemStatement(
        'App crashes on startup',
        categories,
        config
      );

      expect(result.category).toBe('Software');
    });

    it('should handle partial category name match from AI', async () => {
      // AI returns "software" (lowercase) but category is "Software"
      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'software',
        confidence: 0.8,
        reasoning: 'Software issue',
      });

      const result = await categorizeProblemStatement(
        'Excel is not responding',
        categories,
        config
      );

      expect(result.category).toBe('Software');
      expect(result.confidence).toBeLessThanOrEqual(0.8); // Slightly reduced for partial match
    });

    it('should fallback to "Needs Review" when AI fails', async () => {
      vi.mocked(mockProvider.categorize).mockRejectedValue(
        new Error('AI service error')
      );

      const result = await categorizeProblemStatement(
        'Some problem',
        categories,
        config
      );

      expect(result.category).toBe('Needs Review');
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.reasoning).toContain('AI categorization failed');
    });

    it('should fallback to first category if "Needs Review" not available', async () => {
      vi.mocked(mockProvider.categorize).mockRejectedValue(new Error('Error'));

      const limitedCategories = categories.filter(
        (c) => c.name !== 'Needs Review'
      );

      const result = await categorizeProblemStatement(
        'Problem',
        limitedCategories,
        config
      );

      // Should fallback to first available category when neither "Needs Review" nor "Other" match
      expect(limitedCategories.map((c) => c.name)).toContain(result.category);
    });

    it('should parse JSON from reasoning field when category not directly provided', async () => {
      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'unknown',
        confidence: 0.5,
        reasoning: JSON.stringify({
          category: 'Hardware',
          confidence: 0.87,
          reasoning: 'Physical equipment issue',
        }),
      });

      const result = await categorizeProblemStatement(
        'Keyboard keys not working',
        categories,
        config
      );

      expect(result.category).toBe('Hardware');
      expect(result.confidence).toBeCloseTo(0.87);
    });

    it('should handle ambiguous problems by choosing "Needs Review" or "Other"', async () => {
      const ambiguousProblem =
        'User needs help with something but unclear what exactly.';

      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'Other',
        confidence: 0.4,
        reasoning: 'Problem is too ambiguous to categorize confidently',
      });

      const result = await categorizeProblemStatement(
        ambiguousProblem,
        categories,
        config
      );

      expect(['Needs Review', 'Other']).toContain(result.category);
      expect(result.confidence).toBeLessThan(0.7);
    });
  });

  describe('generateTitle', () => {
    it('should generate concise title under 80 characters', async () => {
      const problemStatement =
        'User unable to log into email since this morning. Error shows credentials incorrect.';

      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'test',
        confidence: 0.9,
        reasoning: 'Email login failure - credentials error',
      });

      const result = await generateTitle(problemStatement, config);

      expect(result.length).toBeLessThanOrEqual(80);
      expect(result).toBeTruthy();
    });

    it('should follow format "[Action/Issue] - [Brief context]"', async () => {
      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'test',
        confidence: 0.9,
        reasoning: 'Printer not responding - network connectivity',
      });

      const result = await generateTitle(
        'Printer is not responding to print jobs',
        config
      );

      expect(result).toContain('-');
      expect(result.split('-').length).toBeGreaterThanOrEqual(2);
    });

    it('should remove surrounding quotes from AI response', async () => {
      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'test',
        confidence: 0.9,
        reasoning: '"Email login failed - credentials incorrect"',
      });

      const result = await generateTitle('Problem statement', config);

      expect(result).not.toMatch(/^["']|["']$/);
    });

    it('should truncate long titles to 80 characters', async () => {
      const longTitle = 'A'.repeat(100);
      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'test',
        confidence: 0.9,
        reasoning: longTitle,
      });

      const result = await generateTitle('Problem', config);

      expect(result.length).toBeLessThanOrEqual(80);
    });

    it('should handle AI failure with fallback to first sentence', async () => {
      vi.mocked(mockProvider.categorize).mockRejectedValue(
        new Error('AI error')
      );

      const problemStatement =
        'User cannot access shared drive. Permission denied error shown. This started after recent security update.';

      const result = await generateTitle(problemStatement, config);

      expect(result).toBeTruthy();
      expect(result.length).toBeLessThanOrEqual(80);
      expect(result).toContain('shared drive');
    });

    it('should generate title even if problem statement is empty', async () => {
      vi.mocked(mockProvider.categorize).mockResolvedValue({
        category: 'test',
        confidence: 0.5,
        reasoning: '',
      });

      const result = await generateTitle('', config);

      // Empty problem statement results in fallback title
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate descriptive titles for various problem types', async () => {
      const testCases = [
        {
          statement: 'Laptop battery drains in 1 hour instead of usual 6 hours',
          expected: 'Battery drain',
        },
        {
          statement: 'Cannot print to office printer from laptop',
          expected: 'Printer',
        },
        {
          statement: 'Password reset link email never arrives',
          expected: 'Password',
        },
      ];

      for (const testCase of testCases) {
        vi.mocked(mockProvider.categorize).mockResolvedValue({
          category: 'test',
          confidence: 0.9,
          reasoning: `${testCase.expected} issue - brief context`,
        });

        const result = await generateTitle(testCase.statement, config);

        expect(result.toLowerCase()).toContain(testCase.expected.toLowerCase());
      }
    });
  });
});
