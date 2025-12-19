/**
 * Unit tests for Public KB Popular Articles API
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

describe('Public KB Popular Articles API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (url: string) => {
    return new NextRequest(new URL(url, 'http://localhost'));
  };

  describe('GET /api/kb/public/popular', () => {
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
        createMockRequest('http://localhost/api/kb/public/popular')
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
        createMockRequest('http://localhost/api/kb/public/popular')
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });

    it('should return popular articles sorted by view count', async () => {
      const mockUser = { id: 'user-123' };
      const mockUserProfile = { id: 'user-123', tenant_id: 'org-123' };
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Most Popular',
          slug: 'most-popular',
          view_count: 1000,
        },
        {
          id: 'article-2',
          title: 'Second Popular',
          slug: 'second-popular',
          view_count: 500,
        },
        {
          id: 'article-3',
          title: 'Third Popular',
          slug: 'third-popular',
          view_count: 250,
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
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: mockArticles,
            error: null,
          }),
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as never);

      const response = await GET(
        createMockRequest('http://localhost/api/kb/public/popular')
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.articles).toHaveLength(3);
      expect(data.articles[0].title).toBe('Most Popular');
      expect(data.articles[0].viewCount).toBe(1000);
      expect(data.articles[1].title).toBe('Second Popular');
      expect(data.articles[2].title).toBe('Third Popular');
    });

    it('should respect the limit parameter', async () => {
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

      const limitMock = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: limitMock,
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as never);

      await GET(
        createMockRequest('http://localhost/api/kb/public/popular?limit=3')
      );

      expect(limitMock).toHaveBeenCalledWith(3);
    });

    it('should enforce maximum limit of 10', async () => {
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

      const limitMock = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: limitMock,
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as never);

      // Request 50 but should be capped at 10
      await GET(
        createMockRequest('http://localhost/api/kb/public/popular?limit=50')
      );

      expect(limitMock).toHaveBeenCalledWith(10);
    });

    it('should default to limit of 5 if not specified', async () => {
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

      const limitMock = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: limitMock,
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as never);

      await GET(createMockRequest('http://localhost/api/kb/public/popular'));

      expect(limitMock).toHaveBeenCalledWith(5);
    });

    it('should return empty array if no articles', async () => {
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

      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as never);

      const response = await GET(
        createMockRequest('http://localhost/api/kb/public/popular')
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.articles).toHaveLength(0);
    });
  });
});
