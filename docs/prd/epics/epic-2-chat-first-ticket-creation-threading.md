# Epic 2: Chat-First Ticket Creation & Threading

**Goal:** Deliver the core differentiator of EasyPing - a chat-first, conversational ticket creation experience that feels like messaging, not filling forms. Users can describe issues naturally, engage in threaded conversations with agents, attach files, and track ticket status. Agents see a unified inbox with all tickets, can respond in realtime, and update ticket status. This epic makes EasyPing usable for basic support workflows without AI (AI comes in Epic 3).

## Story 2.1: Create Ticket via Chat Interface

**As an** end user,
**I want** to create a ticket by typing my issue in a chat-style interface,
**so that** I can report problems naturally without filling forms.

**Acceptance Criteria:**

1. "Create Ping" button navigates to chat-style ticket creation screen
2. Interface shows message input box with placeholder: "Send a ping... describe your issue"
3. User types message and hits Enter or clicks Send button
4. **AI analyzes message for clarity and completeness (<2 seconds)**
5. **If message lacks sufficient detail, AI asks targeted clarifying questions in chat:**
   - Questions are specific and contextual (e.g., "What error message do you see?" vs generic "Tell me more")
   - User can answer questions in natural language (not forced multiple choice)
   - AI maintains conversation context across clarifying questions (no repeat questions)
   - Maximum 3 clarification rounds before auto-creating ticket
   - User can click "Skip and create ticket anyway" to bypass clarification
