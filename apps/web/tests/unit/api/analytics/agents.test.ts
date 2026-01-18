/**
 * Unit tests for GET /api/analytics/agents endpoint
 * Story 5.5: Agent Performance Metrics
 *
 * Test coverage:
 * 1. Returns 401 when unauthenticated
 * 2. Returns 404 when user profile not found
 * 3. Returns 403 for end_user role
 * 4. Allows agent role (returns only their own data)
 * 5. Allows manager role (returns all agents)
 * 6. Allows owner role (returns all agents)
 * 7. Returns correct response structure
 * 8. Defaults to 7d period when not specified
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/analytics/agents/route';
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

describe('GET /api/analytics/agents', () => {
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
    };

    // Chain helper
    const createChain = (data: unknown = null) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      data,
      error: null,
    });

    mockClient.from = vi.fn().mockImplementation(() => createChain());

    return mockClient;
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseClient = createMockSupabaseClient();
    mockAdminClient = createMockAdminClient();

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSupabaseClient
    );
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockAdminClient
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper to create a mock NextRequest with URL params
   */
  const createMockRequest = (
    params: Record<string, string> = {}
  ): NextRequest => {
    const searchParams = new URLSearchParams(params);
    const url = `http://localhost:3000/api/analytics/agents?${searchParams}`;
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
   * Test 3: Returns 403 for end_user role
   */
  it('should return 403 for end_user role', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockUserProfile = {
      id: 'user-123',
      role: 'end_user',
      tenant_id: 'tenant-123',
      full_name: 'Test User',
      avatar_url: null,
    };

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
   * Test 4: Allows agent role and returns only their data
   */
  it('should allow agent role and return only their own data', async () => {
    const mockUser = { id: 'agent-123', email: 'agent@example.com' };
    const mockUserProfile = {
      id: 'agent-123',
      role: 'agent',
      tenant_id: 'tenant-123',
      full_name: 'Test Agent',
      avatar_url: 'https://example.com/avatar.jpg',
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUserProfile, error: null }),
    });

    // Mock pings query for agent - needs to handle both resolved pings (.in()) and assigned pings (.not())
    const mockPingsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'ping-1',
            status: 'resolved',
            assigned_at: '2024-01-01T00:00:00Z',
            resolved_at: '2024-01-01T01:00:00Z',
            first_response_at: '2024-01-01T00:30:00Z',
            created_at: '2024-01-01T00:00:00Z',
            sla_policy_id: 'sla-1',
            sla_first_response_due: '2024-01-01T01:00:00Z',
            sla_resolution_due: '2024-01-01T04:00:00Z',
          },
        ],
        error: null,
      }),
    };

    mockAdminClient.from.mockReturnValue(mockPingsChain);

    const request = createMockRequest({ period: '7d' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.agents).toHaveLength(1);
    expect(data.agents[0].agentId).toBe('agent-123');
    expect(data.agents[0].agentName).toBe('Test Agent');
  });

  /**
   * Test 5: Allows manager role and returns all agents
   */
  it('should allow manager role to access all agent metrics', async () => {
    const mockUser = { id: 'manager-123', email: 'manager@example.com' };
    const mockUserProfile = {
      id: 'manager-123',
      role: 'manager',
      tenant_id: 'tenant-123',
      full_name: 'Test Manager',
      avatar_url: null,
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUserProfile, error: null }),
    });

    // Mock agents query with chained .eq() calls
    const mockAgentsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { id: 'agent-1', full_name: 'Agent One', avatar_url: null },
            { id: 'agent-2', full_name: 'Agent Two', avatar_url: null },
          ],
          error: null,
        }),
      }),
    };

    // Mock pings query - needs to handle both resolved pings (.in()) and assigned pings (.not())
    const mockPingsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return mockAgentsChain;
      }
      return mockPingsChain;
    });

    const request = createMockRequest({ period: '7d' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.agents).toHaveLength(2);
  });

  /**
   * Test 6: Allows owner role
   */
  it('should allow owner role to access analytics', async () => {
    const mockUser = { id: 'owner-123', email: 'owner@example.com' };
    const mockUserProfile = {
      id: 'owner-123',
      role: 'owner',
      tenant_id: 'tenant-123',
      full_name: 'Test Owner',
      avatar_url: null,
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUserProfile, error: null }),
    });

    // Mock agents query - empty list with chained .eq() calls
    const mockAgentsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    };

    mockAdminClient.from.mockReturnValue(mockAgentsChain);

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
    const mockUser = { id: 'agent-123', email: 'agent@example.com' };
    const mockUserProfile = {
      id: 'agent-123',
      role: 'agent',
      tenant_id: 'tenant-123',
      full_name: 'Test Agent',
      avatar_url: null,
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUserProfile, error: null }),
    });

    // Mock pings query - needs to handle both resolved pings (.in()) and assigned pings (.not())
    const mockPingsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    mockAdminClient.from.mockReturnValue(mockPingsChain);

    const request = createMockRequest({ period: '7d' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('agents');
    expect(data).toHaveProperty('period');
    expect(data.period).toHaveProperty('startDate');
    expect(data.period).toHaveProperty('endDate');
    expect(Array.isArray(data.agents)).toBe(true);

    // Verify agent structure
    if (data.agents.length > 0) {
      const agent = data.agents[0];
      expect(agent).toHaveProperty('agentId');
      expect(agent).toHaveProperty('agentName');
      expect(agent).toHaveProperty('avatarUrl');
      expect(agent).toHaveProperty('pingsResolved');
      expect(agent).toHaveProperty('avgResolutionTimeMinutes');
      expect(agent).toHaveProperty('slaComplianceRate');
      expect(agent).toHaveProperty('avgFirstResponseMinutes');
      expect(agent).toHaveProperty('pingsAssigned');
    }
  });

  /**
   * Test 8: Defaults to 7d period when not specified
   */
  it('should default to 7d period when not specified', async () => {
    const mockUser = { id: 'agent-123', email: 'agent@example.com' };
    const mockUserProfile = {
      id: 'agent-123',
      role: 'agent',
      tenant_id: 'tenant-123',
      full_name: 'Test Agent',
      avatar_url: null,
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUserProfile, error: null }),
    });

    // Mock pings query - needs to handle both resolved pings (.in()) and assigned pings (.not())
    const mockPingsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    mockAdminClient.from.mockReturnValue(mockPingsChain);

    // No period specified
    const request = createMockRequest({});
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify period is approximately 7 days
    const startDate = new Date(data.period.startDate);
    const endDate = new Date(data.period.endDate);
    const diffDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBeGreaterThanOrEqual(6);
    expect(diffDays).toBeLessThanOrEqual(8);
  });
});
