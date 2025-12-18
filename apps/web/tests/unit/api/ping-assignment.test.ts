/**
 * Unit tests for PATCH /api/pings/[pingNumber]/assign endpoint
 *
 * Test coverage per Story 2.5 Task 9 requirements:
 * 1. PATCH /api/pings/[pingNumber]/assign assigns ping successfully
 * 2. Returns 401 when unauthenticated
 * 3. Returns 403 when end user tries to assign
 * 4. Returns 400 when invalid assignedTo UUID provided
 * 5. Returns 404 when ping not found
 * 6. Returns 404 when assignee not found or not in same tenant
 * 7. Creates system message "Ping assigned to Agent Name"
 * 8. Allows unassignment with null assignedTo
 * 9. Returns 400 when assigning to already-assigned agent
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PATCH } from '@/app/api/pings/[pingNumber]/assign/route';
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

describe('PATCH /api/pings/[pingNumber]/assign', () => {
  let mockSupabaseClient: any;
  let mockSupabaseAdmin: any;

  // Valid UUID constants
  const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
  const PING_ID = '550e8400-e29b-41d4-a716-446655440001';
  const AGENT_ID = '550e8400-e29b-41d4-a716-446655440002';
  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440003';

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
   * Test 1: PATCH /api/pings/[pingNumber]/assign assigns ping successfully
   */
  it('should assign ping successfully when authenticated agent assigns to another agent', async () => {
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
      assigned_to: null,
      tenant_id: TENANT_ID,
    };
    const mockAssignee = {
      id: AGENT_ID,
      full_name: 'Agent Two',
    };
    const mockUpdatedPing = {
      ...mockPing,
      assigned_to: AGENT_ID,
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

    // Mock assignee fetch query
    const mockAssigneeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockAssignee,
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
      insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
    };

    // Setup mock return values in order
    mockSupabaseClient.from.mockReturnValueOnce(mockProfileQuery);
    mockSupabaseAdmin.from
      .mockReturnValueOnce(mockPingQuery) // Fetch ping
      .mockReturnValueOnce(mockAssigneeQuery) // Fetch assignee
      .mockReturnValueOnce(mockUpdateQuery) // Update ping
      .mockReturnValueOnce(mockMessageInsert); // Insert system message

    const request = createMockRequest({ assignedTo: AGENT_ID });
    const params = Promise.resolve({ pingNumber: '5' });

    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ping).toBeDefined();
    expect(data.ping.assigned_to).toBe(AGENT_ID);

    // Verify system message was created
    // Story 4.2.1: Include visibility field
    expect(mockMessageInsert.insert).toHaveBeenCalledWith({
      ping_id: PING_ID,
      sender_id: USER_ID,
      content: 'Ping assigned to Agent Two',
      message_type: 'system',
      visibility: 'public',
    });
  });

  /**
   * Test 2: Returns 401 when unauthenticated
   */
  it('should return 401 when user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const request = createMockRequest({ assignedTo: AGENT_ID });
    const params = Promise.resolve({ pingNumber: '5' });

    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');

    // Verify no database operations were attempted
    expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
  });

  /**
   * Test 3: Returns 403 when end user tries to assign
   */
  it('should return 403 when end user tries to assign ping', async () => {
    const mockUser = { id: USER_ID, email: 'enduser@example.com' };
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

    mockSupabaseClient.from.mockReturnValueOnce(mockProfileQuery);

    const request = createMockRequest({ assignedTo: AGENT_ID });
    const params = Promise.resolve({ pingNumber: '5' });

    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden: Only agents can assign pings');

    // Verify no admin operations were attempted
    expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
  });

  /**
   * Test 4: Returns 400 when invalid assignedTo UUID provided
   */
  it('should return 400 when assignedTo is not a valid UUID', async () => {
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

    mockSupabaseClient.from.mockReturnValueOnce(mockProfileQuery);

    const request = createMockRequest({ assignedTo: 'invalid-uuid' });
    const params = Promise.resolve({ pingNumber: '5' });

    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request');
    expect(data.details).toBeDefined();

    // Verify no ping operations were attempted
    expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
  });

  /**
   * Test 5: Returns 404 when ping not found
   */
  it('should return 404 when ping is not found', async () => {
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

    mockSupabaseClient.from.mockReturnValueOnce(mockProfileQuery);
    mockSupabaseAdmin.from.mockReturnValueOnce(mockPingQuery);

    const request = createMockRequest({ assignedTo: AGENT_ID });
    const params = Promise.resolve({ pingNumber: '999' });

    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Ping not found');
  });

  /**
   * Test 6: Returns 404 when assignee not found or not in same tenant
   */
  it('should return 404 when assignee is not found in same tenant', async () => {
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
      assigned_to: null,
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

    const mockAssigneeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    mockSupabaseClient.from.mockReturnValueOnce(mockProfileQuery);
    mockSupabaseAdmin.from
      .mockReturnValueOnce(mockPingQuery)
      .mockReturnValueOnce(mockAssigneeQuery);

    const request = createMockRequest({ assignedTo: AGENT_ID });
    const params = Promise.resolve({ pingNumber: '5' });

    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Assigned agent not found');
  });

  /**
   * Test 7: Creates system message "Ping assigned to Agent Name"
   */
  it('should create system message with agent name when assigning', async () => {
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
      assigned_to: null,
      tenant_id: TENANT_ID,
    };
    const mockAssignee = {
      id: AGENT_ID,
      full_name: 'Alice Agent',
    };
    const mockUpdatedPing = {
      ...mockPing,
      assigned_to: AGENT_ID,
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

    const mockAssigneeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockAssignee,
        error: null,
      }),
    };

    const mockUpdateQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockUpdatedPing,
        error: null,
      }),
    };

    const mockMessageInsert = {
      insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
    };

    mockSupabaseClient.from.mockReturnValueOnce(mockProfileQuery);
    mockSupabaseAdmin.from
      .mockReturnValueOnce(mockPingQuery)
      .mockReturnValueOnce(mockAssigneeQuery)
      .mockReturnValueOnce(mockUpdateQuery)
      .mockReturnValueOnce(mockMessageInsert);

    const request = createMockRequest({ assignedTo: AGENT_ID });
    const params = Promise.resolve({ pingNumber: '5' });

    await PATCH(request, { params });

    // Verify system message was created with correct content
    // Story 4.2.1: Include visibility field
    expect(mockMessageInsert.insert).toHaveBeenCalledWith({
      ping_id: PING_ID,
      sender_id: USER_ID,
      content: 'Ping assigned to Alice Agent',
      message_type: 'system',
      visibility: 'public',
    });
  });

  /**
   * Test 8: Allows unassignment with null assignedTo
   */
  it('should allow unassignment when assignedTo is null', async () => {
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
      assigned_to: AGENT_ID,
      tenant_id: TENANT_ID,
    };
    const mockUpdatedPing = {
      ...mockPing,
      assigned_to: null,
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
        data: mockUpdatedPing,
        error: null,
      }),
    };

    const mockMessageInsert = {
      insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
    };

    mockSupabaseClient.from.mockReturnValueOnce(mockProfileQuery);
    mockSupabaseAdmin.from
      .mockReturnValueOnce(mockPingQuery)
      .mockReturnValueOnce(mockUpdateQuery)
      .mockReturnValueOnce(mockMessageInsert);

    const request = createMockRequest({ assignedTo: null });
    const params = Promise.resolve({ pingNumber: '5' });

    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ping.assigned_to).toBeNull();

    // Verify system message says "Ping unassigned"
    // Story 4.2.1: Include visibility field
    expect(mockMessageInsert.insert).toHaveBeenCalledWith({
      ping_id: PING_ID,
      sender_id: USER_ID,
      content: 'Ping unassigned',
      message_type: 'system',
      visibility: 'public',
    });
  });

  /**
   * Test 9: Returns 400 when assigning to already-assigned agent
   */
  it('should return 400 when ping is already assigned to the same agent', async () => {
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
      assigned_to: AGENT_ID,
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

    mockSupabaseClient.from.mockReturnValueOnce(mockProfileQuery);
    mockSupabaseAdmin.from.mockReturnValueOnce(mockPingQuery);

    const request = createMockRequest({ assignedTo: AGENT_ID });
    const params = Promise.resolve({ pingNumber: '5' });

    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ping already assigned to this agent');
  });

  /**
   * Test 10: Returns 500 when database update fails
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
      assigned_to: null,
      tenant_id: TENANT_ID,
    };
    const mockAssignee = {
      id: AGENT_ID,
      full_name: 'Alice Agent',
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

    const mockAssigneeQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockAssignee,
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

    mockSupabaseClient.from.mockReturnValueOnce(mockProfileQuery);
    mockSupabaseAdmin.from
      .mockReturnValueOnce(mockPingQuery)
      .mockReturnValueOnce(mockAssigneeQuery)
      .mockReturnValueOnce(mockUpdateQuery);

    const request = createMockRequest({ assignedTo: AGENT_ID });
    const params = Promise.resolve({ pingNumber: '5' });

    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update assignment');
  });
});
