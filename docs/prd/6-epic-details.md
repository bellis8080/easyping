# 6. Epic Details

## Epic 1: Foundation & Authentication

**Goal:** Establish the foundational project infrastructure with modern development tools (monorepo, Next.js, Supabase), implement multi-tenant database schema designed for future SaaS while running in single-tenant mode, provide user authentication and role-based access control, and deliver a fully deployable Docker image with working health check. This epic delivers minimal but complete functionality: users can sign up, log in, and access a basic authenticated dashboard, proving the deployment and authentication systems work end-to-end.

### Story 1.1: Project Setup & Monorepo Infrastructure

**As a** developer,
**I want** a fully configured monorepo with Next.js, TypeScript, and build tools,
**so that** I have a clean foundation to build features efficiently.

**Acceptance Criteria:**

1. Monorepo initialized with pnpm workspaces and Turborepo
2. Next.js 14+ app created in `apps/web` using App Router and TypeScript strict mode
3. Packages created for `database`, `ai`, `ui`, and `types` with proper package.json configuration
4. ESLint, Prettier, and TypeScript configured across all packages
5. Husky + lint-staged configured for pre-commit hooks (lint and type-check)
6. GitHub Actions CI/CD pipeline runs lint, type-check, and build on every PR
7. README with quickstart instructions for local development
8. `.env.example` file with required environment variables documented

### Story 1.2: Supabase Integration & Multi-Tenant Schema

**As a** developer,
**I want** Supabase configured with multi-tenant database schema and RLS policies,
**so that** the architecture supports future SaaS migration while running single-tenant mode today.

**Acceptance Criteria:**

1. Supabase project initialized with local development environment (Supabase CLI)
2. `organizations` table created with id (UUID), name, domain, created_at
3. `users` table extended with tenant_id referencing organizations.id
4. RLS policies created to enforce tenant isolation on all data tables
5. Database migration system configured (Supabase migrations)
6. Seed script creates a default organization on fresh deployment
7. Supabase client configured in Next.js with TypeScript types auto-generated
8. Database connection pooling configured for performance

### Story 1.3: User Authentication (Email/Password & OAuth)

**As an** end user,
**I want** to sign up and log in with email/password or Google OAuth,
**so that** I can access EasyPing securely.

**Acceptance Criteria:**

1. Sign-up page with email/password form (with Zod validation)
2. Login page with email/password form
3. "Forgot password" flow with email reset link
4. Google OAuth sign-in button (using Supabase Auth)
5. After successful auth, user redirected to dashboard
6. Supabase Auth session management configured (refresh tokens, persistent sessions)
7. Protected routes middleware that redirects unauthenticated users to login
8. User profile stored in database with tenant_id set to default organization

### Story 1.4: Role-Based Access Control (RBAC)

**As a** system administrator,
**I want** users assigned to roles (End User, Agent, Manager, Owner),
**so that** permissions are enforced throughout the application.

**Acceptance Criteria:**

1. `user_roles` enum created (end_user, agent, manager, owner)
2. Users table includes `role` column (default: end_user)
3. Middleware checks user role before allowing access to agent/manager routes
4. First user created in an organization automatically assigned `owner` role
5. Owner can assign roles to other users via settings page (basic UI)
6. RLS policies updated to respect user roles (e.g., agents can view all tickets, end users only their own)
7. Role checked in UI to show/hide features (e.g., agent dashboard visible only to agents)

### Story 1.5: Docker Compose Deployment

**As a** self-hoster,
**I want** to deploy EasyPing with a single `docker-compose up` command,
**so that** I can run it on my own infrastructure easily.

**Acceptance Criteria:**

1. `docker-compose.yml` includes Supabase services (Postgres, Auth, Storage, Realtime, PostgREST)
2. Next.js app containerized with optimized production Dockerfile
3. Caddy reverse proxy configured for automatic HTTPS (with self-signed cert for local dev)
4. Environment variables externalized to `.env` file
5. Volumes configured for persistent data (database, storage)
6. Health check endpoints for all services
7. `docker-compose up` starts all services successfully on fresh Ubuntu 22.04 VM
8. README includes deployment instructions with system requirements

