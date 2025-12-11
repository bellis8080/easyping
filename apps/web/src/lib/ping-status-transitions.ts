import { PingStatus, MessageType } from '@easyping/types';

export interface StatusTransitionResult {
  newStatus: PingStatus;
  shouldCreateSystemMessage: boolean;
  systemMessageContent: string | null;
  timestampUpdates: Record<string, string>;
  shouldAutoAssign: boolean;
}

/**
 * Determines if and how ping status should change when a message is sent.
 * Returns null if no status change needed.
 */
export function calculateStatusTransition(
  currentStatus: PingStatus,
  messageType: MessageType,
  senderId: string,
  pingCreatedBy: string,
  assignedTo: string | null,
  agentName: string,
  userName: string,
  firstResponseAt: string | null
): StatusTransitionResult | null {
  // Auto-transition: Agent replies to New ping → In Progress
  if (
    currentStatus === PingStatus.NEW &&
    messageType === MessageType.AGENT &&
    !firstResponseAt
  ) {
    return {
      newStatus: PingStatus.IN_PROGRESS,
      shouldCreateSystemMessage: true,
      systemMessageContent: `${agentName} started working on this ping`,
      timestampUpdates: {
        first_response_at: new Date().toISOString(),
        last_agent_reply_at: new Date().toISOString(),
        status_changed_at: new Date().toISOString(),
      },
      shouldAutoAssign: !assignedTo, // Auto-assign if unassigned
    };
  }

  // Auto-transition: User replies to Waiting on User ping → In Progress
  if (
    currentStatus === PingStatus.WAITING_ON_USER &&
    messageType === MessageType.USER &&
    senderId === pingCreatedBy
  ) {
    return {
      newStatus: PingStatus.IN_PROGRESS,
      shouldCreateSystemMessage: true,
      systemMessageContent: `${userName} responded`,
      timestampUpdates: {
        last_user_reply_at: new Date().toISOString(),
        status_changed_at: new Date().toISOString(),
      },
      shouldAutoAssign: false,
    };
  }

  // Track last reply timestamps without changing status
  if (messageType === MessageType.AGENT) {
    return {
      newStatus: currentStatus,
      shouldCreateSystemMessage: false,
      systemMessageContent: null,
      timestampUpdates: {
        last_agent_reply_at: new Date().toISOString(),
      },
      shouldAutoAssign: false,
    };
  }

  if (messageType === MessageType.USER && senderId === pingCreatedBy) {
    return {
      newStatus: currentStatus,
      shouldCreateSystemMessage: false,
      systemMessageContent: null,
      timestampUpdates: {
        last_user_reply_at: new Date().toISOString(),
      },
      shouldAutoAssign: false,
    };
  }

  return null;
}

/**
 * Validates manual status change and generates system message.
 */
export function validateManualStatusChange(
  currentStatus: PingStatus,
  newStatus: PingStatus,
  agentName: string,
  userName: string
): {
  isValid: boolean;
  systemMessageContent: string | null;
  error: string | null;
} {
  // Prevent invalid transitions
  if (currentStatus === newStatus) {
    return {
      isValid: false,
      systemMessageContent: null,
      error: 'Status is already ' + newStatus,
    };
  }

  // Generate appropriate system message
  let systemMessageContent = `${agentName} changed status to ${getStatusLabel(newStatus)}`;

  if (newStatus === 'waiting_on_user') {
    systemMessageContent = `${agentName} is waiting for ${userName} to respond`;
  }

  return { isValid: true, systemMessageContent, error: null };
}

function getStatusLabel(status: PingStatus): string {
  const labels: Record<PingStatus, string> = {
    draft: 'Draft',
    new: 'New',
    in_progress: 'In Progress',
    waiting_on_user: 'Waiting on User',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  return labels[status];
}
