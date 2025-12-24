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
