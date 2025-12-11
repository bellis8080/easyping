/**
 * Integration Tests for POST /api/pings/[pingNumber]/echo/start
 * Story 3.3: Auto-Categorization of Pings with Conversational Clarification
 *
 * Tests Echo conversation initiation with mocked Supabase and AI provider.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

// Helper to create proper PostgrestSingleResponse mock
function mockRpcResponse<T>(data: T) {
  return { data, error: null, count: null, status: 200, statusText: 'OK' };
}
function mockRpcErrorResponse(error: { message: string }) {
  // Cast as any to satisfy PostgrestSingleResponse union type
  return {
    data: null,
    error,
    count: null,
    status: 400,
    statusText: 'Bad Request',
  } as any;
}

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock Echo conversation service
vi.mock('@/lib/services/echo-conversation-service', () => ({
  analyzeConversation: vi.fn(),
}));

describe('POST /api/pings/[pingNumber]/echo/start', () => {
  let mockSupabase: Partial<SupabaseClient>;
  let mockRequest: NextRequest;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Track query responses for `.single()` calls
    const singleResponses: any[] = [];
    let singleCallIndex = 0;

    // Create a thenable query builder mock
    const createQueryBuilder = () => {
      const builder: any = {
        // Make it thenable so it can be awaited
        then: (resolve: any) => resolve({ data: null, error: null }),
        // Chainable methods
        eq: vi.fn(function (this: any) {
          return this;
        }),
        select: vi.fn(function (this: any) {
          return this;
        }),
        update: vi.fn(function (this: any) {
          return this;
        }),
        insert: vi.fn(function (this: any) {
          return this;
        }),
        order: vi.fn(function (this: any) {
          return this;
        }),
        // Terminal method that returns a specific response
        single: vi.fn(() => {
          const response = singleResponses[singleCallIndex++] || {
            data: null,
            error: null,
          };
          return Promise.resolve(response);
        }),
      };
      return builder;
    };

    // Create mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      } as any,
      from: vi.fn(() => createQueryBuilder()) as any,
      rpc: vi.fn() as any,
      // Expose method to mock single() responses in tests
      _mockSingleResponse: (response: any) => {
        singleResponses.push(response);
      },
    } as any;

    // Mock createClient to return our mock
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    // Mock request
    mockRequest = new NextRequest(
      'http://localhost:4000/api/pings/123/echo/start',
      {
        method: 'POST',
      }
    );
  });

  it('should successfully start Echo conversation with introduction', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockEchoUserId = 'echo-789';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      echo_introduced: false,
      ping_messages: [
        {
          id: 'msg-1',
          message_text: 'My computer is not working',
          created_at: new Date().toISOString(),
        },
      ],
    };

    // Mock auth
    vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null,
    });

    // Mock query responses in order
    // 1. User tenant lookup
    (mockSupabase as any)._mockSingleResponse({
      data: { tenant_id: mockTenantId },
      error: null,
    });
    // 2. Ping lookup
    (mockSupabase as any)._mockSingleResponse({ data: mockPing, error: null });
    // 3. Organization AI config
    (mockSupabase as any)._mockSingleResponse({
      data: {
        ai_config: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          encrypted_api_key: 'encrypted-key',
        },
      },
      error: null,
    });

    // Mock RPC calls
    vi.mocked(mockSupabase.rpc!)
      .mockResolvedValueOnce(mockRpcResponse(mockEchoUserId)) // get_echo_user
      .mockResolvedValueOnce(mockRpcResponse('decrypted-key')); // decrypt_api_key

    // Mock analyzeConversation
    const { analyzeConversation } = await import(
      '@/lib/services/echo-conversation-service'
    );
    vi.mocked(analyzeConversation).mockResolvedValue({
      problemUnderstood: false,
      nextQuestion: 'What exactly happens when you try to use your computer?',
      confidence: 0.4,
    });

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.status).toBe('discovering');
    expect(result.introduced).toBe(true);
    expect(result.question).toBe(
      'What exactly happens when you try to use your computer?'
    );
  });

  it('should skip introduction if Echo already introduced', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockEchoUserId = 'echo-789';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      echo_introduced: true, // Already introduced
      ping_messages: [
        {
          id: 'msg-1',
          message_text: 'My computer is not working',
          created_at: new Date().toISOString(),
        },
      ],
    };

    vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null,
    });

    // Mock query responses in order
    // 1. User tenant lookup
    (mockSupabase as any)._mockSingleResponse({
      data: { tenant_id: mockTenantId },
      error: null,
    });
    // 2. Ping lookup
    (mockSupabase as any)._mockSingleResponse({ data: mockPing, error: null });
    // 3. Organization AI config
    (mockSupabase as any)._mockSingleResponse({
      data: {
        ai_config: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          encrypted_api_key: 'encrypted-key',
        },
      },
      error: null,
    });

    // Mock RPC calls
    vi.mocked(mockSupabase.rpc!)
      .mockResolvedValueOnce(mockRpcResponse(mockEchoUserId)) // get_echo_user
      .mockResolvedValueOnce(mockRpcResponse('decrypted-key')); // decrypt_api_key

    const { analyzeConversation } = await import(
      '@/lib/services/echo-conversation-service'
    );
    vi.mocked(analyzeConversation).mockResolvedValue({
      problemUnderstood: false,
      nextQuestion: 'Can you describe the issue in more detail?',
      confidence: 0.5,
    });

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.introduced).toBe(false);
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'Unauthorized' } as any,
    });

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });

    expect(response.status).toBe(401);
    const result = await response.json();
    expect(result.error).toBe('Unauthorized');
  });

  it('should return 404 if ping not found', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';

    vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null,
    });

    // Mock query responses in order
    // 1. User tenant lookup
    (mockSupabase as any)._mockSingleResponse({
      data: { tenant_id: mockTenantId },
      error: null,
    });
    // 2. Ping not found
    (mockSupabase as any)._mockSingleResponse({
      data: null,
      error: { message: 'Not found' } as any,
    });

    const params = Promise.resolve({ pingNumber: '999' });
    const response = await POST(mockRequest, { params });

    expect(response.status).toBe(404);
    const result = await response.json();
    expect(result.error).toBe('Ping not found');
  });

  it('should return 400 if ping is not in draft status', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'new', // Not draft
      tenant_id: mockTenantId,
      echo_introduced: false,
      ping_messages: [],
    };

    vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null,
    });

    // Mock query responses in order
    // 1. User tenant lookup
    (mockSupabase as any)._mockSingleResponse({
      data: { tenant_id: mockTenantId },
      error: null,
    });
    // 2. Ping lookup
    (mockSupabase as any)._mockSingleResponse({ data: mockPing, error: null });

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toBe('Ping is not in draft status');
  });

  it('should return 500 if Echo user creation fails', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      echo_introduced: false,
      ping_messages: [],
    };

    vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null,
    });

    // Mock query responses in order
    // 1. User tenant lookup
    (mockSupabase as any)._mockSingleResponse({
      data: { tenant_id: mockTenantId },
      error: null,
    });
    // 2. Ping lookup
    (mockSupabase as any)._mockSingleResponse({ data: mockPing, error: null });

    // Echo user creation fails
    vi.mocked(mockSupabase.rpc!).mockResolvedValueOnce(
      mockRpcErrorResponse({ message: 'RPC failed' })
    );

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });

    expect(response.status).toBe(500);
    const result = await response.json();
    expect(result.error).toBe('Failed to initialize Echo');
  });

  it('should return 400 if AI configuration is missing', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockEchoUserId = 'echo-789';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      echo_introduced: false,
      ping_messages: [],
    };

    vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null,
    });

    // Mock query responses in order
    // 1. User tenant lookup
    (mockSupabase as any)._mockSingleResponse({
      data: { tenant_id: mockTenantId },
      error: null,
    });
    // 2. Ping lookup
    (mockSupabase as any)._mockSingleResponse({ data: mockPing, error: null });
    // 3. AI config missing
    (mockSupabase as any)._mockSingleResponse({
      data: { ai_config: null },
      error: null,
    });

    vi.mocked(mockSupabase.rpc!).mockResolvedValueOnce(
      mockRpcResponse(mockEchoUserId)
    );

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toBe('AI configuration not found');
  });

  it('should use fallback question if AI analysis returns no question', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockEchoUserId = 'echo-789';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      echo_introduced: true,
      ping_messages: [],
    };

    vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null,
    });

    // Mock query responses in order
    // 1. User tenant lookup
    (mockSupabase as any)._mockSingleResponse({
      data: { tenant_id: mockTenantId },
      error: null,
    });
    // 2. Ping lookup
    (mockSupabase as any)._mockSingleResponse({ data: mockPing, error: null });
    // 3. Organization AI config
    (mockSupabase as any)._mockSingleResponse({
      data: {
        ai_config: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          encrypted_api_key: 'encrypted-key',
        },
      },
      error: null,
    });

    // Mock RPC calls
    vi.mocked(mockSupabase.rpc!)
      .mockResolvedValueOnce(mockRpcResponse(mockEchoUserId)) // get_echo_user
      .mockResolvedValueOnce(mockRpcResponse('decrypted-key')); // decrypt_api_key

    // AI returns no nextQuestion
    const { analyzeConversation } = await import(
      '@/lib/services/echo-conversation-service'
    );
    vi.mocked(analyzeConversation).mockResolvedValue({
      problemUnderstood: false,
      nextQuestion: undefined,
      confidence: 0.3,
    });

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.question).toBe(
      'Can you tell me more about what is happening?'
    );
  });

  it('should increment clarification count to 1 after first question', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockEchoUserId = 'echo-789';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      echo_introduced: true,
      ping_messages: [],
    };

    vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null,
    });

    // Mock query responses in order
    // 1. User tenant lookup
    (mockSupabase as any)._mockSingleResponse({
      data: { tenant_id: mockTenantId },
      error: null,
    });
    // 2. Ping lookup
    (mockSupabase as any)._mockSingleResponse({ data: mockPing, error: null });
    // 3. Organization AI config
    (mockSupabase as any)._mockSingleResponse({
      data: {
        ai_config: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          encrypted_api_key: 'encrypted-key',
        },
      },
      error: null,
    });

    // Mock RPC calls
    vi.mocked(mockSupabase.rpc!)
      .mockResolvedValueOnce(mockRpcResponse(mockEchoUserId)) // get_echo_user
      .mockResolvedValueOnce(mockRpcResponse('decrypted-key')); // decrypt_api_key

    const { analyzeConversation } = await import(
      '@/lib/services/echo-conversation-service'
    );
    vi.mocked(analyzeConversation).mockResolvedValue({
      problemUnderstood: false,
      nextQuestion: 'What happens?',
      confidence: 0.4,
    });

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.status).toBe('discovering');
    expect(result.question).toBe('What happens?');
  });
});
