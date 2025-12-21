/**
 * Tests for Regenerate Embeddings API Endpoint
 * Story 4.4: Semantic Search with pgvector
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { UserRole } from '@easyping/types';

// Mock Supabase clients
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
};

const mockAdminClient = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

// Mock AI provider
const mockGenerateEmbedding = vi.fn();
vi.mock('@easyping/ai', () => ({
  createAIProvider: vi.fn(() => ({
    generateEmbedding: mockGenerateEmbedding,
  })),
  AIProviderType: { OPENAI: 'openai' },
}));

describe('POST /api/kb/articles/regenerate-embeddings', () => {
  const mockUser = { id: 'user-123' };
  const mockProfile = {
    id: 'user-123',
    tenant_id: 'tenant-456',
    role: UserRole.OWNER,
  };
  const mockOrg = {
    ai_config: {
      enabled: true,
      encrypted_api_key: 'encrypted-key',
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  };
  const mockArticle = {
    id: 'article-123',
    title: 'Test Article',
    content: 'This is test content for embedding generation.',
  };
  const mockEmbedding = Array(1536).fill(0.1);

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful auth
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Default successful profile lookup
    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
      if (table === 'organizations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockOrg, error: null }),
        };
      }
      if (table === 'kb_articles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          limit: vi
            .fn()
            .mockResolvedValue({ data: [mockArticle], error: null }),
          update: vi.fn().mockReturnThis(),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
    });

    // Default successful decrypt
    mockAdminClient.rpc.mockResolvedValue({
      data: 'decrypted-api-key',
      error: null,
    });

    // Default successful embedding generation
    mockGenerateEmbedding.mockResolvedValue(mockEmbedding);
  });

  function createRequest(
    url = 'http://localhost/api/kb/articles/regenerate-embeddings'
  ) {
    return new NextRequest(url, { method: 'POST' });
  }

  it('should return 401 for unauthenticated requests', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 403 for non-owner roles', async () => {
    const agentProfile = { ...mockProfile, role: UserRole.AGENT };
    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue({ data: agentProfile, error: null }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Forbidden - owner role required');
  });

  it('should return 400 when AI is not configured', async () => {
    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
      if (table === 'organizations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { ai_config: null },
            error: null,
          }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('AI configuration not found');
  });

  it('should process articles and return progress', async () => {
    // Setup complex mock chain for kb_articles
    const _updateMock = vi.fn().mockReturnThis();

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
      if (table === 'organizations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockOrg, error: null }),
        };
      }
      if (table === 'kb_articles') {
        return {
          select: vi.fn().mockImplementation((_cols, opts) => {
            if (opts?.count === 'exact') {
              return {
                eq: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                then: (resolve: (arg: { count: number }) => void) =>
                  resolve({ count: 5 }),
              };
            }
            return {
              eq: vi.fn().mockReturnThis(),
              is: vi.fn().mockReturnThis(),
              limit: vi
                .fn()
                .mockResolvedValue({ data: [mockArticle], error: null }),
            };
          }),
          update: _updateMock,
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.progress).toBeDefined();
    expect(body.progress.processed).toBe(1);
    expect(body.progress.failed).toBe(0);
  });

  it('should handle embedding generation failure gracefully', async () => {
    mockGenerateEmbedding.mockRejectedValue(
      new Error('API rate limit exceeded')
    );

    const _updateMock = vi.fn().mockReturnThis();
    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
      if (table === 'organizations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockOrg, error: null }),
        };
      }
      if (table === 'kb_articles') {
        return {
          select: vi.fn().mockImplementation((_cols, opts) => {
            if (opts?.count === 'exact') {
              return {
                eq: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                then: (resolve: (arg: { count: number }) => void) =>
                  resolve({ count: 5 }),
              };
            }
            return {
              eq: vi.fn().mockReturnThis(),
              is: vi.fn().mockReturnThis(),
              limit: vi
                .fn()
                .mockResolvedValue({ data: [mockArticle], error: null }),
            };
          }),
          update: _updateMock,
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.progress.processed).toBe(0);
    expect(body.progress.failed).toBe(1);
    expect(body.failedArticles).toHaveLength(1);
    expect(body.failedArticles[0].error).toBe('API rate limit exceeded');
  });

  it('should return success with no articles when all have embeddings', async () => {
    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
      if (table === 'organizations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockOrg, error: null }),
        };
      }
      if (table === 'kb_articles') {
        return {
          select: vi.fn().mockImplementation((_cols, opts) => {
            if (opts?.count === 'exact') {
              return {
                eq: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                then: (resolve: (arg: { count: number }) => void) =>
                  resolve({ count: 5 }),
              };
            }
            return {
              eq: vi.fn().mockReturnThis(),
              is: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.progress.processed).toBe(0);
    expect(body.progress.remaining).toBe(0);
  });
});
