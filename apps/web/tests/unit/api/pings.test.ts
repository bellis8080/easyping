/**
 * Unit tests for POST /api/pings endpoint
 *
 * Test coverage per QA requirements:
 * 1. POST /api/pings creates ping and message successfully
 * 2. Returns 401 when unauthenticated
 * 3. Returns 400 when message is empty
 * 4. Returns 400 when message exceeds 5000 chars
 * 5. Returns 404 when user profile not found
 * 6. Title is truncated to 50 characters
 * 7. Ping number auto-increments per tenant
 * 8. Rollback occurs if message creation fails
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/pings/route';
import { NextRequest } from 'next/server';

// Mock modules
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/services/routing-service', () => ({
  createRoutingService: vi.fn(() => ({
    routePing: vi.fn().mockResolvedValue({
      routed: false,
      routedTo: null,
      systemMessage: 'No routing rule configured',
    }),
    applyRoutingToUpdate: vi.fn().mockReturnValue({}),
  })),
}));

vi.mock('@/lib/utils', () => ({
  generatePingTitle: vi.fn((message: string, maxLength: number) => {
    const trimmed = message.trim();
    if (trimmed.length <= maxLength) return trimmed;
    return trimmed.substring(0, maxLength) + '...';
  }),
}));

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

describe('POST /api/pings', () => {
  let mockSupabaseClient: any;
  let mockAdminClient: any;

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

    // Create a fresh mock admin client for each test
    mockAdminClient = {
      from: vi.fn(),
    };

    // Mock createClient to return our mock
    (createClient as any).mockResolvedValue(mockSupabaseClient);
    // Mock createAdminClient to return our mock
    (createAdminClient as any).mockReturnValue(mockAdminClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper to create a mock NextRequest with JSON body
   */
  const createMockRequest = (body: any): NextRequest => {
    return {
      json: vi.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  /**
   * Test 1: POST /api/pings creates ping and message successfully
   */
  it('should create ping and message successfully with valid data', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockUserProfile = { tenant_id: 'tenant-123' };
    const mockPing = {
      id: 'ping-456',
      tenant_id: 'tenant-123',
      ping_number: 1,
      created_by: 'user-123',
      title: 'Test message content',
      status: 'new',
      priority: 'normal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Mock successful authentication
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock user profile query (via supabase client)
    const mockProfileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockUserProfile,
        error: null,
      }),
    };

    // Mock organization AI config check (no AI configured - fallback path)
    const mockOrgQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ai_config: null }, // No AI configured
        error: null,
      }),
    };

    // Mock category lookup for "Needs Review" (via supabase client)
    const mockCategoryQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'category-needs-review' },
        error: null,
      }),
    };

    // Mock ping insert (via admin client)
    const mockPingInsert = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockPing,
        error: null,
      }),
    };

    // Mock message insert (via admin client)
    const mockMessageInsert = {
      insert: vi.fn().mockResolvedValue({
        data: { id: 'message-789' },
        error: null,
      }),
    };

    // Mock SLA policy lookup (returns no policy - SLA fields will be null)
    const mockSlaQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    // Setup mock return values for supabase client (auth operations + reads)
    mockSupabaseClient.from
      .mockReturnValueOnce(mockProfileQuery) // First call: users table
      .mockReturnValueOnce(mockOrgQuery) // Second call: organizations table (AI config)
      .mockReturnValueOnce(mockCategoryQuery); // Third call: categories table

    // Setup mock return values for admin client (SLA lookup + writes)
    mockAdminClient.from
      .mockReturnValueOnce(mockSlaQuery) // First call: sla_policies table (lookup)
      .mockReturnValueOnce(mockPingInsert) // Second call: pings table insert
      .mockReturnValueOnce(mockMessageInsert); // Third call: ping_messages table insert

    const request = createMockRequest({ message: 'Test message content' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.ping).toBeDefined();
    expect(data.ping.id).toBe('ping-456');
    expect(data.ping.ping_number).toBe(1);
    expect(data.ping.title).toBe('Test message content');

    // Verify the correct database operations were performed
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('organizations');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('categories');
    expect(mockAdminClient.from).toHaveBeenCalledWith('sla_policies');
    expect(mockAdminClient.from).toHaveBeenCalledWith('pings');
    expect(mockAdminClient.from).toHaveBeenCalledWith('ping_messages');

    // Verify ping insert was called with correct data (fallback path includes category_id and SLA fields)
    expect(mockPingInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: 'tenant-123',
        created_by: 'user-123',
        title: 'Test message content',
        status: 'new',
        priority: 'normal',
        category_id: 'category-needs-review',
        sla_policy_id: null,
        sla_first_response_due: null,
        sla_resolution_due: null,
      })
    );

    // Verify message insert was called with correct data
    // Story 4.2.1: Include visibility field
    expect(mockMessageInsert.insert).toHaveBeenCalledWith({
      ping_id: 'ping-456',
      sender_id: 'user-123',
      content: 'Test message content',
      message_type: 'user',
      visibility: 'public',
    });
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

    const request = createMockRequest({ message: 'Test message' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');

    // Verify no database operations were attempted
    expect(mockSupabaseClient.from).not.toHaveBeenCalled();
  });

  /**
   * Test 3: Returns 400 when message is empty
   */
  it('should return 400 when message is empty', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = createMockRequest({ message: '' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation error');
    expect(data.details).toBeDefined();
    expect(data.details[0].message).toContain('empty');

    // Verify no database operations were attempted
    expect(mockSupabaseClient.from).not.toHaveBeenCalled();
  });

  /**
   * Test 4: Returns 400 when message exceeds 5000 chars
   */
  it('should return 400 when message exceeds 5000 characters', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Create a message that's over 5000 characters
    const longMessage = 'a'.repeat(5001);

    const request = createMockRequest({ message: longMessage });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation error');
    expect(data.details).toBeDefined();
    expect(data.details[0].message).toContain('too long');

    // Verify no database operations were attempted
    expect(mockSupabaseClient.from).not.toHaveBeenCalled();
  });

  /**
   * Test 5: Returns 404 when user profile not found
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
        error: { message: 'Not found' },
      }),
    };

    mockSupabaseClient.from.mockReturnValueOnce(mockProfileQuery);

    const request = createMockRequest({ message: 'Test message' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User profile not found');

    // Verify only the profile query was attempted
    expect(mockSupabaseClient.from).toHaveBeenCalledTimes(1);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
  });

  /**
   * Test 6: Title is truncated to 50 characters
   */
  it('should truncate title to 50 characters when message is long', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockUserProfile = { tenant_id: 'tenant-123' };
    const longMessage =
      'This is a very long message that exceeds fifty characters and should be truncated';
    const expectedTitle = longMessage.substring(0, 50) + '...';

    const mockPing = {
      id: 'ping-456',
      tenant_id: 'tenant-123',
      ping_number: 1,
      created_by: 'user-123',
      title: expectedTitle,
      status: 'new',
      priority: 'normal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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

    // Mock organization AI config check (no AI configured - fallback path)
    const mockOrgQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ai_config: null }, // No AI configured
        error: null,
      }),
    };

    // Mock category lookup for "Needs Review"
    const mockCategoryQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'category-needs-review' },
        error: null,
      }),
    };

    const mockPingInsert = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockPing,
        error: null,
      }),
    };

    const mockMessageInsert = {
      insert: vi.fn().mockResolvedValue({
        data: { id: 'message-789' },
        error: null,
      }),
    };

    // Mock SLA policy lookup (returns no policy - SLA fields will be null)
    const mockSlaQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    // Setup mock return values for supabase client (auth operations + reads)
    mockSupabaseClient.from
      .mockReturnValueOnce(mockProfileQuery)
      .mockReturnValueOnce(mockOrgQuery)
      .mockReturnValueOnce(mockCategoryQuery);

    // Setup mock return values for admin client (SLA lookup + writes)
    mockAdminClient.from
      .mockReturnValueOnce(mockSlaQuery)
      .mockReturnValueOnce(mockPingInsert)
      .mockReturnValueOnce(mockMessageInsert);

    const request = createMockRequest({ message: longMessage });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.ping.title).toBe(expectedTitle);
    expect(data.ping.title.length).toBe(53); // 50 chars + '...'

    // Verify insert was called with truncated title (fallback path includes category_id)
    expect(mockPingInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expectedTitle,
        category_id: 'category-needs-review',
      })
    );
  });

  /**
   * Test 7: Ping number auto-increments per tenant
   * Note: This is tested via the database trigger, so we just verify
   * the response includes the ping_number returned by the database
   */
  it('should return ping with auto-incremented ping_number', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockUserProfile = { tenant_id: 'tenant-123' };
    const mockPing = {
      id: 'ping-456',
      tenant_id: 'tenant-123',
      ping_number: 42, // Simulating auto-increment returned by DB
      created_by: 'user-123',
      title: 'Test message',
      status: 'new',
      priority: 'normal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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

    // Mock organization AI config check (no AI configured - fallback path)
    const mockOrgQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ai_config: null }, // No AI configured
        error: null,
      }),
    };

    // Mock category lookup for "Needs Review"
    const mockCategoryQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'category-needs-review' },
        error: null,
      }),
    };

    const mockPingInsert = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockPing,
        error: null,
      }),
    };

    const mockMessageInsert = {
      insert: vi.fn().mockResolvedValue({
        data: { id: 'message-789' },
        error: null,
      }),
    };

    // Mock SLA policy lookup (returns no policy - SLA fields will be null)
    const mockSlaQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    // Setup mock return values for supabase client (auth operations + reads)
    mockSupabaseClient.from
      .mockReturnValueOnce(mockProfileQuery)
      .mockReturnValueOnce(mockOrgQuery)
      .mockReturnValueOnce(mockCategoryQuery);

    // Setup mock return values for admin client (SLA lookup + writes)
    mockAdminClient.from
      .mockReturnValueOnce(mockSlaQuery)
      .mockReturnValueOnce(mockPingInsert)
      .mockReturnValueOnce(mockMessageInsert);

    const request = createMockRequest({ message: 'Test message' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.ping.ping_number).toBe(42);
  });

  /**
   * Test 8: Rollback occurs if message creation fails
   * Note: With AI integration, rollback happens for draft pings, not fallback path
   * This test exercises the AI-enabled path where draft pings are created
   */
  it('should rollback ping creation if message creation fails', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockUserProfile = { tenant_id: 'tenant-123' };
    const mockPing = {
      id: 'ping-456',
      tenant_id: 'tenant-123',
      ping_number: 1,
      created_by: 'user-123',
      title: null, // Draft ping has null title
      status: 'draft',
      priority: 'normal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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

    // Mock organization AI config (AI IS configured - triggers draft path with rollback)
    const mockOrgQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          ai_config: {
            provider: 'openai',
            model: 'gpt-4o-mini',
            encrypted_api_key: 'encrypted-key',
          },
        },
        error: null,
      }),
    };

    const mockPingInsert = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockPing,
        error: null,
      }),
    };

    // Mock message insert to fail
    const mockMessageInsert = {
      insert: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    };

    // Mock rollback delete
    const mockPingDelete = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    mockSupabaseClient.from
      .mockReturnValueOnce(mockProfileQuery) // users query
      .mockReturnValueOnce(mockOrgQuery) // organizations query (AI config)
      .mockReturnValueOnce(mockPingInsert) // pings insert
      .mockReturnValueOnce(mockMessageInsert) // ping_messages insert (fails)
      .mockReturnValueOnce(mockPingDelete); // pings delete (rollback)

    const request = createMockRequest({ message: 'Test message' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create ping message');

    // Verify rollback was attempted
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('pings');
    expect(mockPingDelete.delete).toHaveBeenCalled();
    expect(mockPingDelete.eq).toHaveBeenCalledWith('id', 'ping-456');
  });
});
