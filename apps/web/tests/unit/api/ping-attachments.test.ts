/**
 * Unit tests for POST /api/pings/[pingNumber]/messages endpoint with attachments
 *
 * Test coverage per QA requirements:
 * 1. POST /api/pings/[pingNumber]/messages creates message with attachments
 * 2. Returns 400 when file size exceeds 10MB
 * 3. Returns 400 when more than 5 attachments provided
 * 4. Returns 401 when unauthenticated
 * 5. Inserts attachments into ping_attachments table
 * 6. Validates attachment metadata (file_name, file_path, mime_type, file_size)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/pings/[pingNumber]/messages/route';
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

describe('POST /api/pings/[pingNumber]/messages with attachments', () => {
  let mockSupabaseClient: any;
  let mockAdminClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock regular Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    };

    // Mock admin Supabase client
    mockAdminClient = {
      from: vi.fn(),
    };

    (createClient as any).mockResolvedValue(mockSupabaseClient);
    (createAdminClient as any).mockReturnValue(mockAdminClient);
  });

  it('should create message with attachments successfully', async () => {
    const mockUser = { id: 'user-123' };
    const mockPing = {
      id: 'ping-123',
      ping_number: 42,
      tenant_id: 'tenant-123',
      created_by: 'user-123',
    };
    const mockMessage = {
      id: 'message-123',
      ping_id: 'ping-123',
      sender_id: 'user-123',
      content: 'Message with attachments',
      message_type: 'user',
      created_at: '2025-01-12T10:00:00Z',
    };
    const mockSender = {
      id: 'user-123',
      full_name: 'Test User',
      avatar_url: null,
      role: 'end_user',
    };
    const mockAttachments = [
      {
        id: 'attachment-1',
        ping_message_id: 'message-123',
        file_name: 'image.png',
        file_path: 'user-123/image.png',
        file_size: 1048576,
        mime_type: 'image/png',
        storage_bucket: 'ping-attachments',
        uploaded_by: 'user-123',
        created_at: '2025-01-12T10:00:00Z',
      },
    ];

    // Mock auth
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock ping fetch
    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockPing,
        error: null,
      }),
    });

    // Mock message creation
    mockSupabaseClient.from.mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockMessage,
        error: null,
      }),
    });

    // Mock admin client for attachments
    mockAdminClient.from.mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: mockAttachments,
        error: null,
      }),
    });

    // Mock sender fetch
    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockSender,
        error: null,
      }),
    });

    // Mock ping update
    mockSupabaseClient.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    });

    const request = new NextRequest(
      'http://localhost:4000/api/pings/42/messages',
      {
        method: 'POST',
        body: JSON.stringify({
          content: 'Message with attachments',
          attachments: [
            {
              file_name: 'image.png',
              file_path: 'user-123/image.png',
              file_size: 1048576,
              mime_type: 'image/png',
            },
          ],
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ pingNumber: '42' }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.message).toBeDefined();
    expect(data.message.id).toBe('message-123');
  });

  it('should return 400 when file size exceeds 10MB', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const request = new NextRequest(
      'http://localhost:4000/api/pings/42/messages',
      {
        method: 'POST',
        body: JSON.stringify({
          content: 'Message',
          attachments: [
            {
              file_name: 'large.pdf',
              file_path: 'user-123/large.pdf',
              file_size: 10485761, // 10MB + 1 byte
              mime_type: 'application/pdf',
            },
          ],
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ pingNumber: '42' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain(
      'Number must be less than or equal to 10485760'
    );
  });

  it('should return 400 when more than 5 attachments provided', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const attachments = Array.from({ length: 6 }, (_, i) => ({
      file_name: `file${i}.png`,
      file_path: `user-123/file${i}.png`,
      file_size: 1000,
      mime_type: 'image/png',
    }));

    const request = new NextRequest(
      'http://localhost:4000/api/pings/42/messages',
      {
        method: 'POST',
        body: JSON.stringify({
          content: 'Message',
          attachments,
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ pingNumber: '42' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Maximum 5 attachments per message');
  });

  it('should return 401 when unauthenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    });

    const request = new NextRequest(
      'http://localhost:4000/api/pings/42/messages',
      {
        method: 'POST',
        body: JSON.stringify({
          content: 'Message',
          attachments: [],
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ pingNumber: '42' }),
    });

    expect(response.status).toBe(401);
  });

  it('should insert attachments into ping_attachments table via admin client', async () => {
    const mockUser = { id: 'user-123' };
    const mockPing = {
      id: 'ping-123',
      ping_number: 42,
      tenant_id: 'tenant-123',
      created_by: 'user-123',
    };
    const mockMessage = {
      id: 'message-123',
      ping_id: 'ping-123',
      sender_id: 'user-123',
      content: 'Message',
      message_type: 'user',
      created_at: '2025-01-12T10:00:00Z',
    };
    const mockSender = {
      id: 'user-123',
      full_name: 'Test User',
      avatar_url: null,
      role: 'end_user',
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockPing,
        error: null,
      }),
    });

    mockSupabaseClient.from.mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockMessage,
        error: null,
      }),
    });

    const mockInsertAttachments = vi.fn().mockReturnThis();
    mockAdminClient.from.mockReturnValueOnce({
      insert: mockInsertAttachments,
      select: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    });

    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockSender,
        error: null,
      }),
    });

    mockSupabaseClient.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    });

    const request = new NextRequest(
      'http://localhost:4000/api/pings/42/messages',
      {
        method: 'POST',
        body: JSON.stringify({
          content: 'Message',
          attachments: [
            {
              file_name: 'test.pdf',
              file_path: 'user-123/test.pdf',
              file_size: 5000,
              mime_type: 'application/pdf',
            },
          ],
        }),
      }
    );

    await POST(request, {
      params: Promise.resolve({ pingNumber: '42' }),
    });

    // Verify admin client was used to insert attachments
    expect(createAdminClient).toHaveBeenCalled();
    expect(mockInsertAttachments).toHaveBeenCalledWith([
      {
        ping_message_id: 'message-123',
        file_name: 'test.pdf',
        file_path: 'user-123/test.pdf',
        file_size: 5000,
        mime_type: 'application/pdf',
        storage_bucket: 'ping-attachments',
        uploaded_by: 'user-123',
      },
    ]);
  });

  it('should validate attachment metadata', async () => {
    const mockUser = { id: 'user-123' };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Missing file_name
    const request = new NextRequest(
      'http://localhost:4000/api/pings/42/messages',
      {
        method: 'POST',
        body: JSON.stringify({
          content: 'Message',
          attachments: [
            {
              file_path: 'user-123/test.pdf',
              file_size: 5000,
              mime_type: 'application/pdf',
            },
          ],
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ pingNumber: '42' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});
