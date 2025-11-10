/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Checks the health of EasyPing application and its dependencies:
 * - Database connectivity (PostgreSQL via PostgREST)
 * - Supabase Auth service (GoTrue)
 * - Supabase Storage service (currently disabled)
 *
 * Returns 200 OK if all services are healthy
 * Returns 503 Service Unavailable if any service is unhealthy
 */

import { NextResponse } from 'next/server';

// Timeout for health checks (5 seconds)
const HEALTH_CHECK_TIMEOUT = 5000;

interface ServiceHealth {
  database: 'healthy' | 'unhealthy';
  auth: 'healthy' | 'unhealthy';
  storage: 'healthy' | 'unhealthy';
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: ServiceHealth;
  version: string;
  error?: string;
}

/**
 * Runs a function with a timeout
 */
async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), timeoutMs);
  });

  return Promise.race([Promise.resolve(promise), timeoutPromise]);
}

/**
 * Check database connectivity via PostgREST
 */
async function checkDatabase(): Promise<'healthy' | 'unhealthy'> {
  try {
    // Use internal SUPABASE_URL for server-side checks (direct to PostgREST)
    // Falls back to NEXT_PUBLIC_SUPABASE_URL for local dev
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      console.error('Health check: Supabase URL not configured');
      return 'unhealthy';
    }

    // Check if PostgREST is responding (GET /)
    const response = await withTimeout(
      fetch(supabaseUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT),
      }),
      HEALTH_CHECK_TIMEOUT
    );

    // PostgREST root endpoint returns 404, which is expected and means it's running
    // Accept both 200 and 404 as healthy responses
    if (response.ok || response.status === 404) {
      return 'healthy';
    }

    console.error('Health check: PostgREST returned status:', response.status);
    return 'unhealthy';
  } catch (error) {
    console.error('Health check: Database check failed:', error);
    return 'unhealthy';
  }
}

/**
 * Check Supabase Auth service (GoTrue)
 */
async function checkAuth(): Promise<'healthy' | 'unhealthy'> {
  try {
    // Determine auth URL based on environment
    // Local dev: use Supabase local instance
    // Docker: use internal Docker hostname
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      console.error('Health check: Supabase URL not configured');
      return 'unhealthy';
    }

    // Build auth health URL from Supabase URL
    // For local dev: http://localhost:54321/auth/v1/health or http://127.0.0.1:54321/auth/v1/health
    // For Docker: http://gotrue:9999/health (uses SUPABASE_URL internal endpoint)
    const isLocalDev =
      supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');
    const authUrl = isLocalDev
      ? `${supabaseUrl}/auth/v1/health`
      : 'http://gotrue:9999/health';

    const response = await withTimeout(
      fetch(authUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT),
      }),
      HEALTH_CHECK_TIMEOUT
    );

    if (response.ok) {
      return 'healthy';
    }

    console.error('Health check: GoTrue returned status:', response.status);
    return 'unhealthy';
  } catch (error) {
    console.error('Health check: Auth check failed:', error);
    return 'unhealthy';
  }
}

/**
 * Check Supabase Storage service
 */
async function checkStorage(): Promise<'healthy' | 'unhealthy'> {
  // Storage is currently disabled in docker-compose.yml
  // Return healthy to not block overall health status
  return 'healthy';

  // Uncomment when storage is enabled:
  /*
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return 'unhealthy';
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if storage service is reachable by listing buckets
    const result = await withTimeout(supabase.storage.listBuckets(), HEALTH_CHECK_TIMEOUT);

    if ('error' in result && result.error) {
      console.error('Health check: Storage service check failed:', result.error.message);
      return 'unhealthy';
    }

    return 'healthy';
  } catch (error) {
    console.error('Health check: Storage check failed:', error);
    return 'unhealthy';
  }
  */
}

/**
 * GET /api/health
 * Health check endpoint
 */
export async function GET() {
  try {
    // Run all health checks in parallel
    const [databaseHealth, authHealth, storageHealth] = await Promise.all([
      checkDatabase(),
      checkAuth(),
      checkStorage(),
    ]);

    const services: ServiceHealth = {
      database: databaseHealth,
      auth: authHealth,
      storage: storageHealth,
    };

    // Determine overall status
    const allHealthy = Object.values(services).every(
      (status) => status === 'healthy'
    );
    const overallStatus = allHealthy ? 'healthy' : 'unhealthy';

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      version: process.env.npm_package_version || '1.0.0',
    };

    // Add error message if any service is unhealthy
    if (!allHealthy) {
      const unhealthyServices = Object.entries(services)
        .filter(([_, status]) => status === 'unhealthy')
        .map(([service, _]) => service);

      response.error = `Unhealthy services: ${unhealthyServices.join(', ')}`;
    }

    // Return 503 if unhealthy, 200 if healthy
    const statusCode = allHealthy ? 200 : 503;

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // Catch-all error handler
    console.error('Health check: Unexpected error:', error);

    const response: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unhealthy',
        auth: 'unhealthy',
        storage: 'unhealthy',
      },
      version: process.env.npm_package_version || '1.0.0',
      error: 'Health check failed with unexpected error',
    };

    return NextResponse.json(response, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  }
}
