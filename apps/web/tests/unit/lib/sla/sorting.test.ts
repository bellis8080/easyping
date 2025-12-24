/**
 * SLA Sorting Tests (Story 5.3)
 *
 * Tests for the SLA risk sorting utility functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateSlaRiskScore, sortBySlaRisk } from '@/lib/sla/sorting';
import type { Ping } from '@easyping/types';

// Helper to create a mock ping with SLA fields
function createMockPing(overrides: Partial<Ping> = {}): Ping {
  const now = new Date();
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  return {
    id: 'ping-1',
    ping_number: 1,
    title: 'Test Ping',
    status: 'open',
    priority: 'normal',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    tenant_id: 'tenant-1',
    created_by: 'user-1',
    assigned_to: null,
    category_id: null,
    sla_policy_id: 'policy-1',
    sla_first_response_due: twoHoursFromNow.toISOString(),
    sla_resolution_due: new Date(
      now.getTime() + 8 * 60 * 60 * 1000
    ).toISOString(),
    first_response_at: null,
    resolved_at: null,
    sla_paused_at: null,
    sla_paused_duration_minutes: 0,
    ai_summary: null,
    ...overrides,
  } as Ping;
}

describe('calculateSlaRiskScore', () => {
  beforeEach(() => {
    // Mock Date.now for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('breached pings', () => {
    it('should return 0 for breached first response SLA', () => {
      // First response due 1 hour ago (breached)
      const ping = createMockPing({
        created_at: new Date('2024-01-15T09:00:00Z').toISOString(),
        sla_first_response_due: new Date('2024-01-15T11:00:00Z').toISOString(),
        first_response_at: null,
      });

      expect(calculateSlaRiskScore(ping)).toBe(0);
    });

    it('should return 0 for breached resolution SLA', () => {
      // Resolution due 1 hour ago (breached), first response already made
      const ping = createMockPing({
        created_at: new Date('2024-01-15T02:00:00Z').toISOString(),
        sla_first_response_due: new Date('2024-01-15T04:00:00Z').toISOString(),
        first_response_at: new Date('2024-01-15T03:00:00Z').toISOString(),
        sla_resolution_due: new Date('2024-01-15T11:00:00Z').toISOString(),
        resolved_at: null,
      });

      expect(calculateSlaRiskScore(ping)).toBe(0);
    });
  });

  describe('red zone (at-risk) pings', () => {
    it('should return score 1-20 for pings in red zone (<20% remaining)', () => {
      // Created 2 hours ago, due in 20 minutes (16.7% remaining of 2h 20m)
      const ping = createMockPing({
        created_at: new Date('2024-01-15T10:00:00Z').toISOString(),
        sla_first_response_due: new Date('2024-01-15T12:20:00Z').toISOString(),
        first_response_at: null,
      });

      const score = calculateSlaRiskScore(ping);
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(20);
    });

    it('should give lower score to more urgent pings in red zone', () => {
      // Ping A: 5% remaining
      const pingA = createMockPing({
        id: 'ping-a',
        created_at: new Date('2024-01-15T10:00:00Z').toISOString(),
        sla_first_response_due: new Date('2024-01-15T12:06:00Z').toISOString(),
        first_response_at: null,
      });

      // Ping B: 15% remaining
      const pingB = createMockPing({
        id: 'ping-b',
        created_at: new Date('2024-01-15T10:00:00Z').toISOString(),
        sla_first_response_due: new Date('2024-01-15T12:18:00Z').toISOString(),
        first_response_at: null,
      });

      expect(calculateSlaRiskScore(pingA)).toBeLessThan(
        calculateSlaRiskScore(pingB)
      );
    });
  });

  describe('yellow zone pings', () => {
    it('should return score 21-50 for pings in yellow zone (20-50% remaining)', () => {
      // Created 2 hours ago, due in 50 minutes (29% remaining of ~2.8h)
      const ping = createMockPing({
        created_at: new Date('2024-01-15T10:00:00Z').toISOString(),
        sla_first_response_due: new Date('2024-01-15T12:50:00Z').toISOString(),
        first_response_at: null,
      });

      const score = calculateSlaRiskScore(ping);
      expect(score).toBeGreaterThanOrEqual(21);
      expect(score).toBeLessThanOrEqual(50);
    });

    it('should score yellow zone higher than red zone', () => {
      // Red zone: 15% remaining
      const redPing = createMockPing({
        id: 'red-ping',
        created_at: new Date('2024-01-15T10:00:00Z').toISOString(),
        sla_first_response_due: new Date('2024-01-15T12:18:00Z').toISOString(),
        first_response_at: null,
      });

      // Yellow zone: 35% remaining
      const yellowPing = createMockPing({
        id: 'yellow-ping',
        created_at: new Date('2024-01-15T10:00:00Z').toISOString(),
        sla_first_response_due: new Date('2024-01-15T13:00:00Z').toISOString(),
        first_response_at: null,
      });

      expect(calculateSlaRiskScore(redPing)).toBeLessThan(
        calculateSlaRiskScore(yellowPing)
      );
    });
  });

  describe('green zone pings', () => {
    it('should return score 51-100 for pings in green zone (>50% remaining)', () => {
      // Created now, due in 2 hours (100% remaining)
      const ping = createMockPing({
        created_at: new Date('2024-01-15T12:00:00Z').toISOString(),
        sla_first_response_due: new Date('2024-01-15T14:00:00Z').toISOString(),
        first_response_at: null,
      });

      const score = calculateSlaRiskScore(ping);
      expect(score).toBeGreaterThanOrEqual(51);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should score green zone higher than yellow zone', () => {
      // Yellow zone: 35% remaining
      const yellowPing = createMockPing({
        id: 'yellow-ping',
        created_at: new Date('2024-01-15T10:00:00Z').toISOString(),
        sla_first_response_due: new Date('2024-01-15T13:05:00Z').toISOString(),
        first_response_at: null,
      });

      // Green zone: 75% remaining
      const greenPing = createMockPing({
        id: 'green-ping',
        created_at: new Date('2024-01-15T12:00:00Z').toISOString(),
        sla_first_response_due: new Date('2024-01-15T16:00:00Z').toISOString(),
        first_response_at: null,
      });

      expect(calculateSlaRiskScore(yellowPing)).toBeLessThan(
        calculateSlaRiskScore(greenPing)
      );
    });
  });

  describe('no SLA pings', () => {
    it('should return 999 for pings without SLA policy', () => {
      const ping = createMockPing({
        sla_policy_id: null,
        sla_first_response_due: null,
        sla_resolution_due: null,
      });

      expect(calculateSlaRiskScore(ping)).toBe(999);
    });

    it('should sort pings without SLA last', () => {
      const noSlaPing = createMockPing({
        id: 'no-sla',
        sla_policy_id: null,
        sla_first_response_due: null,
        sla_resolution_due: null,
      });

      const slaPing = createMockPing({
        id: 'with-sla',
        created_at: new Date('2024-01-15T12:00:00Z').toISOString(),
        sla_first_response_due: new Date('2024-01-15T16:00:00Z').toISOString(),
      });

      expect(calculateSlaRiskScore(noSlaPing)).toBeGreaterThan(
        calculateSlaRiskScore(slaPing)
      );
    });
  });

  describe('paused timers', () => {
    it('should return 500 for paused resolution SLA', () => {
      const ping = createMockPing({
        sla_paused_at: new Date('2024-01-15T11:00:00Z').toISOString(),
        first_response_at: new Date('2024-01-15T10:30:00Z').toISOString(),
      });

      expect(calculateSlaRiskScore(ping)).toBe(500);
    });

    it('should score paused timers lower priority than active at-risk timers', () => {
      // Paused ping
      const pausedPing = createMockPing({
        id: 'paused',
        sla_paused_at: new Date('2024-01-15T11:00:00Z').toISOString(),
        first_response_at: new Date('2024-01-15T10:30:00Z').toISOString(),
      });

      // At-risk (red zone) ping
      const atRiskPing = createMockPing({
        id: 'at-risk',
        created_at: new Date('2024-01-15T10:00:00Z').toISOString(),
        sla_first_response_due: new Date('2024-01-15T12:15:00Z').toISOString(),
        first_response_at: null,
      });

      expect(calculateSlaRiskScore(atRiskPing)).toBeLessThan(
        calculateSlaRiskScore(pausedPing)
      );
    });

    it('should score paused timers higher priority than no SLA', () => {
      const pausedPing = createMockPing({
        id: 'paused',
        sla_paused_at: new Date('2024-01-15T11:00:00Z').toISOString(),
        first_response_at: new Date('2024-01-15T10:30:00Z').toISOString(),
      });

      const noSlaPing = createMockPing({
        id: 'no-sla',
        sla_policy_id: null,
        sla_first_response_due: null,
        sla_resolution_due: null,
      });

      expect(calculateSlaRiskScore(pausedPing)).toBeLessThan(
        calculateSlaRiskScore(noSlaPing)
      );
    });
  });

  describe('uses most urgent timer', () => {
    it('should use first response timer when not yet responded', () => {
      // First response due soon (at-risk), resolution due much later
      const ping = createMockPing({
        created_at: new Date('2024-01-15T10:00:00Z').toISOString(),
        sla_first_response_due: new Date('2024-01-15T12:15:00Z').toISOString(),
        sla_resolution_due: new Date('2024-01-15T20:00:00Z').toISOString(),
        first_response_at: null,
      });

      const score = calculateSlaRiskScore(ping);
      // Should be in red/yellow zone (first response is urgent)
      expect(score).toBeLessThan(50);
    });

    it('should use resolution timer when first response is made', () => {
      // First response already made, resolution is what matters now
      const ping = createMockPing({
        created_at: new Date('2024-01-15T04:00:00Z').toISOString(),
        sla_first_response_due: new Date('2024-01-15T06:00:00Z').toISOString(),
        sla_resolution_due: new Date('2024-01-15T12:15:00Z').toISOString(),
        first_response_at: new Date('2024-01-15T05:00:00Z').toISOString(),
        resolved_at: null,
      });

      const score = calculateSlaRiskScore(ping);
      // Resolution timer is at-risk, should be low score
      expect(score).toBeLessThan(20);
    });
  });
});

describe('sortBySlaRisk', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should sort breached pings first', () => {
    const breachedPing = createMockPing({
      id: 'breached',
      created_at: new Date('2024-01-15T08:00:00Z').toISOString(),
      sla_first_response_due: new Date('2024-01-15T10:00:00Z').toISOString(),
    });

    const onTrackPing = createMockPing({
      id: 'on-track',
      created_at: new Date('2024-01-15T12:00:00Z').toISOString(),
      sla_first_response_due: new Date('2024-01-15T16:00:00Z').toISOString(),
    });

    const sorted = sortBySlaRisk([onTrackPing, breachedPing]);

    expect(sorted[0].id).toBe('breached');
    expect(sorted[1].id).toBe('on-track');
  });

  it('should sort red zone before yellow zone', () => {
    // Red zone (15% remaining)
    const redPing = createMockPing({
      id: 'red',
      created_at: new Date('2024-01-15T10:00:00Z').toISOString(),
      sla_first_response_due: new Date('2024-01-15T12:18:00Z').toISOString(),
    });

    // Yellow zone (35% remaining)
    const yellowPing = createMockPing({
      id: 'yellow',
      created_at: new Date('2024-01-15T09:00:00Z').toISOString(),
      sla_first_response_due: new Date('2024-01-15T13:30:00Z').toISOString(),
    });

    const sorted = sortBySlaRisk([yellowPing, redPing]);

    expect(sorted[0].id).toBe('red');
    expect(sorted[1].id).toBe('yellow');
  });

  it('should sort yellow zone before green zone', () => {
    // Yellow zone
    const yellowPing = createMockPing({
      id: 'yellow',
      created_at: new Date('2024-01-15T09:00:00Z').toISOString(),
      sla_first_response_due: new Date('2024-01-15T13:00:00Z').toISOString(),
    });

    // Green zone
    const greenPing = createMockPing({
      id: 'green',
      created_at: new Date('2024-01-15T12:00:00Z').toISOString(),
      sla_first_response_due: new Date('2024-01-15T18:00:00Z').toISOString(),
    });

    const sorted = sortBySlaRisk([greenPing, yellowPing]);

    expect(sorted[0].id).toBe('yellow');
    expect(sorted[1].id).toBe('green');
  });

  it('should sort pings without SLA last', () => {
    const noSlaPing = createMockPing({
      id: 'no-sla',
      sla_policy_id: null,
      sla_first_response_due: null,
      sla_resolution_due: null,
    });

    const slaPing = createMockPing({
      id: 'with-sla',
      created_at: new Date('2024-01-15T12:00:00Z').toISOString(),
      sla_first_response_due: new Date('2024-01-15T16:00:00Z').toISOString(),
    });

    const sorted = sortBySlaRisk([noSlaPing, slaPing]);

    expect(sorted[0].id).toBe('with-sla');
    expect(sorted[1].id).toBe('no-sla');
  });

  it('should not mutate the original array', () => {
    const ping1 = createMockPing({ id: 'ping-1' });
    const ping2 = createMockPing({ id: 'ping-2' });
    const original = [ping1, ping2];

    const sorted = sortBySlaRisk(original);

    expect(sorted).not.toBe(original);
    expect(original[0].id).toBe('ping-1');
    expect(original[1].id).toBe('ping-2');
  });

  it('should handle mixed array of all SLA states', () => {
    const breached = createMockPing({
      id: 'breached',
      created_at: new Date('2024-01-15T08:00:00Z').toISOString(),
      sla_first_response_due: new Date('2024-01-15T10:00:00Z').toISOString(),
    });

    const redZone = createMockPing({
      id: 'red',
      created_at: new Date('2024-01-15T10:00:00Z').toISOString(),
      sla_first_response_due: new Date('2024-01-15T12:15:00Z').toISOString(),
    });

    const yellowZone = createMockPing({
      id: 'yellow',
      created_at: new Date('2024-01-15T09:00:00Z').toISOString(),
      sla_first_response_due: new Date('2024-01-15T13:00:00Z').toISOString(),
    });

    const greenZone = createMockPing({
      id: 'green',
      created_at: new Date('2024-01-15T12:00:00Z').toISOString(),
      sla_first_response_due: new Date('2024-01-15T18:00:00Z').toISOString(),
    });

    const noSla = createMockPing({
      id: 'no-sla',
      sla_policy_id: null,
      sla_first_response_due: null,
      sla_resolution_due: null,
    });

    // Shuffle the array
    const shuffled = [greenZone, noSla, breached, yellowZone, redZone];
    const sorted = sortBySlaRisk(shuffled);

    expect(sorted[0].id).toBe('breached');
    expect(sorted[1].id).toBe('red');
    expect(sorted[2].id).toBe('yellow');
    expect(sorted[3].id).toBe('green');
    expect(sorted[4].id).toBe('no-sla');
  });
});
