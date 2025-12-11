/**
 * Integration Tests for POST /api/pings/[pingNumber]/echo/finalize
 * Story 3.3: Auto-Categorization of Pings with Conversational Clarification
 *
 * Tests ping finalization with categorization and title generation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

// Helper to create proper PostgrestSingleResponse mock
function mockRpcResponse<T>(data: T, error: null = null) {
  return { data, error, count: null, status: 200, statusText: 'OK' };
}

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock Supabase JS client (for service role admin client)
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

// Mock problem categorization service
vi.mock('@/lib/services/problem-categorization-service', () => ({
  categorizeProblemStatement: vi.fn(),
  generateTitle: vi.fn(),
}));

describe('POST /api/pings/[pingNumber]/echo/finalize', () => {
  let mockSupabase: Partial<SupabaseClient>;
  let mockRequest: NextRequest;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Track query responses for `.single()` calls
    const singleResponses: any[] = [];
    let singleCallIndex = 0;

    // Track query responses for non-single calls (arrays)
    const queryResponses: any[] = [];
    let queryCallIndex = 0;

    // Create a thenable query builder mock
    const createQueryBuilder = () => {
      const builder: any = {
        then: (resolve: any) => {
          const response = queryResponses[queryCallIndex++] || {
            data: null,
            error: null,
          };
          return resolve(response);
        },
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
      _mockQueryResponse: (response: any) => {
        queryResponses.push(response);
      },
    } as any;

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    // Mock @supabase/supabase-js createClient (for admin/service role client)
    const supabaseJs = await import('@supabase/supabase-js');
    vi.mocked(supabaseJs.createClient).mockReturnValue(mockSupabase as any);

    mockRequest = new NextRequest(
      'http://localhost:4000/api/pings/123/echo/finalize',
      {
        method: 'POST',
      }
    );
  });

  it('should successfully finalize ping with categorization and title generation', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockEchoUserId = 'echo-789';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      ai_summary:
        'User laptop will not power on after power outage this morning.',
    };
    const mockCategories = [
      {
        id: 'cat-1',
        name: 'Hardware',
        description: 'Hardware issues',
        color: '#ef4444',
        icon: 'HardDrive',
      },
      {
        id: 'cat-2',
        name: 'Software',
        description: 'Software issues',
        color: '#3b82f6',
        icon: 'Code',
      },
    ];

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

    vi.mocked(mockSupabase.rpc!).mockResolvedValueOnce(
      mockRpcResponse('decrypted-key')
    );

    // Mock categories query
    (mockSupabase as any)._mockQueryResponse({
      data: mockCategories,
      error: null,
    });

    vi.mocked(mockSupabase.rpc!).mockResolvedValueOnce(
      mockRpcResponse(mockEchoUserId)
    );

    const { categorizeProblemStatement, generateTitle } = await import(
      '@/lib/services/problem-categorization-service'
    );
    vi.mocked(categorizeProblemStatement).mockResolvedValue({
      category: 'Hardware',
      confidence: 0.92,
      reasoning: 'Laptop power issue indicates hardware problem',
    });
    vi.mocked(generateTitle).mockResolvedValue(
      "Laptop won't power on - power outage"
    );

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.status).toBe('finalized');
    expect(result.ping_number).toBe(123);
    expect(result.title).toBe("Laptop won't power on - power outage");
    expect(result.category).toBe('Hardware');
    expect(result.confidence).toBe(0.92);
    expect(result.problemStatement).toContain('laptop will not power on');
  });

  it('should categorize as Software when problem is application-related', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      ai_summary:
        'User unable to log into email. Outlook shows credentials incorrect error.',
    };
    const mockCategories = [
      {
        id: 'cat-1',
        name: 'Hardware',
        description: 'Hardware issues',
        color: '#ef4444',
        icon: 'HardDrive',
      },
      {
        id: 'cat-2',
        name: 'Software',
        description: 'Software issues',
        color: '#3b82f6',
        icon: 'Code',
      },
    ];

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

    vi.mocked(mockSupabase.rpc!).mockResolvedValueOnce(
      mockRpcResponse('decrypted-key')
    );

    (mockSupabase as any)._mockQueryResponse({
      data: mockCategories,
      error: null,
    });

    vi.mocked(mockSupabase.rpc!).mockResolvedValueOnce(
      mockRpcResponse('echo-123')
    );

    const { categorizeProblemStatement, generateTitle } = await import(
      '@/lib/services/problem-categorization-service'
    );
    vi.mocked(categorizeProblemStatement).mockResolvedValue({
      category: 'Software',
      confidence: 0.88,
      reasoning: 'Email login issue indicates software problem',
    });
    vi.mocked(generateTitle).mockResolvedValue(
      'Email login failure - credentials error'
    );

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.category).toBe('Software');
    expect(result.title).toContain('Email login');
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
      ai_summary: 'Problem statement',
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

  it('should return 400 if problem statement is missing', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      ai_summary: null, // No problem statement
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
    expect(result.error).toBe('Problem statement not generated');
  });

  it('should return 400 if AI configuration is missing', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      ai_summary: 'Problem statement',
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
      data: { ai_config: null },
      error: null,
    });

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toBe('AI configuration not found');
  });

  it('should return 400 if no active categories found', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      ai_summary: 'Problem statement',
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

    vi.mocked(mockSupabase.rpc!).mockResolvedValueOnce(
      mockRpcResponse('decrypted-key')
    );

    // No categories available
    (mockSupabase as any)._mockQueryResponse({
      data: [],
      error: null,
    });

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toBe('No active categories found');
  });

  it('should return 500 if matched category not found after categorization', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      ai_summary: 'Problem statement',
    };
    const mockCategories = [
      {
        id: 'cat-1',
        name: 'Hardware',
        description: 'Hardware issues',
        color: '#ef4444',
        icon: 'HardDrive',
      },
    ];

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

    vi.mocked(mockSupabase.rpc!).mockResolvedValueOnce(
      mockRpcResponse('decrypted-key')
    );

    (mockSupabase as any)._mockQueryResponse({
      data: mockCategories,
      error: null,
    });

    const { categorizeProblemStatement, generateTitle } = await import(
      '@/lib/services/problem-categorization-service'
    );
    // AI returns category that doesn't exist in available categories
    vi.mocked(categorizeProblemStatement).mockResolvedValue({
      category: 'NonExistentCategory',
      confidence: 0.8,
      reasoning: 'Unknown category',
    });
    vi.mocked(generateTitle).mockResolvedValue('Title');

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });

    expect(response.status).toBe(500);
    const result = await response.json();
    expect(result.error).toBe('Category not found');
  });

  it('should display confidence percentage in system message', async () => {
    const mockUserId = 'user-123';
    const mockTenantId = 'tenant-456';
    const mockPing = {
      id: 'ping-id-1',
      ping_number: 123,
      status: 'draft',
      tenant_id: mockTenantId,
      ai_summary: 'Problem statement',
    };
    const mockCategories = [
      {
        id: 'cat-1',
        name: 'Hardware',
        description: 'Hardware issues',
        color: '#ef4444',
        icon: 'HardDrive',
      },
    ];

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

    vi.mocked(mockSupabase.rpc!).mockResolvedValueOnce(
      mockRpcResponse('decrypted-key')
    );

    (mockSupabase as any)._mockQueryResponse({
      data: mockCategories,
      error: null,
    });

    vi.mocked(mockSupabase.rpc!).mockResolvedValueOnce(
      mockRpcResponse('echo-123')
    );

    const { categorizeProblemStatement, generateTitle } = await import(
      '@/lib/services/problem-categorization-service'
    );
    vi.mocked(categorizeProblemStatement).mockResolvedValue({
      category: 'Hardware',
      confidence: 0.756,
      reasoning: 'Hardware issue',
    });
    vi.mocked(generateTitle).mockResolvedValue('Title');

    const params = Promise.resolve({ pingNumber: '123' });
    const response = await POST(mockRequest, { params });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.confidence).toBe(0.756);
  });
});
