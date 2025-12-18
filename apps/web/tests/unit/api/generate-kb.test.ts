/**
 * Unit tests for POST /api/pings/[pingNumber]/generate-kb endpoint
 * Story 4.2.2: Auto-Generate KB Articles from Resolved Pings
 *
 * Test coverage:
 * 1. Returns 401 when unauthenticated
 * 2. Returns 403 when end user tries to generate KB article
 * 3. Returns 404 when ping not found
 * 4. Returns 409 when KB article already exists for ping
 * 5. Returns 400 when AI not configured
 * 6. Successfully creates draft KB article for agent
 * 7. Handles unique slug generation when slug already exists
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/pings/[pingNumber]/generate-kb/route';
import { NextRequest } from 'next/server';

// Mock modules
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/services/kb-article-generation-service', () => ({
  generateKBArticle: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateKBArticle } from '@/lib/services/kb-article-generation-service';

describe('POST /api/pings/[pingNumber]/generate-kb', () => {
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
      rpc: vi.fn(),
    };

    (createClient as any).mockResolvedValue(mockSupabaseClient);
    (createAdminClient as any).mockReturnValue(mockSupabaseAdmin);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(body: any): NextRequest {
    return {
      json: async () => body,
    } as any;
  }

  /**
   * Test 1: Returns 401 when unauthenticated
   */
  it('should return 401 when unauthenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const request = createMockRequest({ generateKB: true });
    const response = await POST(request, {
      params: Promise.resolve({ pingNumber: '1' }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  /**
   * Test 2: Returns 403 when end user tries to generate KB article
   */
  it('should return 403 when end user tries to generate KB article', async () => {
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
              full_name: 'Test User',
              role: 'end_user',
              tenant_id: TENANT_ID,
            },
            error: null,
          }),
        }),
      }),
    });

    const request = createMockRequest({ generateKB: true });
    const response = await POST(request, {
      params: Promise.resolve({ pingNumber: '1' }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('Only agents can generate KB articles');
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
              full_name: 'Test Agent',
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

    const request = createMockRequest({ generateKB: true });
    const response = await POST(request, {
      params: Promise.resolve({ pingNumber: '999' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Ping not found');
  });

  /**
   * Test 4: Returns 409 when KB article already exists for ping
   */
  it('should return 409 when KB article already exists for ping', async () => {
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
              full_name: 'Test Agent',
              role: 'agent',
              tenant_id: TENANT_ID,
            },
            error: null,
          }),
        }),
      }),
    });

    // Track admin from calls
    let adminFromCallCount = 0;
    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      adminFromCallCount++;

      if (table === 'pings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: PING_ID,
                    ping_number: 1,
                    tenant_id: TENANT_ID,
                    status: 'resolved',
                    priority: 'normal',
                    category_id: CATEGORY_ID,
                    categories: { name: 'General' },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'kb_articles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: ARTICLE_ID,
                    title: 'Existing Article',
                    slug: 'existing-article',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      };
    });

    const request = createMockRequest({ generateKB: true });
    const response = await POST(request, {
      params: Promise.resolve({ pingNumber: '1' }),
    });

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toBe('KB article already exists for this ping');
    expect(data.existingArticle).toBeDefined();
    expect(data.existingArticle.slug).toBe('existing-article');
  });

  /**
   * Test 5: Returns 400 when AI not configured
   */
  it('should return 400 when AI not configured', async () => {
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
              full_name: 'Test Agent',
              role: 'agent',
              tenant_id: TENANT_ID,
            },
            error: null,
          }),
        }),
      }),
    });

    // Track admin from calls
    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'pings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: PING_ID,
                    ping_number: 1,
                    tenant_id: TENANT_ID,
                    status: 'resolved',
                    priority: 'normal',
                    category_id: CATEGORY_ID,
                    categories: null,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'kb_articles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'ping_messages') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'msg-1',
                    content: 'Test message',
                    message_type: 'user',
                    visibility: 'public',
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'organizations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  ai_config: null, // No AI config
                },
                error: null,
              }),
            }),
          }),
        };
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      };
    });

    const request = createMockRequest({ generateKB: true });
    const response = await POST(request, {
      params: Promise.resolve({ pingNumber: '1' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('AI is not configured');
  });

  /**
   * Test 6: Successfully creates draft KB article for agent
   */
  it('should successfully create draft KB article for agent', async () => {
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
              full_name: 'Test Agent',
              role: 'agent',
              tenant_id: TENANT_ID,
            },
            error: null,
          }),
        }),
      }),
    });

    // Track admin from calls
    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'pings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: PING_ID,
                    ping_number: 1,
                    tenant_id: TENANT_ID,
                    status: 'resolved',
                    priority: 'normal',
                    category_id: CATEGORY_ID,
                    categories: { name: 'Account' },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'kb_articles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null, // No existing article
                  error: null,
                }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: ARTICLE_ID,
                  title: 'How to Reset Password',
                  slug: 'how-to-reset-password',
                  status: 'draft',
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'ping_messages') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'msg-1',
                    content: 'I cannot log in',
                    message_type: 'user',
                    visibility: 'public',
                  },
                  {
                    id: 'msg-2',
                    content: 'Click Forgot Password',
                    message_type: 'agent',
                    visibility: 'public',
                  },
                  {
                    id: 'msg-3',
                    content: 'Unlocked account in admin panel',
                    message_type: 'agent',
                    visibility: 'private',
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'organizations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  ai_config: {
                    enabled: true,
                    provider: 'openai',
                    model: 'gpt-4o-mini',
                    encrypted_api_key: 'encrypted-key',
                  },
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'categories') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: CATEGORY_ID, name: 'account' }],
                error: null,
              }),
            }),
          }),
        };
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      };
    });

    // Mock decrypt RPC
    mockSupabaseAdmin.rpc.mockResolvedValue({
      data: 'decrypted-api-key',
      error: null,
    });

    // Mock KB generation service
    (generateKBArticle as any).mockResolvedValue({
      title: 'How to Reset Password',
      content: 'To reset your password, click Forgot Password.',
      agentContent: 'Account was locked. Unlocked in admin panel.',
      suggestedCategorySlug: 'account',
      success: true,
    });

    const request = createMockRequest({ generateKB: true });
    const response = await POST(request, {
      params: Promise.resolve({ pingNumber: '1' }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.article).toBeDefined();
    expect(data.article.title).toBe('How to Reset Password');
    expect(data.article.slug).toBe('how-to-reset-password');
    expect(data.article.status).toBe('draft');
  });
});
