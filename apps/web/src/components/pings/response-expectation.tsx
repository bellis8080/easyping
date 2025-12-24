'use client';

/**
 * Response Expectation Component (Story 5.3)
 *
 * Displays user-friendly response time expectations for end users.
 * No SLA terminology is exposed - just friendly messages.
 */

import type { Ping } from '@easyping/types';
import { CheckCircle2, Clock } from 'lucide-react';
import {
  getCreationConfirmationMessage,
  getResolutionMessage,
} from '@/lib/sla/expectations';

export interface ResponseExpectationProps {
  ping: Ping;
  variant: 'creation' | 'detail' | 'resolved';
}

/**
 * Format relative time (e.g., "15 minutes ago").
 */
function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return 'just now';
  }

  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
}

/**
 * ResponseExpectation - Displays response time expectations for end users.
 *
 * Variants:
 * - `creation`: Shown after ping submission with expected response time
 * - `detail`: Shows when the ping was created (relative time)
 * - `resolved`: Shows how long it took to resolve the ping
 */
export function ResponseExpectation({
  ping,
  variant,
}: ResponseExpectationProps) {
  if (variant === 'creation') {
    const message = getCreationConfirmationMessage(ping);

    return (
      <div
        className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-green-800 dark:bg-green-900/20 dark:text-green-200"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
        <span className="text-sm font-medium">{message}</span>
      </div>
    );
  }

  if (variant === 'detail') {
    const relativeTime = formatRelativeTime(ping.created_at);

    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span className="text-sm">Created {relativeTime}</span>
      </div>
    );
  }

  if (variant === 'resolved') {
    const message = getResolutionMessage(ping);

    if (!message) {
      return null;
    }

    return (
      <div
        className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-green-800 dark:bg-green-900/20 dark:text-green-200"
        role="status"
      >
        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
        <span className="text-sm font-medium">{message}</span>
      </div>
    );
  }

  return null;
}
