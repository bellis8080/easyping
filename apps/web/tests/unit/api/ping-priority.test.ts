/**
 * Unit tests for PATCH /api/pings/[pingNumber]/priority endpoint
 *
 * Test coverage per Story 2.6 Task 10 requirements:
 * 1. PATCH /api/pings/[pingNumber]/priority updates priority successfully
 * 2. Returns 401 when unauthenticated
 * 3. Returns 403 when end user tries to update priority
 * 4. Returns 404 when ping not found
 * 5. Returns 400 when priority is unchanged (no-op scenario)
 * 6. Returns 400 when invalid priority value provided
 * 7. Enforces tenant isolation
 * 8. Returns 500 when database update fails
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PATCH } from '@/app/api/pings/[pingNumber]/priority/route';
import { NextRequest } from 'next/server';

// Mock modules
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

describe('PATCH /api/pings/[pingNumber]/priority', () => {
  let mockSupabaseClient: any;
  let mockSupabaseAdmin: any;

  // Valid UUID constants
  const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
  const PING_ID = '550e8400-e29b-41d4-a716-446655440001';
  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440002';
  const OTHER_TENANT_ID = '550e8400-e29b-41d4-a716-446655440003';

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Create fresh mock Supabase clients for each test
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    };

    mockSupabaseAdmin = {
      from: vi.fn(),
    };

    // Mock createClient and createAdminClient to return our mocks
    (createClient as any).mockResolvedValue(mockSupabaseClient);
    (createAdminClient as any).mockReturnValue(mockSupabaseAdmin);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper to create a mock NextRequest
   */
  function createMockRequest(body: any): NextRequest {
    return {
      json: async () => body,
    } as any;
  }

  /**
   * Test 1: Should update priority successfully when authenticated agent
   */
  it('should update priority successfully when authenticated agent', async () => {
    const mockUser = { id: USER_ID, email: 'agent@example.com' };
    const mockUserProfile = {
      id: USER_ID,
      full_name: 'Agent One',
      role: 'agent',
      tenant_id: TENANT_ID,
    };
    const mockPing = {
      id: PING_ID,
      ping_number: 5,
      priority: 'normal',
      tenant_id: TENANT_ID,
    };
    const mockUpdatedPing = {
      ...mockPing,
      priority: 'urgent',
    };

    // Mock authentication
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock user profile query
    const mockProfileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockUserProfile,
        error: null,
      }),
    };

    // Mock ping fetch query
    const mockPingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockPing,
        error: null,
      }),
    };

    // Mock ping update query
    const mockUpdateQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockUpdatedPing,
        error: null,
      }),
    };

    // Mock system message insert
    const mockMessageInsert = {
      insert: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    // Set up mock query chains
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'users') return mockProfileQuery;
      return null;
    });

    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'pings') {
        // First call is for fetch, second is for update
        if (!mockPingQuery.select.mock.calls.length) {
          return mockPingQuery;
        }
        return mockUpdateQuery;
      }
      if (table === 'ping_messages') return mockMessageInsert;
      return null;
    });

    const req = createMockRequest({ priority: 'urgent' });
    const params = Promise.resolve({ pingNumber: '5' });

    const response = await PATCH(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ping).toEqual(mockUpdatedPing);
    expect(mockUpdateQuery.update).toHaveBeenCalledWith({ priority: 'urgent' });
    // Story 4.2.1: Include visibility field
    expect(mockMessageInsert.insert).toHaveBeenCalledWith({
      ping_id: PING_ID,
      sender_id: USER_ID,
      content: 'Priority changed to urgent',
      message_type: 'system',
      visibility: 'public',
    });
  });

  /**
   * Test 2: Should return 401 when user not authenticated
   */
  it('should return 401 when user not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    });

    const req = createMockRequest({ priority: 'urgent' });
    const params = Promise.resolve({ pingNumber: '5' });

    const response = await PATCH(req, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  /**
   * Test 3: Should return 403 when end user attempts to update priority
   */
  it('should return 403 when end user attempts to update priority', async () => {
    const mockUser = { id: USER_ID, email: 'user@example.com' };
    const mockUserProfile = {
      id: USER_ID,
      full_name: 'End User',
      role: 'end_user',
      tenant_id: TENANT_ID,
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockProfileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockUserProfile,
        error: null,
      }),
    };

    mockSupabaseClient.from.mockReturnValue(mockProfileQuery);

    const req = createMockRequest({ priority: 'urgent' });
    const params = Promise.resolve({ pingNumber: '5' });

    const response = await PATCH(req, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden: Only agents can update priority');
  });

  /**
   * Test 4: Should return 404 when ping not found
   */
  it('should return 404 when ping not found', async () => {
    const mockUser = { id: USER_ID, email: 'agent@example.com' };
    const mockUserProfile = {
      id: USER_ID,
      full_name: 'Agent One',
      role: 'agent',
      tenant_id: TENANT_ID,
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockProfileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockUserProfile,
        error: null,
      }),
    };

    const mockPingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      }),
    };

    mockSupabaseClient.from.mockReturnValue(mockProfileQuery);
    mockSupabaseAdmin.from.mockReturnValue(mockPingQuery);

    const req = createMockRequest({ priority: 'urgent' });
    const params = Promise.resolve({ pingNumber: '999' });

    const response = await PATCH(req, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Ping not found');
  });

  /**
   * Test 5: Should return 400 when priority is unchanged
   */
  it('should return 400 when priority is unchanged', async () => {
    const mockUser = { id: USER_ID, email: 'agent@example.com' };
    const mockUserProfile = {
      id: USER_ID,
      full_name: 'Agent One',
      role: 'agent',
      tenant_id: TENANT_ID,
    };
    const mockPing = {
      id: PING_ID,
      ping_number: 5,
      priority: 'high',
      tenant_id: TENANT_ID,
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockProfileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockUserProfile,
        error: null,
      }),
    };

    const mockPingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockPing,
        error: null,
      }),
    };

    mockSupabaseClient.from.mockReturnValue(mockProfileQuery);
    mockSupabaseAdmin.from.mockReturnValue(mockPingQuery);

    const req = createMockRequest({ priority: 'high' });
    const params = Promise.resolve({ pingNumber: '5' });

    const response = await PATCH(req, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ping already has this priority');
  });

  /**
   * Test 6: Should return 400 when priority is invalid
   */
  it('should return 400 when priority is invalid', async () => {
    const mockUser = { id: USER_ID, email: 'agent@example.com' };
    const mockUserProfile = {
      id: USER_ID,
      full_name: 'Agent One',
      role: 'agent',
      tenant_id: TENANT_ID,
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockProfileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockUserProfile,
        error: null,
      }),
    };

    mockSupabaseClient.from.mockReturnValue(mockProfileQuery);

    const req = createMockRequest({ priority: 'invalid' });
    const params = Promise.resolve({ pingNumber: '5' });

    const response = await PATCH(req, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request');
  });

  /**
   * Test 7: Should enforce tenant isolation
   */
  it('should enforce tenant isolation', async () => {
    const mockUser = { id: USER_ID, email: 'agent@example.com' };
    const mockUserProfile = {
      id: USER_ID,
      full_name: 'Agent One',
      role: 'agent',
      tenant_id: TENANT_ID,
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockProfileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockUserProfile,
        error: null,
      }),
    };

    // Ping exists but in different tenant - query will return null
    const mockPingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      }),
    };

    mockSupabaseClient.from.mockReturnValue(mockProfileQuery);
    mockSupabaseAdmin.from.mockReturnValue(mockPingQuery);

    const req = createMockRequest({ priority: 'urgent' });
    const params = Promise.resolve({ pingNumber: '5' });

    const response = await PATCH(req, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Ping not found');
    expect(mockPingQuery.eq).toHaveBeenCalledWith('tenant_id', TENANT_ID);
  });

  /**
   * Test 8: Should return 500 when database update fails
   */
  it('should return 500 when database update fails', async () => {
    const mockUser = { id: USER_ID, email: 'agent@example.com' };
    const mockUserProfile = {
      id: USER_ID,
      full_name: 'Agent One',
      role: 'agent',
      tenant_id: TENANT_ID,
    };
    const mockPing = {
      id: PING_ID,
      ping_number: 5,
      priority: 'normal',
      tenant_id: TENANT_ID,
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockProfileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockUserProfile,
        error: null,
      }),
    };

    const mockPingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockPing,
        error: null,
      }),
    };

    const mockUpdateQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    };

    mockSupabaseClient.from.mockReturnValue(mockProfileQuery);
    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'pings') {
        if (!mockPingQuery.select.mock.calls.length) {
          return mockPingQuery;
        }
        return mockUpdateQuery;
      }
      return null;
    });

    const req = createMockRequest({ priority: 'urgent' });
    const params = Promise.resolve({ pingNumber: '5' });

    const response = await PATCH(req, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update priority');
  });
});
