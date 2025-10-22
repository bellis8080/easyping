# Epic 5: SLA Tracking & Analytics

**Goal:** Provide visibility and accountability through SLA tracking and analytics dashboards. Define configurable SLA policies with response and resolution time targets, track performance in real-time, notify agents of approaching breaches, and visualize ticket metrics for managers. This epic enables data-driven support management and ensures teams meet service commitments.

## Story 5.1: SLA Policy Configuration

**As a** manager,
**I want** to define SLA policies with response and resolution time targets,
**so that** I can set service level commitments.

**Acceptance Criteria:**

1. `sla_policies` table created with: id, tenant_id, name, priority (matches ticket priority), first_response_minutes, resolution_minutes
2. Settings page includes "SLA Policies" section (manager/owner only)
3. Default SLA policies created on setup: Urgent (30min/4hr), High (2hr/24hr), Normal (8hr/3days), Low (24hr/7days)
4. Manager can add/edit/delete SLA policies
5. SLA policy form includes: Name, Priority, First Response Time (minutes), Resolution Time (minutes)
6. SLA policies applied automatically based on ticket priority
7. Changes to SLA policies apply to new tickets only (existing tickets keep original SLA)

## Story 5.2: SLA Time Tracking

**As a** system,
**I want** to track time-to-first-response and time-to-resolution for tickets,
**so that** SLA compliance can be measured.

**Acceptance Criteria:**

1. `tickets` table includes: first_response_at, resolved_at, sla_first_response_due, sla_resolution_due
2. When ticket created, **both SLA due times** calculated based on priority policy and stored:
   - `sla_first_response_due`: Ticket created_at + first_response_minutes from policy
   - `sla_resolution_due`: Ticket created_at + resolution_minutes from policy
3. **When first agent response posted:** first_response_at timestamp recorded (stops First Response SLA timer)
4. **When ticket marked Resolved:** resolved_at timestamp recorded (stops Resolution SLA timer)
5. **Resolution SLA timer pauses** when ticket status = "Waiting on User" (resumes when agent replies or status changes back to In Progress)
6. **First Response SLA timer never pauses** (always counts from ticket creation to first agent message)
7. Business hours support: SLA calculations respect configured business hours (default: 24/7)
8. **SLA timer calculations:**
   - Time remaining = sla_due_time - current_time (accounting for paused periods)
   - Breach status = current_time > sla_due_time
   - Color coding: Green (>50% time remaining), Yellow (20-50%), Red (<20% or breached)

## Story 5.3: SLA Visual Indicators & Breach Alerts

**As an** agent,
**I want** visual indicators showing both First Response and Resolution SLA status,
**so that** I can prioritize tickets approaching breach.

**Acceptance Criteria:**

**Agent Views (Timers Visible):**

1. **Ticket list (inbox) shows most urgent SLA timer:**
   - If First Response SLA not met → show First Response timer with color badge
   - If First Response SLA met → show Resolution timer with color badge
   - Color coding: 🟢 Green (>50% time remaining), 🟡 Yellow (20-50%), 🔴 Red (<20% or breached)

2. **Ticket detail toolbar shows both timers:**
   - **Before first response:** "🟡 First response due in 1h 23m" + "🟢 Resolution due in 2d 18h"
   - **After first response:** "✅ First response: 45m (within SLA)" + "🟡 Resolution due in 2d 6h"
   - **When Waiting on User:** "✅ First response: 45m" + "⏸️ Resolution timer paused (waiting on user)"
   - **When breached:** "🔴 First response BREACHED (2h 15m ago)" or "🔴 Resolution BREACHED (35m over SLA)"

3. **Hover/tooltip in ticket list shows both timers:**
   - Example: "✅ First response: 23m (within 2h SLA) | 🟡 Resolution: 1d 14h remaining"

4. **Agent inbox sortable by "SLA Risk"** (breached first, then at-risk, then on-track)

5. **SLA breach notifications:**
   - System notification for assigned agent and manager when SLA breached
   - Email notification sent when SLA breached (configurable in settings)
   - In-app notification: "Ticket #123 First Response SLA breached (15 minutes ago)"

**End User Views (No Timers):**

6. **End users do NOT see SLA timers or countdown clocks**
7. **Instead, show static expectations:**
   - At ticket creation: "✓ Ticket created! We typically respond within 2 hours."
   - In ticket view: "Created 15 minutes ago"
   - After resolution: "✓ Resolved in 2h 15m"
8. **No "SLA" terminology exposed to end users** (internal tracking only)

## Story 5.4: Basic Analytics Dashboard

**As a** manager,
**I want** to view ticket metrics and trends,
**so that** I can understand support performance and workload.

**Acceptance Criteria:**

1. Analytics dashboard accessible from sidebar navigation (manager/owner only)
2. Date range selector (Last 7 days, Last 30 days, Last 90 days, Custom range)
3. Key metrics cards: Total Tickets, Avg Resolution Time, SLA Compliance %, Open Tickets
4. Ticket volume chart (line graph showing tickets created per day)
5. Resolution time trend chart (avg resolution time per day)
6. Tickets by status pie chart (New, In Progress, Waiting on User, Resolved)
7. Tickets by category bar chart (Hardware, Software, Network, etc.)
8. All metrics calculated based on selected date range

## Story 5.5: Agent Performance Metrics

**As a** manager,
**I want** to see individual agent performance,
**so that** I can identify top performers and coaching opportunities.

**Acceptance Criteria:**

1. Agent performance table shows: Agent Name, Tickets Resolved, Avg Resolution Time, SLA Compliance %, First Response Time
2. Table sortable by each column
3. Agent detail view (click agent name) shows individual metrics and ticket history
4. Leaderboard view: Top agents by tickets resolved (gamification element)
5. Agent personal dashboard shows their own stats (agents can view their own performance only)
6. Metrics exclude tickets created before agent assignment (only measure from assignment time)

## Story 5.6: Ticket Trends & Recurring Issues

**As a** manager,
**I want** to identify recurring issues and trending topics,
**so that** I can proactively address root causes.

**Acceptance Criteria:**

1. "Trending Topics" section uses AI to analyze ticket content and identify common themes
2. Top 10 recurring keywords/phrases displayed with frequency count
3. Category trends chart shows category volume over time (identifies spikes)
4. "Duplicate Detection" report shows tickets with similar content (potential duplicates)
5. Export trending topics data to CSV for further analysis
6. Alert shown when sudden spike detected: "40% increase in Password Reset tickets this week"

## Story 5.7: Analytics Data Export

**As a** manager,
**I want** to export analytics data to CSV,
**so that** I can perform custom analysis or share with stakeholders.

**Acceptance Criteria:**

1. "Export to CSV" button on analytics dashboard
2. Export includes raw ticket data: ID, Created, Resolved, Status, Category, Assigned Agent, SLA Status
3. Separate CSV export for agent performance metrics
4. Date range filter applied to export data
5. File downloads with timestamp in filename: `easyping-analytics-2025-01-21.csv`

---
