/**
 * E2E tests for health check endpoint
 *
 * Test coverage:
 * - `/api/health` returns 200 when services healthy
 * - Response includes all required fields
 * - Can be called without authentication
 */

import { test, expect } from '@playwright/test';

test.describe('Health Check Endpoint', () => {
  test('/api/health returns 200 when services are healthy', async ({
    request,
  }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('healthy');
  });

  test('health response includes all required fields', async ({ request }) => {
    const response = await request.get('/api/health');
    const body = await response.json();

    // Expect required fields
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('services');
    expect(body).toHaveProperty('version');

    // Expect services to have database, auth, storage
    expect(body.services).toHaveProperty('database');
    expect(body.services).toHaveProperty('auth');
    expect(body.services).toHaveProperty('storage');
  });

  test('health endpoint can be called without authentication', async ({
    request,
  }) => {
    // Make request WITHOUT auth headers
    const response = await request.get('/api/health');

    // Expect successful response (no 401/403)
    expect(response.status()).toBe(200);

    // Expect valid health check data
    const body = await response.json();
    expect(body.status).toBe('healthy');
  });
});
