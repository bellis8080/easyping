/**
 * SLA Risk Sorting Utilities (Story 5.3)
 *
 * Functions for sorting pings by SLA risk level.
 * Lower scores = more urgent (should appear first in list).
 */

import type { Ping } from '@easyping/types';
import {
  getFirstResponseSlaState,
  getResolutionSlaState,
} from './calculations';

/**
 * Calculate SLA risk score for sorting (lower = more urgent).
 *
 * Scoring system:
 * - Breached: 0 (highest priority)
 * - Red zone (<20%): 1-20 based on % remaining
 * - Yellow zone (20-50%): 21-50 based on % remaining
 * - Green zone (>50%): 51-100 based on % remaining
 * - Paused: 500 (lower priority than active timers)
 * - No SLA: 999 (lowest priority)
 *
 * @param ping - Ping with SLA fields
 * @returns Risk score (lower = more urgent)
 */
export function calculateSlaRiskScore(ping: Ping): number {
  // Get both timer states
  const firstResponseState = getFirstResponseSlaState(ping);
  const resolutionState = getResolutionSlaState(ping);

  // Calculate scores for each timer
  const frScore = calculateTimerScore(
    firstResponseState.status,
    firstResponseState.time_remaining_minutes,
    getTotalSlaMinutes(ping.created_at, ping.sla_first_response_due),
    firstResponseState.is_paused
  );

  const resScore = calculateTimerScore(
    resolutionState.status,
    resolutionState.time_remaining_minutes,
    getTotalSlaMinutes(ping.created_at, ping.sla_resolution_due),
    resolutionState.is_paused
  );

  // Return the most urgent (lowest) score
  return Math.min(frScore, resScore);
}

/**
 * Calculate score for a single timer.
 *
 * Note: We don't rely on 'status' for breached detection because
 * getSlaStatus returns 'breached' for both truly breached (time <= 0)
 * AND at-risk (<20% remaining). We need to distinguish these cases.
 */
function calculateTimerScore(
  status: string,
  timeRemainingMinutes: number | null,
  totalSlaMinutes: number | null,
  isPaused: boolean
): number {
  // No SLA configured
  if (totalSlaMinutes === null || totalSlaMinutes === 0) {
    return 999;
  }

  // Paused timers get lower priority than active timers
  if (isPaused) {
    return 500;
  }

  // Completed (first response made or resolved)
  if (status === 'completed') {
    return 999; // Completed timers don't need attention
  }

  // No time remaining info
  if (timeRemainingMinutes === null) {
    return 999;
  }

  // Actually breached (time <= 0) - highest priority
  if (timeRemainingMinutes <= 0) {
    return 0;
  }

  // Calculate percentage remaining
  const percentRemaining = (timeRemainingMinutes / totalSlaMinutes) * 100;

  // Red zone (<20%): scores 1-20
  // Note: This is at-risk, NOT breached - time is still > 0
  if (percentRemaining < 20) {
    // Map 0-20% to scores 1-20 (linear, lower % = lower score)
    return Math.max(1, Math.floor(percentRemaining));
  }

  // Yellow zone (20-50%): scores 21-50
  if (percentRemaining <= 50) {
    // Map 20-50% to scores 21-50
    return Math.floor(20 + ((percentRemaining - 20) / 30) * 30);
  }

  // Green zone (>50%): scores 51-100
  // Map 50-100% to scores 51-100
  return Math.floor(50 + ((percentRemaining - 50) / 50) * 50);
}

/**
 * Calculate total SLA duration in minutes from created_at to due_at.
 */
function getTotalSlaMinutes(
  createdAt: string,
  dueAt: string | null | undefined
): number | null {
  if (!dueAt) {
    return null;
  }

  const created = new Date(createdAt);
  const due = new Date(dueAt);
  return Math.floor((due.getTime() - created.getTime()) / (1000 * 60));
}

/**
 * Sort pings by SLA risk (most urgent first).
 *
 * @param pings - Array of pings to sort
 * @returns Sorted array (does not mutate original)
 */
export function sortBySlaRisk<T extends Ping>(pings: T[]): T[] {
  return [...pings].sort((a, b) => {
    const scoreA = calculateSlaRiskScore(a);
    const scoreB = calculateSlaRiskScore(b);
    return scoreA - scoreB;
  });
}
