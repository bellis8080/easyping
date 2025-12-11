/**
 * Integration Tests for POST /api/pings/[pingNumber]/echo/continue
 * Story 3.3: Auto-Categorization of Pings with Conversational Clarification
 *
 * Tests Echo conversation continuation with problem understanding and escalation logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

// Helper to create proper PostgrestSingleResponse mock
function mockRpcResponse<T>(data: T, error: null = null) {
  return { data, error, count: null, status: 200, statusText: 'OK' };
}
// Note: mockRpcErrorResponse removed - not needed in this file

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock Supabase JS client (for service role admin client)
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

// Mock Echo conversation service
vi.mock('@/lib/services/echo-conversation-service', () => ({
  analyzeConversation: vi.fn(),
  determineWhenToEscalate: vi.fn(),
  generateProblemStatement: vi.fn(),
}));

describe('POST /api/pings/[pingNumber]/echo/continue', () => {
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
        then: (resolve: any) => resolve({ data: null, error: null }),
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

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      } as any,
      from: vi.fn(() => createQueryBuilder()) as any,
      rpc: vi.fn() as any,
      _mockSingleResponse: (response: any) => {
        singleResponses.push(response);
      },
    } as any;

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    // Mock @supabase/supabase-js createClient (for admin/service role client)
    const supabaseJs = await import('@supabase/supabase-js');
    vi.mocked(supabaseJs.createClient).mockReturnValue(mockSupabase as any);

    mockRequest = new NextRequest(
      'http://localhost:4000/api/pings/123/echo/continue',
      {
        method: 'POST',
      }
    );
  });

  it('should ask another question when problem not yet understood', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockEchoUserId = 'echo-789';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      clarification_count: 2,
      ping_messages: [
        {
          id: 'msg-1',
          message_text: 'My computer is broken',
          message_type: 'user',
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          id: 'msg-2',
          message_text: 'What happens when you try to use it?',
          message_type: 'agent',
          created_at: '2024-01-01T10:01:00Z',
        },
        {
          id: 'msg-3',
          message_text: "It won't turn on",
          message_type: 'user',
          created_at: '2024-01-01T10:02:00Z',
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
      .mockResolvedValueOnce(mockRpcResponse('decrypted-key')) // decrypt_api_key
      .mockResolvedValueOnce(mockRpcResponse(mockEchoUserId)); // get_echo_user

    const { determineWhenToEscalate, analyzeConversation } = await import(
      '@/lib/services/echo-conversation-service'
    );
    vi.mocked(determineWhenToEscalate).mockResolvedValue(false);
    vi.mocked(analyzeConversation).mockResolvedValue({
      problemUnderstood: false,
      nextQuestion: 'Did you check if the power cable is plugged in?',
      confidence: 0.6,
    });

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.status).toBe('discovering');
    expect(result.question).toBe(
      'Did you check if the power cable is plugged in?'
    );
    expect(result.clarificationCount).toBe(3);
  });

  it('should move to confirmation phase when problem is understood', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockEchoUserId = 'echo-789';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      clarification_count: 3,
      ping_messages: [
        {
          id: 'msg-1',
          message_text: "My laptop won't turn on",
          message_type: 'user',
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          id: 'msg-2',
          message_text: 'When did this start?',
          message_type: 'agent',
          created_at: '2024-01-01T10:01:00Z',
        },
        {
          id: 'msg-3',
          message_text: 'This morning after a power outage',
          message_type: 'user',
          created_at: '2024-01-01T10:02:00Z',
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
      .mockResolvedValueOnce(mockRpcResponse('decrypted-key')) // decrypt_api_key
      .mockResolvedValueOnce(mockRpcResponse(mockEchoUserId)); // get_echo_user

    const { determineWhenToEscalate, analyzeConversation } = await import(
      '@/lib/services/echo-conversation-service'
    );
    vi.mocked(determineWhenToEscalate).mockResolvedValue(false);
    vi.mocked(analyzeConversation).mockResolvedValue({
      problemUnderstood: true,
      problemStatement:
        'User laptop will not power on after power outage this morning. Power button is unresponsive.',
      confidence: 0.85,
    });

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.status).toBe('confirming');
    expect(result.problemStatement).toContain('laptop will not power on');
    expect(result.confidence).toBe(0.85);
  });

  it('should escalate when hard limit reached (12 questions)', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      clarification_count: 12,
      ping_messages: Array(12)
        .fill(null)
        .map((_, i) => ({
          id: `msg-${i}`,
          content: `Message ${i}`,
          message_type: i % 2 === 0 ? 'user' : 'agent',
          created_at: new Date(Date.now() + i * 1000).toISOString(),
        })),
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
      .mockResolvedValueOnce(mockRpcResponse('decrypted-key')) // decrypt_api_key
      .mockResolvedValueOnce(mockRpcResponse('echo-123')); // get_echo_user

    // Mock analyzeConversation to return problem NOT understood (so escalation path is checked)
    const {
      analyzeConversation,
      determineWhenToEscalate,
      generateProblemStatement,
    } = await import('@/lib/services/echo-conversation-service');
    vi.mocked(analyzeConversation).mockResolvedValue({
      problemUnderstood: false,
      nextQuestion: 'What else can you tell me?',
      confidence: 0.4,
    });
    vi.mocked(determineWhenToEscalate).mockResolvedValue(true);
    vi.mocked(generateProblemStatement).mockResolvedValue(
      'User requires assistance with complex issue after extended clarification.'
    );

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });
    const result = await response.json();

    expect(response.status).toBe(200);
    // Route returns 'confirming' status even for escalation (user must confirm before escalation)
    expect(result.status).toBe('confirming');
    expect(result.problemStatement).toContain('requires assistance');
    expect(result.note).toContain('Escalation pending user confirmation');
  });

  it('should escalate when user explicitly requests human help', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      clarification_count: 5,
      ping_messages: [
        {
          id: 'msg-1',
          content: 'I want to talk to a person',
          message_type: 'user',
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
      .mockResolvedValueOnce(mockRpcResponse('decrypted-key')) // decrypt_api_key
      .mockResolvedValueOnce(mockRpcResponse('echo-123')); // get_echo_user

    // Mock analyzeConversation to return problem NOT understood (so escalation path is checked)
    const {
      analyzeConversation,
      determineWhenToEscalate,
      generateProblemStatement,
    } = await import('@/lib/services/echo-conversation-service');
    vi.mocked(analyzeConversation).mockResolvedValue({
      problemUnderstood: false,
      nextQuestion: 'What can I help with?',
      confidence: 0.3,
    });
    vi.mocked(determineWhenToEscalate).mockResolvedValue(true);
    vi.mocked(generateProblemStatement).mockResolvedValue(
      'User requested human assistance.'
    );

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });
    const result = await response.json();

    expect(response.status).toBe(200);
    // Route returns 'confirming' status even for escalation (user must confirm before escalation)
    expect(result.status).toBe('confirming');
    expect(result.note).toContain('Escalation pending user confirmation');
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

  it('should use fallback question if AI returns no next question', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockEchoUserId = 'echo-789';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      clarification_count: 1,
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
      .mockResolvedValueOnce(mockRpcResponse('decrypted-key')) // decrypt_api_key
      .mockResolvedValueOnce(mockRpcResponse(mockEchoUserId)); // get_echo_user

    const { determineWhenToEscalate, analyzeConversation } = await import(
      '@/lib/services/echo-conversation-service'
    );
    vi.mocked(determineWhenToEscalate).mockResolvedValue(false);
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
      'Can you provide more details about what you are experiencing?'
    );
  });
});
