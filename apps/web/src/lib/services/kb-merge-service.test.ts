/**
 * Unit Tests for KB Merge Service
 * Story 4.2.3: KB Article Comparison & Enhancement
 *
 * Tests article merging logic, change detection,
 * and diff summary generation.
 */

import { describe, it, expect } from 'vitest';
import {
  mergeArticles,
  generateDiffSummary,
  type OriginalArticle,
  type NewContent,
  type KBMergeConfig,
} from './kb-merge-service';

describe('kb-merge-service', () => {
  // Use an invalid config that will cause AI calls to fail
  // This allows us to test error handling reliably
  const mockConfig: KBMergeConfig = {
    ai: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'invalid-test-key-will-fail',
    },
    preserveOriginal: true,
  };

  const mockOriginal: OriginalArticle = {
    id: 'article-123',
    title: 'How to reset your password',
    content:
      '## Overview\n\nIf you forgot your password...\n\n## Steps\n\n1. Go to login page\n2. Click forgot password',
    agentContent: '## Technical Steps\n\n1. Check user status in admin panel',
  };

  const mockNewContent: NewContent = {
    conversationSummary:
      'User: I forgot my password and the reset email never arrived.\nAgent: I found the issue - your email was bouncing.',
    privateNotes: 'Had to manually update email address in database.',
  };

  describe('mergeArticles', () => {
    it('should return error for empty original title', async () => {
      const emptyOriginal: OriginalArticle = {
        ...mockOriginal,
        title: '',
      };

      const result = await mergeArticles(
        emptyOriginal,
        mockNewContent,
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('title and content');
    });

    it('should return error for empty original content', async () => {
      const emptyOriginal: OriginalArticle = {
        ...mockOriginal,
        content: '',
      };

      const result = await mergeArticles(
        emptyOriginal,
        mockNewContent,
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('title and content');
    });

    it('should return error for empty conversation summary', async () => {
      const emptyNewContent: NewContent = {
        conversationSummary: '',
        privateNotes: null,
      };

      const result = await mergeArticles(
        mockOriginal,
        emptyNewContent,
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('conversation summary');
    });

    it('should handle AI provider errors gracefully', async () => {
      // With invalid API key, should fail gracefully
      const result = await mergeArticles(
        mockOriginal,
        mockNewContent,
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Should return original content on failure
      expect(result.title).toBe(mockOriginal.title);
      expect(result.content).toBe(mockOriginal.content);
    });

    it('should handle unsupported provider', async () => {
      const invalidConfig: KBMergeConfig = {
        ai: {
          ...mockConfig.ai,
          provider: 'unsupported-provider',
        },
      };

      const result = await mergeArticles(
        mockOriginal,
        mockNewContent,
        invalidConfig
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported');
    });

    it('should handle anthropic provider errors gracefully', async () => {
      const anthropicConfig: KBMergeConfig = {
        ai: {
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          apiKey: 'invalid-anthropic-key',
        },
      };

      const result = await mergeArticles(
        mockOriginal,
        mockNewContent,
        anthropicConfig
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle null agentContent gracefully', async () => {
      const originalWithoutAgentContent: OriginalArticle = {
        ...mockOriginal,
        agentContent: null,
      };

      const result = await mergeArticles(
        originalWithoutAgentContent,
        mockNewContent,
        mockConfig
      );

      // Should fail due to invalid API key but not crash on null agentContent
      expect(result.success).toBe(false);
      // Original content should be preserved
      expect(result.agentContent).toBe('');
    });

    it('should handle null privateNotes gracefully', async () => {
      const newContentWithoutNotes: NewContent = {
        conversationSummary: mockNewContent.conversationSummary,
        privateNotes: null,
      };

      const result = await mergeArticles(
        mockOriginal,
        newContentWithoutNotes,
        mockConfig
      );

      // Should process without error (though will fail on API call)
      expect(result.success).toBe(false);
    });
  });

  describe('generateDiffSummary', () => {
    it('should detect title changes', () => {
      const original = {
        title: 'Original Title',
        content: 'Content here',
        agentContent: 'Agent content',
      };
      const merged = {
        title: 'New Title',
        content: 'Content here',
        agentContent: 'Agent content',
      };

      const summary = generateDiffSummary(original, merged);

      expect(summary.titleChanged).toBe(true);
      expect(summary.summary).toContain('Title updated');
    });

    it('should detect content additions', () => {
      const original = {
        title: 'Title',
        content: 'Short content',
        agentContent: null,
      };
      const merged = {
        title: 'Title',
        content:
          'Short content plus a lot more content that was added during the merge process to enhance the article',
        agentContent: '',
      };

      const summary = generateDiffSummary(original, merged);

      expect(summary.contentLengthDiff).toBeGreaterThan(0);
      expect(summary.summary).toContain('characters to user content');
    });

    it('should detect agent content additions', () => {
      const original = {
        title: 'Title',
        content: 'Content',
        agentContent: null,
      };
      const merged = {
        title: 'Title',
        content: 'Content',
        agentContent: 'New agent content with technical details for resolution',
      };

      const summary = generateDiffSummary(original, merged);

      expect(summary.agentContentLengthDiff).toBeGreaterThan(0);
      expect(summary.summary).toContain('characters to agent content');
    });

    it('should return minor updates for small changes', () => {
      const original = {
        title: 'Title',
        content: 'Content ABC',
        agentContent: 'Agent',
      };
      const merged = {
        title: 'Title',
        content: 'Content XYZ',
        agentContent: 'Agent',
      };

      const summary = generateDiffSummary(original, merged);

      expect(summary.titleChanged).toBe(false);
      expect(summary.contentLengthDiff).toBe(0);
      expect(summary.summary).toBe('Minor updates');
    });

    it('should handle empty original agent content', () => {
      const original = {
        title: 'Title',
        content: 'Content',
        agentContent: null,
      };
      const merged = {
        title: 'Title',
        content: 'Content',
        agentContent: '',
      };

      const summary = generateDiffSummary(original, merged);

      // Should not crash with null agentContent
      expect(summary.agentContentLengthDiff).toBe(0);
    });

    it('should handle multiple changes', () => {
      const original = {
        title: 'Old Title',
        content: 'Short',
        agentContent: null,
      };
      const merged = {
        title: 'New Title',
        content:
          'Much longer content that was added to improve the article significantly',
        agentContent: 'New technical details',
      };

      const summary = generateDiffSummary(original, merged);

      expect(summary.titleChanged).toBe(true);
      expect(summary.contentLengthDiff).toBeGreaterThan(50);
      expect(summary.agentContentLengthDiff).toBeGreaterThan(0);
      // Summary should contain multiple changes
      expect(summary.summary.split(',').length).toBeGreaterThan(1);
    });
  });
});
