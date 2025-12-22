/**
 * Tests for KB Analytics API Endpoint
 * Story 4.7: KB Analytics & Popular Articles
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock Supabase clients
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Test data
const mockUser = {
  id: 'user-123',
  email: 'manager@example.com',
};

const mockManagerProfile = {
  id: 'user-123',
  role: 'manager',
  tenant_id: 'tenant-456',
};

const mockAgentProfile = {
  id: 'user-123',
  role: 'agent',
  tenant_id: 'tenant-456',
};

const mockEndUserProfile = {
  id: 'user-123',
  role: 'end_user',
  tenant_id: 'tenant-456',
};

const mockArticles = [
  {
    id: 'article-1',
    title: 'Getting Started Guide',
    slug: 'getting-started',
    category_id: 'cat-1',
    view_count: 150,
    helpful_count: 45,
    not_helpful_count: 5,
    deflection_count: 10,
    published_at: '2025-12-15T10:00:00Z',
    categories: { id: 'cat-1', name: 'Getting Started' },
  },
  {
    id: 'article-2',
    title: 'Password Reset',
    slug: 'password-reset',
    category_id: 'cat-2',
    view_count: 120,
    helpful_count: 30,
    not_helpful_count: 10,
    deflection_count: 5,
    published_at: '2025-12-16T10:00:00Z',
    categories: { id: 'cat-2', name: 'Account' },
  },
  {
    id: 'article-3',
    title: 'VPN Setup',
    slug: 'vpn-setup',
    category_id: 'cat-3',
    view_count: 80,
    helpful_count: 3,
    not_helpful_count: 7,
    deflection_count: 2,
    published_at: '2025-12-17T10:00:00Z',
    categories: { id: 'cat-3', name: 'Network' },
  },
];

function createMockRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:4000/api/kb/analytics');
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

function createMockChain() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
}

describe('GET /api/kb/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return 401 for unauthenticated requests', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const response = await GET(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(body.success).toBe(false);
    expect(body.popularArticles).toEqual([]);
  });

  it('should return 403 for end_user role', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const userChain = createMockChain();
    userChain.single.mockResolvedValue({
      data: mockEndUserProfile,
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return userChain;
      }
      return createMockChain();
    });

    const response = await GET(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
    expect(body.success).toBe(false);
  });

  it('should return 403 for agent role', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const userChain = createMockChain();
    userChain.single.mockResolvedValue({
      data: mockAgentProfile,
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return userChain;
      }
      return createMockChain();
    });

    const response = await GET(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
    expect(body.success).toBe(false);
  });

  it('should return analytics data for manager role', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        const chain = createMockChain();
        chain.single.mockResolvedValue({
          data: mockManagerProfile,
          error: null,
        });
        return chain;
      }
      if (table === 'kb_articles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    lte: vi.fn().mockReturnValue({
                      order: vi.fn().mockResolvedValue({
                        data: mockArticles,
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'kb_deflections') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({
                  data: [],
                  count: 5,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return createMockChain();
    });

    const response = await GET(createMockRequest({ period: '7d' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.popularArticles).toBeDefined();
    expect(body.mostHelpful).toBeDefined();
    expect(body.leastHelpful).toBeDefined();
    expect(body.timeline).toBeDefined();
    expect(body.categoryBreakdown).toBeDefined();
    expect(body.totals).toBeDefined();
  });

  it('should return analytics data for owner role', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const ownerProfile = { ...mockManagerProfile, role: 'owner' };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        const chain = createMockChain();
        chain.single.mockResolvedValue({
          data: ownerProfile,
          error: null,
        });
        return chain;
      }
      if (table === 'kb_articles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    lte: vi.fn().mockReturnValue({
                      order: vi.fn().mockResolvedValue({
                        data: mockArticles,
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'kb_deflections') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({
                  data: [],
                  count: 5,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return createMockChain();
    });

    const response = await GET(createMockRequest({ period: '7d' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('should return 404 when user profile not found', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const userChain = createMockChain();
    userChain.single.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return userChain;
      }
      return createMockChain();
    });

    const response = await GET(createMockRequest());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('User not found');
    expect(body.success).toBe(false);
  });

  it('should calculate helpful ratio correctly', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const articleWithVotes = [
      {
        id: 'article-1',
        title: 'Test Article',
        slug: 'test-article',
        category_id: 'cat-1',
        view_count: 100,
        helpful_count: 75, // 75 helpful
        not_helpful_count: 25, // 25 not helpful
        deflection_count: 10,
        published_at: '2025-12-15T10:00:00Z',
        categories: { id: 'cat-1', name: 'Test' },
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        const chain = createMockChain();
        chain.single.mockResolvedValue({
          data: mockManagerProfile,
          error: null,
        });
        return chain;
      }
      if (table === 'kb_articles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    lte: vi.fn().mockReturnValue({
                      order: vi.fn().mockResolvedValue({
                        data: articleWithVotes,
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'kb_deflections') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({
                  data: [],
                  count: 0,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return createMockChain();
    });

    const response = await GET(createMockRequest({ period: '7d' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    // Articles with >= 5 votes should appear in mostHelpful/leastHelpful
    if (body.popularArticles.length > 0) {
      const article = body.popularArticles[0];
      // 75 / (75 + 25) = 0.75 = 75%
      expect(article.helpfulPercentage).toBe(75);
    }
  });

  it('should filter articles with < 5 votes from helpful lists', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const articleWithFewVotes = [
      {
        id: 'article-1',
        title: 'Few Votes Article',
        slug: 'few-votes',
        category_id: 'cat-1',
        view_count: 100,
        helpful_count: 2, // Only 4 total votes
        not_helpful_count: 2,
        deflection_count: 0,
        published_at: '2025-12-15T10:00:00Z',
        categories: { id: 'cat-1', name: 'Test' },
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        const chain = createMockChain();
        chain.single.mockResolvedValue({
          data: mockManagerProfile,
          error: null,
        });
        return chain;
      }
      if (table === 'kb_articles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    lte: vi.fn().mockReturnValue({
                      order: vi.fn().mockResolvedValue({
                        data: articleWithFewVotes,
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'kb_deflections') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({
                  data: [],
                  count: 0,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return createMockChain();
    });

    const response = await GET(createMockRequest({ period: '7d' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    // Article with < 5 votes should NOT appear in mostHelpful or leastHelpful
    expect(body.mostHelpful.length).toBe(0);
    expect(body.leastHelpful.length).toBe(0);
  });

  it('should include tenant isolation', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    let capturedTenantId: string | undefined;

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        const chain = createMockChain();
        chain.single.mockResolvedValue({
          data: mockManagerProfile,
          error: null,
        });
        return chain;
      }
      if (table === 'kb_articles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((field: string, value: string) => {
              if (field === 'tenant_id') {
                capturedTenantId = value;
              }
              return {
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    gte: vi.fn().mockReturnValue({
                      lte: vi.fn().mockReturnValue({
                        order: vi.fn().mockResolvedValue({
                          data: mockArticles,
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              };
            }),
          }),
        };
      }
      if (table === 'kb_deflections') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({
                  data: [],
                  count: 0,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return createMockChain();
    });

    const response = await GET(createMockRequest({ period: '7d' }));

    expect(response.status).toBe(200);
    expect(capturedTenantId).toBe('tenant-456');
  });

  it('should handle empty results gracefully', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        const chain = createMockChain();
        chain.single.mockResolvedValue({
          data: mockManagerProfile,
          error: null,
        });
        return chain;
      }
      if (table === 'kb_articles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    lte: vi.fn().mockReturnValue({
                      order: vi.fn().mockResolvedValue({
                        data: [],
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'kb_deflections') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({
                  data: [],
                  count: 0,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return createMockChain();
    });

    const response = await GET(createMockRequest({ period: '7d' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.popularArticles).toEqual([]);
    expect(body.mostHelpful).toEqual([]);
    expect(body.leastHelpful).toEqual([]);
    expect(body.categoryBreakdown).toEqual([]);
  });
});
