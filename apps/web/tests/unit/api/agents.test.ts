/**
 * Unit tests for GET /api/agents endpoint
 *
 * Test coverage per Story 2.5 requirements:
 * 1. GET /api/agents returns list of agents in tenant
 * 2. Returns 401 when unauthenticated
 * 3. Returns 404 when user profile not found
 * 4. Filters agents by role (agent, manager, owner only)
 * 5. Orders agents by full_name alphabetically
 * 6. Enforces tenant isolation (only agents in same tenant)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/agents/route';

// Mock modules
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('GET /api/agents', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Create a fresh mock Supabase client for each test
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    };

    // Mock createClient to return our mock
    (createClient as any).mockResolvedValue(mockSupabaseClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test 1: GET /api/agents returns list of agents in tenant
   */
  it('should return list of agents successfully when authenticated', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockUserProfile = { tenant_id: 'tenant-123', role: 'agent' };
    const mockAgents = [
      {
        id: 'agent-1',
        full_name: 'Alice Agent',
        avatar_url: 'https://example.com/alice.jpg',
        role: 'agent',
      },
      {
        id: 'agent-2',
        full_name: 'Bob Manager',
        avatar_url: null,
        role: 'manager',
      },
      {
        id: 'agent-3',
        full_name: 'Charlie Owner',
        avatar_url: 'https://example.com/charlie.jpg',
        role: 'owner',
      },
    ];

    // Mock successful authentication
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

    // Mock agents query
    const mockAgentsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockAgents,
        error: null,
      }),
    };

    // Setup mock return values
    mockSupabaseClient.from
      .mockReturnValueOnce(mockProfileQuery) // First call: users table (profile)
      .mockReturnValueOnce(mockAgentsQuery); // Second call: users table (agents)

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toBeDefined();
    expect(data.agents).toHaveLength(3);
    expect(data.agents[0].full_name).toBe('Alice Agent');
    expect(data.agents[1].full_name).toBe('Bob Manager');
    expect(data.agents[2].full_name).toBe('Charlie Owner');

    // Verify the correct database operations were performed
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    expect(mockSupabaseClient.from).toHaveBeenCalledTimes(2);

    // Verify profile query
    expect(mockProfileQuery.select).toHaveBeenCalledWith('tenant_id, role');
    expect(mockProfileQuery.eq).toHaveBeenCalledWith('id', 'user-123');
    expect(mockProfileQuery.single).toHaveBeenCalled();

    // Verify agents query
    expect(mockAgentsQuery.select).toHaveBeenCalledWith(
      'id, full_name, avatar_url, role'
    );
    expect(mockAgentsQuery.eq).toHaveBeenCalledWith('tenant_id', 'tenant-123');
    expect(mockAgentsQuery.in).toHaveBeenCalledWith('role', [
      'agent',
      'manager',
      'owner',
    ]);
    expect(mockAgentsQuery.order).toHaveBeenCalledWith('full_name');
  });

  /**
   * Test 2: Returns 401 when unauthenticated
   */
  it('should return 401 when user is not authenticated', async () => {
    // Mock authentication failure
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');

    // Verify no database operations were attempted
    expect(mockSupabaseClient.from).not.toHaveBeenCalled();
  });

  /**
   * Test 3: Returns 404 when user profile not found
   */
  it('should return 404 when user profile is not found', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock user profile query to return not found
    const mockProfileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    mockSupabaseClient.from.mockReturnValueOnce(mockProfileQuery);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User profile not found');

    // Verify only the profile query was attempted
    expect(mockSupabaseClient.from).toHaveBeenCalledTimes(1);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
  });

  /**
   * Test 4: Filters agents by role (agent, manager, owner only)
   */
  it('should only return users with agent, manager, or owner roles', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockUserProfile = { tenant_id: 'tenant-123', role: 'manager' };
    const mockAgents = [
      {
        id: 'agent-1',
        full_name: 'Agent One',
        avatar_url: null,
        role: 'agent',
      },
      {
        id: 'agent-2',
        full_name: 'Manager One',
        avatar_url: null,
        role: 'manager',
      },
      {
        id: 'agent-3',
        full_name: 'Owner One',
        avatar_url: null,
        role: 'owner',
      },
    ];

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

    const mockAgentsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockAgents,
        error: null,
      }),
    };

    mockSupabaseClient.from
      .mockReturnValueOnce(mockProfileQuery)
      .mockReturnValueOnce(mockAgentsQuery);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toHaveLength(3);

    // Verify role filter was applied
    expect(mockAgentsQuery.in).toHaveBeenCalledWith('role', [
      'agent',
      'manager',
      'owner',
    ]);

    // Verify no end_user roles in results
    data.agents.forEach((agent: any) => {
      expect(agent.role).not.toBe('end_user');
    });
  });

  /**
   * Test 5: Orders agents by full_name alphabetically
   */
  it('should order agents by full_name alphabetically', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockUserProfile = { tenant_id: 'tenant-123', role: 'agent' };
    const mockAgents = [
      {
        id: 'agent-1',
        full_name: 'Alice Agent',
        avatar_url: null,
        role: 'agent',
      },
      {
        id: 'agent-2',
        full_name: 'Bob Agent',
        avatar_url: null,
        role: 'agent',
      },
      {
        id: 'agent-3',
        full_name: 'Charlie Agent',
        avatar_url: null,
        role: 'agent',
      },
    ];

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

    const mockAgentsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockAgents,
        error: null,
      }),
    };

    mockSupabaseClient.from
      .mockReturnValueOnce(mockProfileQuery)
      .mockReturnValueOnce(mockAgentsQuery);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);

    // Verify order was applied
    expect(mockAgentsQuery.order).toHaveBeenCalledWith('full_name');

    // Verify results are in alphabetical order
    expect(data.agents[0].full_name).toBe('Alice Agent');
    expect(data.agents[1].full_name).toBe('Bob Agent');
    expect(data.agents[2].full_name).toBe('Charlie Agent');
  });

  /**
   * Test 6: Enforces tenant isolation (only agents in same tenant)
   */
  it('should only return agents from the same tenant', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockUserProfile = { tenant_id: 'tenant-123', role: 'agent' };
    const mockAgents = [
      {
        id: 'agent-1',
        full_name: 'Agent from tenant-123',
        avatar_url: null,
        role: 'agent',
      },
    ];

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

    const mockAgentsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockAgents,
        error: null,
      }),
    };

    mockSupabaseClient.from
      .mockReturnValueOnce(mockProfileQuery)
      .mockReturnValueOnce(mockAgentsQuery);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);

    // Verify tenant_id filter was applied
    expect(mockAgentsQuery.eq).toHaveBeenCalledWith('tenant_id', 'tenant-123');

    // Verify results are from correct tenant
    expect(data.agents).toHaveLength(1);
    expect(data.agents[0].full_name).toBe('Agent from tenant-123');
  });

  /**
   * Test 7: Returns 500 when database query fails
   */
  it('should return 500 when database query fails', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockUserProfile = { tenant_id: 'tenant-123', role: 'agent' };

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

    const mockAgentsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    };

    mockSupabaseClient.from
      .mockReturnValueOnce(mockProfileQuery)
      .mockReturnValueOnce(mockAgentsQuery);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch agents');
  });
});