### Story 1.6: First-Run Setup Wizard

**As a** first-time user,
**I want** a setup wizard on initial deployment,
**so that** I can configure my organization and admin account.

**Acceptance Criteria:**

1. On first run, detect if organization exists; if not, show setup wizard
2. Setup wizard collects: Organization name, admin email, admin password, AI provider API key (optional)
3. Wizard creates organization record and first user with owner role
4. AI provider configuration saved to database (encrypted API key)
5. After setup, user redirected to main dashboard
6. Setup wizard only appears once (flag in database tracks completion)
7. Wizard UI matches EasyPing branding (clean, modern, ping.me theme)

### Story 1.7: Basic Dashboard & Health Check

**As an** end user or agent,
**I want** to see a basic authenticated dashboard after login,
**so that** I know the system is working and I can navigate to features.

**Acceptance Criteria:**

1. Dashboard shows welcome message with user's name and organization name
2. Sidebar navigation includes: My Pings, Create Ping, Knowledge Base, Settings
3. Empty state message: "You have no pings yet. Send your first ping!"
4. `/api/health` endpoint returns 200 with service status (database, auth, storage)
5. Dashboard is responsive (desktop and mobile web)
6. Loading states shown while fetching user data
7. Error states handled gracefully (e.g., database connection failure)

---

## Epic 2: Chat-First Ticket Creation & Threading

**Goal:** Deliver the core differentiator of EasyPing - a chat-first, conversational ticket creation experience that feels like messaging, not filling forms. Users can describe issues naturally, engage in threaded conversations with agents, attach files, and track ticket status. Agents see a unified inbox with all tickets, can respond in realtime, and update ticket status. This epic makes EasyPing usable for basic support workflows without AI (AI comes in Epic 3).

### Story 2.1: Create Ticket via Chat Interface

**As an** end user,
**I want** to create a ticket by typing my issue in a chat-style interface,
**so that** I can report problems naturally without filling forms.

**Acceptance Criteria:**

