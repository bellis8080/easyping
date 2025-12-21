/**
 * Tests for Related KB Articles API
 * Story 4.5: KB Article Detail Page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock Supabase clients
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockNeq = vi.fn();
const mockIs = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: mockFrom,
    })
  ),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

// Helper to create mock request
function createMockRequest(slug: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/kb/public/articles/${slug}/related`
  );
}

// Helper to create params promise
function createParams(slug: string): Promise<{ slug: string }> {
  return Promise.resolve({ slug });
}

describe('GET /api/kb/public/articles/[slug]/related', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock chain
    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      eq: mockEq,
      is: mockIs,
      neq: mockNeq,
      single: mockSingle,
    });
    mockIs.mockReturnValue({
      single: mockSingle,
      neq: mockNeq,
    });
    mockNeq.mockReturnValue({
      order: mockOrder,
      single: mockSingle,
    });
    mockOrder.mockReturnValue({
      limit: mockLimit,
    });
    mockLimit.mockResolvedValue({ data: [], error: null });
  });

  it('should return 401 for unauthenticated requests', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const req = createMockRequest('test-article');
    const response = await GET(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 for user not found', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    const req = createMockRequest('test-article');
    const response = await GET(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('User not found');
  });

  it('should return 404 for non-existent article', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-123', tenant_id: 'tenant-123' },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Not found' },
    });

    const req = createMockRequest('non-existent');
    const response = await GET(req, { params: createParams('non-existent') });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Article not found');
  });

  it('should return related articles using semantic search', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-123', tenant_id: 'tenant-123' },
      error: null,
    });

    // Article with embedding
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'article-123',
        category_id: 'cat-123',
        embedding: '[0.1, 0.2, 0.3]',
      },
      error: null,
    });

    // Semantic search results
    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'related-1',
          title: 'Related Article 1',
          slug: 'related-1',
          category_name: 'General',
          view_count: 100,
        },
        {
          id: 'article-123', // Current article - should be filtered out
          title: 'Current Article',
          slug: 'test-article',
          category_name: 'General',
          view_count: 50,
        },
        {
          id: 'related-2',
          title: 'Related Article 2',
          slug: 'related-2',
          category_name: 'FAQ',
          view_count: 75,
        },
      ],
      error: null,
    });

    const req = createMockRequest('test-article');
    const response = await GET(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.articles).toHaveLength(2);
    expect(data.articles[0].id).toBe('related-1');
    expect(data.articles[1].id).toBe('related-2');
    expect(
      data.articles.find((a: { id: string }) => a.id === 'article-123')
    ).toBeUndefined();
  });

  it('should fall back to same category when no embedding', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-123', tenant_id: 'tenant-123' },
      error: null,
    });

    // Article without embedding
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'article-123',
        category_id: 'cat-123',
        embedding: null,
      },
      error: null,
    });

    // Category-based results
    mockLimit.mockResolvedValueOnce({
      data: [
        {
          id: 'cat-article-1',
          title: 'Category Article 1',
          slug: 'cat-article-1',
          view_count: 50,
          categories: { name: 'General' },
        },
        {
          id: 'cat-article-2',
          title: 'Category Article 2',
          slug: 'cat-article-2',
          view_count: 30,
          categories: { name: 'General' },
        },
      ],
      error: null,
    });

    const req = createMockRequest('test-article');
    const response = await GET(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.articles).toHaveLength(2);
    expect(data.articles[0].categoryName).toBe('General');
  });

  it('should return empty array when no related articles found', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-123', tenant_id: 'tenant-123' },
      error: null,
    });

    // Article without embedding and no category
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'article-123',
        category_id: null,
        embedding: null,
      },
      error: null,
    });

    // No popular articles
    mockLimit.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const req = createMockRequest('test-article');
    const response = await GET(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.articles).toHaveLength(0);
  });

  it('should limit results to 3 articles', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-123', tenant_id: 'tenant-123' },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'article-123',
        category_id: 'cat-123',
        embedding: '[0.1, 0.2]',
      },
      error: null,
    });

    // Return 4 semantic results
    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'r1',
          title: 'R1',
          slug: 'r1',
          category_name: 'A',
          view_count: 10,
        },
        {
          id: 'r2',
          title: 'R2',
          slug: 'r2',
          category_name: 'B',
          view_count: 20,
        },
        {
          id: 'r3',
          title: 'R3',
          slug: 'r3',
          category_name: 'C',
          view_count: 30,
        },
        {
          id: 'r4',
          title: 'R4',
          slug: 'r4',
          category_name: 'D',
          view_count: 40,
        },
      ],
      error: null,
    });

    const req = createMockRequest('test-article');
    const response = await GET(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.articles).toHaveLength(3);
  });

  it('should return 400 for empty slug', async () => {
    const req = createMockRequest('');
    const response = await GET(req, { params: createParams('') });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Slug is required');
  });
});
