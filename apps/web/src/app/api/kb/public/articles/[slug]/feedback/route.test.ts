/**
 * Tests for KB Article Feedback API
 * Story 4.5: KB Article Detail Page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from './route';

// Mock Supabase clients
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIs = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

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

// Helper to create mock POST request
function createMockPostRequest(slug: string, body: unknown): NextRequest {
  return new NextRequest(
    `http://localhost/api/kb/public/articles/${slug}/feedback`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Helper to create mock GET request
function createMockGetRequest(slug: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/kb/public/articles/${slug}/feedback`,
    { method: 'GET' }
  );
}

// Helper to create params promise
function createParams(slug: string): Promise<{ slug: string }> {
  return Promise.resolve({ slug });
}

describe('POST /api/kb/public/articles/[slug]/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock chain
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      eq: mockEq,
      is: mockIs,
      single: mockSingle,
    });
    mockIs.mockReturnValue({
      single: mockSingle,
    });
    mockInsert.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  it('should return 401 for unauthenticated requests', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const req = createMockPostRequest('test-article', { helpful: true });
    const response = await POST(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 for missing helpful field', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const req = createMockPostRequest('test-article', {});
    const response = await POST(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Field "helpful" (boolean) is required');
  });

  it('should return 400 for invalid helpful field type', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const req = createMockPostRequest('test-article', { helpful: 'yes' });
    const response = await POST(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Field "helpful" (boolean) is required');
  });

  it('should return 404 for user not found', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    const req = createMockPostRequest('test-article', { helpful: true });
    const response = await POST(req, { params: createParams('test-article') });
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

    const req = createMockPostRequest('non-existent', { helpful: true });
    const response = await POST(req, { params: createParams('non-existent') });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Article not found');
  });

  it('should record new helpful feedback', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-123', tenant_id: 'tenant-123' },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'article-123' },
      error: null,
    });

    // No existing feedback
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const req = createMockPostRequest('test-article', { helpful: true });
    const response = await POST(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Feedback recorded');
    expect(data.updated).toBe(false);

    expect(mockInsert).toHaveBeenCalledWith({
      article_id: 'article-123',
      user_id: 'user-123',
      is_helpful: true,
    });
  });

  it('should record new not-helpful feedback', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-123', tenant_id: 'tenant-123' },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'article-123' },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const req = createMockPostRequest('test-article', { helpful: false });
    const response = await POST(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    expect(mockInsert).toHaveBeenCalledWith({
      article_id: 'article-123',
      user_id: 'user-123',
      is_helpful: false,
    });
  });

  it('should return already recorded for duplicate same feedback', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-123', tenant_id: 'tenant-123' },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'article-123' },
      error: null,
    });

    // Existing feedback with same value
    mockSingle.mockResolvedValueOnce({
      data: { id: 'feedback-123', is_helpful: true },
      error: null,
    });

    const req = createMockPostRequest('test-article', { helpful: true });
    const response = await POST(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Feedback already recorded');
    expect(data.updated).toBe(false);

    // Should not insert or update
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('should update feedback when user changes their mind', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-123', tenant_id: 'tenant-123' },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'article-123' },
      error: null,
    });

    // Existing feedback with different value
    mockSingle.mockResolvedValueOnce({
      data: { id: 'feedback-123', is_helpful: true },
      error: null,
    });

    const req = createMockPostRequest('test-article', { helpful: false });
    const response = await POST(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Feedback updated');
    expect(data.updated).toBe(true);

    expect(mockUpdate).toHaveBeenCalledWith({ is_helpful: false });
  });

  it('should return 400 for empty slug', async () => {
    const req = createMockPostRequest('', { helpful: true });
    const response = await POST(req, { params: createParams('') });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Slug is required');
  });
});

describe('GET /api/kb/public/articles/[slug]/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      eq: mockEq,
      is: mockIs,
      single: mockSingle,
    });
    mockIs.mockReturnValue({
      single: mockSingle,
    });
  });

  it('should return 401 for unauthenticated requests', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const req = createMockGetRequest('test-article');
    const response = await GET(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('should return hasFeedback false when no feedback exists', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-123', tenant_id: 'tenant-123' },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'article-123' },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const req = createMockGetRequest('test-article');
    const response = await GET(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.hasFeedback).toBe(false);
    expect(data.isHelpful).toBe(null);
  });

  it('should return hasFeedback true with isHelpful value', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-123', tenant_id: 'tenant-123' },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: 'article-123' },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { is_helpful: true },
      error: null,
    });

    const req = createMockGetRequest('test-article');
    const response = await GET(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.hasFeedback).toBe(true);
    expect(data.isHelpful).toBe(true);
  });
});
