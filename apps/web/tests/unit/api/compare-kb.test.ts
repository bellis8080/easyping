/**
 * Unit tests for POST /api/pings/[pingNumber]/compare-kb endpoint
 * Story 4.2.3: KB Article Comparison & Enhancement
 *
 * Test coverage:
 * 1. Returns 401 when unauthenticated
 * 2. Returns 403 when end user tries to compare KB
 * 3. Returns 404 when ping not found
 * 4. Returns hasSimilar=false when no similar articles
 * 5. Returns hasSimilar=true with similarArticle when match found
 * 6. Returns empty result when ping has no messages
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/pings/[pingNumber]/compare-kb/route';
import { NextRequest } from 'next/server';

// Mock modules
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/services/kb-similarity-service', () => ({
  findSimilarArticles: vi.fn(),
  getArticleExcerpt: vi.fn((content: string) => content.slice(0, 100)),
}));

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { findSimilarArticles } from '@/lib/services/kb-similarity-service';

describe('POST /api/pings/[pingNumber]/compare-kb', () => {
  let mockSupabaseClient: any;
  let mockSupabaseAdmin: any;

  // Valid UUID constants
  const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
  const PING_ID = '550e8400-e29b-41d4-a716-446655440001';
  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440002';
  const ARTICLE_ID = '550e8400-e29b-41d4-a716-446655440003';
  const CATEGORY_ID = '550e8400-e29b-41d4-a716-446655440004';

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    };

    mockSupabaseAdmin = {
      from: vi.fn(),
    };

    (createClient as any).mockResolvedValue(mockSupabaseClient);
    (createAdminClient as any).mockReturnValue(mockSupabaseAdmin);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(): NextRequest {
    return {} as any;
  }

  /**
   * Test 1: Returns 401 when unauthenticated
   */
  it('should return 401 when unauthenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const request = createMockRequest();
    const response = await POST(request, {
      params: Promise.resolve({ pingNumber: '1' }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
    expect(data.hasSimilar).toBe(false);
  });

  /**
   * Test 2: Returns 403 when end user tries to compare KB
   */
  it('should return 403 when end user tries to compare KB', async () => {
    const mockUser = { id: USER_ID, email: 'user@example.com' };
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock user profile - end_user role
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: USER_ID,
              role: 'end_user',
              tenant_id: TENANT_ID,
            },
            error: null,
          }),
        }),
      }),
    });

    const request = createMockRequest();
    const response = await POST(request, {
      params: Promise.resolve({ pingNumber: '1' }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  /**
   * Test 3: Returns 404 when ping not found
   */
  it('should return 404 when ping not found', async () => {
    const mockUser = { id: USER_ID, email: 'agent@example.com' };
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock user profile - agent role
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: USER_ID,
              role: 'agent',
              tenant_id: TENANT_ID,
            },
            error: null,
          }),
        }),
      }),
    });

    // Mock ping not found
    mockSupabaseAdmin.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      }),
    });

    const request = createMockRequest();
    const response = await POST(request, {
      params: Promise.resolve({ pingNumber: '999' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Ping not found');
  });

  /**
   * Test 4: Returns hasSimilar=false when no similar articles
   */
  it('should return hasSimilar=false when no similar articles found', async () => {
    const mockUser = { id: USER_ID, email: 'agent@example.com' };
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock user profile
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

    // Mock ping found
    const pingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: PING_ID, tenant_id: TENANT_ID, category_id: CATEGORY_ID },
        error: null,
      }),
    };

    // Mock messages
    const messagesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ content: 'Help me reset password', message_type: 'user' }],
        error: null,
      }),
    };

    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'pings') return pingQuery;
      if (table === 'ping_messages') return messagesQuery;
      return {};
    });

    // Mock similarity search - no matches
    (findSimilarArticles as any).mockResolvedValue({
      hasSimilar: false,
      bestMatch: null,
      matches: [],
    });

    const request = createMockRequest();
    const response = await POST(request, {
      params: Promise.resolve({ pingNumber: '1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.hasSimilar).toBe(false);
    expect(data.similarity).toBe(0);
    expect(data.success).toBe(true);
  });

  /**
   * Test 5: Returns hasSimilar=true with similarArticle when match found
   */
  it('should return hasSimilar=true with similarArticle when match found', async () => {
    const mockUser = { id: USER_ID, email: 'agent@example.com' };
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock user profile
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

    // Mock ping found
    const pingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: PING_ID, tenant_id: TENANT_ID, category_id: CATEGORY_ID },
        error: null,
      }),
    };

    // Mock messages
    const messagesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ content: 'Help me reset my password', message_type: 'user' }],
        error: null,
      }),
    };

    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'pings') return pingQuery;
      if (table === 'ping_messages') return messagesQuery;
      return {};
    });

    // Mock similarity search - match found
    const mockSimilarArticle = {
      id: ARTICLE_ID,
      title: 'How to reset your password',
      slug: 'reset-password',
      content: 'Step by step guide...',
      categoryId: CATEGORY_ID,
      categoryName: 'Account',
      similarity: 85,
      viewCount: 100,
      helpfulCount: 25,
    };

    (findSimilarArticles as any).mockResolvedValue({
      hasSimilar: true,
      bestMatch: mockSimilarArticle,
      matches: [mockSimilarArticle],
    });

    const request = createMockRequest();
    const response = await POST(request, {
      params: Promise.resolve({ pingNumber: '1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.hasSimilar).toBe(true);
    expect(data.similarity).toBe(85);
    expect(data.similarArticle).toBeDefined();
    expect(data.similarArticle.id).toBe(ARTICLE_ID);
    expect(data.similarArticle.title).toBe('How to reset your password');
    expect(data.success).toBe(true);
  });

  /**
   * Test 6: Returns empty result when ping has no messages
   */
  it('should return hasSimilar=false when ping has no messages', async () => {
    const mockUser = { id: USER_ID, email: 'agent@example.com' };
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock user profile
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

    // Mock ping found
    const pingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: PING_ID, tenant_id: TENANT_ID, category_id: null },
        error: null,
      }),
    };

    // Mock no messages
    const messagesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'pings') return pingQuery;
      if (table === 'ping_messages') return messagesQuery;
      return {};
    });

    const request = createMockRequest();
    const response = await POST(request, {
      params: Promise.resolve({ pingNumber: '1' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.hasSimilar).toBe(false);
    expect(data.success).toBe(true);
    // Should not call findSimilarArticles when no content
    expect(findSimilarArticles).not.toHaveBeenCalled();
  });
});
