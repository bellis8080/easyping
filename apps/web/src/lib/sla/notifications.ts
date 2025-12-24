/**
 * SLA Notification Service (Story 5.3)
 *
 * Manages SLA breach notifications to prevent duplicate toasts
 * and track which pings have already been notified.
 */

import type { Ping } from '@easyping/types';
import {
  getFirstResponseSlaState,
  getResolutionSlaState,
} from './calculations';

/**
 * Notification record for a ping's SLA status change.
 */
export interface SlaNotification {
  pingId: string;
  pingNumber: number;
  type: 'at_risk' | 'breached';
  slaType: 'first_response' | 'resolution';
  notifiedAt: Date;
}

/**
 * Key format for notification tracking.
 */
function getNotificationKey(
  pingId: string,
  type: 'at_risk' | 'breached',
  slaType: 'first_response' | 'resolution'
): string {
  return `${pingId}:${type}:${slaType}`;
}

/**
 * Session storage key for persisted notifications.
 */
const STORAGE_KEY = 'sla-notifications';

/**
 * SLA Notification Service
 *
 * Singleton service that tracks which SLA notifications have been shown
 * to prevent duplicate toasts. Persists to sessionStorage.
 */
class SlaNotificationService {
  private notifiedPings: Map<string, SlaNotification> = new Map();
  private initialized = false;

