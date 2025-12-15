/**
 * Echo Suggest API Route Tests
 * Story 3.7: Echo - AI Response Suggestions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/echo-response-service', () => ({
  generateResponseSuggestion: vi.fn(),
  generateAlternativeResponse: vi.fn(),
}));

describe('POST /api/pings/[pingNumber]/echo/suggest', () => {
  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  };

  const mockAdminClient = {
    from: vi.fn(),
    rpc: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup default mocks
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as any);

    const supabaseJs = await import('@supabase/supabase-js');
    vi.mocked(supabaseJs.createClient).mockReturnValue(mockAdminClient as any);
  });

  const createRequest = (body: Record<string, unknown> = {}) => {
    return new NextRequest('http://localhost/api/pings/42/echo/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  it('should return 401 if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const response = await POST(createRequest(), {
      params: Promise.resolve({ pingNumber: '42' }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if user not found in database', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const response = await POST(createRequest(), {
      params: Promise.resolve({ pingNumber: '42' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });

  it('should return 403 if user is not agent/manager/owner', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'org-123', role: 'user' },
            error: null,
          }),
        }),
      }),
    });

    const response = await POST(createRequest(), {
      params: Promise.resolve({ pingNumber: '42' }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Only agents can get response suggestions');
  });

  it('should return 404 if ping not found', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'org-123', role: 'agent' },
            error: null,
          }),
        }),
      }),
    });

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    const response = await POST(createRequest(), {
      params: Promise.resolve({ pingNumber: '42' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Ping not found');
  });

  it('should return 400 for draft pings', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'org-123', role: 'agent' },
            error: null,
          }),
        }),
      }),
    });

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'ping-123',
                ping_number: 42,
                status: 'draft',
                ping_messages: [],
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const response = await POST(createRequest(), {
      params: Promise.resolve({ pingNumber: '42' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Cannot suggest responses for draft pings');
  });

  it('should return 400 if AI config not found', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'org-123', role: 'agent' },
            error: null,
          }),
        }),
      }),
    });

    // First call for ping
    const pingCall = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'ping-123',
                ping_number: 42,
                status: 'in_progress',
                priority: 'medium',
                ping_messages: [
                  {
                    id: 'msg-1',
                    content: 'Test message',
                    message_type: 'user',
                    created_at: new Date().toISOString(),
                  },
                ],
                ping_categories: { name: 'General' },
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    // Second call for org data
    const orgCall = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { name: 'Test Org', ai_config: null },
            error: null,
          }),
        }),
      }),
    };

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === 'pings') return pingCall;
      if (table === 'organizations') return orgCall;
      return pingCall;
    });

    const response = await POST(createRequest(), {
      params: Promise.resolve({ pingNumber: '42' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('AI configuration not found');
  });

  it('should return suggestion on success', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'org-123', role: 'agent' },
            error: null,
          }),
        }),
      }),
    });

    const pingCall = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'ping-123',
                ping_number: 42,
                status: 'in_progress',
                priority: 'medium',
                summary: 'Test summary',
                ping_messages: [
                  {
                    id: 'msg-1',
                    content: 'Test message',
                    message_type: 'user',
                    sender_id: 'user-456',
                    created_at: new Date().toISOString(),
                    edited_at: null,
                  },
                ],
                ping_categories: { name: 'General' },
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    const orgCall = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              name: 'Test Org',
              ai_config: {
                provider: 'openai',
                model: 'gpt-4o-mini',
                encrypted_api_key: 'encrypted-key',
              },
            },
            error: null,
          }),
        }),
      }),
    };

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === 'pings') return pingCall;
      if (table === 'organizations') return orgCall;
      return pingCall;
    });

    mockAdminClient.rpc.mockResolvedValue({
      data: 'decrypted-api-key',
      error: null,
    });

    // Mock the response service
    const { generateResponseSuggestion } = await import(
      '@/lib/services/echo-response-service'
    );
    vi.mocked(generateResponseSuggestion).mockResolvedValue({
      suggestion: 'Here is a suggested response for the user.',
      generatedAt: new Date(),
    });

    const response = await POST(createRequest(), {
      params: Promise.resolve({ pingNumber: '42' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.suggestion).toBe('Here is a suggested response for the user.');
    expect(data.generatedAt).toBeDefined();
  });

  it('should use alternative response when requested', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'org-123', role: 'agent' },
            error: null,
          }),
        }),
      }),
    });

    const pingCall = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'ping-123',
                ping_number: 42,
                status: 'in_progress',
                priority: 'medium',
                ping_messages: [
                  {
                    id: 'msg-1',
                    content: 'Test',
                    message_type: 'user',
                    sender_id: 'user-456',
                    created_at: new Date().toISOString(),
                  },
                ],
                ping_categories: null,
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    const orgCall = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              name: 'Test Org',
              ai_config: {
                provider: 'openai',
                model: 'gpt-4o-mini',
                encrypted_api_key: 'encrypted-key',
              },
            },
            error: null,
          }),
        }),
      }),
    };

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === 'pings') return pingCall;
      if (table === 'organizations') return orgCall;
      return pingCall;
    });

    mockAdminClient.rpc.mockResolvedValue({
      data: 'decrypted-api-key',
      error: null,
    });

    const { generateAlternativeResponse } = await import(
      '@/lib/services/echo-response-service'
    );
    vi.mocked(generateAlternativeResponse).mockResolvedValue({
      suggestion: 'Alternative response',
      generatedAt: new Date(),
    });

    const response = await POST(createRequest({ alternative: true }), {
      params: Promise.resolve({ pingNumber: '42' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.suggestion).toBe('Alternative response');
    expect(generateAlternativeResponse).toHaveBeenCalled();
  });
});
