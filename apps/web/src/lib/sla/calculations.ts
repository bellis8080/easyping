/**
 * SLA Calculation Utilities (Story 5.2)
 *
 * Core functions for calculating SLA status, time remaining, and formatting.
 * These utilities power the SLA timer UI components and API endpoints.
 */

import type {
  Ping,
  SlaStatus,
  SlaTimerStatus,
  SlaTimerState,
} from '@easyping/types';

/**
 * Calculate time remaining for an SLA, accounting for paused time.
 *
 * @param dueAt - ISO timestamp when SLA is due (null if no SLA)
 * @param pausedAt - ISO timestamp when pause started (null if not paused)
 * @param pausedDurationMinutes - Accumulated pause time in minutes
 * @returns Minutes remaining (negative if breached), or null if no SLA
 */
export function calculateTimeRemaining(
  dueAt: string | null,
  pausedAt: string | null,
  pausedDurationMinutes: number
): number | null {
  if (!dueAt) {
    return null; // No SLA configured
  }

  const now = new Date();
  const due = new Date(dueAt);

  // Calculate base time remaining
  let timeRemainingMs = due.getTime() - now.getTime();

  // Add back paused time (SLA clock doesn't run while paused)
  timeRemainingMs += pausedDurationMinutes * 60 * 1000;

  // If currently paused, add the current pause duration too
  if (pausedAt) {
    const pauseStart = new Date(pausedAt);
    const currentPauseMs = now.getTime() - pauseStart.getTime();
    timeRemainingMs += currentPauseMs;
  }

  return Math.floor(timeRemainingMs / (1000 * 60)); // Convert to minutes
}

/**
 * Get SLA status based on time remaining percentage.
 *
 * Color coding per UX spec:
 * - on_track (green): >50% time remaining
 * - at_risk (yellow): 20-50% time remaining
 * - breached (red): <20% time remaining or past due
 *
 * @param timeRemainingMinutes - Minutes remaining (can be negative if breached)
 * @param totalSlaMinutes - Total SLA duration in minutes
 * @returns SLA status
 */
export function getSlaStatus(
  timeRemainingMinutes: number,
  totalSlaMinutes: number
): SlaStatus {
  if (timeRemainingMinutes <= 0) {
    return 'breached';
  }

  const percentRemaining = (timeRemainingMinutes / totalSlaMinutes) * 100;

  if (percentRemaining > 50) {
    return 'on_track';
  } else if (percentRemaining > 20) {
    return 'at_risk';
  } else {
    return 'breached';
  }
}

/**
 * Get the state of the First Response SLA timer.
 *
 * First Response SLA:
 * - Never pauses
 * - Completed when first_response_at is set
 * - Counts from ping creation to first agent message
 *
 * @param ping - Ping with SLA fields
 * @returns Timer state
 */
export function getFirstResponseSlaState(ping: Ping): SlaTimerState {
  // If first response already happened, return completed state
  if (ping.first_response_at) {
    const createdAt = new Date(ping.created_at);
    const respondedAt = new Date(ping.first_response_at);
    const timeTakenMinutes = Math.floor(
      (respondedAt.getTime() - createdAt.getTime()) / (1000 * 60)
    );

    // Determine if it was within SLA
    let status: SlaTimerStatus = 'completed';
    if (ping.sla_first_response_due) {
      const dueAt = new Date(ping.sla_first_response_due);
      if (respondedAt > dueAt) {
        status = 'breached';
      }
    }

    return {
      status,
      is_paused: false,
      time_remaining_minutes: null,
      time_over_minutes:
        status === 'breached' ? Math.abs(timeTakenMinutes) : null,
      time_taken_minutes: timeTakenMinutes,
      due_at: ping.sla_first_response_due,
      completed_at: ping.first_response_at,
    };
  }

  // First response not yet made - calculate time remaining
  if (!ping.sla_first_response_due) {
    // No SLA configured
    return {
      status: 'on_track',
      is_paused: false,
      time_remaining_minutes: null,
      time_over_minutes: null,
      time_taken_minutes: null,
      due_at: null,
      completed_at: null,
    };
  }

  // First Response SLA never pauses, so don't account for pause time
  const timeRemainingMinutes = calculateTimeRemaining(
    ping.sla_first_response_due,
    null, // Never paused
    0 // No pause duration
  );

  // Calculate total SLA minutes for status determination
  const createdAt = new Date(ping.created_at);
  const dueAt = new Date(ping.sla_first_response_due);
  const totalSlaMinutes = Math.floor(
    (dueAt.getTime() - createdAt.getTime()) / (1000 * 60)
  );

  const status =
    timeRemainingMinutes !== null && timeRemainingMinutes <= 0
      ? 'breached'
      : getSlaStatus(timeRemainingMinutes || 0, totalSlaMinutes);

  return {
    status,
    is_paused: false,
    time_remaining_minutes: timeRemainingMinutes,
    time_over_minutes:
      timeRemainingMinutes !== null && timeRemainingMinutes < 0
        ? Math.abs(timeRemainingMinutes)
        : null,
    time_taken_minutes: null,
    due_at: ping.sla_first_response_due,
    completed_at: null,
  };
}

