import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { POST } from './route';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

describe('Category Restore API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create a chainable mock
  const createChainMock = (finalValue: object) => {
    const chainMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(finalValue),
      update: vi.fn().mockReturnThis(),
    };
    return chainMock;
  };

  const createMockRequest = () => {
    return new NextRequest(
      new URL('http://localhost/api/categories/cat-123/restore'),
      {
        method: 'POST',
      }
    );
  };

  const createMockParams = (id: string = 'cat-123') => ({
    params: Promise.resolve({ id }),
  });

  it('should return 401 if user is not authenticated', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated'),
        }),
      },
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const response = await POST(createMockRequest(), createMockParams());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 if user is not manager or owner', async () => {
    const mockUser = { id: 'user-123' };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const chainMock = createChainMock({
      data: { tenant_id: 'org-123', role: 'agent' },
      error: null,
    });
    const mockAdminClient = {
      from: vi.fn().mockReturnValue(chainMock),
    };
    vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as never);

    const response = await POST(createMockRequest(), createMockParams());
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Only managers and owners');
  });

  it('should return 404 if category not found', async () => {
    const mockUser = { id: 'user-123' };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    let callCount = 0;
    const mockAdminClient = {
      from: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainMock({
            data: { tenant_id: 'org-123', role: 'manager' },
            error: null,
          });
        }
        // Category lookup
        return createChainMock({
          data: null,
          error: { message: 'Not found' },
        });
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as never);

    const response = await POST(createMockRequest(), createMockParams());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Category not found');
  });

  it('should return 400 if category is not archived', async () => {
    const mockUser = { id: 'user-123' };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    let callCount = 0;
    const mockAdminClient = {
      from: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainMock({
            data: { tenant_id: 'org-123', role: 'manager' },
            error: null,
          });
        }
        // Category lookup - returns active category
        return createChainMock({
          data: { id: 'cat-123', is_active: true },
          error: null,
        });
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as never);

    const response = await POST(createMockRequest(), createMockParams());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('not archived');
  });
});
