/**
 * SLA Utilities (Story 5.2)
 *
 * Re-exports all SLA-related utilities for easy importing.
 */

export {
  calculateTimeRemaining,
  getSlaStatus,
  getFirstResponseSlaState,
  getResolutionSlaState,
  formatSlaTime,
  getMostUrgentTimer,
} from './calculations';

export {
  type BusinessHoursConfig,
  DEFAULT_BUSINESS_HOURS,
  isBusinessHours,
  calculateBusinessMinutes,
} from './business-hours';

export { calculateSlaRiskScore, sortBySlaRisk } from './sorting';

export {
  type SlaNotification,
  slaNotificationService,
  sendSlaBreachEmail,
} from './notifications';

export {
  isBrowserNotificationSupported,
  isBrowserNotificationPermitted,
  requestBrowserNotificationPermission,
  isTabFocused,
  showSlaBrowserNotification,
  showSlaAtRiskBrowserNotification,
} from './browser-notifications';

export {
  formatDurationFriendly,
  formatDurationCompact,
  getExpectedResponseTime,
  getResolvedDuration,
  getCreationConfirmationMessage,
  getResolutionMessage,
} from './expectations';
