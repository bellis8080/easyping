/**
 * Tests for KB Suggestions API Endpoint
 * Story 4.6: KB Suggestions During Ping Creation
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
    embedding_model: 'text-embedding-3-small',
  },
};

const mockEmbedding = new Array(1536).fill(0.1);

const mockSearchResults = [
  {
    id: 'article-1',
    title: 'Password Reset Guide',
    slug: 'password-reset-guide',
    content: 'This is how you reset your password step by step...',
    category_name: 'Account',
    similarity: 0.95,
  },
  {
    id: 'article-2',
    title: 'Login Troubleshooting',
    slug: 'login-troubleshooting',
    content: 'Common login issues and how to fix them...',
    category_name: 'Access',
    similarity: 0.85,
  },
  {
    id: 'article-3',
    title: 'Account Recovery Steps',
    slug: 'account-recovery-steps',
    content: 'How to recover your account when locked out...',
    category_name: 'Account',
    similarity: 0.75,
  },
  {
    id: 'article-4',
    title: 'Two-Factor Authentication',
    slug: 'two-factor-auth',
    content: 'Setting up and using 2FA...',
    category_name: 'Security',
    similarity: 0.65,
  },
];

const mockFulltextResults = [
  {
    id: 'article-5',
    title: 'VPN Connection Issues',
    slug: 'vpn-issues',
    content: 'Troubleshooting VPN connectivity problems...',
    category_name: 'Network',
    similarity_score: 0.8,
  },
];

function createMockRequest(query?: string): NextRequest {
  const url = new URL('http://localhost:4000/api/kb/suggestions');
  if (query) url.searchParams.set('query', query);
  return new NextRequest(url.toString(), { method: 'GET' });
}

describe('GET /api/kb/suggestions', () => {
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

    const response = await GET(createMockRequest('password reset help'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(body.suggestions).toEqual([]);
  });

  it('should return empty array for query < 10 characters', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const response = await GET(createMockRequest('short'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.suggestions).toEqual([]);
    expect(body.totalCount).toBe(0);
  });

  it('should return empty array for empty query', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const response = await GET(createMockRequest(''));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.suggestions).toEqual([]);
    expect(body.totalCount).toBe(0);
  });

  it('should return top 3 articles for valid query', async () => {
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

    const response = await GET(
      createMockRequest('I forgot my password and need help resetting it')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.suggestions.length).toBe(3); // Max 3 suggestions
    expect(body.totalCount).toBe(4); // Total count of all matches
    expect(body.suggestions[0].title).toBe('Password Reset Guide');
    expect(body.suggestions[0].slug).toBe('password-reset-guide');
    expect(body.suggestions[0].categoryName).toBe('Account');
    expect(body.suggestions[0].excerpt).toBeDefined();
  });

  it('should include total count for "View all X results" link', async () => {
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

    const response = await GET(createMockRequest('password reset help please'));
    const body = await response.json();

    expect(body.totalCount).toBe(4);
    expect(body.suggestions.length).toBe(3);
  });

  it('should filter by tenant_id', async () => {
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

    mockRpc.mockImplementation(
      (fn: string, params: Record<string, unknown>) => {
        if (fn === 'decrypt_api_key') {
          return Promise.resolve({ data: 'decrypted-key', error: null });
        }
        if (fn === 'search_kb_semantic') {
          // Verify tenant_id is passed
          expect(params.p_tenant_id).toBe('tenant-456');
          return Promise.resolve({ data: mockSearchResults, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      }
    );

    mockGenerateEmbedding.mockResolvedValue(mockEmbedding);

    const response = await GET(createMockRequest('password reset help please'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
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

    const response = await GET(
      createMockRequest('vpn connection not working properly')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.suggestions.length).toBe(1);
    expect(body.suggestions[0].title).toBe('VPN Connection Issues');
  });

  it('should return 404 when user profile not found', async () => {
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
                data: null,
                error: { message: 'Not found' },
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

    const response = await GET(createMockRequest('password reset help please'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('User not found');
  });

  it('should handle no matches found', async () => {
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

    const response = await GET(createMockRequest('xyznonexistent query here'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.suggestions).toEqual([]);
    expect(body.totalCount).toBe(0);
  });
});
