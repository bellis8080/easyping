import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { GET, POST } from './route';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

describe('Categories API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (url: string, method = 'GET', body?: object) => {
    const req = new NextRequest(new URL(url, 'http://localhost'), {
      method,
      ...(body && {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    });
    return req;
  };

  // Helper to create a chainable mock
  const createChainMock = (finalValue: object) => {
    const chainMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(finalValue),
      order: vi.fn().mockResolvedValue(finalValue),
      insert: vi.fn().mockReturnThis(),
    };
    return chainMock;
  };

  describe('GET /api/categories', () => {
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

      const response = await GET(
        createMockRequest('http://localhost/api/categories')
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user profile not found', async () => {
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
        data: null,
        error: { message: 'Not found' },
      });
      const mockAdminClient = {
        from: vi.fn().mockReturnValue(chainMock),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as never);

      const response = await GET(
        createMockRequest('http://localhost/api/categories')
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });
  });

  describe('POST /api/categories', () => {
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

      const response = await POST(
        createMockRequest('http://localhost/api/categories', 'POST', {
          name: 'Test Category',
          color: '#FF0000',
        })
      );
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

      const response = await POST(
        createMockRequest('http://localhost/api/categories', 'POST', {
          name: 'Test Category',
          color: '#FF0000',
        })
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Only managers and owners');
    });

    it('should return 404 if user profile not found', async () => {
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
        data: null,
        error: { message: 'Not found' },
      });
      const mockAdminClient = {
        from: vi.fn().mockReturnValue(chainMock),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as never);

      const response = await POST(
        createMockRequest('http://localhost/api/categories', 'POST', {
          name: 'Test Category',
          color: '#FF0000',
        })
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });
  });
});
