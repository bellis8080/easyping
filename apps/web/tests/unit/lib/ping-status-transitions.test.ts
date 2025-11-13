import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateStatusTransition,
  validateManualStatusChange,
} from '@/lib/ping-status-transitions';
import { PingStatus, MessageType } from '@easyping/types';

describe('ping-status-transitions', () => {
  describe('calculateStatusTransition', () => {
    beforeEach(() => {
      // Mock Date.now() for consistent timestamp testing
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-12T10:00:00Z'));
    });

    it('should transition New → In Progress when agent sends first reply', () => {
      const result = calculateStatusTransition(
        'new' as PingStatus,
        'agent' as MessageType,
        'agent-id',
        'user-id',
        null, // unassigned
        'Agent Name',
        'User Name',
        null // no first_response_at
      );

      expect(result).toBeTruthy();
      expect(result?.newStatus).toBe('in_progress');
      expect(result?.shouldCreateSystemMessage).toBe(true);
      expect(result?.systemMessageContent).toBe(
        'Agent Name started working on this ping'
      );
      expect(result?.shouldAutoAssign).toBe(true);
      expect(result?.timestampUpdates).toHaveProperty('first_response_at');
      expect(result?.timestampUpdates).toHaveProperty('last_agent_reply_at');
      expect(result?.timestampUpdates).toHaveProperty('status_changed_at');
    });

    it('should NOT auto-assign when agent already assigned', () => {
      const result = calculateStatusTransition(
        'new' as PingStatus,
        'agent' as MessageType,
        'agent-id',
        'user-id',
        'agent-id', // already assigned
        'Agent Name',
        'User Name',
        null
      );

      expect(result).toBeTruthy();
      expect(result?.shouldAutoAssign).toBe(false);
    });

    it('should transition Waiting on User → In Progress when user replies', () => {
      const result = calculateStatusTransition(
        'waiting_on_user' as PingStatus,
        'user' as MessageType,
        'user-id',
        'user-id', // senderId matches pingCreatedBy
        'agent-id',
        'Agent Name',
        'User Name',
        '2025-01-12T09:00:00Z' // already has first_response_at
      );

      expect(result).toBeTruthy();
      expect(result?.newStatus).toBe('in_progress');
      expect(result?.shouldCreateSystemMessage).toBe(true);
      expect(result?.systemMessageContent).toBe('User Name responded');
      expect(result?.shouldAutoAssign).toBe(false);
      expect(result?.timestampUpdates).toHaveProperty('last_user_reply_at');
      expect(result?.timestampUpdates).toHaveProperty('status_changed_at');
    });

    it('should return null when no status transition needed', () => {
      const result = calculateStatusTransition(
        'in_progress' as PingStatus,
        'system' as MessageType,
        'agent-id',
        'user-id',
        'agent-id',
        'Agent Name',
        'User Name',
        '2025-01-12T09:00:00Z'
      );

      expect(result).toBeNull();
    });

    it('should update timestamps for agent replies without changing status', () => {
      const result = calculateStatusTransition(
        'in_progress' as PingStatus,
        'agent' as MessageType,
        'agent-id',
        'user-id',
        'agent-id',
        'Agent Name',
        'User Name',
        '2025-01-12T09:00:00Z'
      );

      expect(result).toBeTruthy();
      expect(result?.newStatus).toBe('in_progress'); // same status
      expect(result?.shouldCreateSystemMessage).toBe(false);
      expect(result?.timestampUpdates).toHaveProperty('last_agent_reply_at');
      expect(result?.timestampUpdates).not.toHaveProperty('status_changed_at');
    });

    it('should update timestamps for user replies without changing status', () => {
      const result = calculateStatusTransition(
        'in_progress' as PingStatus,
        'user' as MessageType,
        'user-id',
        'user-id',
        'agent-id',
        'Agent Name',
        'User Name',
        '2025-01-12T09:00:00Z'
      );

      expect(result).toBeTruthy();
      expect(result?.newStatus).toBe('in_progress');
      expect(result?.shouldCreateSystemMessage).toBe(false);
      expect(result?.timestampUpdates).toHaveProperty('last_user_reply_at');
    });
  });

  describe('validateManualStatusChange', () => {
    it('should prevent changing to same status', () => {
      const result = validateManualStatusChange(
        'in_progress' as PingStatus,
        'in_progress' as PingStatus,
        'Agent Name',
        'User Name'
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Status is already in_progress');
      expect(result.systemMessageContent).toBeNull();
    });

    it('should generate correct system message for status change', () => {
      const result = validateManualStatusChange(
        'new' as PingStatus,
        'resolved' as PingStatus,
        'Agent Name',
        'User Name'
      );

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.systemMessageContent).toBe(
        'Agent Name changed status to Resolved'
      );
    });

    it('should generate special message for waiting_on_user status', () => {
      const result = validateManualStatusChange(
        'in_progress' as PingStatus,
        'waiting_on_user' as PingStatus,
        'Agent Name',
        'User Name'
      );

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.systemMessageContent).toBe(
        'Agent Name is waiting for User Name to respond'
      );
    });
  });
});
