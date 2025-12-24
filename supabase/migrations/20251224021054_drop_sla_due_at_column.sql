-- Migration: Drop deprecated sla_due_at column
-- Story 5.2: SLA Time Tracking
--
-- The sla_due_at column has been replaced by:
-- - sla_first_response_due: When first response is due
-- - sla_resolution_due: When resolution is due
-- - sla_paused_at: When resolution SLA timer was paused
-- - sla_paused_duration_minutes: Accumulated pause time
--
-- These new columns provide more granular SLA tracking with support for
-- first response SLA, resolution SLA, and timer pause/resume functionality.

ALTER TABLE pings DROP COLUMN IF EXISTS sla_due_at;
