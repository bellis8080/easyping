import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { UserRole } from '@easyping/types';

// Mock dependencies
vi.mock('@/lib/auth/helpers', () => ({
  getUserProfile: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { GET, PUT } from './route';
import { getUserProfile } from '@/lib/auth/helpers';
import { createAdminClient } from '@/lib/supabase/admin';

describe('AI Config API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/ai-config', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(getUserProfile).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should return 403 if user is not owner', async () => {
      vi.mocked(getUserProfile).mockResolvedValue({
        id: 'user-123',
        tenant_id: 'org-123',
        role: 'agent' as UserRole,
        email: 'agent@test.com',
        full_name: 'Test Agent',
        avatar_url: null,
        created_at: '2024-01-01',
        last_seen_at: '2024-01-01',
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Only organization owners');
    });

    it('should return empty config if no AI config exists', async () => {
      vi.mocked(getUserProfile).mockResolvedValue({
        id: 'user-123',
        tenant_id: 'org-123',
        role: 'owner' as UserRole,
        email: 'owner@test.com',
        full_name: 'Test Owner',
        avatar_url: null,
        created_at: '2024-01-01',
        last_seen_at: '2024-01-01',
      });

      const mockAdminClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { id: 'org-123', ai_config: {} },
                  error: null,
                })
              ),
            })),
          })),
        })),
        rpc: vi.fn(),
      };

      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        provider: null,
        apiKey: null,
        model: null,
        enabled: false,
      });
    });

    it('should return decrypted AI config for owner', async () => {
      vi.mocked(getUserProfile).mockResolvedValue({
        id: 'user-123',
        tenant_id: 'org-123',
        role: 'owner' as UserRole,
        email: 'owner@test.com',
        full_name: 'Test Owner',
        avatar_url: null,
        created_at: '2024-01-01',
        last_seen_at: '2024-01-01',
      });

      const mockAdminClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: {
                    id: 'org-123',
                    ai_config: {
                      provider: 'openai',
                      encrypted_api_key: 'encrypted-key-123',
                      model: 'gpt-4o-mini',
                      enabled: true,
                    },
                  },
                  error: null,
                })
              ),
            })),
          })),
        })),
        rpc: vi.fn(() =>
          Promise.resolve({
            data: 'sk-test-key-123',
            error: null,
          })
        ),
      };

      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.provider).toBe('openai');
      expect(data.apiKey).toBe('sk-test-key-123');
      expect(data.model).toBe('gpt-4o-mini');
      expect(data.enabled).toBe(true);
    });
  });

  describe('PUT /api/ai-config', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(getUserProfile).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/ai-config', {
        method: 'PUT',
        body: JSON.stringify({
          provider: 'openai',
          apiKey: 'sk-test',
          model: 'gpt-4o-mini',
          enabled: true,
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should return 403 if user is not owner', async () => {
      vi.mocked(getUserProfile).mockResolvedValue({
        id: 'user-123',
        tenant_id: 'org-123',
        role: 'agent' as UserRole,
        email: 'agent@test.com',
        full_name: 'Test Agent',
        avatar_url: null,
        created_at: '2024-01-01',
        last_seen_at: '2024-01-01',
      });

      const request = new NextRequest('http://localhost/api/ai-config', {
        method: 'PUT',
        body: JSON.stringify({
          provider: 'openai',
          apiKey: 'sk-test',
          model: 'gpt-4o-mini',
          enabled: true,
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Only organization owners');
    });

    it('should return 400 if required fields are missing', async () => {
      vi.mocked(getUserProfile).mockResolvedValue({
        id: 'user-123',
        tenant_id: 'org-123',
        role: 'owner' as UserRole,
        email: 'owner@test.com',
        full_name: 'Test Owner',
        avatar_url: null,
        created_at: '2024-01-01',
        last_seen_at: '2024-01-01',
      });

      const request = new NextRequest('http://localhost/api/ai-config', {
        method: 'PUT',
        body: JSON.stringify({
          provider: 'openai',
          // Missing apiKey and model
          enabled: true,
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should encrypt API key and update AI config', async () => {
      vi.mocked(getUserProfile).mockResolvedValue({
        id: 'user-123',
        tenant_id: 'org-123',
        role: 'owner' as UserRole,
        email: 'owner@test.com',
        full_name: 'Test Owner',
        avatar_url: null,
        created_at: '2024-01-01',
        last_seen_at: '2024-01-01',
      });

      const mockAdminClient = {
        rpc: vi.fn(() =>
          Promise.resolve({
            data: 'encrypted-key-123',
            error: null,
          })
        ),
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        })),
      };

      vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as any);

      const request = new NextRequest('http://localhost/api/ai-config', {
        method: 'PUT',
        body: JSON.stringify({
          provider: 'openai',
          apiKey: 'sk-test-key-123',
          model: 'gpt-4o-mini',
          enabled: true,
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.config.provider).toBe('openai');
      expect(data.config.model).toBe('gpt-4o-mini');
      expect(data.config.enabled).toBe(true);
      // API key should be masked
      expect(data.config.apiKey).toContain('...');
    });
  });
});
