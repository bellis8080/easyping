/**
 * Browser Notification Support for SLA Breaches (Story 5.3)
 *
 * Handles browser notifications for SLA breaches when the tab is not focused.
 */

import type { Ping } from '@easyping/types';

/**
 * Check if browser notifications are supported.
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Check if browser notifications are permitted.
 */
export function isBrowserNotificationPermitted(): boolean {
  if (!isBrowserNotificationSupported()) {
    return false;
  }
  return Notification.permission === 'granted';
}

/**
 * Request permission for browser notifications.
 *
 * @returns true if permission was granted
 */
export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!isBrowserNotificationSupported()) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
}

/**
 * Check if the current tab is focused.
 */
export function isTabFocused(): boolean {
  if (typeof document === 'undefined') {
    return true;
  }
  return document.visibilityState === 'visible' && document.hasFocus();
}

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
 * Show browser notification for SLA breach.
 *
 * Only shows if:
 * - Browser notifications are supported and permitted
 * - Tab is not focused (toast is shown instead if focused)
 *
 * @param ping - The ping that has breached SLA
 * @param slaType - Which SLA timer breached
 * @param onNavigate - Callback to navigate to the ping
 * @returns true if notification was shown
 */
export function showSlaBrowserNotification(
  ping: Ping,
  slaType: 'first_response' | 'resolution',
  onNavigate?: (pingNumber: number) => void
): boolean {
  // Don't show if tab is focused (toast is enough)
  if (isTabFocused()) {
    return false;
  }

  // Check if notifications are permitted
  if (!isBrowserNotificationPermitted()) {
    return false;
  }

  const pingLabel = formatPingNumber(ping.ping_number);
  const slaLabel = formatSlaType(slaType);

  try {
    const notification = new Notification('EasyPing - SLA Breach', {
      body: `${pingLabel} ${slaLabel} SLA breached`,
      icon: '/logo.svg',
      tag: `sla-breach-${ping.id}-${slaType}`, // Prevent duplicate notifications
      requireInteraction: true, // Keep notification until user interacts
    });

    // Handle click to navigate to ping
    notification.onclick = () => {
      window.focus();
      if (onNavigate) {
        onNavigate(ping.ping_number);
      }
      notification.close();
    };

    return true;
  } catch {
    return false;
  }
}

/**
 * Show browser notification for SLA at-risk.
 *
 * Only shows for more severe at-risk cases (< 10% remaining).
 * Less urgent at-risk notifications only use in-app toasts.
 *
 * @param ping - The ping that is at risk
 * @param slaType - Which SLA timer is at risk
 * @param percentRemaining - Percentage of time remaining
 * @param onNavigate - Callback to navigate to the ping
 * @returns true if notification was shown
 */
export function showSlaAtRiskBrowserNotification(
  ping: Ping,
  slaType: 'first_response' | 'resolution',
  percentRemaining: number,
  onNavigate?: (pingNumber: number) => void
): boolean {
  // Only show browser notification for severe at-risk (< 10%)
  if (percentRemaining >= 10) {
    return false;
  }

  // Don't show if tab is focused
  if (isTabFocused()) {
    return false;
  }

  if (!isBrowserNotificationPermitted()) {
    return false;
  }

  const pingLabel = formatPingNumber(ping.ping_number);
  const slaLabel = formatSlaType(slaType);

  try {
    const notification = new Notification('EasyPing - SLA At Risk', {
      body: `${pingLabel} ${slaLabel} SLA nearly breached`,
      icon: '/logo.svg',
      tag: `sla-at-risk-${ping.id}-${slaType}`,
    });

    notification.onclick = () => {
      window.focus();
      if (onNavigate) {
        onNavigate(ping.ping_number);
      }
      notification.close();
    };

    return true;
  } catch {
    return false;
  }
}
