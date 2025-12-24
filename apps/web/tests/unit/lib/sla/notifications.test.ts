/**
 * Unit tests for SLA Notification Service (Story 5.3)
 *
 * Tests the notification tracking and deduplication logic.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Ping } from '@easyping/types';

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

// Set up sessionStorage mock before importing the module
vi.stubGlobal('sessionStorage', mockSessionStorage);

// We need to dynamically import the module after mocking sessionStorage
// to ensure the singleton is initialized with our mock
let slaNotificationService: typeof import('@/lib/sla/notifications').slaNotificationService;

/**
 * Create a mock ping for testing.
 */
function createMockPing(overrides: Partial<Ping> = {}): Ping {
  const now = new Date();
  const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  return {
    id: 'ping-1',
    tenant_id: 'tenant-1',
    ping_number: 1,
    title: 'Test Ping',
    status: 'open',
    priority: 'medium',
    channel: 'web',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    created_by: 'user-1',
    assigned_to: null,
    assigned_team: null,
    category_id: null,
    sla_first_response_due: tenMinutesFromNow.toISOString(),
    sla_resolution_due: oneHourFromNow.toISOString(),
    first_response_at: null,
    resolved_at: null,
    sla_paused_at: null,
    sla_paused_duration_ms: 0,
    ...overrides,
  } as Ping;
}

