/**
 * Tests for KB Article View Tracking API
 * Story 4.5: KB Article Detail Page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock Supabase clients
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIs = vi.fn();
const mockGte = vi.fn();
const mockLimit = vi.fn();
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

// Helper to create mock request
function createMockRequest(slug: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/kb/public/articles/${slug}/view`,
    {
      method: 'POST',
    }
  );
}

// Helper to create params promise
function createParams(slug: string): Promise<{ slug: string }> {
  return Promise.resolve({ slug });
}

describe('POST /api/kb/public/articles/[slug]/view', () => {
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
      gte: mockGte,
      single: mockSingle,
    });
    mockIs.mockReturnValue({
      single: mockSingle,
    });
    mockGte.mockReturnValue({
      limit: mockLimit,
    });
    mockLimit.mockReturnValue({
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

    const req = createMockRequest('test-article');
    const response = await POST(req, { params: createParams('test-article') });
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

    // User profile query succeeds
    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-123', tenant_id: 'tenant-123' },
      error: null,
    });

    // Article query returns null
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Not found' },
    });

    const req = createMockRequest('non-existent');
    const response = await POST(req, { params: createParams('non-existent') });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Article not found');
  });

  it('should track new view and increment count', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    // User profile query succeeds
    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-123', tenant_id: 'tenant-123' },
      error: null,
    });

    // Article query succeeds
    mockSingle.mockResolvedValueOnce({
      data: { id: 'article-123', view_count: 42 },
      error: null,
    });

    // No existing view in last 24 hours
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const req = createMockRequest('test-article');
    const response = await POST(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.tracked).toBe(true);

    // Verify insert was called
    expect(mockInsert).toHaveBeenCalledWith({
      article_id: 'article-123',
      user_id: 'user-123',
      viewed_at: expect.any(String),
    });
  });

  it('should not track duplicate view within 24 hours', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    // User profile query succeeds
    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-123', tenant_id: 'tenant-123' },
      error: null,
    });

    // Article query succeeds
    mockSingle.mockResolvedValueOnce({
      data: { id: 'article-123', view_count: 42 },
      error: null,
    });

    // Existing view found in last 24 hours
    mockSingle.mockResolvedValueOnce({
      data: { id: 'existing-view-123' },
      error: null,
    });

    const req = createMockRequest('test-article');
    const response = await POST(req, { params: createParams('test-article') });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.tracked).toBe(false);

    // Verify insert was NOT called
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('should return 400 for empty slug', async () => {
    const req = createMockRequest('');
    const response = await POST(req, { params: createParams('') });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Slug is required');
  });

  it('should handle errors gracefully (fire-and-forget)', async () => {
    mockGetUser.mockRejectedValue(new Error('Database error'));

    const req = createMockRequest('test-article');
    const response = await POST(req, { params: createParams('test-article') });
    const data = await response.json();

    // Should return success even on error (fire-and-forget)
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.tracked).toBe(false);
  });
});
