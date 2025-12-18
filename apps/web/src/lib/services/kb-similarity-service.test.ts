/**
 * Unit Tests for KB Similarity Service
 * Story 4.2.3: KB Article Comparison & Enhancement
 *
 * Tests similarity search logic, threshold filtering,
 * and category-based filtering.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  findSimilarArticles,
  getArticleExcerpt,
} from './kb-similarity-service';

describe('kb-similarity-service', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseClient = {
      rpc: vi.fn(),
      from: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findSimilarArticles', () => {
    const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
    const CATEGORY_ID = '550e8400-e29b-41d4-a716-446655440001';

    it('should return empty result for empty content', async () => {
      const result = await findSimilarArticles(
        mockSupabaseClient,
        '',
        TENANT_ID
      );

      expect(result.hasSimilar).toBe(false);
      expect(result.bestMatch).toBeNull();
      expect(result.matches).toHaveLength(0);
    });

    it('should return empty result for whitespace-only content', async () => {
      const result = await findSimilarArticles(
        mockSupabaseClient,
        '   \n\t  ',
        TENANT_ID
      );

      expect(result.hasSimilar).toBe(false);
      expect(result.bestMatch).toBeNull();
      expect(result.matches).toHaveLength(0);
    });

    it('should return matches above threshold using RPC', async () => {
      const mockSearchResults = [
        {
          id: 'article-1',
          title: 'How to reset password',
          slug: 'how-to-reset-password',
          content: 'Step 1: Go to settings...',
          category_id: CATEGORY_ID,
          category_name: 'Account',
          similarity_score: 0.35, // Should normalize to 100 (max)
          view_count: 100,
          helpful_count: 25,
        },
        {
          id: 'article-2',
          title: 'Password recovery tips',
          slug: 'password-recovery-tips',
          content: 'If you forgot your password...',
          category_id: CATEGORY_ID,
          category_name: 'Account',
          similarity_score: 0.25, // Should normalize to ~75
          view_count: 50,
          helpful_count: 10,
        },
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockSearchResults,
        error: null,
      });

      const result = await findSimilarArticles(
        mockSupabaseClient,
        'how do I reset my password',
        TENANT_ID,
        CATEGORY_ID
      );

      expect(result.hasSimilar).toBe(true);
      expect(result.bestMatch).not.toBeNull();
      expect(result.bestMatch?.title).toBe('How to reset password');
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('should respect minimum similarity threshold', async () => {
      const mockSearchResults = [
        {
          id: 'article-1',
          title: 'Unrelated article',
          slug: 'unrelated',
          content: 'Something completely different',
          category_id: CATEGORY_ID,
          category_name: 'Other',
          similarity_score: 0.1, // Should normalize to ~30, below 70 threshold
          view_count: 10,
          helpful_count: 1,
        },
      ];

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockSearchResults,
        error: null,
      });

      const result = await findSimilarArticles(
        mockSupabaseClient,
        'password reset help',
        TENANT_ID,
        null,
        { minSimilarity: 70 }
      );

      expect(result.hasSimilar).toBe(false);
      expect(result.bestMatch).toBeNull();
      expect(result.matches).toHaveLength(0);
    });

    it('should search within category first, then across all categories', async () => {
      // First call (with category) returns no matches
      mockSupabaseClient.rpc
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({
          data: [
            {
              id: 'article-1',
              title: 'Found in another category',
              slug: 'found-elsewhere',
              content: 'This matches your search',
              category_id: 'other-category',
              category_name: 'Support',
              similarity_score: 0.3,
              view_count: 20,
              helpful_count: 5,
            },
          ],
          error: null,
        });

      const result = await findSimilarArticles(
        mockSupabaseClient,
        'search for something',
        TENANT_ID,
        CATEGORY_ID
      );

      // Should have called RPC twice: first with category, then without
      expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(2);
      expect(result.hasSimilar).toBe(true);
    });

    it('should fall back to basic search when RPC fails', async () => {
      // RPC fails
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC function not found' },
      });

      // Mock basic Supabase query
      const mockBasicQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'fallback-article',
              title: 'Password help article',
              slug: 'password-help',
              content: 'Information about password reset',
              category_id: null,
              view_count: 5,
              helpful_count: 1,
            },
          ],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockBasicQuery);

      await findSimilarArticles(mockSupabaseClient, 'password help', TENANT_ID);

      // Should have used fallback
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('kb_articles');
    });

    it('should respect limit configuration', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      await findSimilarArticles(
        mockSupabaseClient,
        'test query',
        TENANT_ID,
        null,
        { limit: 3 }
      );

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'search_similar_kb_articles',
        expect.objectContaining({
          p_limit: 3,
        })
      );
    });
  });

  describe('getArticleExcerpt', () => {
    it('should return full content if under max length', () => {
      const shortContent = 'This is a short article.';
      const excerpt = getArticleExcerpt(shortContent, 200);

      expect(excerpt).toBe(shortContent);
    });

    it('should truncate content at word boundary', () => {
      const longContent =
        'This is a longer article that should be truncated at a word boundary to avoid cutting off in the middle of a word which would look unprofessional.';
      const excerpt = getArticleExcerpt(longContent, 50);

      expect(excerpt.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(excerpt.endsWith('...')).toBe(true);
      // Should end with a complete word followed by ...
      // The function cuts at word boundary, so any word character before ... is valid
      expect(excerpt).toMatch(/\w\.\.\.$/); // Should end with word...
    });

    it('should strip markdown headers', () => {
      const markdownContent = '## Header\n\nThis is the actual content.';
      const excerpt = getArticleExcerpt(markdownContent);

      expect(excerpt).not.toContain('##');
      expect(excerpt).toContain('content');
    });

    it('should strip bold and italic formatting', () => {
      const formattedContent = 'This has **bold** and *italic* text.';
      const excerpt = getArticleExcerpt(formattedContent);

      expect(excerpt).not.toContain('**');
      expect(excerpt).not.toContain('*');
      expect(excerpt).toContain('bold');
      expect(excerpt).toContain('italic');
    });

    it('should handle empty content', () => {
      const excerpt = getArticleExcerpt('');
      expect(excerpt).toBe('');
    });
  });
});
