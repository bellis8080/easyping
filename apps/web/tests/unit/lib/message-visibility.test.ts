/**
 * Tests for message visibility utilities
 * Story 4.2.1: Agent Private Notes
 */

import { describe, it, expect } from 'vitest';
import {
  filterMessagesForUser,
  filterRawMessagesForUser,
  isMessageVisibleToUser,
  countPrivateNotes,
} from '@/lib/message-visibility';
import { UserRole, MessageVisibility, PingMessage } from '@easyping/types';

// Helper to create a mock message
function createMockMessage(
  visibility: MessageVisibility,
  overrides: Partial<PingMessage> = {}
): PingMessage {
  return {
    id: 'msg-1',
    ping_id: 'ping-1',
    sender_id: 'user-1',
    content: 'Test message',
    message_type: 'agent',
    visibility,
    created_at: new Date().toISOString(),
    edited_at: null,
    ...overrides,
  };
}

describe('filterMessagesForUser', () => {
  const publicMessage = createMockMessage(MessageVisibility.PUBLIC, {
    id: 'public-1',
  });
  const privateMessage = createMockMessage(MessageVisibility.PRIVATE, {
    id: 'private-1',
  });
  const messages = [publicMessage, privateMessage];

  it('returns all messages for agents', () => {
    const result = filterMessagesForUser(messages, UserRole.AGENT);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual(publicMessage);
    expect(result).toContainEqual(privateMessage);
  });

  it('returns all messages for managers', () => {
    const result = filterMessagesForUser(messages, UserRole.MANAGER);
    expect(result).toHaveLength(2);
  });

  it('returns all messages for owners', () => {
    const result = filterMessagesForUser(messages, UserRole.OWNER);
    expect(result).toHaveLength(2);
  });

  it('returns only public messages for end users', () => {
    const result = filterMessagesForUser(messages, UserRole.END_USER);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(publicMessage);
  });

  it('handles empty message array', () => {
    const result = filterMessagesForUser([], UserRole.END_USER);
    expect(result).toHaveLength(0);
  });

  it('handles all public messages', () => {
    const allPublic = [
      createMockMessage(MessageVisibility.PUBLIC, { id: 'p1' }),
      createMockMessage(MessageVisibility.PUBLIC, { id: 'p2' }),
    ];
    const result = filterMessagesForUser(allPublic, UserRole.END_USER);
    expect(result).toHaveLength(2);
  });

  it('handles all private messages for end user', () => {
    const allPrivate = [
      createMockMessage(MessageVisibility.PRIVATE, { id: 'p1' }),
      createMockMessage(MessageVisibility.PRIVATE, { id: 'p2' }),
    ];
    const result = filterMessagesForUser(allPrivate, UserRole.END_USER);
    expect(result).toHaveLength(0);
  });
});

describe('filterRawMessagesForUser', () => {
  const publicMessage = { id: 'public-1', visibility: 'public' };
  const privateMessage = { id: 'private-1', visibility: 'private' };
  const nullVisibility = { id: 'null-1', visibility: null };
  const undefinedVisibility = { id: 'undefined-1' };
  const messages = [
    publicMessage,
    privateMessage,
    nullVisibility,
    undefinedVisibility,
  ];

  it('returns all messages for agents', () => {
    const result = filterRawMessagesForUser(messages, 'agent');
    expect(result).toHaveLength(4);
  });

  it('returns only public/null/undefined messages for end users', () => {
    const result = filterRawMessagesForUser(messages, 'end_user');
    expect(result).toHaveLength(3); // public, null, undefined
    expect(result).not.toContainEqual(privateMessage);
  });

  it('handles manager role', () => {
    const result = filterRawMessagesForUser(messages, 'manager');
    expect(result).toHaveLength(4);
  });

  it('handles owner role', () => {
    const result = filterRawMessagesForUser(messages, 'owner');
    expect(result).toHaveLength(4);
  });
});

describe('isMessageVisibleToUser', () => {
  const publicMessage = createMockMessage(MessageVisibility.PUBLIC);
  const privateMessage = createMockMessage(MessageVisibility.PRIVATE);

  it('returns true for public messages regardless of role', () => {
    expect(isMessageVisibleToUser(publicMessage, UserRole.END_USER)).toBe(true);
    expect(isMessageVisibleToUser(publicMessage, UserRole.AGENT)).toBe(true);
    expect(isMessageVisibleToUser(publicMessage, UserRole.MANAGER)).toBe(true);
    expect(isMessageVisibleToUser(publicMessage, UserRole.OWNER)).toBe(true);
  });

  it('returns false for private messages for end users', () => {
    expect(isMessageVisibleToUser(privateMessage, UserRole.END_USER)).toBe(
      false
    );
  });

  it('returns true for private messages for agents', () => {
    expect(isMessageVisibleToUser(privateMessage, UserRole.AGENT)).toBe(true);
  });

  it('returns true for private messages for managers', () => {
    expect(isMessageVisibleToUser(privateMessage, UserRole.MANAGER)).toBe(true);
  });

  it('returns true for private messages for owners', () => {
    expect(isMessageVisibleToUser(privateMessage, UserRole.OWNER)).toBe(true);
  });
});

describe('countPrivateNotes', () => {
  it('returns 0 for no private messages', () => {
    const messages = [
      createMockMessage(MessageVisibility.PUBLIC),
      createMockMessage(MessageVisibility.PUBLIC),
    ];
    expect(countPrivateNotes(messages)).toBe(0);
  });

  it('counts private messages correctly', () => {
    const messages = [
      createMockMessage(MessageVisibility.PUBLIC),
      createMockMessage(MessageVisibility.PRIVATE),
      createMockMessage(MessageVisibility.PUBLIC),
      createMockMessage(MessageVisibility.PRIVATE),
    ];
    expect(countPrivateNotes(messages)).toBe(2);
  });

  it('returns 0 for empty array', () => {
    expect(countPrivateNotes([])).toBe(0);
  });

  it('handles all private messages', () => {
    const messages = [
      createMockMessage(MessageVisibility.PRIVATE),
      createMockMessage(MessageVisibility.PRIVATE),
      createMockMessage(MessageVisibility.PRIVATE),
    ];
    expect(countPrivateNotes(messages)).toBe(3);
  });
});
