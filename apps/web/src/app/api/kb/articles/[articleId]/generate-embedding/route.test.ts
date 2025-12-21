/**
 * Tests for Generate Embedding API Endpoint
 * Story 4.4: Semantic Search with pgvector
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock Supabase clients
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

// Mock AI provider
const mockGenerateEmbedding = vi.fn();
vi.mock('@easyping/ai', () => ({
  createAIProvider: vi.fn(() => ({
    generateEmbedding: mockGenerateEmbedding,
  })),
}));

// Test data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockAgentProfile = {
  id: 'user-123',
  tenant_id: 'tenant-456',
  role: 'agent',
};

const mockEndUserProfile = {
  id: 'user-123',
  tenant_id: 'tenant-456',
  role: 'end_user',
};

const mockArticle = {
  id: 'article-789',
  title: 'How to Reset Your Password',
  content:
    'This article explains how to reset your password. First, go to the login page...',
  status: 'published',
  tenant_id: 'tenant-456',
};

const mockOrg = {
  ai_config: {
    enabled: true,
    encrypted_api_key: 'encrypted-key-123',
    provider: 'openai',
    model: 'gpt-4o-mini',
  },
};

const mockEmbedding = new Array(1536).fill(0.1);

function createMockRequest(): NextRequest {
  return new NextRequest(
    'http://localhost:4000/api/kb/articles/article-789/generate-embedding',
    {
      method: 'POST',
    }
  );
}

function createMockParams() {
  return { params: Promise.resolve({ articleId: 'article-789' }) };
}

describe('POST /api/kb/articles/[articleId]/generate-embedding', () => {
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

    const response = await POST(createMockRequest(), createMockParams());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(body.success).toBe(false);
  });

  it('should return 404 when user profile not found', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      }),
    });

    const response = await POST(createMockRequest(), createMockParams());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('User profile not found');
  });

  it('should return 403 for end_user role', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockEndUserProfile,
            error: null,
          }),
        }),
      }),
    });

    const response = await POST(createMockRequest(), createMockParams());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('should return 404 when article not found', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockAgentProfile,
                error: null,
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
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    const response = await POST(createMockRequest(), createMockParams());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Article not found');
  });

  it('should return 400 when AI is not configured', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockAgentProfile,
                error: null,
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
                single: vi.fn().mockResolvedValue({
                  data: mockArticle,
                  error: null,
                }),
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
                data: { ai_config: { enabled: false } },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    const response = await POST(createMockRequest(), createMockParams());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('AI is not configured for this organization');
  });

  it('should generate and store embedding successfully', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockAgentProfile,
                error: null,
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
                single: vi.fn().mockResolvedValue({
                  data: mockArticle,
                  error: null,
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        };
      }
      if (table === 'organizations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockOrg,
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    mockRpc.mockResolvedValue({
      data: 'decrypted-api-key',
      error: null,
    });

    mockGenerateEmbedding.mockResolvedValue(mockEmbedding);

    const response = await POST(createMockRequest(), createMockParams());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.embedding).toBeDefined();
    expect(body.embedding.dimensions).toBe(1536);
    expect(body.embedding.generatedAt).toBeDefined();
  });

  it('should handle AI provider failure gracefully', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockAgentProfile,
                error: null,
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
                single: vi.fn().mockResolvedValue({
                  data: mockArticle,
                  error: null,
                }),
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
                data: mockOrg,
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    mockRpc.mockResolvedValue({
      data: 'decrypted-api-key',
      error: null,
    });

    mockGenerateEmbedding.mockRejectedValue(
      new Error('API rate limit exceeded')
    );

    const response = await POST(createMockRequest(), createMockParams());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('API rate limit exceeded');
  });

  it('should truncate long content before embedding', async () => {
    const longContent = 'x'.repeat(10000); // Content longer than 8000 chars
    const longArticle = { ...mockArticle, content: longContent };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockAgentProfile,
                error: null,
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
                single: vi.fn().mockResolvedValue({
                  data: longArticle,
                  error: null,
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        };
      }
      if (table === 'organizations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockOrg,
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    mockRpc.mockResolvedValue({
      data: 'decrypted-api-key',
      error: null,
    });

    mockGenerateEmbedding.mockImplementation((text: string) => {
      // Verify text was truncated
      expect(text.length).toBeLessThanOrEqual(8000);
      expect(text.endsWith('...')).toBe(true);
      return Promise.resolve(mockEmbedding);
    });

    const response = await POST(createMockRequest(), createMockParams());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });
});
