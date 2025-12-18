/**
 * Message Visibility Utilities
 * Story 4.2.1: Agent Private Notes
 *
 * Provides utilities for filtering and managing message visibility.
 * End users should NEVER see private messages or know they exist.
 */

import {
  MessageVisibility,
  UserRole,
  canViewPrivateMessages,
  type PingMessage,
} from '@easyping/types';

/**
 * Filter messages based on user role.
 *
 * For end users, this removes all private messages from the list.
 * For agents/managers/owners, all messages are returned.
 *
 * @param messages - Array of ping messages to filter
 * @param userRole - The role of the current user
 * @returns Filtered array of messages visible to the user
 */
export function filterMessagesForUser(
  messages: PingMessage[],
  userRole: UserRole
): PingMessage[] {
  // Agents, managers, and owners can see all messages
  if (canViewPrivateMessages(userRole)) {
    return messages;
  }

  // End users only see public messages
  return messages.filter((msg) => msg.visibility === MessageVisibility.PUBLIC);
}

/**
 * Filter messages based on user role (string version for raw data).
 *
 * This version accepts string visibility values for use with raw database responses.
 *
 * @param messages - Array of messages with string visibility
 * @param userRole - The role of the current user (string)
 * @returns Filtered array of messages
 */
export function filterRawMessagesForUser<
  T extends { visibility?: string | null },
>(messages: T[], userRole: string): T[] {
  // Agents, managers, and owners can see all messages
  if (userRole !== 'end_user') {
    return messages;
  }

  // End users only see public messages (or messages without visibility set, for backwards compatibility)
  return messages.filter(
    (msg) =>
      msg.visibility === 'public' ||
      msg.visibility === null ||
      msg.visibility === undefined
  );
}

/**
 * Check if a message should be visible to a user.
 *
 * @param message - The message to check
 * @param userRole - The role of the current user
 * @returns true if the message should be visible
 */
export function isMessageVisibleToUser(
  message: PingMessage,
  userRole: UserRole
): boolean {
  if (canViewPrivateMessages(userRole)) {
    return true;
  }
  return message.visibility === MessageVisibility.PUBLIC;
}

/**
 * Get a count of private notes in a message list.
 * Useful for displaying "X private notes" indicator for agents.
 *
 * @param messages - Array of ping messages
 * @returns Number of private messages
 */
export function countPrivateNotes(messages: PingMessage[]): number {
  return messages.filter((msg) => msg.visibility === MessageVisibility.PRIVATE)
    .length;
}
