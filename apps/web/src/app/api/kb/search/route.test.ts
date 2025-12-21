/**
 * Tests for KB Semantic Search API Endpoint
 * Story 4.4: Semantic Search with pgvector
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

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

const mockProfile = {
  tenant_id: 'tenant-456',
};

const mockOrg = {
  ai_config: {
    enabled: true,
    encrypted_api_key: 'encrypted-key',
    provider: 'openai',
    model: 'gpt-4o-mini',
  },
};

const mockEmbedding = new Array(1536).fill(0.1);

const mockSearchResults = [
  {
    id: 'article-1',
    title: 'Password Reset Guide',
    slug: 'password-reset-guide',
    content: 'This is how you reset your password...',
    category_id: 'cat-1',
    category_name: 'Account',
    view_count: 100,
    helpful_count: 50,
    not_helpful_count: 5,
    similarity: 0.95,
  },
];

const mockFulltextResults = [
  {
    id: 'article-2',
    title: 'Login Issues',
    slug: 'login-issues',
    content: 'Common login problems and solutions...',
    category_id: 'cat-2',
    category_name: 'Access',
    view_count: 80,
    helpful_count: 40,
    similarity_score: 0.8,
  },
];

function createMockRequest(query?: string, limit?: string): NextRequest {
  const url = new URL('http://localhost:4000/api/kb/search');
  if (query) url.searchParams.set('query', query);
  if (limit) url.searchParams.set('limit', limit);
  return new NextRequest(url.toString(), { method: 'GET' });
}

describe('GET /api/kb/search', () => {
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

    const response = await GET(createMockRequest('password reset'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('should return empty results for empty query', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    });

    const response = await GET(createMockRequest(''));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.results).toEqual([]);
  });

  it('should return empty results for query too short', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    });

    const response = await GET(createMockRequest('a'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.results).toEqual([]);
  });

  it('should fallback to fulltext when AI not configured', async () => {
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
                data: mockProfile,
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
                data: { ai_config: null },
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

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'search_similar_kb_articles') {
        return Promise.resolve({ data: mockFulltextResults, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const response = await GET(createMockRequest('login issues'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.searchType).toBe('fulltext');
    expect(body.results.length).toBeGreaterThan(0);
  });

  it('should use semantic search when AI is configured', async () => {
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
                data: mockProfile,
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

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'decrypt_api_key') {
        return Promise.resolve({ data: 'decrypted-key', error: null });
      }
      if (fn === 'search_kb_semantic') {
        return Promise.resolve({ data: mockSearchResults, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    mockGenerateEmbedding.mockResolvedValue(mockEmbedding);

    const response = await GET(createMockRequest('password reset'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.searchType).toBe('semantic');
    expect(body.results.length).toBeGreaterThan(0);
    expect(body.results[0].title).toBe('Password Reset Guide');
  });

  it('should fallback to fulltext when embedding generation fails', async () => {
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
                data: mockProfile,
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

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'decrypt_api_key') {
        return Promise.resolve({ data: 'decrypted-key', error: null });
      }
      if (fn === 'search_similar_kb_articles') {
        return Promise.resolve({ data: mockFulltextResults, error: null });
      }
      return Promise.resolve({
        data: null,
        error: { message: 'RPC not found' },
      });
    });

    mockGenerateEmbedding.mockRejectedValue(new Error('API error'));

    const response = await GET(createMockRequest('login issues'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.searchType).toBe('fulltext');
  });

  it('should return empty array when no matches found', async () => {
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
                data: mockProfile,
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
                data: { ai_config: null },
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

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'search_similar_kb_articles') {
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const response = await GET(createMockRequest('xyznonexistent123'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.results).toEqual([]);
  });
});
