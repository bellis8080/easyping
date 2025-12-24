'use client';

/**
 * SlaTimerBadge Component (Story 5.2 Task 9.1)
 *
 * Displays the most urgent SLA timer as a compact badge in the ping list.
 * Shows First Response timer if not yet responded, otherwise Resolution timer.
 *
 * Color coding per UX spec:
 * - Green (on_track): >50% time remaining
 * - Yellow (at_risk): 20-50% time remaining
 * - Red (breached): <20% or past due
 *
 * Accessibility:
 * - Uses icon + text (not color alone) per WCAG 2.1 AA
 * - ARIA labels for screen readers
 * - Respects prefers-reduced-motion
 */

import { useEffect, useState, useMemo } from 'react';
import { Clock, CheckCircle, Pause, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Ping, SlaTimerStatus } from '@easyping/types';
import {
  getMostUrgentTimer,
  getFirstResponseSlaState,
  getResolutionSlaState,
  formatSlaTime,
} from '@/lib/sla';

interface SlaTimerBadgeProps {
  ping: Ping;
  showTooltip?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  SlaTimerStatus,
  {
    bgColor: string;
    textColor: string;
    borderColor: string;
    Icon: typeof Clock;
  }
> = {
  on_track: {
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    Icon: Clock,
  },
  at_risk: {
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    Icon: Clock,
  },
  breached: {
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    Icon: XCircle,
  },
  completed: {
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-200',
    Icon: CheckCircle,
  },
  paused: {
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    Icon: Pause,
  },
};

export function SlaTimerBadge({
  ping,
  showTooltip = true,
  className,
}: SlaTimerBadgeProps) {
  const [, setRefreshCount] = useState(0);

  // Auto-refresh timer every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshCount((c) => c + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Get the most urgent timer state
  const { timer, type } = useMemo(() => getMostUrgentTimer(ping), [ping]);

  // Don't show badge if no SLA configured
  if (!ping.sla_first_response_due && !ping.sla_resolution_due) {
    return null;
  }

  // Don't show badge if both timers completed
  if (ping.first_response_at && ping.resolved_at) {
    return null;
  }

  const config = STATUS_CONFIG[timer.status];
  const { Icon } = config;

  // Format the display text
  let displayText: string;
  if (timer.status === 'paused') {
    displayText = 'Paused';
  } else if (timer.status === 'completed') {
    displayText = timer.time_taken_minutes
      ? formatSlaTime(timer.time_taken_minutes, false)
      : 'Done';
  } else if (timer.time_remaining_minutes !== null) {
    displayText = formatSlaTime(
      timer.time_remaining_minutes,
      timer.status === 'breached'
    );
  } else {
    displayText = '--';
  }

  // Generate ARIA label
  const timerTypeLabel =
    type === 'first_response' ? 'First response' : 'Resolution';
  const statusLabel =
    timer.status === 'breached'
      ? 'breached'
      : timer.status === 'at_risk'
        ? 'at risk'
        : timer.status === 'on_track'
          ? 'on track'
          : timer.status === 'paused'
            ? 'paused'
            : 'completed';
  const ariaLabel = `SLA: ${timerTypeLabel} ${displayText}, ${statusLabel}`;

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        'transition-colors duration-500 ease-in-out motion-reduce:transition-none',
        config.bgColor,
        config.textColor,
        config.borderColor,
        className
      )}
      aria-label={ariaLabel}
      role="status"
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span>{displayText}</span>
    </span>
  );

  if (!showTooltip) {
    return badge;
  }

  // Get both timer states for tooltip
  const firstResponseState = getFirstResponseSlaState(ping);
  const resolutionState = getResolutionSlaState(ping);

  const formatTooltipLine = (
    label: string,
    state: ReturnType<typeof getFirstResponseSlaState>
  ): string => {
    if (state.status === 'completed') {
      const time = state.time_taken_minutes
        ? formatSlaTime(state.time_taken_minutes, false)
        : 'N/A';
      return `${label}: ${time} (within SLA)`;
    }
    if (state.status === 'breached' && state.completed_at) {
      // Breached but completed (late response/resolution)
      const time = state.time_taken_minutes
        ? formatSlaTime(state.time_taken_minutes, false)
        : 'N/A';
      return `${label}: ${time} (over SLA)`;
    }
    if (state.status === 'paused') {
      return `${label}: Paused (waiting on user)`;
    }
    if (state.time_remaining_minutes !== null) {
      return `${label}: ${formatSlaTime(state.time_remaining_minutes, state.status === 'breached')} remaining`;
    }
    return `${label}: No SLA`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs bg-slate-900 text-white border-slate-700">
          <div className="space-y-1 text-sm">
            <p>{formatTooltipLine('First response', firstResponseState)}</p>
            <p>{formatTooltipLine('Resolution', resolutionState)}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
