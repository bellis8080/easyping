/**
 * Unit tests for Public KB Articles API
 * Story 4.3.5: KB Browse Page & Category Filtering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { GET } from './route';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

describe('Public KB Articles API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (url: string) => {
    return new NextRequest(new URL(url, 'http://localhost'));
  };

  describe('GET /api/kb/public/articles', () => {
    it('should return 401 if user is not authenticated', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const response = await GET(
        createMockRequest('http://localhost/api/kb/public/articles')
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user profile not found', async () => {
      const mockUser = { id: 'user-123' };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const response = await GET(
        createMockRequest('http://localhost/api/kb/public/articles')
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });

    it('should return published articles for authenticated user', async () => {
      const mockUser = { id: 'user-123' };
      const mockUserProfile = { id: 'user-123', tenant_id: 'org-123' };
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Test Article',
          slug: 'test-article',
          content:
            'This is a test article content that is longer than 150 characters so we can test the excerpt functionality properly.',
          category_id: 'cat-1',
          view_count: 100,
          helpful_count: 10,
          not_helpful_count: 2,
          updated_at: '2024-01-15T00:00:00Z',
          categories: { name: 'Test Category' },
        },
      ];

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue({ data: mockUserProfile, error: null }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({
            data: mockArticles,
            error: null,
            count: 1,
          }),
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as never);

      const response = await GET(
        createMockRequest('http://localhost/api/kb/public/articles')
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.articles).toHaveLength(1);
      expect(data.articles[0].title).toBe('Test Article');
      expect(data.articles[0].slug).toBe('test-article');
      expect(data.articles[0].viewCount).toBe(100);
      expect(data.articles[0].helpfulCount).toBe(10);
      expect(data.articles[0].notHelpfulCount).toBe(2);
      expect(data.articles[0].categoryName).toBe('Test Category');
      expect(data.pagination.total).toBe(1);
    });

    it('should filter by search query', async () => {
      const mockUser = { id: 'user-123' };
      const mockUserProfile = { id: 'user-123', tenant_id: 'org-123' };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue({ data: mockUserProfile, error: null }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const orMock = vi.fn().mockReturnThis();
      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          or: orMock,
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0,
          }),
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as never);

      await GET(
        createMockRequest('http://localhost/api/kb/public/articles?search=test')
      );

      // Verify the or clause was called with search pattern
      expect(orMock).toHaveBeenCalledWith(
        expect.stringContaining('title.ilike.%test%')
      );
    });

    it('should filter by category', async () => {
      const mockUser = { id: 'user-123' };
      const mockUserProfile = { id: 'user-123', tenant_id: 'org-123' };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue({ data: mockUserProfile, error: null }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const eqMock = vi.fn().mockReturnThis();
      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: eqMock,
          is: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0,
          }),
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as never);

      await GET(
        createMockRequest(
          'http://localhost/api/kb/public/articles?category=cat-123'
        )
      );

      // Verify category_id filter was applied
      expect(eqMock).toHaveBeenCalledWith('category_id', 'cat-123');
    });

    it('should return pagination info', async () => {
      const mockUser = { id: 'user-123' };
      const mockUserProfile = { id: 'user-123', tenant_id: 'org-123' };
      const mockArticles = Array.from({ length: 10 }, (_, i) => ({
        id: `article-${i}`,
        title: `Article ${i}`,
        slug: `article-${i}`,
        content: 'Content',
        category_id: null,
        view_count: 0,
        helpful_count: 0,
        not_helpful_count: 0,
        updated_at: '2024-01-15T00:00:00Z',
        categories: null,
      }));

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue({ data: mockUserProfile, error: null }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({
            data: mockArticles,
            error: null,
            count: 25, // Total is more than page size
          }),
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as never);

      const response = await GET(
        createMockRequest(
          'http://localhost/api/kb/public/articles?page=1&limit=10'
        )
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.total).toBe(25);
      expect(data.pagination.hasMore).toBe(true);
    });
  });
});