1. "Create Ping" button navigates to chat-style ticket creation screen
2. Interface shows message input box with placeholder: "Send a ping... describe your issue"
3. User types message and hits Enter or clicks Send button
4. New ticket created in database with status=New, user message as first thread entry
5. Ticket assigned auto-generated ID (e.g., #PING-001)
6. User immediately sees their message in conversation thread
7. Empty state for "My Pings" replaced with new ticket in conversation list
8. Ticket conversation list shows: last message preview, timestamp, unread indicator

### Story 2.2: Threaded Conversation in Tickets

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

### Story 2.3: File Attachments in Conversations

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

### Story 2.4: Ticket Status Management

**As an** agent,
**I want** to update ticket status (New, In Progress, Waiting on User, Resolved, Closed),
**so that** I can track ticket lifecycle.

**Acceptance Criteria:**

1. Ticket detail view shows status dropdown in toolbar (current status visible)
2. Agent can change status via dropdown (End users cannot change status)
3. Status change creates system message in thread: "Agent changed status to In Progress"
4. Status change updates ticket in database with timestamp
5. Ticket list filters available: All, New, In Progress, Resolved
6. Status badge displayed on ticket in conversation list (color-coded: green=Resolved, yellow=In Progress, etc.)
7. Resolved tickets auto-archive from "My Pings" after 90 days (configurable in settings)
8. Closed tickets hidden from default views (accessible via "Closed Pings" filter)

### Story 2.5: Agent Ticket Assignment

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

### Story 2.6: Ticket Priority Management

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

### Story 2.7: Real-Time Updates & Notifications

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

## Epic 3: AI Integration & Intelligent Routing

**Goal:** Transform EasyPing from basic ticketing to AI-native support desk. Integrate multiple AI providers (OpenAI, Anthropic, Azure) with bring-your-own-key model, automatically categorize and route incoming tickets, generate AI summaries pinned at top of threads, and provide agent copilot with suggested responses. This epic delivers the core AI value proposition that differentiates EasyPing from traditional help desks.

### Story 3.1: AI Provider Abstraction Layer

**As a** developer,
**I want** an abstraction layer supporting multiple AI providers,
**so that** users can choose their preferred provider and we can swap models easily.

**Acceptance Criteria:**

1. AI provider interface defined in `packages/ai` with methods: `categorize()`, `summarize()`, `suggestResponse()`, `generateEmbedding()`
2. OpenAI provider implementation (GPT-3.5-turbo, GPT-4)
3. Anthropic provider implementation (Claude 3.5 Sonnet, Claude 3 Haiku)
4. Azure OpenAI provider implementation
5. Provider configuration stored in database (encrypted API keys, model selection)
6. Graceful fallback when AI unavailable (error logged, feature disabled temporarily)
7. Provider selection configurable per organization in settings
8. Unit tests with mocked API responses (90%+ coverage)

### Story 3.2: AI Provider Configuration UI

**As an** organization owner,
**I want** to configure my AI provider API keys and model preferences,
**so that** AI features work with my own API account.

**Acceptance Criteria:**

1. Settings page includes "AI Configuration" section
2. Form to input API key for OpenAI, Anthropic, or Azure OpenAI
3. Provider selection dropdown (OpenAI, Anthropic, Azure)
4. Model selection dropdown (GPT-3.5-turbo, GPT-4, Claude 3.5 Sonnet, etc.)
5. "Test Connection" button validates API key and shows success/error message
6. API keys encrypted before storing in database
7. Option to disable AI features if no key configured
8. Warning shown when AI credits low (if provider API returns usage info)

### Story 3.3: Auto-Categorization of Tickets

**As an** agent,
**I want** tickets automatically categorized (Hardware, Software, Network, Access Request, etc.),
**so that** I can quickly understand ticket type and route appropriately.

**Acceptance Criteria:**

1. Default categories created on setup: Hardware, Software, Network, Access Request, Password Reset, Other
2. When ticket created, AI analyzes first user message and assigns category from available categories
3. Category determination completes within 3 seconds
4. Category displayed as badge in ticket list and ticket detail view
5. Agents can manually override AI category selection (dropdown in toolbar showing all active categories)
6. System message created when category assigned: "AI categorized as: Software"
7. Fallback to "Other" or first available category if AI fails or confidence below threshold (70%)
8. Category statistics shown in analytics dashboard (coming in Epic 5)

### Story 3.4: Category Management

**As a** manager or owner,
**I want** to add, edit, and delete ticket categories,
**so that** I can customize categories to match my organization's support structure.

**Acceptance Criteria:**

1. Settings page includes "Categories" section (manager/owner only)
2. Categories list shows: Category name, color (for badge), ticket count, active/archived status
3. "Add Category" button opens form: Name (required), Description (optional), Color picker, Icon (optional)
4. Manager can edit existing category name, description, color, and icon
5. Manager can archive category (soft-delete) - tickets keep category, but not available for new tickets
6. Cannot delete category if tickets currently use it (must archive instead)
7. "Other" category is system-reserved and cannot be deleted (can be renamed)
8. Category changes immediately reflected in ticket creation, routing rules, and analytics
9. Maximum 50 active categories per organization (prevent overwhelming dropdown)
10. Categories sortable via drag-and-drop to control display order

### Story 3.5: Automatic Ticket Routing

**As a** manager,
**I want** tickets automatically routed to appropriate agent queues based on category,
**so that** specialized agents receive relevant tickets.

**Acceptance Criteria:**

1. Routing rules configurable in settings: Map categories to agent queues or specific agents
2. Example rule: "Hardware → Hardware Team queue", "Password Reset → assign to Agent Bob"
3. When ticket categorized, routing rule applied automatically
4. Ticket assigned to queue or agent based on rule (if rule exists)
5. System message created: "Auto-routed to Hardware Team"
6. If no routing rule matches, ticket remains unassigned
7. Managers can edit routing rules via settings UI (add/remove/reorder rules)

### Story 3.6: AI-Pinned Ticket Summaries

**As an** agent,
**I want** an AI-generated summary pinned at top of ticket threads,
**so that** I can quickly understand issue context without reading entire conversation.

**Acceptance Criteria:**

1. Summary section pinned at top of ticket detail view (above conversation thread)
2. Summary includes: Issue description (2-3 sentences), key details extracted, current status, next steps
3. Summary generated when ticket has 3+ messages in thread
4. Summary re-generated when significant updates occur (status change, new info added)
5. "Refresh Summary" button allows manual regeneration
6. Summary shown in collapsible card (can minimize to save space)
7. Loading state shown while AI generates summary
8. Fallback message if AI unavailable: "Summary unavailable"

### Story 3.7: Agent Copilot - Response Suggestions

**As an** agent,
**I want** AI to suggest response drafts while composing replies,
**so that** I can respond faster and more consistently.

**Acceptance Criteria:**

1. When agent focuses on message input box, AI analyzes ticket context
2. Suggested response appears as "ghost text" (light gray, italic) in input box or side panel
3. Agent can press Tab or click "Use Suggestion" to accept AI draft
4. Agent can edit AI suggestion before sending
5. "Generate Another" button requests alternative suggestion
6. Suggestions based on ticket history, category, and KB articles
7. Suggestions appear within 2 seconds of focusing input
8. Agent can disable copilot in personal settings if preferred

### Story 3.8: KB Article Suggestions During Resolution

**As an** agent,
**I want** AI to suggest relevant KB articles while resolving tickets,
**so that** I can reference existing solutions quickly.

**Acceptance Criteria:**

1. Side panel in ticket detail view shows "Related Articles" section
2. AI searches KB for articles matching ticket content (semantic search using embeddings)
3. Top 3 most relevant articles displayed with title and preview
4. Clicking article opens in modal or new tab
5. Agent can insert KB article link into response with one click
6. "No relevant articles found" message if KB empty or no matches
7. KB suggestions refresh when ticket content changes significantly

---

## Epic 4: Knowledge Base & Self-Service

**Goal:** Build a self-service knowledge base that automatically captures support knowledge from resolved tickets. AI converts successful resolutions into article drafts, agents review and publish, and users search KB before creating tickets. Semantic search using pgvector enables intelligent article discovery. This epic reduces repetitive questions and builds a living documentation system that grows with every resolved ticket.

### Story 4.1: KB Database Schema & Article Management

**As a** developer,
**I want** a knowledge base schema with articles, categories, and usage tracking,
**so that** we can store and organize support knowledge.

**Acceptance Criteria:**

1. `kb_articles` table created with: id, tenant_id, title, content (markdown), category, status (draft/published), source_ticket_id, created_by, created_at, updated_at
2. `kb_categories` table with predefined categories (Hardware, Software, Network, etc.)
3. `kb_article_views` table tracks article usage (article_id, user_id, viewed_at)
4. RLS policies enforce tenant isolation
5. Articles soft-deleted (deleted_at column) not hard-deleted
6. Full-text search index on title and content (tsvector + GIN index)
7. Database migration creates seed categories

### Story 4.2: Auto-Generate KB Articles from Resolved Tickets

**As an** agent,
**I want** resolved tickets to automatically generate KB article drafts,
**so that** I can capture solutions without manual writing.

**Acceptance Criteria:**

1. When ticket marked Resolved, AI analyzes conversation thread
2. AI generates KB article draft with: title (issue summary), content (solution steps), category (matches ticket category)
3. Draft saved to database with status=draft, source_ticket_id linked
4. Agent receives notification: "KB article draft created from Ping #123"
5. Draft not visible to end users (only agents see drafts)
6. AI extracts key information: problem statement, solution steps, prerequisites, related issues
7. Article generation takes <5 seconds

### Story 4.3: KB Article Editor for Agents

**As an** agent,
**I want** to review, edit, and publish KB article drafts,
**so that** I can ensure quality before making articles public.

**Acceptance Criteria:**

1. KB section in sidebar navigation (agents only)
2. KB dashboard shows tabs: Published, Drafts, Archived
3. Draft articles list shows title, category, source ticket, created date
4. Clicking draft opens editor with markdown support (WYSIWYG or split-pane)
5. Editor toolbar includes: bold, italic, headers, lists, code blocks, links, images
6. Live preview pane shows rendered markdown
7. "Publish" button changes status to published and makes visible to users
8. "Save Draft" button saves without publishing
9. "Delete" button soft-deletes article
10. Published articles display publish date and author name

### Story 4.4: Semantic Search with pgvector

**As a** user or agent,
**I want** to search KB articles using natural language,
**so that** I can find solutions even if I don't know exact keywords.

**Acceptance Criteria:**

1. `kb_articles` table includes `embedding` column (vector type from pgvector)
2. When article published, AI generates embedding from title + content
3. Search query generates embedding and finds similar articles (cosine similarity)
4. Search returns top 10 most relevant articles ranked by similarity
5. Search also includes traditional full-text search as fallback
6. Results show: title, excerpt with highlighted keywords, category badge, view count
7. Search box in KB page with instant results (debounced, updates as user types)
8. Empty state if no results: "No articles found. Try different keywords or create a ping."

### Story 4.5: KB Article Detail Page

**As a** user,
**I want** to view full KB article content,
**so that** I can self-serve and resolve issues without creating tickets.

**Acceptance Criteria:**

1. Clicking article from search results navigates to article detail page
2. Detail page shows: title, category badge, publish date, author, full content (rendered markdown)
3. "Was this helpful?" feedback widget (Yes/No thumbs up/down)
4. Related articles section at bottom (based on category or semantic similarity)
5. "Still need help? Create a ping" button if article doesn't solve issue
6. Article view tracked in `kb_article_views` table
7. View count displayed on article (e.g., "Viewed 127 times")
8. Breadcrumb navigation: Knowledge Base > Category > Article Title

### Story 4.6: KB Suggestions During Ticket Creation

**As a** user,
**I want** to see relevant KB articles while describing my issue,
**so that** I can self-solve without submitting a ticket.

**Acceptance Criteria:**

1. As user types in "Create Ping" message box, system searches KB in real-time
2. "Related Articles" panel appears below message box if matches found
3. Top 3 articles displayed with title and short preview
4. User can click article to view in modal overlay
5. Modal includes "This solved my issue" button (closes ticket creation flow)
6. If user continues typing after viewing article, ticket creation proceeds normally
7. Debounced search (waits 500ms after typing stops before searching)
8. "View all X results" link expands to full search page

### Story 4.7: KB Analytics & Popular Articles

**As a** manager,
**I want** to see which KB articles are most viewed and helpful,
**so that** I can identify valuable content and gaps.

**Acceptance Criteria:**

1. KB dashboard shows "Popular Articles" section (top 10 by views)
2. "Most Helpful" section shows articles with highest thumbs-up ratio
3. "Least Helpful" section shows articles with low ratings (need improvement)
4. Article creation timeline chart (articles published per week/month)
5. Category breakdown chart (articles by category)
6. Export KB analytics to CSV

---

## Epic 5: SLA Tracking & Analytics

**Goal:** Provide visibility and accountability through SLA tracking and analytics dashboards. Define configurable SLA policies with response and resolution time targets, track performance in real-time, notify agents of approaching breaches, and visualize ticket metrics for managers. This epic enables data-driven support management and ensures teams meet service commitments.

### Story 5.1: SLA Policy Configuration

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

### Story 5.2: SLA Time Tracking

**As a** system,
**I want** to track time-to-first-response and time-to-resolution for tickets,
**so that** SLA compliance can be measured.

**Acceptance Criteria:**

1. `tickets` table includes: first_response_at, resolved_at, sla_first_response_due, sla_resolution_due
2. When ticket created, SLA due times calculated based on policy and stored
3. When first agent response posted, first_response_at timestamp recorded
4. When ticket marked Resolved, resolved_at timestamp recorded
5. SLA timer pauses when ticket status = "Waiting on User" (resume when agent replies)
6. Business hours support: SLA calculations respect configured business hours (default: 24/7)
7. Ticket detail view shows SLA timers: "First response due in 1h 23m" or "Resolved in 2h 15m (within SLA)"

### Story 5.3: SLA Visual Indicators & Breach Alerts

**As an** agent,
**I want** visual indicators showing SLA status,
**so that** I can prioritize tickets approaching breach.

**Acceptance Criteria:**

1. Ticket list shows SLA status badge: Green (on track), Yellow (at risk - 80% of time elapsed), Red (breached)
2. "At risk" defined as 80% of SLA time consumed
3. Breached tickets highlighted with red indicator in ticket list
4. Ticket detail view shows countdown timer: "First response due in 23 minutes"
5. Agent inbox sortable by "SLA Risk" (breached first, then at-risk, then on-track)
6. SLA breach creates system notification for assigned agent and manager
7. Email notification sent when SLA breached (configurable in settings)

### Story 5.4: Basic Analytics Dashboard

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

### Story 5.5: Agent Performance Metrics

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

### Story 5.6: Ticket Trends & Recurring Issues

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

### Story 5.7: Analytics Data Export

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

## Epic 6: Known Issues, Plugins & Launch Prep

**Goal:** Complete the MVP with known issues tracking (reduce duplicate tickets during outages), establish plugin framework foundation for extensibility, write comprehensive documentation for users, admins, and developers, optimize performance for production, conduct security review, and prepare for public launch. This epic delivers the final polish and infrastructure needed to go live.

### Story 6.1: Known Issues Board

**As an** IT team,
**I want** to publish known ongoing issues visible to all users,
**so that** users can follow issues instead of creating duplicate tickets.

**Acceptance Criteria:**

1. `known_issues` table created with: id, tenant_id, title, description, status (investigating/identified/monitoring/resolved), created_by, created_at, resolved_at
2. "Known Issues" page accessible from sidebar (public to all users)
3. Managers can create known issue from ticket detail view ("Pin as Known Issue" button)
4. Known issue detail page shows: title, description, status, timeline of updates, affected users count
5. Users can "Follow" known issue to receive updates
6. When ticket created matching known issue keywords, system suggests: "Is this related to [Known Issue]? Follow instead"
7. Status updates to known issue notify all followers (in-app + email)
8. Resolved known issues archived after 30 days

### Story 6.2: Duplicate Ticket Detection

**As an** agent,
**I want** the system to detect potential duplicate tickets,
**so that** I can consolidate related issues.

**Acceptance Criteria:**

1. When ticket created, AI searches for similar open tickets (semantic similarity using embeddings)
2. If similar ticket found (>80% similarity), system shows notification to user: "Similar ping found: #PING-123. View it?"
3. Agent view shows "Potential Duplicates" section in ticket sidebar
4. Agent can mark ticket as duplicate and link to original ticket
5. Duplicate ticket status set to "Closed - Duplicate" and users redirected to original
6. Users following duplicate ticket automatically follow original ticket
7. Duplicate detection logs saved for analytics (identify frequent duplicate patterns)

### Story 6.3: Plugin Framework Foundation

**As a** developer,
**I want** a plugin system with lifecycle hooks and webhooks,
**so that** I can extend EasyPing functionality.

**Acceptance Criteria:**

**Core Plugin Infrastructure:**

1. Plugin registry in database: `plugins` table (id, tenant_id, name, version, enabled, config, permissions)
2. Event hooks defined: `ticket.created`, `ticket.updated`, `ticket.resolved`, `ticket.closed`, `kb_article.published`, `user.created`, `message.sent`
3. Webhook system sends HTTP POST to configured URLs when events fire (includes event payload, signature for verification)
4. Plugin manifest format documented (JSON schema with metadata, hooks, config schema, permissions, UI components)
5. Settings page shows "Plugins" section (owner only) to enable/disable/configure plugins
6. Plugin configuration stored encrypted in database (per-tenant settings)

**Advanced Plugin Capabilities (Architecture Support):**

7. **UI Extension Points**: Plugin manifest can declare custom UI components that render in:
   - Ticket sidebar (for contextual information, actions)
   - Ticket message thread (for inline status badges, rich content)
   - Settings pages (for plugin configuration UI)
   - Custom standalone pages (for dashboards, reports)
8. **Action Execution**: Plugins can register custom actions callable from UI (e.g., "Reset Password", "Run Query")
9. **Background Jobs**: Plugin framework supports scheduled tasks and background processing (cron-style jobs)
10. **Data Storage**: Plugins can store custom data in isolated database tables (namespaced per plugin)
11. **API Access**: Plugins receive scoped API access to EasyPing data (tickets, users, KB) with permission enforcement

**Example Plugin & Documentation:**

12. Example plugin created: Slack webhook (posts notification to Slack when ticket created)
13. Example plugin architecture documented showing UI components, actions, and background jobs
14. Plugin developer guide written with code examples for each capability
15. TypeScript interfaces for plugin API published as npm package (`@easyping/plugin-sdk`)

**Security & Permissions:**

16. Plugin permission system: Plugins declare required permissions (read_tickets, write_tickets, execute_actions, etc.)
17. Users must approve plugin permissions before installation
18. Plugin sandbox prevents access to unauthorized data or system resources
19. Audit log tracks all plugin actions for compliance

### Story 6.4: Comprehensive Documentation

**As a** user, admin, or developer,
**I want** detailed documentation covering setup, usage, and customization,
**so that** I can effectively use and extend EasyPing.

**Acceptance Criteria:**

1. `docs/` directory includes: User Guide, Admin Guide, Developer Guide, Plugin Development, API Reference
2. User Guide covers: Creating pings, managing conversations, searching KB, following known issues
3. Admin Guide covers: Setup wizard, user management, SLA configuration, AI provider setup, branding customization
4. Developer Guide covers: Local dev setup, database schema, architecture overview, contributing guidelines
5. Plugin Development guide includes: Plugin manifest format, available hooks, example plugins, TypeScript API
6. API Reference documents all REST endpoints (auto-generated from OpenAPI/Swagger schema)
7. README.md includes: Quick start, deployment instructions, feature highlights, license info, community links
8. CONTRIBUTING.md with: Code of conduct, PR process, commit conventions, testing requirements

### Story 6.5: Performance Optimization

**As a** self-hoster,
**I want** EasyPing to run efficiently on modest hardware,
**so that** I don't need expensive infrastructure.

**Acceptance Criteria:**

1. Database query performance analyzed and optimized (composite indexes on hot queries)
2. Next.js app configured with production optimizations (minification, tree-shaking, code splitting)
3. Supabase Realtime connections optimized (connection pooling, lazy subscriptions)
4. Image uploads compressed before storage (max 1920px width, JPEG quality 85%)
5. Lazy loading implemented for heavy components (analytics charts, KB editor)
6. Bundle size analyzed (main bundle <500KB gzipped)
7. Load testing confirms: 100 concurrent users on 4GB RAM VM with acceptable response times (<2s page load)
8. Database query logging enabled to identify slow queries

### Story 6.6: Security Review & Hardening

**As a** security-conscious user,
**I want** EasyPing to follow security best practices,
**so that** my data is protected.

**Acceptance Criteria:**

1. Dependency audit completed (npm audit fix, no high/critical vulnerabilities)
2. RLS policies tested to confirm tenant isolation (no cross-tenant data leaks)
3. Input validation using Zod on all forms (prevents XSS, injection attacks)
4. API keys encrypted at rest (using Supabase vault or database encryption)
5. Rate limiting implemented on API routes (prevent abuse: 100 req/min per IP)
6. CSRF protection enabled (Next.js CSRF tokens)
7. Security headers configured (CSP, X-Frame-Options, HSTS)
8. Docker image scanned for vulnerabilities (using Trivy or Snyk)
9. Security documentation written (deployment best practices, HTTPS setup, backup procedures)

### Story 6.7: Launch Preparation & Docker Image Publishing

**As a** community member,
**I want** to easily install EasyPing from public Docker Hub,
**so that** I can deploy with a single command.

**Acceptance Criteria:**

1. Docker image built with multi-stage Dockerfile (optimized size <500MB)
2. Image published to Docker Hub: `easyping/easyping:latest` and `easyping/easyping:v1.0.0`
3. Docker Compose file updated with versioned image reference
4. Deployment tested on clean Ubuntu 22.04, Debian 12, and Fedora VMs
5. GitHub release created with changelog, Docker install instructions, migration notes
6. Landing page created at easyping.me with: Feature highlights, demo video, "Deploy Now" button, GitHub link
7. README badges added: Docker pulls, GitHub stars, license, build status
8. Community channels established: GitHub Discussions, Discord server (optional)
9. Show HN post drafted (ready for launch day)
10. Product Hunt submission prepared (screenshots, tagline, description)

---
