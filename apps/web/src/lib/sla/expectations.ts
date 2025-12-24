/**
 * SLA Expectations for End Users (Story 5.3)
 *
 * Provides user-friendly response time expectations without exposing
 * SLA terminology to end users.
 */

import type { Ping } from '@easyping/types';

/**
 * Format minutes into a user-friendly duration string.
 *
 * Examples:
 * - 30 -> "30 minutes"
 * - 60 -> "1 hour"
 * - 120 -> "2 hours"
 * - 1440 -> "1 day"
 * - 2880 -> "2 days"
 *
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 */
export function formatDurationFriendly(minutes: number): string {
  if (minutes < 60) {
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }

  const days = Math.round(hours / 24);
  return days === 1 ? '1 day' : `${days} days`;
}

/**
 * Format minutes into a compact duration string (e.g., "2h 15m").
 *
 * @param minutes - Duration in minutes
 * @returns Compact formatted duration
 */
export function formatDurationCompact(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) {
      return days === 1 ? '1 day' : `${days} days`;
    }
    return `${days}d ${remainingHours}h`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Get expected response time message from SLA due date.
 *
 * @param ping - The ping to get expectations for
 * @returns User-friendly response time message, or null if no SLA configured
 */
export function getExpectedResponseTime(ping: Ping): string | null {
  // Calculate expected response time from first_response_due
  if (!ping.sla_first_response_due) {
    return null;
  }

  // Calculate the total SLA duration from created_at to due date
  const created = new Date(ping.created_at);
  const due = new Date(ping.sla_first_response_due);
  const totalMinutes = Math.round(
    (due.getTime() - created.getTime()) / (1000 * 60)
  );

  if (totalMinutes <= 0) {
    return null;
  }

  return formatDurationFriendly(totalMinutes);
}

/**
 * Get the "resolved in" duration message.
 *
 * @param ping - The resolved ping
 * @returns Formatted duration string, or null if not resolved
 */
export function getResolvedDuration(ping: Ping): string | null {
  if (!ping.resolved_at) {
    return null;
  }

  const created = new Date(ping.created_at);
  const resolved = new Date(ping.resolved_at);
  const totalMinutes = Math.round(
    (resolved.getTime() - created.getTime()) / (1000 * 60)
  );

  if (totalMinutes <= 0) {
    return 'just now';
  }

  return formatDurationCompact(totalMinutes);
}

/**
 * Get the creation confirmation message for end users.
 *
 * @param ping - The newly created ping
 * @returns Confirmation message with expected response time
 */
export function getCreationConfirmationMessage(ping: Ping): string {
  const expectedTime = getExpectedResponseTime(ping);

  if (expectedTime) {
    return `Ticket created! We typically respond within ${expectedTime}.`;
  }

  return "Ticket created! We'll get back to you as soon as possible.";
}

/**
 * Get the resolution confirmation message for end users.
 *
 * @param ping - The resolved ping
 * @returns Resolution message with duration
 */
export function getResolutionMessage(ping: Ping): string | null {
  const duration = getResolvedDuration(ping);

  if (!duration) {
    return null;
  }

  return `Resolved in ${duration}`;
}
