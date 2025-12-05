/**
 * AI Error Handling and Graceful Fallback
 *
 * Provides utilities for handling AI provider failures gracefully
 * without breaking the application.
 */

import type { AIProviderError } from './providers/base';

/**
 * Failure tracking for organizations
 * Maps organization ID to consecutive failure count
 */
const failureCounts = new Map<string, number>();

/**
 * Threshold for disabling AI features after consecutive failures
 */
const FAILURE_THRESHOLD = 5;

/**
 * Executes an AI function with graceful fallback on failure
 *
 * @param fn - Async function to execute (AI provider method)
 * @param fallback - Fallback value to return on failure
 * @param orgId - Optional organization ID for failure tracking
 * @returns Result of function or fallback value
 *
 * @example
 * ```typescript
 * const category = await withFallback(
 *   () => provider.categorize(messages),
 *   { category: 'Other', confidence: 0 },
 *   orgId
 * );
 * ```
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  orgId?: string
): Promise<T> {
  try {
    const result = await fn();

    // Reset failure count on success
    if (orgId) {
      failureCounts.set(orgId, 0);
    }

    return result;
  } catch (error) {
    // Log error with context
    const errorDetails = formatAIError(error);
    console.error('AI operation failed:', errorDetails);

    // Track consecutive failures
    if (orgId) {
      const currentCount = failureCounts.get(orgId) || 0;
      const newCount = currentCount + 1;
      failureCounts.set(orgId, newCount);

      // Log warning if approaching threshold
      if (newCount >= FAILURE_THRESHOLD) {
        console.warn(
          `Organization ${orgId} has ${newCount} consecutive AI failures. AI features should be disabled.`
        );
      }
    }

    // Return fallback value
    return fallback;
  }
}

/**
 * Checks if AI features should be disabled for an organization
 * based on consecutive failure count
 *
 * @param orgId - Organization ID
 * @returns True if AI should be disabled (5+ consecutive failures)
 */
export function shouldDisableAI(orgId: string): boolean {
  const failureCount = failureCounts.get(orgId) || 0;
  return failureCount >= FAILURE_THRESHOLD;
}

/**
 * Resets failure count for an organization
 * (called when admin re-enables AI in settings)
 *
 * @param orgId - Organization ID
 */
export function resetFailureCount(orgId: string): void {
  failureCounts.set(orgId, 0);
}

/**
 * Gets current failure count for an organization
 *
 * @param orgId - Organization ID
 * @returns Number of consecutive failures
 */
export function getFailureCount(orgId: string): number {
  return failureCounts.get(orgId) || 0;
}

/**
 * Formats AI error for logging
 *
 * @param error - Error object (AIProviderError or generic Error)
 * @returns Formatted error details
 */
function formatAIError(error: unknown): {
  provider: string;
  code: string;
  message: string;
  retryable: boolean;
  timestamp: string;
} {
  const timestamp = new Date().toISOString();

  // Handle AIProviderError
  if (isAIProviderError(error)) {
    return {
      provider: error.provider,
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      timestamp,
    };
  }

  // Handle generic Error
  if (error instanceof Error) {
    return {
      provider: 'unknown',
      code: 'UNKNOWN_ERROR',
      message: error.message,
      retryable: true,
      timestamp,
    };
  }

  // Handle unknown error types
  return {
    provider: 'unknown',
    code: 'UNKNOWN_ERROR',
    message: String(error),
    retryable: true,
    timestamp,
  };
}

/**
 * Type guard for AIProviderError
 *
 * @param error - Error to check
 * @returns True if error is AIProviderError
 */
function isAIProviderError(error: unknown): error is AIProviderError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'provider' in error &&
    'code' in error &&
    'retryable' in error
  );
}
