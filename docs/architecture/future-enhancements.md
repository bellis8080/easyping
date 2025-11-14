# Future Enhancements

This document tracks features and enhancements that are not required for MVP but should be implemented in future iterations.

## Auto-Archive Resolved Pings

**Requirement:** Resolved pings should auto-archive from "My Pings" after 90 days (configurable).

**Implementation Options:**
1. Supabase Edge Functions with pg_cron extension (scheduled daily job)
2. Next.js API route + external cron service (cron-job.org, GitHub Actions)
3. Database view with created_at filter (simple but less flexible)

**Recommended Approach:** Use Supabase pg_cron extension for serverless scheduled jobs.

**Epic:** To be implemented in Epic 5 (SLA Tracking & Analytics) or Epic 6 (Launch Prep)

## In-App Assignment Notifications (Story 2.7)

**Requirement:** When a ping is assigned to an agent, they should receive an in-app notification badge.

**Implementation:**
- Notification badge component in header (unread count)
- Notifications table in database to track assignment events
- Realtime subscription to notify assigned agent
- Mark notification as read when ping is opened

**Epic:** Story 2.7 (Real-Time Updates & Notifications)
