/**
 * Unit tests for GET /api/kb/categories endpoint
 * Story 4.3.0: KB Article Editor for Agents - Task 8
 *
 * Test coverage:
 * 1. Returns 401 when unauthenticated
 * 2. Returns 403 when end user tries to access
 * 3. Returns empty array when no categories exist
 * 4. Returns categories with article counts for agents
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/kb/categories/route';

// Mock modules
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

describe('GET /api/kb/categories', () => {
  let mockSupabaseClient: ReturnType<typeof vi.fn>;
  let mockSupabaseAdmin: ReturnType<typeof vi.fn>;

  // Valid UUID constants
  const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
  const CATEGORY_ID_1 = '550e8400-e29b-41d4-a716-446655440002';
  const CATEGORY_ID_2 = '550e8400-e29b-41d4-a716-446655440003';

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    mockSupabaseAdmin = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSupabaseClient
    );
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockSupabaseAdmin
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test 1: Returns 401 when unauthenticated
   */
  it('should return 401 when unauthenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const response = await GET();

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
    expect(data.categories).toEqual([]);
  });

  /**
   * Test 2: Returns 403 when end user tries to access
   */
  it('should return 403 when end user tries to access', async () => {
    const mockUser = { id: USER_ID, email: 'user@example.com' };
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock user profile lookup - end_user role
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: USER_ID, role: 'end_user', tenant_id: TENANT_ID },
            error: null,
          }),
        }),
      }),
    });

    const response = await GET();

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
    expect(data.categories).toEqual([]);
  });

  /**
   * Test 3: Returns empty array when no categories exist
   */
  it('should return empty array when no categories exist', async () => {
    const mockUser = { id: USER_ID, email: 'agent@example.com' };
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock user profile lookup - agent role
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: USER_ID, role: 'agent', tenant_id: TENANT_ID },
            error: null,
          }),
        }),
      }),
    });

    // Mock categories fetch - empty
    mockSupabaseAdmin.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.categories).toEqual([]);
  });

  /**
   * Test 4: Returns categories with article counts for agents
   */
  it('should return categories with article counts for agents', async () => {
    const mockUser = { id: USER_ID, email: 'agent@example.com' };
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock user profile lookup - agent role
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: USER_ID, role: 'agent', tenant_id: TENANT_ID },
            error: null,
          }),
        }),
      }),
    });

    const mockCategories = [
      {
        id: CATEGORY_ID_1,
        name: 'Getting Started',
        slug: 'getting-started',
        description: 'Guides for new users',
        sort_order: 1,
      },
      {
        id: CATEGORY_ID_2,
        name: 'Troubleshooting',
        slug: 'troubleshooting',
        description: 'Common issues',
        sort_order: 2,
      },
    ];

    // Mock categories fetch
    const mockCategoriesQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockCategories,
              error: null,
            }),
          }),
        }),
      }),
    };

    // Mock article counts fetch
    const mockArticleCountsQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({
              data: [
                { category_id: CATEGORY_ID_1 },
                { category_id: CATEGORY_ID_1 },
                { category_id: CATEGORY_ID_2 },
              ],
              error: null,
            }),
          }),
        }),
      }),
    };

    let callCount = 0;
    mockSupabaseAdmin.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return mockCategoriesQuery;
      }
      return mockArticleCountsQuery;
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.categories).toHaveLength(2);
    expect(data.categories[0].name).toBe('Getting Started');
    expect(data.categories[0].articleCount).toBe(2);
    expect(data.categories[1].name).toBe('Troubleshooting');
    expect(data.categories[1].articleCount).toBe(1);
  });
});
