/**
 * Unit tests for Public KB Categories API
 * Story 4.3.5: KB Browse Page & Category Filtering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { GET } from './route';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

describe('Public KB Categories API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/kb/public/categories', () => {
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

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
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
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });

    it('should return categories with article counts for authenticated user', async () => {
      const mockUser = { id: 'user-123' };
      const mockUserProfile = { id: 'user-123', tenant_id: 'org-123' };
      const mockArticles = [
        { category_id: 'cat-1', categories: { id: 'cat-1', name: 'Account' } },
        { category_id: 'cat-1', categories: { id: 'cat-1', name: 'Account' } },
        { category_id: 'cat-2', categories: { id: 'cat-2', name: 'Billing' } },
      ];

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue({ data: mockUserProfile, error: null }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({
            data: mockArticles,
            error: null,
          }),
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.totalArticles).toBe(3);
      expect(data.categories).toHaveLength(2);

      // Check Account category has 2 articles
      const accountCategory = data.categories.find(
        (c: { name: string }) => c.name === 'Account'
      );
      expect(accountCategory).toBeDefined();
      expect(accountCategory.articleCount).toBe(2);

      // Check Billing category has 1 article
      const billingCategory = data.categories.find(
        (c: { name: string }) => c.name === 'Billing'
      );
      expect(billingCategory).toBeDefined();
      expect(billingCategory.articleCount).toBe(1);
    });

    it('should return empty categories if no published articles', async () => {
      const mockUser = { id: 'user-123' };
      const mockUserProfile = { id: 'user-123', tenant_id: 'org-123' };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue({ data: mockUserProfile, error: null }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.totalArticles).toBe(0);
      expect(data.categories).toHaveLength(0);
    });

    it('should sort categories alphabetically by name', async () => {
      const mockUser = { id: 'user-123' };
      const mockUserProfile = { id: 'user-123', tenant_id: 'org-123' };
      const mockArticles = [
        { category_id: 'cat-z', categories: { id: 'cat-z', name: 'Zebra' } },
        { category_id: 'cat-a', categories: { id: 'cat-a', name: 'Apple' } },
        { category_id: 'cat-m', categories: { id: 'cat-m', name: 'Mango' } },
      ];

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue({ data: mockUserProfile, error: null }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({
            data: mockArticles,
            error: null,
          }),
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories[0].name).toBe('Apple');
      expect(data.categories[1].name).toBe('Mango');
      expect(data.categories[2].name).toBe('Zebra');
    });
  });
});
