/**
 * Unit Tests for SLA Calculation Utilities (Story 5.2 Task 10)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateTimeRemaining,
  getSlaStatus,
  getFirstResponseSlaState,
  getResolutionSlaState,
  formatSlaTime,
  getMostUrgentTimer,
} from '@/lib/sla/calculations';
import type { Ping } from '@easyping/types';

// Mock Date for consistent testing
const MOCK_NOW = new Date('2025-01-15T12:00:00Z');

describe('SLA Calculations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateTimeRemaining', () => {
    it('should return null if no due date', () => {
      const result = calculateTimeRemaining(null, null, 0);
      expect(result).toBeNull();
    });

    it('should calculate time remaining correctly with no pause', () => {
      // Due in 2 hours (120 minutes)
      const dueAt = new Date('2025-01-15T14:00:00Z').toISOString();
      const result = calculateTimeRemaining(dueAt, null, 0);
      expect(result).toBe(120);
    });

    it('should add back paused duration to time remaining', () => {
      // Due in 2 hours (120 minutes), but 30 minutes were paused
      const dueAt = new Date('2025-01-15T14:00:00Z').toISOString();
      const result = calculateTimeRemaining(dueAt, null, 30);
      expect(result).toBe(150); // 120 + 30 = 150
    });

    it('should account for currently active pause', () => {
      // Due in 2 hours (120 minutes), currently paused for 15 minutes
      const dueAt = new Date('2025-01-15T14:00:00Z').toISOString();
      const pausedAt = new Date('2025-01-15T11:45:00Z').toISOString(); // 15 minutes ago
      const result = calculateTimeRemaining(dueAt, pausedAt, 0);
      expect(result).toBe(135); // 120 + 15 = 135
    });

    it('should combine paused duration and current pause', () => {
      // Due in 2 hours, 30 mins accumulated pause, currently paused for 15 mins
      const dueAt = new Date('2025-01-15T14:00:00Z').toISOString();
      const pausedAt = new Date('2025-01-15T11:45:00Z').toISOString();
      const result = calculateTimeRemaining(dueAt, pausedAt, 30);
      expect(result).toBe(165); // 120 + 30 + 15 = 165
    });

    it('should return negative value when breached', () => {
      // Due 30 minutes ago
      const dueAt = new Date('2025-01-15T11:30:00Z').toISOString();
      const result = calculateTimeRemaining(dueAt, null, 0);
      expect(result).toBe(-30);
    });
  });

  describe('getSlaStatus', () => {
    it('should return on_track when >50% time remaining', () => {
      // 60 minutes remaining out of 100 = 60%
      expect(getSlaStatus(60, 100)).toBe('on_track');
    });

    it('should return on_track at exactly 51%', () => {
      expect(getSlaStatus(51, 100)).toBe('on_track');
    });

    it('should return at_risk when 20-50% time remaining', () => {
      // 40 minutes remaining out of 100 = 40%
      expect(getSlaStatus(40, 100)).toBe('at_risk');
    });

    it('should return at_risk at exactly 21%', () => {
      expect(getSlaStatus(21, 100)).toBe('at_risk');
    });

    it('should return breached when <20% time remaining', () => {
      // 15 minutes remaining out of 100 = 15%
      expect(getSlaStatus(15, 100)).toBe('breached');
    });

    it('should return breached when time is negative', () => {
      expect(getSlaStatus(-10, 100)).toBe('breached');
    });

    it('should return breached at exactly 0 minutes', () => {
      expect(getSlaStatus(0, 100)).toBe('breached');
    });
  });

  describe('getFirstResponseSlaState', () => {
    const basePing: Ping = {
      id: 'test-id',
      tenant_id: 'tenant-id',
      ping_number: 1,
      created_by: 'user-id',
      assigned_to: null,
      category_id: null,
      team_id: null,
      status: 'new',
      priority: 'normal',
      title: 'Test Ping',
      created_at: new Date('2025-01-15T10:00:00Z').toISOString(),
      updated_at: new Date('2025-01-15T10:00:00Z').toISOString(),
      resolved_at: null,
      closed_at: null,
      ai_summary: null,
      summary_updated_at: null,
      first_response_at: null,
      last_user_reply_at: null,
      last_agent_reply_at: null,
      status_changed_at: null,
      sla_policy_id: null,
      sla_first_response_due: null,
      sla_resolution_due: null,
      sla_paused_at: null,
      sla_paused_duration_minutes: 0,
    };

    it('should return on_track state when no first response and >50% time remaining', () => {
      const ping: Ping = {
        ...basePing,
        sla_first_response_due: new Date('2025-01-15T15:00:00Z').toISOString(), // 5 hours total (10:00-15:00), 3 hours remaining (12:00-15:00) = 60%
      };
      const state = getFirstResponseSlaState(ping);
      expect(state.status).toBe('on_track');
      expect(state.is_paused).toBe(false);
      expect(state.time_remaining_minutes).toBe(180); // 3 hours = 180 minutes
    });

    it('should return completed state when first response was made on time', () => {
      const ping: Ping = {
        ...basePing,
        first_response_at: new Date('2025-01-15T11:00:00Z').toISOString(), // 1 hour after creation
        sla_first_response_due: new Date('2025-01-15T14:00:00Z').toISOString(), // 4 hour SLA
      };
      const state = getFirstResponseSlaState(ping);
      expect(state.status).toBe('completed');
      expect(state.time_taken_minutes).toBe(60); // 1 hour
      expect(state.completed_at).toBe(ping.first_response_at);
    });

    it('should return breached state when first response was late', () => {
      const ping: Ping = {
        ...basePing,
        first_response_at: new Date('2025-01-15T16:00:00Z').toISOString(), // 6 hours after creation
        sla_first_response_due: new Date('2025-01-15T14:00:00Z').toISOString(), // 4 hour SLA
      };
      const state = getFirstResponseSlaState(ping);
      expect(state.status).toBe('breached');
    });

    it('should never pause first response timer', () => {
      const ping: Ping = {
        ...basePing,
        sla_first_response_due: new Date('2025-01-15T14:00:00Z').toISOString(),
        sla_paused_at: new Date('2025-01-15T11:00:00Z').toISOString(), // This should be ignored
        sla_paused_duration_minutes: 30,
      };
      const state = getFirstResponseSlaState(ping);
      expect(state.is_paused).toBe(false);
      // First response timer ignores pause, so 120 minutes remaining (not 150)
      expect(state.time_remaining_minutes).toBe(120);
    });

    it('should handle no SLA configured', () => {
      const ping: Ping = {
        ...basePing,
        sla_first_response_due: null,
      };
      const state = getFirstResponseSlaState(ping);
      expect(state.status).toBe('on_track');
      expect(state.time_remaining_minutes).toBeNull();
      expect(state.due_at).toBeNull();
    });
  });

  describe('getResolutionSlaState', () => {
    const basePing: Ping = {
      id: 'test-id',
      tenant_id: 'tenant-id',
      ping_number: 1,
      created_by: 'user-id',
      assigned_to: null,
      category_id: null,
      team_id: null,
      status: 'in_progress',
      priority: 'normal',
      title: 'Test Ping',
      created_at: new Date('2025-01-15T10:00:00Z').toISOString(),
      updated_at: new Date('2025-01-15T10:00:00Z').toISOString(),
      resolved_at: null,
      closed_at: null,
      ai_summary: null,
      summary_updated_at: null,
      first_response_at: new Date('2025-01-15T10:30:00Z').toISOString(),
      last_user_reply_at: null,
      last_agent_reply_at: null,
      status_changed_at: null,
      sla_policy_id: null,
      sla_first_response_due: null,
      sla_resolution_due: null,
      sla_paused_at: null,
      sla_paused_duration_minutes: 0,
    };

    it('should return on_track state for active timer', () => {
      const ping: Ping = {
        ...basePing,
        sla_resolution_due: new Date('2025-01-16T10:00:00Z').toISOString(), // 24 hours total, 22 hours remaining
      };
      const state = getResolutionSlaState(ping);
      expect(state.status).toBe('on_track');
      expect(state.is_paused).toBe(false);
    });

    it('should return paused state when timer is paused', () => {
      const ping: Ping = {
        ...basePing,
        sla_resolution_due: new Date('2025-01-16T10:00:00Z').toISOString(),
        sla_paused_at: new Date('2025-01-15T11:00:00Z').toISOString(), // Paused 1 hour ago
      };
      const state = getResolutionSlaState(ping);
      expect(state.status).toBe('paused');
      expect(state.is_paused).toBe(true);
    });

    it('should account for paused duration in time remaining', () => {
      const ping: Ping = {
        ...basePing,
        sla_resolution_due: new Date('2025-01-15T14:00:00Z').toISOString(), // 4 hours total
        sla_paused_duration_minutes: 60, // 1 hour paused
      };
      const state = getResolutionSlaState(ping);
      // Base remaining: 2 hours + 1 hour paused = 3 hours = 180 minutes
      expect(state.time_remaining_minutes).toBe(180);
    });

    it('should return completed state when resolved on time', () => {
      const ping: Ping = {
        ...basePing,
        resolved_at: new Date('2025-01-15T14:00:00Z').toISOString(), // 4 hours after creation
        sla_resolution_due: new Date('2025-01-16T10:00:00Z').toISOString(), // 24 hour SLA
      };
      const state = getResolutionSlaState(ping);
      expect(state.status).toBe('completed');
      expect(state.completed_at).toBe(ping.resolved_at);
    });

    it('should return breached state when resolved late', () => {
      const ping: Ping = {
        ...basePing,
        resolved_at: new Date('2025-01-17T10:00:00Z').toISOString(), // Resolved after SLA
        sla_resolution_due: new Date('2025-01-16T10:00:00Z').toISOString(), // 24 hour SLA
      };
      const state = getResolutionSlaState(ping);
      expect(state.status).toBe('breached');
    });

    it('should handle no SLA configured', () => {
      const ping: Ping = {
        ...basePing,
        sla_resolution_due: null,
      };
      const state = getResolutionSlaState(ping);
      expect(state.status).toBe('on_track');
      expect(state.time_remaining_minutes).toBeNull();
      expect(state.due_at).toBeNull();
    });
  });

  describe('formatSlaTime', () => {
    it('should format minutes under 60 as "Xm"', () => {
      expect(formatSlaTime(23)).toBe('23m');
      expect(formatSlaTime(59)).toBe('59m');
      expect(formatSlaTime(1)).toBe('1m');
    });

    it('should format hours 1-24 as "Xh Ym"', () => {
      expect(formatSlaTime(83)).toBe('1h 23m'); // 1 hour 23 minutes
      expect(formatSlaTime(120)).toBe('2h'); // 2 hours exactly
      expect(formatSlaTime(60)).toBe('1h'); // 1 hour exactly
    });

    it('should format days as "Xd Yh"', () => {
      expect(formatSlaTime(24 * 60 + 6 * 60)).toBe('1d 6h'); // 1 day 6 hours
      expect(formatSlaTime(48 * 60)).toBe('2d'); // 2 days exactly
    });

    it('should format breached time with BREACHED prefix', () => {
      expect(formatSlaTime(-30, true)).toBe('BREACHED (30m ago)');
      expect(formatSlaTime(-135, true)).toBe('BREACHED (2h 15m ago)');
    });

    it('should auto-detect breached from negative minutes', () => {
      expect(formatSlaTime(-30)).toBe('BREACHED (30m ago)');
    });
  });

  describe('getMostUrgentTimer', () => {
    const basePing: Ping = {
      id: 'test-id',
      tenant_id: 'tenant-id',
      ping_number: 1,
      created_by: 'user-id',
      assigned_to: null,
      category_id: null,
      team_id: null,
      status: 'new',
      priority: 'normal',
      title: 'Test Ping',
      created_at: new Date('2025-01-15T10:00:00Z').toISOString(),
      updated_at: new Date('2025-01-15T10:00:00Z').toISOString(),
      resolved_at: null,
      closed_at: null,
      ai_summary: null,
      summary_updated_at: null,
      first_response_at: null,
      last_user_reply_at: null,
      last_agent_reply_at: null,
      status_changed_at: null,
      sla_policy_id: null,
      sla_first_response_due: new Date('2025-01-15T14:00:00Z').toISOString(),
      sla_resolution_due: new Date('2025-01-16T10:00:00Z').toISOString(),
      sla_paused_at: null,
      sla_paused_duration_minutes: 0,
    };

    it('should return first_response timer when not yet responded', () => {
      const { timer, type } = getMostUrgentTimer(basePing);
      expect(type).toBe('first_response');
      expect(timer.due_at).toBe(basePing.sla_first_response_due);
    });

    it('should return resolution timer when first response is done', () => {
      const ping: Ping = {
        ...basePing,
        first_response_at: new Date('2025-01-15T11:00:00Z').toISOString(),
      };
      const { timer, type } = getMostUrgentTimer(ping);
      expect(type).toBe('resolution');
      expect(timer.due_at).toBe(ping.sla_resolution_due);
    });
  });
});
