/**
 * Integration Tests for POST /api/pings/[pingNumber]/echo/confirm
 * Story 3.3: Auto-Categorization of Pings with Conversational Clarification
 *
 * Tests problem statement confirmation with keyword detection and regeneration logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock Echo conversation service
vi.mock('@/lib/services/echo-conversation-service', () => ({
  generateProblemStatement: vi.fn(),
}));

describe('POST /api/pings/[pingNumber]/echo/confirm', () => {
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

    mockRequest = new NextRequest(
      'http://localhost:4000/api/pings/123/echo/confirm',
      {
        method: 'POST',
      }
    );
  });

  it('should confirm problem statement when user says "yes"', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      ping_messages: [
        {
          id: 'msg-1',
          message_text: "yes, that's correct",
          message_type: 'user',
          created_at: new Date().toISOString(),
        },
      ],
    };

    vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null,
    });

    (mockSupabase as any)._mockSingleResponse({
      data: { tenant_id: mockTenantId },
      error: null,
    });

    (mockSupabase as any)._mockSingleResponse({ data: mockPing, error: null });

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.status).toBe('confirmed');
    expect(result.message).toContain('confirmed');
  });

  it('should detect various confirmation keywords', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';

    const confirmationKeywords = [
      'yes',
      'correct',
      'right',
      'exactly',
      "that's right",
      'yep',
      'yeah',
      'confirmed',
      'accurate',
      'true',
    ];

    for (const keyword of confirmationKeywords) {
      vi.clearAllMocks();

      const mockPing = {
        id: 'ping-id-1',
        ping_number: 123,
        status: 'draft',
        tenant_id: mockTenantId,
        ping_messages: [
          {
            id: 'msg-1',
            message_text: keyword,
            message_type: 'user',
            created_at: new Date().toISOString(),
          },
        ],
      };

      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      });

      (mockSupabase as any)._mockSingleResponse({
        data: { tenant_id: mockTenantId },
        error: null,
      });

      (mockSupabase as any)._mockSingleResponse({
        data: mockPing,
        error: null,
      });

      const params = Promise.resolve({ pingNumber: '123' });
      const response = await POST(mockRequest, { params });
      const result = await response.json();

      expect(result.status).toBe('confirmed');
    }
  });

  it('should regenerate problem statement when user disagrees with "no"', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockEchoUserId = 'echo-789';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      ping_messages: [
        {
          id: 'msg-1',
          message_text: "no, that's not quite right",
          message_type: 'user',
          created_at: new Date().toISOString(),
        },
        {
          id: 'msg-2',
          message_text: 'Previous message',
          message_type: 'agent',
          created_at: new Date(Date.now() - 1000).toISOString(),
        },
      ],
    };

    vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null,
    });

    (mockSupabase as any)._mockSingleResponse({
      data: { tenant_id: mockTenantId },
      error: null,
    });

    (mockSupabase as any)._mockSingleResponse({ data: mockPing, error: null });

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

    vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
      data: 'decrypted-key',
      error: null,
    });

    vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
      data: mockEchoUserId,
      error: null,
    });

    const { generateProblemStatement } = await import(
      '@/lib/services/echo-conversation-service'
    );
    vi.mocked(generateProblemStatement).mockResolvedValue(
      'Updated problem statement based on user corrections.'
    );

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.status).toBe('reconfirming');
    expect(result.updatedProblemStatement).toContain(
      'Updated problem statement'
    );
  });

  it('should detect various disagreement keywords', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockEchoUserId = 'echo-789';

    const disagreementKeywords = [
      'no',
      'not quite',
      'not exactly',
      'wrong',
      'incorrect',
      'actually',
    ];

    for (const keyword of disagreementKeywords) {
      vi.clearAllMocks();

      const mockPing = {
        id: 'ping-id-1',
        ping_number: 123,
        status: 'draft',
        tenant_id: mockTenantId,
        ping_messages: [
          {
            id: 'msg-1',
            message_text: keyword,
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
      (mockSupabase as any)._mockSingleResponse({
        data: mockPing,
        error: null,
      });
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
      vi.mocked(mockSupabase.rpc)
        .mockResolvedValueOnce({ data: 'decrypted-key', error: null }) // decrypt_api_key
        .mockResolvedValueOnce({ data: mockEchoUserId, error: null }); // get_echo_user

      const { generateProblemStatement } = await import(
        '@/lib/services/echo-conversation-service'
      );
      vi.mocked(generateProblemStatement).mockResolvedValue(
        'Updated statement'
      );

      const params = Promise.resolve({ pingNumber: '123' });
      const response = await POST(mockRequest, { params });
      const result = await response.json();

      expect(result.status).toBe('reconfirming');
    }
  });

  it('should regenerate problem statement when user provides long correction (>20 chars)', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockEchoUserId = 'echo-789';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      ping_messages: [
        {
          id: 'msg-1',
          message_text:
            'Well, actually the issue is with the keyboard not the mouse',
          message_type: 'user',
          created_at: new Date().toISOString(),
        },
      ],
    };

    vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null,
    });

    (mockSupabase as any)._mockSingleResponse({
      data: { tenant_id: mockTenantId },
      error: null,
    });

    (mockSupabase as any)._mockSingleResponse({ data: mockPing, error: null });

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

    vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
      data: 'decrypted-key',
      error: null,
    });

    vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
      data: mockEchoUserId,
      error: null,
    });

    const { generateProblemStatement } = await import(
      '@/lib/services/echo-conversation-service'
    );
    vi.mocked(generateProblemStatement).mockResolvedValue(
      'User keyboard is malfunctioning.'
    );

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.status).toBe('reconfirming');
    expect(result.updatedProblemStatement).toContain('keyboard');
  });

  it('should ask for clarification when response is ambiguous', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockEchoUserId = 'echo-789';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      ping_messages: [
        {
          id: 'msg-1',
          message_text: 'hmm',
          message_type: 'user',
          created_at: new Date().toISOString(),
        },
      ],
    };

    vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null,
    });

    (mockSupabase as any)._mockSingleResponse({
      data: { tenant_id: mockTenantId },
      error: null,
    });

    (mockSupabase as any)._mockSingleResponse({ data: mockPing, error: null });

    vi.mocked(mockSupabase.rpc).mockResolvedValue({
      data: mockEchoUserId,
      error: null,
    });

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.status).toBe('awaiting_clarification');
    expect(result.message).toContain('Asking user for clearer confirmation');
  });

  it('should not confirm when message contains both confirmation and disagreement keywords', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockEchoUserId = 'echo-789';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      ping_messages: [
        {
          id: 'msg-1',
          message_text: 'yes, but actually no',
          message_type: 'user',
          created_at: new Date().toISOString(),
        },
      ],
    };

    vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null,
    });

    (mockSupabase as any)._mockSingleResponse({
      data: { tenant_id: mockTenantId },
      error: null,
    });

    (mockSupabase as any)._mockSingleResponse({ data: mockPing, error: null });

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

    vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
      data: 'decrypted-key',
      error: null,
    });

    vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
      data: mockEchoUserId,
      error: null,
    });

    const { generateProblemStatement } = await import(
      '@/lib/services/echo-conversation-service'
    );
    vi.mocked(generateProblemStatement).mockResolvedValue(
      'Clarified statement'
    );

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });
    const result = await response.json();

    // Should NOT confirm when disagreement keyword present
    expect(result.status).not.toBe('confirmed');
    expect(result.status).toBe('reconfirming');
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

    (mockSupabase as any)._mockSingleResponse({
      data: { tenant_id: mockTenantId },
      error: null,
    });

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

    (mockSupabase as any)._mockSingleResponse({
      data: { tenant_id: mockTenantId },
      error: null,
    });

    (mockSupabase as any)._mockSingleResponse({ data: mockPing, error: null });

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toBe('Ping is not in draft status');
  });

  it('should return 400 if no user message found', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      ping_messages: [
        {
          id: 'msg-1',
          message_text: 'Agent message',
          message_type: 'agent',
          created_at: new Date().toISOString(),
        },
      ],
    };

    vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } as any },
      error: null,
    });

    (mockSupabase as any)._mockSingleResponse({
      data: { tenant_id: mockTenantId },
      error: null,
    });

    (mockSupabase as any)._mockSingleResponse({ data: mockPing, error: null });

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toBe('No user message found');
  });
});
