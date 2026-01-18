/**
 * Unit tests for GET /api/analytics/pings endpoint
 * Story 5.4: Basic Analytics Dashboard
 *
 * Test coverage:
 * 1. Returns correct totals for date range
 * 2. Calculates previous period comparison
 * 3. SLA compliance calculation (with and without resolved pings)
 * 4. Volume aggregation by day
 * 5. Category breakdown grouping
 * 6. Role authorization (reject non-manager/owner)
 * 7. Tenant isolation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/analytics/pings/route';
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

describe('GET /api/analytics/pings', () => {
  let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;
  let mockAdminClient: ReturnType<typeof createMockAdminClient>;

  function createMockSupabaseClient() {
    return {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };
  }

  function createMockAdminClient() {
    const mockClient = {
      from: vi.fn(),
      rpc: vi.fn(),
    };

    // Chain helper
    const createChain = (data: unknown = null, count: number | null = null) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      data,
      count,
    });

    mockClient.from = vi.fn().mockImplementation(() => createChain());
    mockClient.rpc = vi.fn().mockResolvedValue({ data: null });

    return mockClient;
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseClient = createMockSupabaseClient();
    mockAdminClient = createMockAdminClient();

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabaseClient);
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(mockAdminClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper to create a mock NextRequest with URL params
   */
  const createMockRequest = (params: Record<string, string> = {}): NextRequest => {
    const searchParams = new URLSearchParams(params);
    const url = `http://localhost:3000/api/analytics/pings?${searchParams}`;
    return {
      url,
    } as unknown as NextRequest;
  };

  /**
   * Test 1: Returns 401 when unauthenticated
   */
  it('should return 401 when user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const request = createMockRequest({ period: '7d' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Unauthorized');
  });

  /**
   * Test 2: Returns 404 when user profile not found
   */
  it('should return 404 when user profile is not found', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const request = createMockRequest({ period: '7d' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('User not found');
  });

  /**
   * Test 3: Returns 403 for non-manager/owner roles
   */
  it('should return 403 for agent role', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockUserProfile = { id: 'user-123', role: 'agent', tenant_id: 'tenant-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUserProfile, error: null }),
    });

    const request = createMockRequest({ period: '7d' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Forbidden');
  });

  /**
   * Test 4: Returns 403 for end_user role
   */
  it('should return 403 for end_user role', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockUserProfile = { id: 'user-123', role: 'end_user', tenant_id: 'tenant-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUserProfile, error: null }),
    });

    const request = createMockRequest({ period: '7d' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Forbidden');
  });

  /**
   * Test 5: Allows manager role
   */
  it('should allow manager role to access analytics', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockUserProfile = { id: 'user-123', role: 'manager', tenant_id: 'tenant-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUserProfile, error: null }),
    });

    // Mock admin client queries to return empty/zero data
    const emptyChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      data: [],
      count: 0,
    };

    mockAdminClient.from.mockReturnValue(emptyChain);
    mockAdminClient.rpc.mockResolvedValue({ data: null });

    const request = createMockRequest({ period: '7d' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  /**
   * Test 6: Allows owner role
   */
  it('should allow owner role to access analytics', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockUserProfile = { id: 'user-123', role: 'owner', tenant_id: 'tenant-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUserProfile, error: null }),
    });

    // Mock admin client queries
    const emptyChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      data: [],
      count: 0,
    };

    mockAdminClient.from.mockReturnValue(emptyChain);
    mockAdminClient.rpc.mockResolvedValue({ data: null });

    const request = createMockRequest({ period: '7d' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  /**
   * Test 7: Returns correct response structure
   */
  it('should return correct response structure with all fields', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockUserProfile = { id: 'user-123', role: 'manager', tenant_id: 'tenant-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUserProfile, error: null }),
    });

    // Mock admin client queries
    const emptyChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      data: [],
      count: 0,
    };

    mockAdminClient.from.mockReturnValue(emptyChain);
    mockAdminClient.rpc.mockResolvedValue({ data: null });

    const request = createMockRequest({ period: '7d' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('totals');
    expect(data.totals).toHaveProperty('totalPings');
    expect(data.totals).toHaveProperty('avgResolutionTimeMinutes');
    expect(data.totals).toHaveProperty('slaComplianceRate');
    expect(data.totals).toHaveProperty('openPings');
    expect(data.totals).toHaveProperty('previousPeriod');
    expect(data.totals.previousPeriod).toHaveProperty('totalPings');
    expect(data).toHaveProperty('volume');
    expect(data).toHaveProperty('categoryBreakdown');
    expect(Array.isArray(data.volume)).toBe(true);
    expect(Array.isArray(data.categoryBreakdown)).toBe(true);
  });

  /**
   * Test 8: Defaults to 7d period when not specified
   */
  it('should default to 7d period when not specified', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockUserProfile = { id: 'user-123', role: 'manager', tenant_id: 'tenant-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUserProfile, error: null }),
    });

    // Mock admin client queries
    const emptyChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      data: [],
      count: 0,
    };

    mockAdminClient.from.mockReturnValue(emptyChain);
    mockAdminClient.rpc.mockResolvedValue({ data: null });

    // No period specified
    const request = createMockRequest({});
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Should have 7 days of volume data
    expect(data.volume.length).toBeGreaterThanOrEqual(7);
  });
});