describe('SlaNotificationService', () => {
  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    mockSessionStorage.clear();

    // Reset the module registry to get a fresh instance
    vi.resetModules();

    // Re-import to get fresh singleton instance
    const module = await import('@/lib/sla/notifications');
    slaNotificationService = module.slaNotificationService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('shouldNotify', () => {
    it('should return true for first notification of a ping', () => {
      const ping = createMockPing();

      const result = slaNotificationService.shouldNotify(
        ping,
        'at_risk',
        'first_response'
      );

      expect(result).toBe(true);
    });

    it('should return false for duplicate notification with same type', () => {
      const ping = createMockPing();

      // First notification
      slaNotificationService.markNotified(ping, 'at_risk', 'first_response');

      // Try to notify again with same type
      const result = slaNotificationService.shouldNotify(
        ping,
        'at_risk',
        'first_response'
      );

      expect(result).toBe(false);
    });

    it('should return true when escalating from at_risk to breached', () => {
      const ping = createMockPing();

      // First, mark as at_risk
      slaNotificationService.markNotified(ping, 'at_risk', 'first_response');

      // Should allow escalation to breached
      const result = slaNotificationService.shouldNotify(
        ping,
        'breached',
        'first_response'
      );

      expect(result).toBe(true);
    });

    it('should track at_risk and breached as separate notification types', () => {
      const ping = createMockPing();

      // Mark as breached
      slaNotificationService.markNotified(ping, 'breached', 'first_response');

      // at_risk is tracked separately (different key in storage)
      // The mutual exclusivity is handled by checkPingForNotifications, not shouldNotify
      const result = slaNotificationService.shouldNotify(
        ping,
        'at_risk',
        'first_response'
      );

      // Implementation tracks types separately - at_risk wasn't notified yet
      expect(result).toBe(true);
    });

    it('should track first_response and resolution SLA types separately', () => {
      const ping = createMockPing();

      // Notify for first_response
      slaNotificationService.markNotified(ping, 'at_risk', 'first_response');

      // Should still allow notification for resolution
      const result = slaNotificationService.shouldNotify(
        ping,
        'at_risk',
        'resolution'
      );

      expect(result).toBe(true);
    });
  });

  describe('markNotified', () => {
    it('should persist notification to sessionStorage', () => {
      const ping = createMockPing();

      slaNotificationService.markNotified(ping, 'at_risk', 'first_response');

      expect(mockSessionStorage.setItem).toHaveBeenCalled();
    });

    it('should update existing notification when escalating', () => {
      const ping = createMockPing();

      // First notification
      slaNotificationService.markNotified(ping, 'at_risk', 'first_response');

      // Escalate to breached
      slaNotificationService.markNotified(ping, 'breached', 'first_response');

      // Should not allow at_risk anymore
      const result = slaNotificationService.shouldNotify(
        ping,
        'at_risk',
        'first_response'
      );

      expect(result).toBe(false);
    });
  });

  describe('clearNotification', () => {
    it('should clear notification for a ping', () => {
      const ping = createMockPing();

      // Add notification
      slaNotificationService.markNotified(ping, 'at_risk', 'first_response');

      // Clear it
      slaNotificationService.clearNotification(ping.id);

      // Should now allow notification again
      const result = slaNotificationService.shouldNotify(
        ping,
        'at_risk',
        'first_response'
      );

      expect(result).toBe(true);
    });

    it('should persist cleared state to sessionStorage', () => {
      const ping = createMockPing();

      slaNotificationService.markNotified(ping, 'at_risk', 'first_response');
      vi.clearAllMocks();

      slaNotificationService.clearNotification(ping.id);

      expect(mockSessionStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('checkPingForNotifications', () => {
    it('should return empty array for ping with no SLA due dates', () => {
      const ping = createMockPing({
        sla_first_response_due: null,
        sla_resolution_due: null,
      });

      const result = slaNotificationService.checkPingForNotifications(ping);

      expect(result).toEqual([]);
    });

    it('should return empty array for resolved ping', () => {
      const ping = createMockPing({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      });

      const result = slaNotificationService.checkPingForNotifications(ping);

      expect(result).toEqual([]);
    });

    it('should return at_risk notification when under 20% time remaining', () => {
      const now = new Date();
      // Created 81 minutes ago, due in 19 minutes (19% remaining of 100 minutes)
      const created = new Date(now.getTime() - 81 * 60 * 1000);
      const due = new Date(now.getTime() + 19 * 60 * 1000);

      const ping = createMockPing({
        created_at: created.toISOString(),
        sla_first_response_due: due.toISOString(),
        sla_resolution_due: null, // Only test first_response
      });

      const result = slaNotificationService.checkPingForNotifications(ping);

      expect(result).toContainEqual({
        type: 'at_risk',
        slaType: 'first_response',
      });
    });

    it('should return breached notification when time remaining is 0 or negative', () => {
      const now = new Date();
      // Due 5 minutes ago
      const due = new Date(now.getTime() - 5 * 60 * 1000);

      const ping = createMockPing({
        sla_first_response_due: due.toISOString(),
        sla_resolution_due: null,
      });

      const result = slaNotificationService.checkPingForNotifications(ping);

      expect(result).toContainEqual({
        type: 'breached',
        slaType: 'first_response',
      });
    });

    it('should not return duplicate notifications', () => {
      const now = new Date();
      const due = new Date(now.getTime() - 5 * 60 * 1000);

      const ping = createMockPing({
        sla_first_response_due: due.toISOString(),
        sla_resolution_due: null,
      });

      // First check - should return notification
      const result1 = slaNotificationService.checkPingForNotifications(ping);
      expect(result1.length).toBeGreaterThan(0);

      // Mark as notified
      for (const notification of result1) {
        slaNotificationService.markNotified(
          ping,
          notification.type,
          notification.slaType
        );
      }

      // Second check - should return empty (already notified)
      const result2 = slaNotificationService.checkPingForNotifications(ping);
      expect(result2).toEqual([]);
    });

    it('should skip first_response check if already responded', () => {
      const now = new Date();
      const due = new Date(now.getTime() - 5 * 60 * 1000);

      const ping = createMockPing({
        sla_first_response_due: due.toISOString(),
        first_response_at: new Date(
          now.getTime() - 10 * 60 * 1000
        ).toISOString(), // Responded 10 min ago
        sla_resolution_due: null,
      });

      const result = slaNotificationService.checkPingForNotifications(ping);

      // Should not return first_response notification since already responded
      expect(
        result.find((n) => n.slaType === 'first_response')
      ).toBeUndefined();
    });

    it('should skip paused SLA timers for resolution only (first_response never pauses)', () => {
      const now = new Date();
      // First Response SLA is breached
      const frDue = new Date(now.getTime() - 5 * 60 * 1000);
      // Resolution SLA is also breached (but paused)
      const resDue = new Date(now.getTime() - 2 * 60 * 1000);

      const ping = createMockPing({
        sla_first_response_due: frDue.toISOString(),
        sla_resolution_due: resDue.toISOString(),
        first_response_at: new Date(
          now.getTime() - 10 * 60 * 1000
        ).toISOString(), // Responded 10 min ago
        sla_paused_at: new Date().toISOString(), // Currently paused
      });

      const result = slaNotificationService.checkPingForNotifications(ping);

      // First Response SLA never pauses, so if it weren't already responded,
      // it would still notify. But since first_response_at is set, FR is skipped.
      // Resolution is paused, so no notification for that either.
      expect(result).toEqual([]);
    });

    it('should still notify for first_response SLA even when paused (first_response never pauses)', () => {
      const now = new Date();
      const frDue = new Date(now.getTime() - 5 * 60 * 1000);

      const ping = createMockPing({
        sla_first_response_due: frDue.toISOString(),
        sla_resolution_due: null,
        first_response_at: null, // Not yet responded
        sla_paused_at: new Date().toISOString(), // Currently paused (but FR ignores this)
      });

      const result = slaNotificationService.checkPingForNotifications(ping);

      // First Response SLA never pauses - should still notify
      expect(result).toContainEqual({
        type: 'breached',
        slaType: 'first_response',
      });
    });

    it('should check both first_response and resolution SLAs', () => {
      const now = new Date();
      // First response is breached
      const frDue = new Date(now.getTime() - 5 * 60 * 1000);
      // Resolution is also breached (but first_response_at must be set for resolution to be checked)
      const resDue = new Date(now.getTime() - 2 * 60 * 1000);

      // First, check a ping where only first_response is relevant
      const pingNoResponse = createMockPing({
        sla_first_response_due: frDue.toISOString(),
        sla_resolution_due: resDue.toISOString(),
        first_response_at: null, // No response yet
      });

      const resultNoResponse =
        slaNotificationService.checkPingForNotifications(pingNoResponse);

      // Should only get first_response breach (resolution not checked until first response made)
      expect(resultNoResponse).toContainEqual({
        type: 'breached',
        slaType: 'first_response',
      });
      expect(resultNoResponse).not.toContainEqual({
        type: 'breached',
        slaType: 'resolution',
      });

      // Now check a ping where first response was made
      const pingWithResponse = createMockPing({
        id: 'ping-2', // Different ID to avoid deduplication
        sla_first_response_due: frDue.toISOString(),
        sla_resolution_due: resDue.toISOString(),
        first_response_at: new Date(
          now.getTime() - 10 * 60 * 1000
        ).toISOString(), // Responded 10 min ago
      });

      const resultWithResponse =
        slaNotificationService.checkPingForNotifications(pingWithResponse);

      // Should only get resolution breach (first_response already made)
      expect(resultWithResponse).not.toContainEqual({
        type: 'breached',
        slaType: 'first_response',
      });
      expect(resultWithResponse).toContainEqual({
        type: 'breached',
        slaType: 'resolution',
      });
    });
  });

  describe('Session storage persistence', () => {
    it('should restore notifications from sessionStorage on initialization', async () => {
      const ping = createMockPing();

      // Simulate existing data in sessionStorage (stored as Array<[key, SlaNotification]>)
      const key = `${ping.id}:breached:first_response`;
      const existingData: Array<
        [
          string,
          {
            pingId: string;
            pingNumber: number;
            type: string;
            slaType: string;
            notifiedAt: string;
          },
        ]
      > = [
        [
          key,
          {
            pingId: ping.id,
            pingNumber: ping.ping_number,
            type: 'breached',
            slaType: 'first_response',
            notifiedAt: new Date().toISOString(),
          },
        ],
      ];
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(existingData));

      // Reset module to trigger re-initialization
      vi.resetModules();
      const module = await import('@/lib/sla/notifications');
      const freshService = module.slaNotificationService;

      // Should not allow breached again since it's already in storage
      const result = freshService.shouldNotify(
        ping,
        'breached',
        'first_response'
      );

      expect(result).toBe(false);
    });

    it('should handle corrupted sessionStorage data gracefully', async () => {
      // Simulate corrupted data
      mockSessionStorage.getItem.mockReturnValue('not valid json');

      // Reset module to trigger re-initialization
      vi.resetModules();
      const module = await import('@/lib/sla/notifications');
      const freshService = module.slaNotificationService;

      // Should still work normally
      const ping = createMockPing();
      const result = freshService.shouldNotify(
        ping,
        'at_risk',
        'first_response'
      );

      expect(result).toBe(true);
    });
  });
});
