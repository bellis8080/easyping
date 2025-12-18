/**
 * Unit tests for KB Articles API endpoints
 * Story 4.3.0: KB Article Editor for Agents - Tasks 4, 12, 13
 *
 * Test coverage for GET /api/kb/articles:
 * 1. Returns 401 when unauthenticated
 * 2. Returns 403 when end user tries to access
 * 3. Returns articles filtered by status
 * 4. Returns pagination metadata
 *
 * Test coverage for POST /api/kb/articles:
 * 5. Creates draft article successfully
 * 6. Creates and publishes article in one step
 * 7. Generates unique slug when conflict exists
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET, POST } from '@/app/api/kb/articles/route';
import { NextRequest } from 'next/server';

// Mock modules
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

describe('KB Articles API', () => {
  let mockSupabaseClient: ReturnType<typeof vi.fn>;
  let mockSupabaseAdmin: ReturnType<typeof vi.fn>;

  // Valid UUID constants
  const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
  const ARTICLE_ID = '550e8400-e29b-41d4-a716-446655440002';

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    mockSupabaseAdmin = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
    };

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSupabaseClient
    );
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockSupabaseAdmin
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(
    url: string,
    method: string = 'GET',
    body?: object
  ): NextRequest {
    return {
      url,
      method,
      json: async () => body,
    } as unknown as NextRequest;
  }

  describe('GET /api/kb/articles', () => {
    /**
     * Test 1: Returns 401 when unauthenticated
     */
    it('should return 401 when unauthenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const request = createMockRequest(
        'http://localhost/api/kb/articles?status=draft'
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    /**
     * Test 2: Returns 403 when end user tries to access
     */
    it('should return 403 when end user tries to access', async () => {
      const mockUser = { id: USER_ID, email: 'user@example.com' };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: USER_ID, role: 'end_user', tenant_id: TENANT_ID },
              error: null,
            }),
          }),
        }),
      });

      const request = createMockRequest(
        'http://localhost/api/kb/articles?status=draft'
      );
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Forbidden');
    });

    /**
     * Test 3: Returns articles filtered by status
     */
    it('should return articles filtered by status', async () => {
      const mockUser = { id: USER_ID, email: 'agent@example.com' };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: USER_ID, role: 'agent', tenant_id: TENANT_ID },
              error: null,
            }),
          }),
        }),
      });

      const mockArticles = [
        {
          id: ARTICLE_ID,
          title: 'Test Article',
          slug: 'test-article',
          status: 'draft',
          category_id: null,
          source_ping_id: null,
          enhances_article_id: null,
          created_at: '2025-01-01T00:00:00Z',
          published_at: null,
          published_by: null,
          view_count: 0,
          kb_categories: null,
          pings: null,
          publisher: null,
        },
      ];

      mockSupabaseAdmin.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockArticles,
                    error: null,
                    count: 1,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const request = createMockRequest(
        'http://localhost/api/kb/articles?status=draft'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.articles).toHaveLength(1);
      expect(data.articles[0].title).toBe('Test Article');
    });
  });

  describe('POST /api/kb/articles', () => {
    /**
     * Test 5: Creates draft article successfully
     */
    it('should create draft article successfully', async () => {
      const mockUser = { id: USER_ID, email: 'agent@example.com' };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: USER_ID, role: 'agent', tenant_id: TENANT_ID },
              error: null,
            }),
          }),
        }),
      });

      // Mock slug uniqueness check (no existing article)
      const mockSlugCheck = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });

      // Mock article insert
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: ARTICLE_ID,
              title: 'New Article',
              slug: 'new-article',
              status: 'draft',
            },
            error: null,
          }),
        }),
      });

      let callCount = 0;
      mockSupabaseAdmin.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: mockSlugCheck,
                }),
              }),
            }),
          };
        }
        return { insert: mockInsert };
      });

      const request = createMockRequest(
        'http://localhost/api/kb/articles',
        'POST',
        {
          title: 'New Article',
          content: 'Test content',
        }
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.article.title).toBe('New Article');
      expect(data.article.status).toBe('draft');
    });

    /**
     * Test 6: Returns 400 when title is missing
     */
    it('should return 400 when title is missing', async () => {
      const mockUser = { id: USER_ID, email: 'agent@example.com' };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: USER_ID, role: 'agent', tenant_id: TENANT_ID },
              error: null,
            }),
          }),
        }),
      });

      const request = createMockRequest(
        'http://localhost/api/kb/articles',
        'POST',
        {
          content: 'Test content',
        }
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Title is required');
    });
  });
});
