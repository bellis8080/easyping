/**
 * Unit Tests: Routing Service
 * Story 3.5: Automatic Ping Routing
 */

import { describe, it, expect, vi } from 'vitest';
import { RoutingService, createRoutingService } from './routing-service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@easyping/types';

// Create mock Supabase client
function createMockSupabaseClient(
  mockData: {
    routingRule?: {
      id: string;
      category_id: string;
      rule_type: 'agent' | 'team';
      destination_agent_id: string | null;
      destination_team_id: string | null;
      priority: number;
      is_active: boolean;
      destination_agent?: { id: string; full_name: string } | null;
      destination_team?: { id: string; name: string } | null;
    } | null;
    error?: Error | null;
  } = {}
): SupabaseClient<Database> {
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockMaybeSingle = vi.fn().mockResolvedValue({
    data: mockData.routingRule,
    error: mockData.error || null,
  });

  return {
    from: vi.fn().mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      maybeSingle: mockMaybeSingle,
    }),
  } as unknown as SupabaseClient<Database>;
}

describe('RoutingService', () => {
  const tenantId = 'tenant-123';

  describe('routePing', () => {
    it('returns not routed when categoryId is null', async () => {
      const mockClient = createMockSupabaseClient();
      const service = new RoutingService(mockClient, tenantId);

      const result = await service.routePing(null);

      expect(result.routed).toBe(false);
      expect(result.routedTo).toBeNull();
      expect(result.systemMessage).toContain('without category');
    });

    it('returns not routed when no routing rule exists', async () => {
      const mockClient = createMockSupabaseClient({ routingRule: null });
      const service = new RoutingService(mockClient, tenantId);

      const result = await service.routePing('category-123');

      expect(result.routed).toBe(false);
      expect(result.routedTo).toBeNull();
      expect(result.systemMessage).toContain('No routing rule configured');
    });

    it('routes to team when team rule exists', async () => {
      const mockClient = createMockSupabaseClient({
        routingRule: {
          id: 'rule-1',
          category_id: 'category-123',
          rule_type: 'team',
          destination_agent_id: null,
          destination_team_id: 'team-123',
          priority: 1,
          is_active: true,
          destination_agent: null,
          destination_team: { id: 'team-123', name: 'Tech Support' },
        },
      });
      const service = new RoutingService(mockClient, tenantId);

      const result = await service.routePing('category-123');

      expect(result.routed).toBe(true);
      expect(result.routedTo).toEqual({
        type: 'team',
        id: 'team-123',
        name: 'Tech Support',
      });
      expect(result.systemMessage).toContain('Tech Support');
    });

    it('routes to agent when agent rule exists', async () => {
      const mockClient = createMockSupabaseClient({
        routingRule: {
          id: 'rule-1',
          category_id: 'category-123',
          rule_type: 'agent',
          destination_agent_id: 'agent-123',
          destination_team_id: null,
          priority: 1,
          is_active: true,
          destination_agent: { id: 'agent-123', full_name: 'John Smith' },
          destination_team: null,
        },
      });
      const service = new RoutingService(mockClient, tenantId);

      const result = await service.routePing('category-123');

      expect(result.routed).toBe(true);
      expect(result.routedTo).toEqual({
        type: 'agent',
        id: 'agent-123',
        name: 'John Smith',
      });
      expect(result.systemMessage).toContain('John Smith');
    });

    it('handles database error gracefully', async () => {
      const mockClient = createMockSupabaseClient({
        error: new Error('Database error'),
      });
      const service = new RoutingService(mockClient, tenantId);

      const result = await service.routePing('category-123');

      expect(result.routed).toBe(false);
      expect(result.routedTo).toBeNull();
      expect(result.systemMessage).toContain('Error determining routing');
    });
  });

  describe('applyRoutingToUpdate', () => {
    it('returns empty object when not routed', () => {
      const mockClient = createMockSupabaseClient();
      const service = new RoutingService(mockClient, tenantId);

      const result = service.applyRoutingToUpdate({
        routed: false,
        routedTo: null,
        systemMessage: 'Not routed',
      });

      expect(result).toEqual({});
    });

    it('returns assigned_to for agent routing', () => {
      const mockClient = createMockSupabaseClient();
      const service = new RoutingService(mockClient, tenantId);

      const result = service.applyRoutingToUpdate({
        routed: true,
        routedTo: { type: 'agent', id: 'agent-123', name: 'John' },
        systemMessage: 'Routed',
      });

      expect(result).toEqual({ assigned_to: 'agent-123' });
    });

    it('returns team_id for team routing', () => {
      const mockClient = createMockSupabaseClient();
      const service = new RoutingService(mockClient, tenantId);

      const result = service.applyRoutingToUpdate({
        routed: true,
        routedTo: { type: 'team', id: 'team-123', name: 'Support' },
        systemMessage: 'Routed',
      });

      expect(result).toEqual({ team_id: 'team-123' });
    });
  });

  describe('generateSystemMessageContent', () => {
    it('includes ping number in message', () => {
      const mockClient = createMockSupabaseClient();
      const service = new RoutingService(mockClient, tenantId);

      const result = service.generateSystemMessageContent(
        {
          routed: true,
          routedTo: { type: 'team', id: 'team-123', name: 'Support' },
          systemMessage: 'Routed to Support team',
        },
        42
      );

      expect(result).toContain('#42');
    });
  });
});

describe('createRoutingService', () => {
  it('creates a RoutingService instance', () => {
    const mockClient = createMockSupabaseClient();
    const service = createRoutingService(mockClient, 'tenant-123');

    expect(service).toBeInstanceOf(RoutingService);
  });
});