6. **If AI analysis times out (>5s), ticket created with category "Needs Review"**
7. **Once sufficient information gathered, AI generates problem statement summary**
8. New ticket created in database with status=New, AI-determined category, all conversation as thread entries
9. Ticket assigned auto-generated ID (e.g., #PING-001)
10. **User sees AI-generated problem statement summary at top of conversation thread**
11. User immediately sees full conversation history (their messages + AI clarifications) in thread
12. Empty state for "My Pings" replaced with new ticket in conversation list
13. Ticket conversation list shows: last message preview, timestamp, unread indicator, category badge
14. **KB article suggestions shown during message composition (debounced 300ms, semantic search)**
15. **If user clicks KB article and resolves issue, no ticket created**
16. **API documentation created for new endpoints:**
    - **POST `/api/tickets`** endpoint documented with OpenAPI/Swagger schema
    - **Inline JSDoc comments** added to API route functions with request/response types
    - **API documentation tool configured:** `swagger-jsdoc` or `@scalar/nextjs-api-reference` for auto-generation
    - **API docs accessible at:** `/api/docs` endpoint showing interactive API explorer
    - **Request/response examples** included in docs with sample payloads
    - **Error responses documented:** 400 (validation error), 401 (unauthorized), 500 (server error)
    - **All subsequent API routes** must include inline documentation as part of Definition of Done

## Story 2.2: Threaded Conversation in Tickets

**As an** agent,
**I want** to reply to tickets in a threaded conversation,
**so that** I can communicate back-and-forth with users naturally.

**Acceptance Criteria:**

1. Agent inbox shows all tickets assigned to them or unassigned
2. Clicking ticket opens conversation thread in right panel (split view)
3. Agent can type reply in message input box at bottom of thread
4. Agent message appears in thread immediately after sending
5. User receives realtime update (WebSocket via Supabase Realtime) - message appears without refresh
6. Conversation thread displays: sender avatar, name, message content, timestamp
7. Agent and user messages visually distinguished (e.g., different background colors)
8. Typing indicators show when agent or user is composing message

## Story 2.3: File Attachments in Conversations

**As a** user or agent,
**I want** to attach files (screenshots, logs, documents) to ticket conversations,
**so that** I can provide context and evidence for issues.

**Acceptance Criteria:**

1. Message input box includes attachment button (paperclip icon)
2. Clicking attachment opens file picker (supports images, PDFs, text files, logs)
3. Selected files uploaded to Supabase Storage
4. File attachment appears in conversation thread with filename and file size
5. Image attachments display inline thumbnails (clickable to view full size)
6. Non-image files show download link with icon indicating file type
7. File size limited to 10MB per attachment
8. Multiple files can be attached to single message (up to 5 files)
9. Upload progress indicator shown during file upload

## Story 2.4: Ticket Status Management

**As an** agent,
**I want** ticket status to update automatically based on conversation flow (with manual override),
**so that** I can track ticket lifecycle without manual status changes.

**Acceptance Criteria:**

**Auto-Status Transitions:**

1. **When agent sends first message on New ticket:** Status automatically changes New → In Progress
   - Records `first_response_at` timestamp (stops "First Response Time" SLA timer)
   - Auto-assigns ticket to that agent if unassigned (see Story 2.5)
   - System message: "Agent Name started working on this ticket"
2. **When user replies and status is Waiting on User:** Status automatically changes Waiting on User → In Progress
   - Indicates ball is back in agent's court (user provided requested information)
   - Resumes SLA resolution timer
   - System message: "User Name responded"

**Manual Status Changes (Agent-controlled):**

3. Ticket detail view shows status dropdown in toolbar (current status visible)
4. Agent can manually change status via dropdown (End users cannot change status)
5. Agent can manually set status to **Waiting on User** (e.g., when asking user to test a fix or provide info)
   - Pauses SLA resolution timer until user responds
   - System message: "Agent Name is waiting for User Name to respond"
6. Agent must manually mark tickets as **Resolved** or **Closed** (not automated)
7. Manual status change creates system message in thread: "Agent changed status to Resolved"
8. Status change updates ticket in database with timestamp

**Status Display & Filtering:**

9. Ticket list filters available: All, New, In Progress, Waiting on User, Resolved
10. Status badge displayed on ticket in conversation list (color-coded: green=Resolved, yellow=In Progress, blue=Waiting on User, gray=New)
11. Resolved tickets auto-archive from "My Pings" after 90 days (configurable in settings)
12. Closed tickets hidden from default views (accessible via "Closed Pings" filter)

## Story 2.5: Agent Ticket Assignment

**As a** manager or agent,
**I want** to assign tickets to specific agents,
**so that** workload is distributed and accountability is clear.

**Acceptance Criteria:**

1. Ticket toolbar includes "Assign to" dropdown showing all agents
2. Manager or agent can assign ticket to any agent (or leave unassigned)
3. Assignment creates system message in thread: "Ticket assigned to Agent Name"
4. Assigned agent receives notification (in-app notification badge)
5. Agent inbox shows "Assigned to Me" view (default) and "Unassigned" view
6. Ticket list displays assigned agent avatar/name
7. Reassignment allowed (updates assignment timestamp)

## Story 2.6: Ticket Priority Management

**As an** agent,
**I want** to set ticket priority (Low, Normal, High, Urgent),
**so that** I can triage and focus on critical issues first.

**Acceptance Criteria:**

1. Ticket toolbar includes priority dropdown (Low, Normal, High, Urgent)
2. Priority change updates database and creates system message
3. Default priority: Normal (set on ticket creation)
4. Urgent tickets highlighted in ticket list (red indicator)
5. Ticket list sortable by priority
6. Priority badge displayed in ticket conversation list

## Story 2.7: Real-Time Updates & Notifications

**As a** user or agent,
**I want** to see new messages and updates instantly without refreshing,
**so that** conversations feel live and responsive.

**Acceptance Criteria:**

1. Supabase Realtime subscriptions configured for ticket messages and status changes
2. New messages appear in conversation thread within 500ms (no page refresh)
3. Ticket list updates when new tickets created or status changes
4. In-app notification badge shows unread ticket count
5. Browser tab title updates with unread count: "(3) EasyPing"
6. Sound notification plays when new message received (user can disable in settings)
7. Connection status indicator shows when realtime connection lost

---
