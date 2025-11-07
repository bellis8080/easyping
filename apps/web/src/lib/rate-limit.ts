/**
 * Simple in-memory rate limiter for API endpoints
 * For production, consider using Redis for distributed rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (entry.resetAt < now) {
        rateLimitMap.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed within the window
   */
  limit: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;
}

export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;

  /**
   * Number of requests remaining in the current window
   */
  remaining: number;

  /**
   * Time when the rate limit will reset (Unix timestamp in ms)
   */
  resetAt: number;
}

/**
 * Check if a request is within rate limits
 *
 * @param identifier - Unique identifier for the client (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  // No existing entry - create new one
  if (!entry) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });

    return {
      allowed: true,
      remaining: config.limit - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Entry exists but window has expired - reset
  if (entry.resetAt < now) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });

    return {
      allowed: true,
      remaining: config.limit - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Entry exists and window is still active - increment count
  entry.count++;

  return {
    allowed: entry.count <= config.limit,
    remaining: Math.max(0, config.limit - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header if available, otherwise falls back to connection IP
 *
 * @param request - Next.js request object
 * @returns Client IP address
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from common proxy headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to a constant for local development
  // In production behind a proxy, one of the above headers should be set
  return 'unknown-client';
}