/**
 * Get the state of the Resolution SLA timer.
 *
 * Resolution SLA:
 * - Pauses when status is "Waiting on User"
 * - Completed when resolved_at is set
 * - Accounts for accumulated pause time
 *
 * @param ping - Ping with SLA fields
 * @returns Timer state
 */
export function getResolutionSlaState(ping: Ping): SlaTimerState {
  // If already resolved, return completed state
  if (ping.resolved_at) {
    const createdAt = new Date(ping.created_at);
    const resolvedAt = new Date(ping.resolved_at);

    // Calculate actual working time (excluding paused time)
    let workingTimeMs = resolvedAt.getTime() - createdAt.getTime();
    workingTimeMs -= (ping.sla_paused_duration_minutes || 0) * 60 * 1000;

    const timeTakenMinutes = Math.floor(workingTimeMs / (1000 * 60));

    // Determine if it was within SLA
    let status: SlaTimerStatus = 'completed';
    if (ping.sla_resolution_due) {
      // Check if resolution time exceeded SLA (accounting for pause time)
      const dueAt = new Date(ping.sla_resolution_due);
      // Add pause time back to the due time for comparison
      const adjustedDueTime =
        dueAt.getTime() + (ping.sla_paused_duration_minutes || 0) * 60 * 1000;
      if (resolvedAt.getTime() > adjustedDueTime) {
        status = 'breached';
      }
    }

    return {
      status,
      is_paused: false,
      time_remaining_minutes: null,
      time_over_minutes: null,
      time_taken_minutes: timeTakenMinutes,
      due_at: ping.sla_resolution_due,
      completed_at: ping.resolved_at,
    };
  }

  // Not resolved yet - check if paused
  const isPaused = ping.sla_paused_at !== null;

  // No SLA configured
  if (!ping.sla_resolution_due) {
    return {
      status: isPaused ? 'paused' : 'on_track',
      is_paused: isPaused,
      time_remaining_minutes: null,
      time_over_minutes: null,
      time_taken_minutes: null,
      due_at: null,
      completed_at: null,
    };
  }

  // Calculate time remaining accounting for pause
  const timeRemainingMinutes = calculateTimeRemaining(
    ping.sla_resolution_due,
    ping.sla_paused_at,
    ping.sla_paused_duration_minutes || 0
  );

  // Calculate total SLA minutes for status determination
  const createdAt = new Date(ping.created_at);
  const dueAt = new Date(ping.sla_resolution_due);
  const totalSlaMinutes = Math.floor(
    (dueAt.getTime() - createdAt.getTime()) / (1000 * 60)
  );

  let status: SlaTimerStatus;
  if (isPaused) {
    status = 'paused';
  } else if (timeRemainingMinutes !== null && timeRemainingMinutes <= 0) {
    status = 'breached';
  } else {
    status = getSlaStatus(timeRemainingMinutes || 0, totalSlaMinutes);
  }

  return {
    status,
    is_paused: isPaused,
    time_remaining_minutes: timeRemainingMinutes,
    time_over_minutes:
      timeRemainingMinutes !== null && timeRemainingMinutes < 0
        ? Math.abs(timeRemainingMinutes)
        : null,
    time_taken_minutes: null,
    due_at: ping.sla_resolution_due,
    completed_at: null,
  };
}

/**
 * Format SLA time for display per UX design system.
 *
 * Time formatting rules:
 * - < 60 min: Minutes only (e.g., "23m")
 * - 1-24 hours: Hours + minutes (e.g., "1h 23m")
 * - > 24 hours: Days + hours (e.g., "2d 6h")
 * - Breached: "BREACHED (X over)" format (e.g., "BREACHED (2h 15m ago)")
 *
 * @param minutes - Time in minutes (negative for breached)
 * @param breached - Whether the SLA is breached (optional, inferred from negative minutes)
 * @returns Formatted time string
 */
export function formatSlaTime(minutes: number, breached?: boolean): string {
  const isBreached = breached ?? minutes < 0;
  const absMinutes = Math.abs(minutes);

  const formatDuration = (mins: number): string => {
    if (mins < 60) {
      return `${mins}m`;
    } else if (mins < 24 * 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
    } else {
      const days = Math.floor(mins / (24 * 60));
      const remainingHours = Math.floor((mins % (24 * 60)) / 60);
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
  };

  if (isBreached) {
    return `BREACHED (${formatDuration(absMinutes)} ago)`;
  }

  return formatDuration(absMinutes);
}

/**
 * Get the most urgent SLA timer for display in ping list.
 *
 * Priority:
 * 1. If First Response not met: Show First Response timer
 * 2. If First Response met: Show Resolution timer
 *
 * @param ping - Ping with SLA fields
 * @returns The most urgent timer state and its type
 */
export function getMostUrgentTimer(ping: Ping): {
  timer: SlaTimerState;
  type: 'first_response' | 'resolution';
} {
  const firstResponseState = getFirstResponseSlaState(ping);
  const resolutionState = getResolutionSlaState(ping);

  // If first response not yet made, show first response timer
  if (!ping.first_response_at) {
    return { timer: firstResponseState, type: 'first_response' };
  }

  // First response made, show resolution timer
  return { timer: resolutionState, type: 'resolution' };
}
