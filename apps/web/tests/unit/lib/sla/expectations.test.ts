/**
 * Unit tests for SLA Expectations (Story 5.3)
 *
 * Tests the user-friendly response time formatting and expectation messages.
 */

import { describe, it, expect } from 'vitest';
import type { Ping } from '@easyping/types';
import {
  formatDurationFriendly,
  formatDurationCompact,
  getExpectedResponseTime,
  getResolvedDuration,
  getCreationConfirmationMessage,
  getResolutionMessage,
} from '@/lib/sla/expectations';

/**
 * Create a mock ping for testing.
 */
function createMockPing(overrides: Partial<Ping> = {}): Ping {
  const now = new Date();

  return {
    id: 'ping-1',
    tenant_id: 'tenant-1',
    ping_number: 1,
    title: 'Test Ping',
    status: 'open',
    priority: 'medium',
    channel: 'web',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    created_by: 'user-1',
    assigned_to: null,
    assigned_team: null,
    category_id: null,
    sla_first_response_due: null,
    sla_resolution_due: null,
    first_response_at: null,
    resolved_at: null,
    sla_paused_at: null,
    sla_paused_duration_ms: 0,
    ...overrides,
  } as Ping;
}

describe('formatDurationFriendly', () => {
  it('should format 1 minute correctly', () => {
    expect(formatDurationFriendly(1)).toBe('1 minute');
  });

  it('should format multiple minutes correctly', () => {
    expect(formatDurationFriendly(30)).toBe('30 minutes');
  });

  it('should format 60 minutes as 1 hour', () => {
    expect(formatDurationFriendly(60)).toBe('1 hour');
  });

  it('should format multiple hours correctly', () => {
    expect(formatDurationFriendly(120)).toBe('2 hours');
  });

  it('should round minutes to hours', () => {
    expect(formatDurationFriendly(90)).toBe('2 hours'); // Rounds 1.5 to 2
  });

  it('should format 24 hours as 1 day', () => {
    expect(formatDurationFriendly(1440)).toBe('1 day');
  });

  it('should format multiple days correctly', () => {
    expect(formatDurationFriendly(2880)).toBe('2 days');
  });
});

describe('formatDurationCompact', () => {
  it('should format minutes compactly', () => {
    expect(formatDurationCompact(30)).toBe('30m');
  });

  it('should format 1 hour as 1h', () => {
    expect(formatDurationCompact(60)).toBe('1h');
  });

  it('should format hours and minutes compactly', () => {
    expect(formatDurationCompact(90)).toBe('1h 30m');
  });

  it('should format 2 hours as 2h', () => {
    expect(formatDurationCompact(120)).toBe('2h');
  });

  it('should format hours and minutes with remainder', () => {
    expect(formatDurationCompact(135)).toBe('2h 15m');
  });

  it('should format 1 day correctly', () => {
    expect(formatDurationCompact(1440)).toBe('1 day');
  });

  it('should format multiple days correctly', () => {
    expect(formatDurationCompact(2880)).toBe('2 days');
  });

  it('should format days and hours correctly', () => {
    expect(formatDurationCompact(1560)).toBe('1d 2h'); // 26 hours = 1 day 2 hours
  });
});

describe('getExpectedResponseTime', () => {
  it('should return null when no SLA configured', () => {
    const ping = createMockPing({
      sla_first_response_due: null,
    });

    expect(getExpectedResponseTime(ping)).toBeNull();
  });

  it('should return formatted duration based on SLA due date', () => {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const ping = createMockPing({
      created_at: now.toISOString(),
      sla_first_response_due: twoHoursFromNow.toISOString(),
    });

    expect(getExpectedResponseTime(ping)).toBe('2 hours');
  });

  it('should return null when due date is in the past', () => {
    const now = new Date();
    const pastDue = new Date(now.getTime() - 1 * 60 * 60 * 1000);

    const ping = createMockPing({
      created_at: now.toISOString(),
      sla_first_response_due: pastDue.toISOString(),
    });

    expect(getExpectedResponseTime(ping)).toBeNull();
  });
});

describe('getResolvedDuration', () => {
  it('should return null when ping is not resolved', () => {
    const ping = createMockPing({
      resolved_at: null,
    });

    expect(getResolvedDuration(ping)).toBeNull();
  });

  it('should return "just now" for very quick resolution', () => {
    const now = new Date();

    const ping = createMockPing({
      created_at: now.toISOString(),
      resolved_at: now.toISOString(),
    });

    expect(getResolvedDuration(ping)).toBe('just now');
  });

  it('should return compact duration for resolved ping', () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const ping = createMockPing({
      created_at: twoHoursAgo.toISOString(),
      resolved_at: now.toISOString(),
    });

    expect(getResolvedDuration(ping)).toBe('2h');
  });

  it('should handle hours and minutes', () => {
    const now = new Date();
    const start = new Date(now.getTime() - (2 * 60 + 15) * 60 * 1000); // 2h 15m ago

    const ping = createMockPing({
      created_at: start.toISOString(),
      resolved_at: now.toISOString(),
    });

    expect(getResolvedDuration(ping)).toBe('2h 15m');
  });
});

describe('getCreationConfirmationMessage', () => {
  it('should return message with expected response time', () => {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const ping = createMockPing({
      created_at: now.toISOString(),
      sla_first_response_due: twoHoursFromNow.toISOString(),
    });

    expect(getCreationConfirmationMessage(ping)).toBe(
      'Ticket created! We typically respond within 2 hours.'
    );
  });

  it('should return generic message when no SLA configured', () => {
    const ping = createMockPing({
      sla_first_response_due: null,
    });

    expect(getCreationConfirmationMessage(ping)).toBe(
      "Ticket created! We'll get back to you as soon as possible."
    );
  });
});

describe('getResolutionMessage', () => {
  it('should return null when ping is not resolved', () => {
    const ping = createMockPing({
      resolved_at: null,
    });

    expect(getResolutionMessage(ping)).toBeNull();
  });

  it('should return "Resolved in X" message', () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const ping = createMockPing({
      created_at: twoHoursAgo.toISOString(),
      resolved_at: now.toISOString(),
    });

    expect(getResolutionMessage(ping)).toBe('Resolved in 2h');
  });
});
