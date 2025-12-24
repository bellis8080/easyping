'use client';

/**
 * SlaTimerDisplay Component (Story 5.2 Task 9.2)
 *
 * Displays both First Response and Resolution SLA timers in the ping detail toolbar.
 * Shows full context for each timer with status icons and time information.
 *
 * Timer states per wireframes:
 * - Before first response: "First response due in 1h 23m"
 * - After first response: "First response: 45m (within SLA)" with checkmark
 * - When Waiting on User: "Resolution timer paused" with pause icon
 * - When breached: "First response BREACHED (2h 15m ago)" with X icon
 *
 * Accessibility:
 * - Uses aria-live="polite" for dynamic updates
 * - Icons paired with text labels
 * - Lucide React icons per UX spec
 */

import { useEffect, useState, useMemo } from 'react';
import { Clock, CheckCircle, Pause, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Ping, SlaTimerStatus } from '@easyping/types';
import {
  getFirstResponseSlaState,
  getResolutionSlaState,
  formatSlaTime,
} from '@/lib/sla';

interface SlaTimerDisplayProps {
  ping: Ping;
  className?: string;
}

const STATUS_STYLES: Record<
  SlaTimerStatus,
  { textColor: string; Icon: typeof Clock }
> = {
  on_track: { textColor: 'text-green-600', Icon: Clock },
  at_risk: { textColor: 'text-yellow-600', Icon: Clock },
  breached: { textColor: 'text-red-600', Icon: XCircle },
  completed: { textColor: 'text-gray-600', Icon: CheckCircle },
  paused: { textColor: 'text-blue-600', Icon: Pause },
};

interface TimerItemProps {
  label: string;
  status: SlaTimerStatus;
  timeRemainingMinutes: number | null;
  timeTakenMinutes: number | null;
  timeOverMinutes: number | null;
}

function TimerItem({
  label,
  status,
  timeRemainingMinutes,
  timeTakenMinutes,
  timeOverMinutes,
}: TimerItemProps) {
  const { textColor, Icon } = STATUS_STYLES[status];

  // Build display text based on state
  let displayText: string;

  if (status === 'completed') {
    const time = timeTakenMinutes
      ? formatSlaTime(timeTakenMinutes, false)
      : 'N/A';
    displayText = `${label}: ${time} (within SLA)`;
  } else if (status === 'breached') {
    // Use timeOverMinutes if available, otherwise calculate from negative timeRemainingMinutes
    const overTime =
      timeOverMinutes ??
      (timeRemainingMinutes !== null ? Math.abs(timeRemainingMinutes) : 0);
    displayText = `${label} BREACHED (${formatSlaTime(overTime, false)} ago)`;
  } else if (status === 'paused') {
    displayText = `${label} timer paused (waiting on user)`;
  } else if (timeRemainingMinutes !== null) {
    displayText = `${label} due in ${formatSlaTime(timeRemainingMinutes, false)}`;
  } else {
    displayText = `${label}: No SLA`;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-sm font-medium',
        'transition-colors duration-500 ease-in-out motion-reduce:transition-none',
        textColor
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{displayText}</span>
    </div>
  );
}

export function SlaTimerDisplay({ ping, className }: SlaTimerDisplayProps) {
  const [, setRefreshCount] = useState(0);

  // Auto-refresh timer every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshCount((c) => c + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Calculate timer states
  const firstResponseState = useMemo(
    () => getFirstResponseSlaState(ping),
    [ping]
  );

  const resolutionState = useMemo(() => getResolutionSlaState(ping), [ping]);

  // Don't show if no SLA configured
  if (!ping.sla_first_response_due && !ping.sla_resolution_due) {
    return null;
  }

  return (
    <div
      className={cn('flex flex-col gap-1 sm:flex-row sm:gap-4', className)}
      aria-live="polite"
      aria-label="SLA timers"
    >
      {ping.sla_first_response_due && (
        <TimerItem
          label="First response"
          status={firstResponseState.status}
          timeRemainingMinutes={firstResponseState.time_remaining_minutes}
          timeTakenMinutes={firstResponseState.time_taken_minutes}
          timeOverMinutes={firstResponseState.time_over_minutes}
        />
      )}

      {ping.sla_resolution_due && (
        <TimerItem
          label="Resolution"
          status={resolutionState.status}
          timeRemainingMinutes={resolutionState.time_remaining_minutes}
          timeTakenMinutes={resolutionState.time_taken_minutes}
          timeOverMinutes={resolutionState.time_over_minutes}
        />
      )}
    </div>
  );
}