  /**
   * Initialize service from sessionStorage.
   */
  private init(): void {
    if (this.initialized || typeof window === 'undefined') {
      return;
    }

    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Array<[string, SlaNotification]>;
        this.notifiedPings = new Map(
          parsed.map(([key, value]) => [
            key,
            { ...value, notifiedAt: new Date(value.notifiedAt) },
          ])
        );
      }
    } catch {
      // Ignore storage errors
    }

    this.initialized = true;
  }

  /**
   * Persist current state to sessionStorage.
   */
  private persist(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const entries = Array.from(this.notifiedPings.entries());
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Check if we should notify for a ping's SLA status change.
   *
   * @param ping - The ping to check
   * @param newType - The notification type (at_risk or breached)
   * @param slaType - Which SLA timer (first_response or resolution)
   * @returns true if we should show a notification
   */
  shouldNotify(
    ping: Ping,
    newType: 'at_risk' | 'breached',
    slaType: 'first_response' | 'resolution'
  ): boolean {
    this.init();

    const key = getNotificationKey(ping.id, newType, slaType);
    return !this.notifiedPings.has(key);
  }

  /**
   * Mark a ping as notified for a specific status.
   */
  markNotified(
    ping: Ping,
    type: 'at_risk' | 'breached',
    slaType: 'first_response' | 'resolution'
  ): void {
    this.init();

    const key = getNotificationKey(ping.id, type, slaType);
    this.notifiedPings.set(key, {
      pingId: ping.id,
      pingNumber: ping.ping_number,
      type,
      slaType,
      notifiedAt: new Date(),
    });

    this.persist();
  }

  /**
   * Clear notification state for a ping (e.g., when resolved).
   */
  clearNotification(pingId: string): void {
    this.init();

    // Remove all entries for this ping
    const keysToDelete: string[] = [];
    for (const key of this.notifiedPings.keys()) {
      if (key.startsWith(`${pingId}:`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.notifiedPings.delete(key);
    }

    this.persist();
  }

  /**
   * Check a ping's SLA status and determine what notifications to show.
   *
   * @returns Array of notifications that should be shown
   */
  checkPingForNotifications(
    ping: Ping
  ): Array<{
    type: 'at_risk' | 'breached';
    slaType: 'first_response' | 'resolution';
  }> {
    this.init();

    const notifications: Array<{
      type: 'at_risk' | 'breached';
      slaType: 'first_response' | 'resolution';
    }> = [];

    // Skip if ping is resolved or closed
    if (ping.status === 'resolved' || ping.status === 'closed') {
      return notifications;
    }

    // Check first response SLA (only if not yet responded)
    if (!ping.first_response_at && ping.sla_first_response_due) {
      const frState = getFirstResponseSlaState(ping);

      // Skip if paused
      if (!frState.is_paused && frState.time_remaining_minutes !== null) {
        // Calculate percentage for threshold detection
        const created = new Date(ping.created_at);
        const due = new Date(ping.sla_first_response_due);
        const totalMinutes = (due.getTime() - created.getTime()) / (1000 * 60);
        const percentRemaining =
          (frState.time_remaining_minutes / totalMinutes) * 100;

        // Breached (time <= 0)
        if (frState.time_remaining_minutes <= 0) {
          if (this.shouldNotify(ping, 'breached', 'first_response')) {
            notifications.push({ type: 'breached', slaType: 'first_response' });
          }
        }
        // At-risk (<20% remaining but not breached)
        else if (percentRemaining < 20) {
          if (this.shouldNotify(ping, 'at_risk', 'first_response')) {
            notifications.push({ type: 'at_risk', slaType: 'first_response' });
          }
        }
      }
    }

    // Check resolution SLA (only if first response made and not resolved)
    if (
      ping.first_response_at &&
      !ping.resolved_at &&
      ping.sla_resolution_due
    ) {
      const resState = getResolutionSlaState(ping);

      // Skip if paused
      if (!resState.is_paused && resState.time_remaining_minutes !== null) {
        // Calculate percentage for threshold detection
        const created = new Date(ping.created_at);
        const due = new Date(ping.sla_resolution_due);
        const totalMinutes = (due.getTime() - created.getTime()) / (1000 * 60);
        const percentRemaining =
          (resState.time_remaining_minutes / totalMinutes) * 100;

        // Breached (time <= 0)
        if (resState.time_remaining_minutes <= 0) {
          if (this.shouldNotify(ping, 'breached', 'resolution')) {
            notifications.push({ type: 'breached', slaType: 'resolution' });
          }
        }
        // At-risk (<20% remaining but not breached)
        else if (percentRemaining < 20) {
          if (this.shouldNotify(ping, 'at_risk', 'resolution')) {
            notifications.push({ type: 'at_risk', slaType: 'resolution' });
          }
        }
      }
    }

    return notifications;
  }

  /**
   * Get the number of tracked notifications (for testing).
   */
  getNotificationCount(): number {
    this.init();
    return this.notifiedPings.size;
  }

  /**
   * Clear all notifications (for testing).
   */
  clearAll(): void {
    this.notifiedPings.clear();
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
    }
  }
}

// Export singleton instance
export const slaNotificationService = new SlaNotificationService();

/**
 * Email Notification Placeholder (Story 5.3 - Task 4 DEFERRED)
 *
 * TODO: Implement email notifications for SLA breaches.
 *
 * Requirements:
 * - Email notification when SLA is breached
 * - Configurable in Settings > Notifications
 * - Requires SMTP configuration (email infrastructure)
 * - Should send to assigned agent only
 * - Respect user notification preferences
 *
 * This is deferred to a future story (Epic 6 launch prep) when
 * email infrastructure is configured.
 *
 * @param ping - The ping that breached SLA
 * @param slaType - Which SLA timer breached
 * @param assignedAgentEmail - Email of the assigned agent
 */
export function sendSlaBreachEmail(
  ping: { id: string; ping_number: number },
  slaType: 'first_response' | 'resolution',
  assignedAgentEmail: string | null
): void {
  // DEV ONLY: Log when email would be sent (for testing without email infrastructure)
  if (process.env.NODE_ENV === 'development') {
    console.log('[SLA Email Notification - PLACEHOLDER]', {
      message: 'Email would be sent if email infrastructure was configured',
      pingId: ping.id,
      pingNumber: ping.ping_number,
      slaType,
      recipient: assignedAgentEmail || 'no assigned agent',
      subject: `SLA Breach: Ping #${ping.ping_number} ${slaType === 'first_response' ? 'First Response' : 'Resolution'} SLA`,
    });
  }

  // TODO: Implement actual email sending when email infrastructure is available
  // Example implementation:
  // await sendEmail({
  //   to: assignedAgentEmail,
  //   subject: `SLA Breach: Ping #${ping.ping_number}`,
  //   template: 'sla-breach',
  //   data: { ping, slaType },
  // });
}
