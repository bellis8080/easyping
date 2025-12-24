/**
 * Business Hours Support (Story 5.2)
 *
 * MVP: 24/7 mode - SLA timers always count.
 * Future: Will respect configured business hours.
 */

/**
 * Configuration for business hours.
 * MVP uses '24/7' mode, future versions will support custom schedules.
 */
export interface BusinessHoursConfig {
  mode: '24/7' | 'custom';
  timezone: string;
  schedule?: {
    day: number; // 0 = Sunday, 6 = Saturday
    start: string; // HH:mm format
    end: string; // HH:mm format
  }[];
}

/**
 * Default business hours configuration (24/7 for MVP).
 */
export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  mode: '24/7',
  timezone: 'UTC',
};

/**
 * Check if a given timestamp falls within business hours.
 *
 * MVP: Always returns true (24/7 mode - all hours are business hours).
 * Future: Will check against configured business hours schedule.
 *
 * @param timestamp - The timestamp to check
 * @param config - Business hours configuration (optional, defaults to 24/7)
 * @returns true if within business hours, false otherwise
 */
export function isBusinessHours(
  _timestamp: Date,
  config: BusinessHoursConfig = DEFAULT_BUSINESS_HOURS
): boolean {
  // MVP: 24/7 mode - always return true
  if (config.mode === '24/7') {
    return true;
  }

  // TODO: Post-MVP - Implement custom business hours checking
  // This would involve:
  // 1. Converting timestamp to the configured timezone
  // 2. Getting the day of week
  // 3. Checking if current time falls within the schedule for that day
  // 4. Handling edge cases (holidays, DST transitions, etc.)

  return true;
}

/**
 * Calculate the effective SLA duration accounting for business hours.
 *
 * MVP: Returns the same duration (24/7 mode).
 * Future: Will calculate only business hours within the period.
 *
 * @param startTime - Start of the period
 * @param endTime - End of the period
 * @param config - Business hours configuration
 * @returns Effective duration in minutes (only counting business hours)
 */
export function calculateBusinessMinutes(
  startTime: Date,
  endTime: Date,
  config: BusinessHoursConfig = DEFAULT_BUSINESS_HOURS
): number {
  // MVP: 24/7 mode - return full duration
  if (config.mode === '24/7') {
    return Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  }

  // TODO: Post-MVP - Calculate only business hours
  // This is complex and would need to:
  // 1. Iterate through each day in the range
  // 2. For each day, calculate the overlap with business hours
  // 3. Sum up all the business minutes
  // 4. Handle timezone conversions properly

  return Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
}
