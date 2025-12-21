/**
 * Tests for KB Article Detail API
 * Story 4.5: KB Article Detail Page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock Supabase clients
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
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
  })),
}));

// Helper to create mock request
function createMockRequest(slug: string): NextRequest {
  return new NextRequest(`http://localhost/api/kb/public/articles/${slug}`);
}

// Helper to create params promise
function createParams(slug: string): Promise<{ slug: string }> {
  return Promise.resolve({ slug });
}

describe('GET /api/kb/public/articles/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock chain for user profile query
    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      eq: mockEq,
      single: mockSingle,
    });
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

    // User profile query returns null
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

    // User profile query succeeds
    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-123', tenant_id: 'tenant-123', role: 'end_user' },
      error: null,
    });

    // Article query returns null
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

  it('should return 404 for unpublished article', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-123', tenant_id: 'tenant-123', role: 'end_user' },
      error: null,
    });

    // Article is draft, not published
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'article-123',
        title: 'Test Article',
        slug: 'test-article',
        content: 'Content',
        agent_content: null,
        category_id: null,
        created_by: 'author-123',
        view_count: 0,
        helpful_count: 0,
        not_helpful_count: 0,
        published_at: null,
        updated_at: '2025-01-01T00:00:00Z',
        status: 'draft',
        deleted_at: null,
        categories: null,
        users: { full_name: 'Author Name' },
      },
      error: null,
    });

    const req = createMockRequest('test-article');
    const response = await GET(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Article not found');
  });

  it('should return 404 for deleted article', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-123', tenant_id: 'tenant-123', role: 'end_user' },
      error: null,
    });

    // Article is soft-deleted
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'article-123',
        title: 'Test Article',
        slug: 'test-article',
        content: 'Content',
        agent_content: null,
        category_id: null,
        created_by: 'author-123',
        view_count: 0,
        helpful_count: 0,
        not_helpful_count: 0,
        published_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        status: 'published',
        deleted_at: '2025-01-02T00:00:00Z',
        categories: null,
        users: { full_name: 'Author Name' },
      },
      error: null,
    });

    const req = createMockRequest('test-article');
    const response = await GET(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Article not found');
  });

  it('should return article details for end_user (without agent content)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-123', tenant_id: 'tenant-123', role: 'end_user' },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'article-123',
        title: 'Test Article',
        slug: 'test-article',
        content: '# Hello World',
        agent_content: 'Secret agent notes',
        category_id: 'cat-123',
        created_by: 'author-123',
        view_count: 42,
        helpful_count: 10,
        not_helpful_count: 2,
        published_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        status: 'published',
        deleted_at: null,
        categories: { name: 'General' },
        users: { full_name: 'John Doe' },
      },
      error: null,
    });

    const req = createMockRequest('test-article');
    const response = await GET(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.article).toBeDefined();
    expect(data.article.title).toBe('Test Article');
    expect(data.article.content).toBe('# Hello World');
    expect(data.article.categoryName).toBe('General');
    expect(data.article.authorName).toBe('John Doe');
    expect(data.article.viewCount).toBe(42);
    // End user should NOT see agent content
    expect(data.article.agentContent).toBeUndefined();
  });

  it('should return article with agent content for agent role', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'agent-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'agent-123', tenant_id: 'tenant-123', role: 'agent' },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'article-123',
        title: 'Test Article',
        slug: 'test-article',
        content: '# Hello World',
        agent_content: 'Secret agent notes',
        category_id: 'cat-123',
        created_by: 'author-123',
        view_count: 42,
        helpful_count: 10,
        not_helpful_count: 2,
        published_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        status: 'published',
        deleted_at: null,
        categories: { name: 'General' },
        users: { full_name: 'John Doe' },
      },
      error: null,
    });

    const req = createMockRequest('test-article');
    const response = await GET(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Agent should see agent content
    expect(data.article.agentContent).toBe('Secret agent notes');
  });

  it('should return article with agent content for manager role', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'manager-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'manager-123', tenant_id: 'tenant-123', role: 'manager' },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'article-123',
        title: 'Test Article',
        slug: 'test-article',
        content: '# Hello World',
        agent_content: 'Secret manager notes',
        category_id: null,
        created_by: 'author-123',
        view_count: 0,
        helpful_count: 0,
        not_helpful_count: 0,
        published_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        status: 'published',
        deleted_at: null,
        categories: null,
        users: null,
      },
      error: null,
    });

    const req = createMockRequest('test-article');
    const response = await GET(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.article.agentContent).toBe('Secret manager notes');
  });

  it('should return article with agent content for owner role', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'owner-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'owner-123', tenant_id: 'tenant-123', role: 'owner' },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'article-123',
        title: 'Test Article',
        slug: 'test-article',
        content: '# Hello World',
        agent_content: 'Owner notes',
        category_id: null,
        created_by: 'author-123',
        view_count: 0,
        helpful_count: 0,
        not_helpful_count: 0,
        published_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        status: 'published',
        deleted_at: null,
        categories: null,
        users: null,
      },
      error: null,
    });

    const req = createMockRequest('test-article');
    const response = await GET(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.article.agentContent).toBe('Owner notes');
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
