/**
 * SLA Breach Toast Functions (Story 5.3)
 *
 * Toast notification functions for SLA at-risk and breached states.
 * Uses sonner toast library with custom formatting.
 */

import { toast } from 'sonner';
import type { Ping } from '@easyping/types';
import { formatSlaTime } from '@/lib/sla';

/**
 * Format ping number for display.
 */
function formatPingNumber(pingNumber: number): string {
  return `#PING-${String(pingNumber).padStart(3, '0')}`;
}

/**
 * Format SLA type for display.
 */
function formatSlaType(slaType: 'first_response' | 'resolution'): string {
  return slaType === 'first_response' ? 'First Response' : 'Resolution';
}

/**
 * Show toast for SLA entering at-risk zone (<20% remaining).
 *
 * @param ping - The ping that is at risk
 * @param slaType - Which SLA timer is at risk
 * @param timeRemainingMinutes - Minutes remaining before breach
 * @param onViewPing - Callback when "View Ping" is clicked
 */
export function showSlaAtRiskToast(
  ping: Ping,
  slaType: 'first_response' | 'resolution',
  timeRemainingMinutes: number,
  onViewPing?: (pingNumber: number) => void
): void {
  const pingLabel = formatPingNumber(ping.ping_number);
  const slaLabel = formatSlaType(slaType);
  const timeLabel = formatSlaTime(timeRemainingMinutes);

  toast.warning(`${pingLabel} SLA at risk - ${slaLabel} due in ${timeLabel}`, {
    duration: 5000, // Auto-dismiss after 5 seconds
    action: onViewPing
      ? {
          label: 'View Ping',
          onClick: () => onViewPing(ping.ping_number),
        }
      : undefined,
    // Accessibility: Toast library handles aria-live automatically
  });
}

/**
 * Show toast for SLA breach.
 *
 * @param ping - The ping that has breached SLA
 * @param slaType - Which SLA timer breached
 * @param timeOverMinutes - Minutes past the SLA deadline
 * @param onViewPing - Callback when "View Ping" is clicked
 */
export function showSlaBreachedToast(
  ping: Ping,
  slaType: 'first_response' | 'resolution',
  timeOverMinutes: number,
  onViewPing?: (pingNumber: number) => void
): void {
  const pingLabel = formatPingNumber(ping.ping_number);
  const slaLabel = formatSlaType(slaType);
  const timeLabel = formatSlaTime(Math.abs(timeOverMinutes));

  toast.error(`${pingLabel} ${slaLabel} SLA breached (${timeLabel} ago)`, {
    duration: Infinity, // Error toasts persist until dismissed
    action: onViewPing
      ? {
          label: 'View Ping',
          onClick: () => onViewPing(ping.ping_number),
        }
      : undefined,
    // Accessibility: Toast library handles aria-live automatically
  });
}

/**
 * Process a ping and show appropriate SLA notifications.
 *
 * This function checks the ping's SLA status and shows toast notifications
 * for any at-risk or breached states. It uses the notification service
 * to prevent duplicate toasts.
 *
 * @param ping - The ping to check
 * @param notifications - Array of notifications to show
 * @param onViewPing - Callback when "View Ping" is clicked
 */
export function processSlaNotifications(
  ping: Ping,
  notifications: Array<{
    type: 'at_risk' | 'breached';
    slaType: 'first_response' | 'resolution';
  }>,
  onViewPing?: (pingNumber: number) => void
): void {
  for (const notification of notifications) {
    if (notification.type === 'at_risk') {
      // Calculate time remaining for the message
      const due = new Date(
        notification.slaType === 'first_response'
          ? ping.sla_first_response_due!
          : ping.sla_resolution_due!
      );
      const now = new Date();
      const remainingMs = due.getTime() - now.getTime();
      const remainingMinutes = Math.max(
        0,
        Math.floor(remainingMs / (1000 * 60))
      );

      showSlaAtRiskToast(
        ping,
        notification.slaType,
        remainingMinutes,
        onViewPing
      );
    } else {
      // Calculate time over for the message
      const due = new Date(
        notification.slaType === 'first_response'
          ? ping.sla_first_response_due!
          : ping.sla_resolution_due!
      );
      const now = new Date();
      const overMs = now.getTime() - due.getTime();
      const overMinutes = Math.max(0, Math.floor(overMs / (1000 * 60)));

      showSlaBreachedToast(ping, notification.slaType, overMinutes, onViewPing);
    }
  }
}
