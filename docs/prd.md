# EasyPing Product Requirements Document (PRD)

**Product:** EasyPing.me (Community Edition)
**Audience:** Small IT teams, startups, freelancers, open-source community
**Status:** Ready for Architecture Phase
**Version:** 1.0

**Tagline:** *"No forms. No friction. Just EasyPing."*

---

## Ecosystem Context

EasyPing is part of the **ping.me ecosystem**, a suite of interconnected products built on the shared concept of a "Ping":

- **EasyPing.me** - Free, open-source, chat-first service desk (this product)
- **ServicePing.me** - Enterprise edition with SSO, compliance, advanced features (future)
- **ProductPing.me** - Innovation management and feature request tracking (future)
- **OpsPing.me** - Incident and release management (future)

This PRD focuses on **EasyPing** as the foundational community edition that validates product-market fit and builds ecosystem momentum.

---

## Table of Contents

1. [Goals and Background Context](#1-goals-and-background-context)
2. [Requirements](#2-requirements)
   - [Functional Requirements](#functional-requirements)
   - [Non-Functional Requirements](#non-functional-requirements)
3. [User Interface Design Goals](#3-user-interface-design-goals)
4. [Technical Assumptions](#4-technical-assumptions)
   - [Open-Core Business Model](#open-core-business-model)
   - [License Strategy](#license-strategy)
   - [Multi-Tenancy Strategy](#multi-tenancy-strategy)
   - [Technology Stack](#technology-stack)
   - [Development Practices](#development-practices)
5. [Epic List](#5-epic-list)
6. [Epic Details](#6-epic-details)
   - [6.1 Epic 1: Foundation](#61-epic-1-foundation-setup-and-deployment-infrastructure)
   - [6.2 Epic 2: Tickets](#62-epic-2-tickets-core-ticketing-with-chat-first-ux)
   - [6.3 Epic 3: AI](#63-epic-3-ai-intelligent-routing-and-agent-copilot)
   - [6.4 Epic 4: Knowledge Base](#64-epic-4-knowledge-base-self-service-and-auto-documentation)
   - [6.5 Epic 5: SLA & Analytics](#65-epic-5-sla--analytics-transparency-and-performance-tracking)
   - [6.6 Epic 6: Plugins & Launch](#66-epic-6-plugins--launch-extensibility-and-production-readiness)
   - [6.7 Post-MVP Roadmap](#67-post-mvp-roadmap-future-plugins--features)
7. [Checklist Results Report](#7-checklist-results-report)
8. [Next Steps](#8-next-steps)

---

## 1. Goals and Background Context

### Goals

- **Deliver a free, open-source service desk** that eliminates the cost barrier for small teams and startups
- **Provide chat-first ticket intake** that removes form friction and aligns with how teams already communicate (Slack/Teams)
- **Build AI-native automation** from day one to auto-categorize, route, and suggest responses without manual triage
- **Automatically generate a living knowledge base** from resolved tickets to solve problems once and reuse solutions
- **Enable easy self-hosted deployment** via Docker to give teams full control and data ownership
- **Create a plugin ecosystem foundation** that allows community extension and customization
- **Establish community-driven innovation** that validates demand and creates upgrade path to ServicePing (enterprise edition)
- **Maintain ecosystem vision** linking support (EasyPing) → incidents (OpsPing) → features (ProductPing) for future phases

**Success Metrics (6-Month Targets):**

- **GitHub stars:** 2,000+ (community validation and discoverability)
- **Active deployments:** 200+ organizations running EasyPing in production
- **Community contributors:** 5+ external contributors with merged PRs
- **Conversion signals:** 10+ "we'd pay for hosted version" inquiries (validates ServicePing demand)
- **Knowledge base growth:** Average 20+ KB articles auto-generated per deployment
- **Plugin adoption:** 3+ community-developed plugins published

### Background Context

Traditional service desk solutions (Zendesk, Freshdesk, ServiceNow) are expensive, form-heavy, and built for enterprise workflows that don't fit small IT teams, startups, or open-source projects. These tools create friction through ticket forms, lack meaningful AI automation, and require manual knowledge base curation. The result: tickets become "black holes" with no visibility, duplicate issues pile up, and support knowledge is lost rather than captured.

EasyPing solves this by being the first **AI-native, chat-first, truly free** service desk. Built on modern stack (React, Next.js, Supabase), it provides conversational ticket intake, intelligent auto-routing, agent copilot assistance, and automatic knowledge base generation—all deployable in 60 seconds via Docker. The community edition (EasyPing) validates product-market fit and builds ecosystem momentum, while the broader vision includes enterprise features (ServicePing), incident management (OpsPing), and innovation tracking (ProductPing) as future paid modules. By starting with a free, open-source foundation, we lower customer acquisition costs, build credibility through GitHub stars and community adoption, and create a clear upgrade path for teams that grow beyond community edition capabilities.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-21 | 1.0 | PRD finalized with quantified success metrics and table of contents | PM Agent |
| 2025-01-21 | 0.1 | Initial PRD draft focused on EasyPing with ecosystem context | PM Agent |

---

## 2. Requirements

### Functional Requirements

**Ticket Intake & Management**

- **FR1:** The system shall provide a chat-first interface for users to create tickets by describing issues in natural language without filling forms
- **FR2:** The system shall convert chat conversations into structured ticket records with automatic metadata extraction
- **FR3:** The system shall support threaded conversations within each ticket, allowing back-and-forth discussion between users and agents
- **FR4:** The system shall allow users to attach files (images, documents, logs) to ticket conversations
- **FR5:** The system shall track ticket status (New, In Progress, Waiting on User, Resolved, Closed) with visual indicators
- **FR6:** The system shall allow agents to manually update ticket status, priority, and assignment

**AI Capabilities**

- **FR7:** The system shall automatically categorize incoming tickets using AI-based classification (e.g., Hardware, Software, Access Request, Network)
- **FR8:** The system shall automatically route tickets to appropriate queues or agents based on category and priority
- **FR9:** The system shall generate concise AI-powered summaries of ticket history and pin them at the top of each ticket thread
- **FR10:** The system shall provide agent copilot functionality that suggests response drafts based on ticket context
- **FR11:** The system shall suggest relevant knowledge base articles to agents during ticket resolution
- **FR12:** The system shall allow users to provide their own AI provider API keys (OpenAI, Anthropic, Azure) for AI features

**Knowledge Base**

- **FR13:** The system shall automatically convert resolved tickets into knowledge base article drafts with AI assistance
- **FR14:** The system shall allow agents to review, edit, and publish auto-generated knowledge base articles
- **FR15:** The system shall provide semantic search across knowledge base articles using vector embeddings
- **FR16:** The system shall suggest relevant KB articles to users during ticket creation based on their description
- **FR17:** The system shall track KB article usage and link articles back to source tickets

**Known Issues & Transparency**

- **FR18:** The system shall allow IT teams to publish and pin known ongoing issues (outages, incidents)
- **FR19:** The system shall allow users to follow/subscribe to known issues instead of creating duplicate tickets
- **FR20:** The system shall automatically detect potential duplicate tickets and suggest joining existing issues

**SLA Tracking**

- **FR21:** The system shall support configurable SLA policies with response time and resolution time targets
- **FR22:** The system shall track time-to-first-response and time-to-resolution for each ticket
- **FR23:** The system shall provide visual SLA indicators (on-track, at-risk, breached) for agents and managers
- **FR24:** The system shall send notifications when tickets are approaching or breaching SLA thresholds

**Analytics & Reporting**

- **FR25:** The system shall provide a dashboard showing ticket volume, resolution times, and SLA compliance
- **FR26:** The system shall track and display agent performance metrics (tickets resolved, avg resolution time)
- **FR27:** The system shall identify recurring issues and trending topics from ticket data

**User Management & Permissions**

- **FR28:** The system shall support four user roles: End User, Agent, Manager, Owner
- **FR29:** The system shall allow users to self-register and create accounts via email/password or OAuth
- **FR30:** The system shall restrict agent and manager functions to authorized users only

**Plugin Framework**

- **FR31:** The system shall provide a plugin framework with webhook support for extending functionality
- **FR32:** The system shall allow plugins to hook into ticket lifecycle events (created, updated, resolved, closed)
- **FR33:** The system shall provide plugin configuration interface for enabling/disabling plugins

**Deployment & Configuration**

- **FR34:** The system shall be deployable via a single Docker Compose command
- **FR35:** The system shall include all necessary services (database, auth, storage, realtime) in the Docker deployment
- **FR36:** The system shall provide a first-run setup wizard for initial configuration
- **FR37:** The system shall allow administrators to configure branding (logo, colors, company name)

---

### Non-Functional Requirements

**Performance**

- **NFR1:** The system shall load the ticket list view in under 2 seconds for up to 10,000 tickets
- **NFR2:** The system shall process and display new messages in ticket threads with realtime updates (< 500ms latency)
- **NFR3:** AI auto-categorization shall complete within 3 seconds of ticket creation
- **NFR4:** Knowledge base search results shall return in under 1 second

**Security**

- **NFR5:** The system shall use Row Level Security (RLS) to isolate tenant data in multi-instance deployments
- **NFR6:** The system shall hash and salt all user passwords using industry-standard algorithms (bcrypt)
- **NFR7:** The system shall use HTTPS/TLS for all network communications
- **NFR8:** The system shall sanitize all user inputs to prevent XSS and SQL injection attacks
- **NFR9:** The system shall store AI provider API keys encrypted at rest
- **NFR10:** The system shall provide audit logs for sensitive operations (user creation, role changes, config updates)

**Scalability**

- **NFR11:** The system shall support up to 100 concurrent users on a single self-hosted instance with 4GB RAM
- **NFR12:** The system shall support up to 50,000 tickets per tenant without performance degradation
- **NFR13:** The database schema shall use appropriate indexes to maintain query performance at scale

**Deployment & Operations**

- **NFR14:** The system shall start successfully with a single `docker-compose up` command on fresh Ubuntu 22.04 installation
- **NFR15:** The system shall provide clear error messages and logging for troubleshooting deployment issues
- **NFR16:** The system shall support database backups and restoration procedures
- **NFR17:** The system shall document resource requirements (CPU, RAM, storage) for self-hosted deployment

**Open Source & Licensing**

- **NFR18:** The system shall be released under an OSI-approved open source license (MIT or Apache 2.0)
- **NFR19:** The system shall clearly document which features are community edition vs enterprise-only
- **NFR20:** The system shall not include telemetry or phone-home functionality without explicit user consent

**Data Privacy**

- **NFR21:** The system shall allow users to run entirely self-hosted with no external dependencies (except BYOK AI)
- **NFR22:** The system shall not send ticket data to external services without explicit user configuration
- **NFR23:** The system shall provide data export functionality for all user and ticket data

**API & Integration**

- **NFR24:** The system shall provide a documented REST API for ticket creation and management
- **NFR25:** The system shall use industry-standard authentication for API access (API keys, OAuth tokens)

**Usability**

- **NFR26:** The system shall provide a responsive web UI that works on desktop and mobile browsers
- **NFR27:** The system shall provide inline help and tooltips for key features
- **NFR28:** The system shall require minimal configuration for basic operation after initial setup

**Development & Community**

- **NFR29:** The system shall include a development environment setup guide (README with quickstart)
- **NFR30:** The system shall provide plugin development documentation and examples
- **NFR31:** The system shall maintain test coverage of at least 70% for critical business logic

---

## 3. User Interface Design Goals

### Overall UX Vision

EasyPing's UX should feel like **"Slack for support tickets"** — a modern, chat-first interface that eliminates the cognitive overhead of traditional ticketing systems. Users should be able to describe their problem naturally in a conversation, not hunt through dropdown menus or mandatory form fields. The experience should be **frictionless, familiar, and fast**.

**Key UX Principles:**

- **Conversational by default**: Every interaction starts with a message, not a form
- **Realtime and responsive**: Updates appear instantly without page refreshes (WebSocket-driven)
- **Progressive disclosure**: Simple by default, powerful when needed (hide complexity until required)
- **AI-augmented, not AI-gated**: AI assists agents but never blocks workflows if it fails
- **Clean and uncluttered**: Generous whitespace, clear visual hierarchy, focused attention
- **Keyboard-first for power users**: Full keyboard navigation for agents who live in the tool

The overall aesthetic should be **modern SaaS product** — think Linear, Notion, or Vercel's design language — not enterprise software from 2010.

---

### Key Interaction Paradigms

**Primary Interactions:**

1. **Chat-based ticket creation**: Users type freely in a message box, system captures context and creates ticket automatically
2. **Threaded conversations**: Each ticket is a persistent chat thread with chronological message history
3. **Inline AI suggestions**: Agents see AI-generated response suggestions as "ghost text" they can accept/edit/ignore
4. **Drag-and-drop attachments**: Files can be dropped directly into conversation threads
5. **Quick actions via emoji reactions**: Mark resolved, escalate, or assign tickets with reaction-style buttons (⚡ for quick actions)
6. **Live typing indicators**: Show when agents or users are composing responses
7. **Command palette**: Keyboard shortcut (Cmd+K) to search tickets, navigate, or execute actions
8. **Smart autocomplete**: Auto-suggest ticket IDs, user names, KB articles as users type

**Navigation Model:**

- **Sidebar navigation**: Persistent left sidebar with Inbox, My Pings, All Tickets, Known Issues, Knowledge Base, Settings
- **Ticket detail view**: Right-side panel shows full conversation thread with AI summary pinned at top
- **Contextual actions**: Toolbar at top of ticket with status, assignment, priority, SLA timer

---

### Core Screens and Views

**For End Users:**

1. **Create Ticket Screen**: Simple chat interface with "Send a ping..." or "What can we help with?" prompt
2. **My Pings**: **Chat-style conversation list** showing active pings with:
   - Contact/agent avatar and name
   - Last message preview
   - Status indicator badge (🟢 New, 🟡 In Progress, 🔵 Waiting on You, ✅ Resolved)
   - Timestamp of last activity
   - Unread message count
   - **Auto-archive behavior**: Resolved pings automatically fall off the list after 7 days (configurable)
3. **Ticket Conversation View**: Full thread view with message history, attachments, status updates
4. **Known Issues Board**: Public-facing board showing ongoing incidents with follow/subscribe options
5. **Knowledge Base Search**: Self-service search interface with article previews (could brand as "Help Center" or "Answers")

**For Agents:**

6. **Agent Inbox**: Unified queue of assigned pings with SLA indicators and filters (by status, priority, category)
7. **Ticket Detail Panel**: Split view - ping list on left, conversation thread on right with AI copilot suggestions
8. **Knowledge Base Editor**: Interface to review AI-generated KB drafts and publish articles
9. **Agent Dashboard**: Personal metrics (pings resolved today, avg resolution time, SLA compliance)

**For Managers:**

10. **Analytics Dashboard**: High-level metrics (ping volume trends, SLA performance, top categories, agent performance)
11. **Team Overview**: See all open pings across team with assignment and status
12. **SLA Configuration**: Interface to define and edit SLA policies

**Admin/Owner:**

13. **Settings & Configuration**: System settings, user management, branding, AI provider setup
14. **Plugin Management**: Enable/disable plugins, configure plugin settings
15. **First-Run Setup Wizard**: Initial configuration flow for Docker deployment (company name, admin user, AI keys)

---

### Accessibility

**Target Level: WCAG 2.1 Level AA**

**Key Requirements:**

- Keyboard navigation for all interactive elements
- ARIA labels for screen readers on dynamic content (chat messages, notifications)
- Color contrast ratios meeting AA standards (4.5:1 for normal text, 3:1 for large text)
- Focus indicators clearly visible for keyboard users
- Alt text for all images and icons
- Support for browser zoom up to 200% without breaking layout
- Captions/transcripts for any video help content

---

### Branding

**Ping.me Ecosystem Identity:**

EasyPing is part of the **ping.me ecosystem**, and the branding should reinforce this across all products:

- **EasyPing.me** - Community edition (this product)
- **ServicePing.me** - Enterprise edition (future)
- **ProductPing.me** - Innovation management (future)
- **OpsPing.me** - Incident + release management (future)

**Core Brand Concept: "Ping"**

The term **"ping"** should permeate the user experience:

- **User-facing language**: "Send a ping" instead of "Create a ticket"
- **Conversation list**: "My Pings" instead of "My Tickets"
- **Notifications**: "You received a ping from IT" instead of "New ticket response"
- **Agent language**: Can use "ticket" internally for agents, but "ping" for user-facing UI
- **Tagline**: *"No forms. No friction. Just EasyPing."*

**Visual Style:**

- **Modern and professional**: Clean, minimalist design with professional polish
- **Ping metaphor**: Visual language could incorporate waves, ripples, signals, or connection imagery
- **Open-source friendly**: Welcoming and transparent, not corporate/sterile
- **Light mode primary**: Default to light theme, dark mode as stretch goal for v2
- **Component library**: Use shadcn/ui + Tailwind for modern React stack consistency

**Brand Customization (for self-hosted users):**

- Configurable company logo (header and login screen)
- Configurable primary brand color (used for buttons, links, highlights)
- Configurable company name (appears in page titles, emails, headers)
- **Domain customization**: Self-hosted instances run on user's domain, but powered by EasyPing
- Default EasyPing.me branding where user hasn't customized

**Default EasyPing Branding:**

- **Domain**: EasyPing.me (community edition hosted/demo)
- **Color palette**:
  - Primary: `#3B82F6` (Tailwind blue-500) - suggests "ping" signal/connectivity
  - Accent: `#8B5CF6` (Tailwind violet-500) - adds visual interest
  - Status colors: Green (resolved), Yellow (in progress), Blue (waiting), Red (SLA breach)
- **Logo concept**: Simple, memorable icon suggesting ping/wave/signal (e.g., concentric circles, radio waves, or chat bubble with ripple effect)
- **Typography**: Inter font family (clean, modern, excellent readability)
- **Iconography**: Lucide icons or similar clean, minimal icon set

**Branding Consistency Across Ecosystem:**

All ping.me products should share visual DNA:
- Consistent color palette with product-specific accent colors
- Shared ping/wave/signal visual metaphor
- Unified typography and component styling
- Clear product differentiation through accent colors:
  - EasyPing: Blue (approachable, community)
  - ServicePing: Navy/Professional (enterprise)
  - ProductPing: Purple (innovation)
  - OpsPing: Orange/Red (urgency, ops)

**Terminology Guide:**

| Traditional Ticketing Term | EasyPing Term (User-Facing) | Agent Term (Internal) |
|----------------------------|----------------------------|----------------------|
| Create ticket | Send a ping | Create ticket |
| My tickets | My pings | My queue |
| Ticket #1234 | Ping #1234 | Ticket #1234 |
| New ticket notification | New ping from [user] | New ticket assigned |
| Ticket resolved | Ping resolved | Ticket closed |
| Ticket list | Conversations | Queue |

---

### Target Device and Platforms

**Primary Target: Web Responsive (Desktop + Mobile Web)**

**Desktop Experience (Primary):**

- Optimized for 1280px+ resolution
- Agents will primarily use desktop browsers
- Support for Chrome, Firefox, Safari, Edge (latest 2 versions)
- Full feature set available on desktop

**Mobile Web Experience (Secondary):**

- Responsive layout that works on mobile browsers (iOS Safari, Chrome Android)
- Streamlined interface for ticket viewing and basic responses
- Touch-friendly targets (minimum 44px tap areas)
- Users can create tickets and view status on mobile
- Agent features accessible but not optimized (agents primarily work on desktop)

**NOT in scope for MVP:**

- Native mobile apps (iOS/Android)
- PWA offline capabilities
- Tablet-specific layouts (use responsive web)
- Desktop applications (Electron)

---

## 4. Technical Assumptions

### Open-Core Business Model

**EasyPing is Open-Core, NOT Fully Open Source SaaS**

EasyPing follows an **open-core model**: the core product is open source (AGPLv3), but the SaaS orchestration, billing, and enterprise features remain **proprietary** for ServicePing.me.

**What This Means:**

- **Open Source Core** (EasyPing): Anyone can self-host, modify, and extend
- **Proprietary SaaS Layer** (ServicePing.me): Multi-tenant orchestration, billing, enterprise features closed-source
- **Commercial Protection**: License prevents competitors from offering hosted EasyPing as a service without releasing modifications
- **Community Value**: Users get full-featured, production-ready software for free
- **Business Sustainability**: We monetize hosting, support, and enterprise features

---

### License Strategy: AGPLv3

**License Choice: GNU Affero General Public License v3.0 (AGPLv3)**

**Why AGPLv3:**

- **SaaS Protection**: Anyone running EasyPing as a hosted service must open source their modifications
- **Fork Prevention**: Competitors can't take EasyPing, add features, and sell hosted version without contributing back
- **Self-Hosting Freedom**: Users can deploy, modify, and run EasyPing internally without restrictions
- **Community Contributions**: Encourages contributions back to the project
- **Precedent**: Used successfully by GitLab, Grafana, MongoDB (similar models)

**What AGPLv3 Allows:**

✅ Self-host EasyPing for your organization
✅ Modify code for internal use
✅ Fork and distribute modified versions (must stay AGPLv3)
✅ Build plugins and integrations

**What AGPLv3 Prevents:**

❌ Running modified EasyPing as hosted SaaS without open sourcing changes
❌ Relicensing under permissive license (MIT/Apache)
❌ Offering "EasyPing-as-a-Service" commercially without releasing code

**Exception: ServicePing.me (Our Hosted SaaS)**

- **We own the code**, so we can offer ServicePing.me under proprietary license
- ServicePing.me includes proprietary orchestration layer NOT in open-source repo
- We're not violating AGPLv3 because we're the copyright holder

**Alternative Considered:**

- **MIT/Apache 2.0**: Too permissive, allows competitors to easily launch SaaS
- **Fair Source / BSL**: Less community-friendly, limited adoption
- **Dual License**: Complex, confusing for contributors

---

### Multi-Tenancy Strategy: Schema-Ready, Orchestration Proprietary

**CRITICAL DESIGN PRINCIPLE:** EasyPing has a **multi-tenant database schema** (good architecture) but runs in **single-tenant mode**. The SaaS orchestration layer for ServicePing.me remains **proprietary and closed-source**.

**What's in Open Source (EasyPing):**

✅ **Multi-tenant database schema**: Tables include `tenant_id`, RLS policies exist
✅ **Single organization mode**: One org per deployment, no org switching UI
✅ **Clean architecture**: Tenant isolation enforced at DB level (security best practice)
✅ **Data export**: Users can export their org data for migration

**What Stays Proprietary (ServicePing.me):**

🔒 **Multi-tenant SaaS orchestration**: Org provisioning, cross-tenant admin, resource allocation
🔒 **Billing & subscription system**: Stripe integration, usage metering, plan limits
🔒 **SaaS admin dashboard**: Platform-wide metrics, org management, support tools
🔒 **Enterprise features**: SSO/SAML, SOC 2 compliance, advanced audit logs
🔒 **Infrastructure automation**: Kubernetes configs, auto-scaling, multi-region deployment

**Multi-Tenant Database Design (Open Source):**

- **Every table includes `tenant_id`**: All data tables include a `tenant_id` (UUID) column referencing an `organizations` table
- **Row Level Security (RLS)**: PostgreSQL RLS policies enforce tenant isolation at the database level
- **Single tenant mode**: EasyPing creates one organization during setup, hides multi-org UI
- **Future-proof architecture**: Schema supports multiple orgs, but orchestration isn't exposed

**Why This Approach:**

✅ **Clean architecture**: Multi-tenant schema is better even for single-tenant (security, data isolation)
✅ **ServicePing.me ready**: When we launch SaaS, we add proprietary orchestration layer on top
✅ **Competitor protection**: Forking EasyPing doesn't give you SaaS orchestration (6-12 months of work)
✅ **Community benefits**: Users get well-architected software without SaaS complexity

**What Competitors Would Need to Build:**

If someone forks EasyPing to create a competing SaaS, they must build from scratch:

1. **Tenant provisioning system** (2-3 months)
2. **Billing integration with Stripe** (1-2 months)
3. **Usage metering and plan enforcement** (1-2 months)
4. **Cross-tenant admin dashboard** (1-2 months)
5. **Multi-region infrastructure** (2-3 months)
6. **Compliance & security certifications** (6-12 months)
7. **Enterprise SSO/SAML** (1-2 months)

**Total: 6-12+ months of engineering** AFTER forking. By then, ServicePing.me is years ahead.

**Migration Path to ServicePing.me:**

1. **Phase 1 (Now)**: Build EasyPing with multi-tenant schema, single-tenant mode
2. **Phase 2 (6-12 months)**: Validate product-market fit, grow community to 5,000+ deployments
3. **Phase 3 (12-18 months)**: Launch ServicePing.me with proprietary SaaS orchestration layer
4. **Data portability**: EasyPing users can export and migrate to ServicePing.me seamlessly

---

### Open vs Proprietary: Clear Boundaries

**EasyPing Repository (Open Source - AGPLv3):**

```
easyping/ (open source repo)
├── apps/
│   ├── web/              # Next.js app (single-tenant mode)
│   └── docs/             # Documentation
├── packages/
│   ├── database/         # Multi-tenant schema, RLS policies
│   ├── ai/               # AI provider abstraction
│   ├── ui/               # Shared components
│   └── types/            # TypeScript types
├── docker/
│   └── docker-compose.yml  # Self-hosted deployment
└── LICENSE               # AGPLv3
```

**ServicePing.me Proprietary Layer (Closed Source):**

```
serviceping-orchestration/ (private repo)
├── apps/
│   ├── platform-admin/   # Cross-tenant admin dashboard
│   └── billing/          # Stripe billing service
├── packages/
│   ├── tenant-provisioning/  # Org creation, resource allocation
│   ├── usage-metering/       # Track usage, enforce limits
│   ├── enterprise-auth/      # SSO/SAML integrations
│   └── compliance/           # SOC 2, audit logs, data residency
├── infrastructure/
│   ├── kubernetes/       # Multi-tenant K8s configs
│   └── terraform/        # Infrastructure as code
└── LICENSE               # Proprietary / All Rights Reserved
```

**Integration Point:**

- ServicePing.me imports EasyPing as a package/module
- Adds proprietary orchestration layer on top
- Same core codebase, different deployment modes
- Environment variable: `DEPLOYMENT_MODE=saas` enables proprietary features

**Why This Matters:**

- **Open source doesn't = giving away the SaaS business**
- **Community builds the core, we build the orchestration**
- **Competitors must reinvent SaaS plumbing (6-12 months)**
- **We stay ahead through execution, brand, and proprietary layer**

---

### Repository Structure: Monorepo

**Decision:** Use a **monorepo** structure with all code in a single repository.

**Structure:**

```
easyping/
├── apps/
│   ├── web/              # Next.js frontend application
│   └── docs/             # Documentation site (optional, future)
├── packages/
│   ├── database/         # Supabase migrations, schemas, RLS policies
│   ├── ai/               # AI provider abstraction layer
│   ├── ui/               # Shared UI components (shadcn/ui)
│   └── types/            # Shared TypeScript types
├── docker/
│   └── docker-compose.yml  # Self-hosted deployment configuration
└── scripts/              # Build, deployment, migration scripts
```

**Rationale:**

- **Simplified development**: Single clone, single install, unified versioning
- **Code sharing**: Easy to share types, utilities, and components between frontend and backend
- **Community-friendly**: Contributors only need to understand one repo structure
- **Deployment simplicity**: One build process for Docker image
- **Tool support**: Modern tools (Turborepo, pnpm workspaces) make monorepos fast and efficient

---

### Service Architecture: Monolithic Frontend + Supabase BaaS

**Architecture Pattern:** Serverless monolith with Backend-as-a-Service (Supabase)

**Components:**

1. **Frontend (Next.js)**
   - Server-side rendering (SSR) for initial page loads
   - Client-side React for interactive UI
   - Next.js API routes for lightweight server functions (AI calls, webhook handlers)
   - Deployed as single containerized application

2. **Backend (Supabase)**
   - **PostgreSQL**: Database with Row Level Security (RLS) for tenant isolation
   - **Supabase Auth**: User authentication (email/password, OAuth)
   - **Supabase Storage**: File attachments (images, documents, logs)
   - **Supabase Realtime**: WebSocket-based live updates for chat threads
   - **pgvector**: Vector embeddings for semantic search (knowledge base)
   - **PostgREST**: Auto-generated REST API from database schema
   - **Supabase Edge Functions** (future): Serverless functions for plugin webhooks

3. **AI Layer (Provider Abstraction)**
   - Abstraction layer supporting multiple providers (OpenAI, Anthropic, Azure OpenAI)
   - Users bring their own API keys (BYOK model for EasyPing)
   - ServicePing.me will use platform API keys with usage tracking
   - Graceful degradation when AI unavailable
   - Future: Local model support (Ollama, LM Studio)

**Rationale:**

- **Speed to market**: Supabase provides auth, database, storage, realtime out-of-box
- **Self-hostable**: Supabase can be self-hosted via Docker (EasyPing)
- **SaaS-ready**: Same Supabase stack works for hosted ServicePing.me
- **Scalability**: Supabase scales from small deployments to high traffic
- **Developer experience**: Type-safe client, automatic API generation, real-time subscriptions
- **Cost-effective**: Generous free tier, self-hosted option eliminates vendor lock-in

**NOT building:**

- Separate microservices (overkill for MVP)
- Custom authentication system (use Supabase Auth)
- Custom realtime infrastructure (use Supabase Realtime)
- GraphQL API (use Supabase PostgREST, add GraphQL later if needed)

---

### Testing Requirements: Unit + Integration Testing

**Testing Strategy:**

**1. Unit Testing (70% coverage minimum)**

- **Framework**: Vitest (fast, modern, compatible with Vite/Next.js)
- **Coverage targets**:
  - AI provider abstraction layer: 90%+
  - Business logic (ticket categorization, routing): 80%+
  - Utility functions: 80%+
  - UI components: 60%+
- **Mocking**: Mock Supabase client, AI provider APIs
- **CI/CD**: Tests run on every PR

**2. Integration Testing**

- **Framework**: Playwright or Cypress for critical user flows
- **Key flows to test**:
  - User creates ticket via chat interface
  - AI auto-categorizes and routes ticket
  - Agent responds to ticket, user receives notification
  - Knowledge base article creation from resolved ticket
  - SLA breach notification
- **Database**: Use Supabase local development environment with test data
- **Coverage**: 10-15 critical user journeys

**3. Manual Testing (for MVP)**

- End-to-end testing before releases
- Browser compatibility testing (Chrome, Firefox, Safari, Edge)
- Mobile responsive testing (iOS Safari, Chrome Android)
- Docker deployment testing on fresh Ubuntu VM

**NOT in MVP scope:**

- E2E testing for every feature (too time-consuming for MVP)
- Load/performance testing (defer until post-launch)
- Security penetration testing (manual review + dependency scanning for MVP)

**Rationale:**

- **Focus on quality**: 70% unit coverage ensures core logic is solid
- **Integration tests**: Catch critical bugs in user flows without over-investing in test infrastructure
- **Manual testing**: Acceptable for MVP, automate incrementally post-launch
- **CI/CD integration**: Automated tests prevent regressions

---

### Technology Stack Details

**Frontend:**

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **UI Components**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React hooks + Zustand (for complex global state)
- **Forms**: React Hook Form + Zod validation
- **Date/Time**: date-fns (lightweight, modern)

**Backend:**

- **Database**: PostgreSQL 15+ (via Supabase)
- **ORM/Client**: Supabase JavaScript client (type-safe)
- **Migrations**: Supabase CLI migration system
- **Vector Search**: pgvector extension
- **Full-text Search**: PostgreSQL tsvector + GIN indexes

**AI Integration:**

- **Providers**: OpenAI (GPT-4, GPT-3.5), Anthropic (Claude), Azure OpenAI
- **Abstraction**: Custom provider interface (future: Vercel AI SDK)
- **Embeddings**: OpenAI text-embedding-3-small or sentence-transformers
- **Model Selection**: User-configurable (default: GPT-3.5-turbo for cost)
- **EasyPing**: BYOK (Bring Your Own Key) model
- **ServicePing.me**: Platform API keys with usage metering and billing

**Infrastructure:**

- **Containerization**: Docker + Docker Compose
- **Supabase**: Self-hosted via official Docker images (EasyPing)
- **Supabase Cloud**: Hosted Supabase for ServicePing.me
- **Reverse Proxy**: Caddy (automatic HTTPS, easy configuration)
- **CI/CD**: GitHub Actions (lint, test, build, Docker image publish)
- **Image Registry**: Docker Hub (public images for community)

**Developer Tools:**

- **Package Manager**: pnpm (fast, efficient, workspace support)
- **Monorepo Tool**: Turborepo (build caching, parallel execution)
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode
- **Git Hooks**: Husky + lint-staged (pre-commit checks)
- **Versioning**: Semantic versioning (semver)

**Documentation:**

- **Format**: Markdown (GitHub-flavored)
- **API Docs**: TypeDoc for code documentation
- **User Docs**: Markdown files in `/docs` directory
- **Contributing Guide**: CONTRIBUTING.md with setup instructions
- **Plugin Development**: Detailed guide with example plugins

**Deployment Targets:**

**EasyPing (Self-Hosted):**

- **Primary**: Docker Compose (single-command deployment)
- **Cloud VPS**: DigitalOcean, Linode, AWS EC2, Hetzner (user-managed)
- **Kubernetes**: Helm charts (Phase 2, for advanced users)
- **Minimum Requirements**: 2 CPU cores, 4GB RAM, 20GB storage
- **Recommended**: 4 CPU cores, 8GB RAM, 50GB SSD

**ServicePing.me (Hosted SaaS):**

- **Application**: Vercel, Railway, or AWS ECS (managed Next.js)
- **Database**: Supabase Cloud (managed PostgreSQL with global replication)
- **CDN**: Vercel Edge Network or CloudFront
- **Monitoring**: Datadog or New Relic for production observability
- **Scalability**: Auto-scaling based on load

---

### Security Considerations

**EasyPing Security:**

- **Dependencies**: Automated scanning with Dependabot
- **Secrets**: Environment variables, never committed to Git
- **API Keys**: Encrypted at rest in database
- **HTTPS**: Required for production (enforced by Caddy)
- **CORS**: Configured to prevent unauthorized API access
- **Rate Limiting**: Implement at API level to prevent abuse
- **SQL Injection**: Prevented by Supabase client parameterization
- **XSS**: Sanitize user inputs, use React's built-in escaping
- **RLS Policies**: Tenant isolation enforced at database level

**ServicePing.me Additional Security:**

- **SOC 2 Compliance** (future): Audit logs, access controls, data encryption
- **SSO/SAML**: Enterprise authentication (Okta, Azure AD)
- **Data Residency**: Region-specific deployment options (EU, US)
- **Penetration Testing**: Annual third-party security audits
- **Bug Bounty**: Community security researcher program
- **DDoS Protection**: CloudFlare or AWS Shield
- **Secrets Management**: AWS Secrets Manager or HashiCorp Vault

---

### Plugin Framework Architecture

**Plugin System Design:**

- **Hook System**: Event-based hooks (ticket.created, ticket.updated, ticket.resolved)
- **Webhook Support**: HTTP webhooks to external services
- **Plugin Format**: NPM packages with manifest file
- **Plugin API**: Documented TypeScript interfaces
- **Sandbox**: Plugins run in isolated context (future: Deno runtime for security)
- **Discovery**: Community plugin registry (future: marketplace)

**Plugin Marketplace (ServicePing.me):**

- **Vetted Plugins**: Reviewed and approved by ServicePing team
- **Paid Plugins**: Revenue sharing model for plugin developers
- **Installation**: One-click install from marketplace
- **Billing Integration**: Plugin subscriptions handled via Stripe

---

### Observability & Monitoring

**EasyPing (Basic):**

- **Logging**: Structured JSON logs via Pino
- **Error Tracking**: Sentry (optional, user-configurable)
- **Metrics**: Basic Supabase dashboard metrics
- **Health Checks**: `/api/health` endpoint for monitoring

**ServicePing.me (Production-Grade):**

- **APM**: Datadog or New Relic for application performance monitoring
- **Error Tracking**: Sentry with full source maps and user context
- **Metrics**: Prometheus + Grafana for custom dashboards
- **Alerting**: PagerDuty integration for critical incidents
- **Uptime Monitoring**: StatusPage.io for public status
- **Analytics**: PostHog or Mixpanel for product analytics

---

### Database Schema Principles

**Multi-Tenant Schema Design:**

```sql
-- Core tenant table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  domain TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example data table with tenant_id
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policy for tenant isolation
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON tickets
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
```

**Key Principles:**

- **Foreign key to organizations**: Every data table references `organizations.id`
- **CASCADE deletion**: Deleting organization deletes all related data
- **RLS enforcement**: Tenant ID checked at database level, not application
- **Indexes**: Composite indexes on (tenant_id, <query_field>) for performance
- **Audit trails**: Track created_by, updated_by, deleted_at for compliance

---

### Localization (Future)

**Deferred to Post-MVP:**

- **i18n Framework**: next-intl
- **Initial Language**: English only
- **Future Languages**: Community-contributed translations
- **ServicePing.me**: Professional translations for major languages (ES, FR, DE, PT, JP)

---

### Technical Rationale Summary

**Why Next.js?**

- Modern React framework with SSR/SSG capabilities
- Excellent developer experience (Fast Refresh, TypeScript support)
- Built-in API routes for server functions
- Large community, extensive ecosystem
- Easy deployment (Docker, Vercel, self-hosted)

**Why Supabase?**

- Open-source alternative to Firebase (self-hostable for EasyPing)
- Built on PostgreSQL (industry-standard, powerful)
- Provides auth, storage, realtime, database in one stack
- Excellent TypeScript support and developer experience
- Active community and development
- Can scale from EasyPing to ServicePing.me without migration

**Why TypeScript?**

- Type safety prevents bugs at compile time
- Better IDE support (autocomplete, refactoring)
- Self-documenting code
- Essential for community contributions
- Industry standard for modern JavaScript projects

**Why shadcn/ui?**

- Not a component library dependency (copy-paste components)
- Built on Radix UI (accessible, unstyled primitives)
- Fully customizable with Tailwind
- Modern, beautiful default styling
- Growing community and examples

**Why Monorepo?**

- Simpler for small team and community contributors
- Share types and utilities between frontend/backend
- Single build and deployment process
- Easier dependency management
- Modern tools make monorepos fast (Turborepo, pnpm)

**Why Multi-Tenant from Day One?**

- **Critical for SaaS migration**: Retrofitting multi-tenancy is extremely difficult and risky
- **Better architecture**: Forces clean data isolation patterns
- **Shared codebase**: EasyPing and ServicePing.me use same code
- **Security by default**: RLS policies prevent data leaks even with buggy queries
- **Future-proof**: When ServicePing.me launches, we flip config flags, not rewrite code

**Trade-offs Acknowledged:**

- **Supabase dependency**: Tight coupling to Supabase (mitigated by self-hosting option and PostgreSQL standard)
- **Next.js complexity**: Heavier than simple React SPA (justified by SSR benefits and routing)
- **BYOK friction**: EasyPing users must obtain AI API keys (acceptable trade-off vs running AI infrastructure)
- **Multi-tenant overhead**: Adds complexity to EasyPing (justified by ServicePing.me migration path)
- **Monolith vs microservices**: Monolith simpler for MVP, can extract services later if needed

---

## 5. Epic List

**Epic 1: Foundation & Authentication**
Establish project infrastructure (monorepo, Next.js, Supabase, Docker), implement multi-tenant database schema with single-tenant mode, add user authentication (email/password, OAuth), and deliver a working health check endpoint to validate deployment.

**Epic 2: Chat-First Ticket Creation & Threading**
Enable users to create tickets via conversational chat interface, implement threaded conversations with realtime updates, support file attachments, and provide basic ticket status management (New, In Progress, Resolved).

**Epic 3: AI Integration & Intelligent Routing**
Build AI provider abstraction layer with BYOK configuration, implement auto-categorization with customizable category management, enable automatic routing of tickets, add AI-pinned summaries at top of ticket threads, and provide agent copilot with response suggestions.

**Epic 4: Knowledge Base & Self-Service**
Automatically generate knowledge base article drafts from resolved tickets, build KB editor for agents to review and publish, implement semantic search using pgvector, and enable KB article suggestions during ticket creation.

**Epic 5: SLA Tracking & Analytics**
Implement configurable SLA policies with time tracking (first response, resolution), add visual SLA indicators and breach notifications, build basic analytics dashboard showing ticket volume and resolution times, and display agent performance metrics.

**Epic 6: Known Issues, Plugins & Launch Prep**
Create known issues board for public incident tracking with follow/subscribe, establish plugin framework foundation with webhook support, write comprehensive documentation (user, admin, developer), optimize performance, and prepare for public launch (security review, Docker image publishing).

---

## 6. Epic Details

### Epic 1: Foundation & Authentication

**Goal:** Establish the foundational project infrastructure with modern development tools (monorepo, Next.js, Supabase), implement multi-tenant database schema designed for future SaaS while running in single-tenant mode, provide user authentication and role-based access control, and deliver a fully deployable Docker image with working health check. This epic delivers minimal but complete functionality: users can sign up, log in, and access a basic authenticated dashboard, proving the deployment and authentication systems work end-to-end.

#### Story 1.1: Project Setup & Monorepo Infrastructure

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

#### Story 1.2: Supabase Integration & Multi-Tenant Schema

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

#### Story 1.3: User Authentication (Email/Password & OAuth)

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

#### Story 1.4: Role-Based Access Control (RBAC)

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

#### Story 1.5: Docker Compose Deployment

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

#### Story 1.6: First-Run Setup Wizard

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

#### Story 1.7: Basic Dashboard & Health Check

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

### Epic 2: Chat-First Ticket Creation & Threading

**Goal:** Deliver the core differentiator of EasyPing - a chat-first, conversational ticket creation experience that feels like messaging, not filling forms. Users can describe issues naturally, engage in threaded conversations with agents, attach files, and track ticket status. Agents see a unified inbox with all tickets, can respond in realtime, and update ticket status. This epic makes EasyPing usable for basic support workflows without AI (AI comes in Epic 3).

#### Story 2.1: Create Ticket via Chat Interface

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

#### Story 2.2: Threaded Conversation in Tickets

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

#### Story 2.3: File Attachments in Conversations

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

#### Story 2.4: Ticket Status Management

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

#### Story 2.5: Agent Ticket Assignment

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

#### Story 2.6: Ticket Priority Management

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

#### Story 2.7: Real-Time Updates & Notifications

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

### Epic 3: AI Integration & Intelligent Routing

**Goal:** Transform EasyPing from basic ticketing to AI-native support desk. Integrate multiple AI providers (OpenAI, Anthropic, Azure) with bring-your-own-key model, automatically categorize and route incoming tickets, generate AI summaries pinned at top of threads, and provide agent copilot with suggested responses. This epic delivers the core AI value proposition that differentiates EasyPing from traditional help desks.

#### Story 3.1: AI Provider Abstraction Layer

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

#### Story 3.2: AI Provider Configuration UI

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

#### Story 3.3: Auto-Categorization of Tickets

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

#### Story 3.4: Category Management

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

#### Story 3.5: Automatic Ticket Routing

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

#### Story 3.6: AI-Pinned Ticket Summaries

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

#### Story 3.7: Agent Copilot - Response Suggestions

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

#### Story 3.8: KB Article Suggestions During Resolution

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

### Epic 4: Knowledge Base & Self-Service

**Goal:** Build a self-service knowledge base that automatically captures support knowledge from resolved tickets. AI converts successful resolutions into article drafts, agents review and publish, and users search KB before creating tickets. Semantic search using pgvector enables intelligent article discovery. This epic reduces repetitive questions and builds a living documentation system that grows with every resolved ticket.

#### Story 4.1: KB Database Schema & Article Management

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

#### Story 4.2: Auto-Generate KB Articles from Resolved Tickets

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

#### Story 4.3: KB Article Editor for Agents

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

#### Story 4.4: Semantic Search with pgvector

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

#### Story 4.5: KB Article Detail Page

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

#### Story 4.6: KB Suggestions During Ticket Creation

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

#### Story 4.7: KB Analytics & Popular Articles

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

### Epic 5: SLA Tracking & Analytics

**Goal:** Provide visibility and accountability through SLA tracking and analytics dashboards. Define configurable SLA policies with response and resolution time targets, track performance in real-time, notify agents of approaching breaches, and visualize ticket metrics for managers. This epic enables data-driven support management and ensures teams meet service commitments.

#### Story 5.1: SLA Policy Configuration

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

#### Story 5.2: SLA Time Tracking

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

#### Story 5.3: SLA Visual Indicators & Breach Alerts

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

#### Story 5.4: Basic Analytics Dashboard

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

#### Story 5.5: Agent Performance Metrics

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

#### Story 5.6: Ticket Trends & Recurring Issues

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

#### Story 5.7: Analytics Data Export

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

### Epic 6: Known Issues, Plugins & Launch Prep

**Goal:** Complete the MVP with known issues tracking (reduce duplicate tickets during outages), establish plugin framework foundation for extensibility, write comprehensive documentation for users, admins, and developers, optimize performance for production, conduct security review, and prepare for public launch. This epic delivers the final polish and infrastructure needed to go live.

#### Story 6.1: Known Issues Board

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

#### Story 6.2: Duplicate Ticket Detection

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

#### Story 6.3: Plugin Framework Foundation

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

#### Story 6.4: Comprehensive Documentation

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

#### Story 6.5: Performance Optimization

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

#### Story 6.6: Security Review & Hardening

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

#### Story 6.7: Launch Preparation & Docker Image Publishing

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

## 6.5. Post-MVP Roadmap & Future Features

This section documents strategic features and plugins planned for post-MVP development. These features influence the MVP architecture (ensuring extensibility) but are intentionally deferred to maintain focus on core value delivery.

### Priority Plugin Examples

These plugins demonstrate the full capabilities of the plugin framework and serve as reference implementations for the community.

#### System Uptime Monitoring Plugin

**Description:** Monitor critical systems and display real-time status within tickets and on a dedicated dashboard.

**Capabilities Demonstrated:**
- Background polling/monitoring (cron jobs every 60 seconds)
- Custom UI components in ticket sidebar (status badges: 🟢 Online, 🔴 Offline)
- Standalone dashboard page showing all monitored systems
- Inline mention detection (e.g., "@prod-api" shows status badge)
- Webhook notifications on status changes (Slack, email, etc.)
- Historical uptime data storage in plugin-specific tables

**Business Value:**
- Reduces "is the system down?" tickets during outages
- Provides instant context to agents when systems are mentioned
- Enables proactive notification before users report issues

**Open Source vs Proprietary:**
- ✅ **Open Source** (EasyPing) - Community can build and share monitoring plugins
- 🔒 **ServicePing.me Premium** - Advanced monitoring with alerts, SLA correlation, multi-region checks

---

#### MCP (Model Context Protocol) Integration Plugin

**Description:** Execute actions against external systems using MCP servers (password resets, database queries, security group management, etc.).

**Capabilities Demonstrated:**
- Action execution from ticket UI ("Reset Password" button in sidebar)
- Permission-based action access (only authorized agents can execute)
- Interactive action forms (collect parameters before execution)
- Audit logging of all actions executed
- Integration with identity systems (Active Directory, Okta, etc.)

**Example Actions:**
- Reset user password (integrates with AD/Okta)
- Add user to security group
- Run predefined database queries (read-only analytics)
- Restart services (via monitoring integrations)
- Provision cloud resources (via Terraform/IaC)

**Business Value:**
- Eliminates context-switching for common IT tasks
- Reduces resolution time (agents don't leave EasyPing)
- Enforces security through permission system and audit logs
- Self-service portal for users (with appropriate permissions)

**Open Source vs Proprietary:**
- ✅ **Open Source** (EasyPing) - MCP protocol support, action framework
- 🔒 **ServicePing.me Premium** - Pre-built enterprise integrations (AD, Okta, AWS, Azure)

---

### Agent Gamification & Certification System

**Description:** Skill-based certification system with badges, leveling, and routing based on competencies. Motivates agents, improves ticket routing accuracy, and identifies training needs.

**Core Features:**

1. **Skill & Certification Tracking**
   - Agents earn certifications in categories (Hardware, Software, Network, etc.)
   - Certification levels: Beginner → Intermediate → Advanced → Expert
   - Requirements: Tickets resolved, avg resolution time, SLA compliance, KB articles published
   - Manager can manually award/revoke certifications

2. **Badge System**
   - Visual badges displayed on agent profiles and in ticket assignments
   - Special badges: "First Responder", "KB Contributor", "SLA Champion", "Problem Solver"
   - Achievement unlocks (e.g., "Resolved 100 tickets", "Zero SLA breaches this month")

3. **Enhanced Routing**
   - Routing rules extended to consider agent certifications
   - Example: "Hardware tickets → agents certified in Hardware (Advanced level)"
   - Load balancing within certified agent pool
   - Escalation paths based on certification levels

4. **Leaderboards & Recognition**
   - Weekly/monthly leaderboards by category (extends existing analytics)
   - Public recognition wall for top performers
   - Team competition modes (gamification)

5. **Training & Development**
   - Identify skill gaps through ticket assignment failures
   - Recommend training based on certification progress
   - Track agent growth over time

**Business Value:**
- Increased agent engagement and motivation
- Better ticket routing accuracy (right agent, first time)
- Visible career progression path for agents
- Data-driven training and coaching decisions

**Open Source vs Proprietary:**
- 🔒 **ServicePing.me Exclusive** - Full gamification and certification system
- **Rationale:** Requires significant UI/UX investment, analytics, and ongoing content (certification criteria). Differentiates ServicePing.me for enterprise customers.

---

### AI Agent Self-Service Portal

**Description:** AI-powered autonomous agents that execute common support tasks without human intervention (password resets, account unlocks, permission requests, software installations).

**Core Features:**

1. **Autonomous Task Execution**
   - AI agent analyzes ticket intent (e.g., "reset my password")
   - Validates user identity and authorization
   - Executes action via MCP plugin or API integration
   - Confirms success with user, closes ticket automatically
   - Escalates to human agent if AI confidence low or action fails

2. **Supported Self-Service Actions**
   - Password resets (via AD/Okta integration)
   - Account unlocks
   - Permission requests (with approval workflows)
   - Software installation requests (via MDM integration)
   - VPN access provisioning
   - License assignments

3. **Safety & Audit**
   - All AI actions logged with full audit trail
   - Multi-factor authentication verification before sensitive actions
   - Rollback capabilities for reversible actions
   - Human-in-the-loop for high-risk operations
   - Compliance reporting (who, what, when, why)

4. **Learning & Improvement**
   - AI learns from human agent resolutions
   - Confidence scoring improves over time
   - Manager can review and approve AI action patterns
   - Feedback loop (did AI solve issue correctly?)

**Business Value:**
- Instant resolution for common requests (no wait time)
- Dramatically reduces agent workload (30-50% ticket reduction)
- 24/7 self-service availability
- Consistent, error-free execution of routine tasks
- Frees agents to focus on complex, high-value work

**Open Source vs Proprietary:**
- 🔒 **ServicePing.me Exclusive** - Full AI agent system
- **Rationale:** Requires advanced AI orchestration, security audits, liability considerations. Premium feature for enterprise customers.
- ✅ **Open Source** (EasyPing) - Basic AI suggestions and copilot (already in MVP)

---

### Additional Post-MVP Features

**Phase 2 (6-12 months post-launch):**

- **Omnichannel Expansion**: Email ticket creation, Teams/Slack native apps, SMS notifications
- **Advanced Analytics**: Custom dashboards, predictive analytics (forecast ticket volume)
- **Multi-language Support**: i18n/localization for global teams
- **Mobile Apps**: Native iOS/Android apps (currently mobile web only)
- **Video/Screen Recording**: Embed Loom/screen recordings in tickets
- **Change Management**: Link tickets to change requests, deployment tracking
- **Asset Management**: Track IT assets, link to tickets (e.g., "MacBook Pro #12345")

**Phase 3 (12-24 months):**

- **OpsPing.me Integration**: Full incident + release management (separate product)
- **ProductPing.me Integration**: Feature request tracking with pizza tracker
- **ServicePing.me Marketplace**: Vetted plugin marketplace with billing
- **Enterprise Compliance**: SOC 2, HIPAA, ISO 27001 certifications
- **Advanced AI**: Custom model fine-tuning, local model support (Ollama)
- **Workflow Automation**: Visual workflow builder (Zapier-like)

---

### Strategic Guidance for Architect

**Critical Architectural Decisions Based on Future Vision:**

1. **Plugin Architecture Must Support:**
   - Custom UI components (React components injected at extension points)
   - Background jobs and scheduled tasks (worker queue system)
   - Persistent data storage (plugin-specific database tables)
   - Action execution with permissions and audit logging
   - Real-time data subscriptions (for monitoring plugins)

2. **Database Schema Considerations:**
   - `agent_certifications` table (skill tracking)
   - `agent_badges` table (achievements)
   - `plugin_data` namespace (isolated storage per plugin)
   - `action_audit_log` table (track all executed actions)
   - Extensible JSON columns for future plugin metadata

3. **API Design:**
   - Plugin SDK should abstract Supabase client (future-proof for migrations)
   - RESTful API + GraphQL layer (future consideration)
   - Webhook delivery with retry/dead letter queue
   - Rate limiting per plugin to prevent abuse

4. **Security Model:**
   - Permission system extensible for future roles and custom permissions
   - OAuth scopes for plugin API access (read/write/execute granularity)
   - Encrypted plugin config storage (secrets management)
   - Sandboxed plugin execution (consider Deno runtime for isolation)

**Key Takeaway:** The MVP plugin framework (Epic 6, Story 6.3) must be robust enough to support these advanced use cases without major refactoring. Focus on extensibility over immediate feature completeness.

---

## 7. Checklist Results Report

### Executive Summary

**Overall PRD Completeness:** 98%
**MVP Scope Appropriateness:** Just Right (with minor optimizations possible)
**Readiness for Architecture Phase:** ✅ **READY**
**Recent Improvements:** ✅ Quantified success metrics added, ✅ Table of contents added

The PRD is comprehensive, well-structured, and ready for the Architecture phase. The product vision is clear, technical constraints are well-documented, and the epic/story breakdown follows best practices. All critical gaps have been addressed.

---

### Category Analysis

| Category                         | Status  | Critical Issues                                           |
| -------------------------------- | ------- | --------------------------------------------------------- |
| 1. Problem Definition & Context  | PASS    | None - problem clearly articulated with competitive analysis |
| 2. MVP Scope Definition          | PASS    | Scope well-defined; Post-MVP roadmap documents future features |
| 3. User Experience Requirements  | PASS    | Comprehensive UI/UX goals with ping.me branding strategy |
| 4. Functional Requirements       | PASS    | 37 FRs + 31 NFRs well-documented and testable |
| 5. Non-Functional Requirements   | PASS    | Performance, security, scalability all addressed |
| 6. Epic & Story Structure        | PASS    | 6 epics, 42 stories (7 per epic avg), sequential and logical |
| 7. Technical Guidance            | PASS    | Multi-tenancy, open-core model, plugin architecture detailed |
| 8. Cross-Functional Requirements | PARTIAL | Data schema examples provided; full schema deferred to architect |
| 9. Clarity & Communication       | PASS    | Well-organized, consistent terminology, markdown formatting |

**Overall Status:** 8/9 PASS, 1/9 PARTIAL = **92% Complete**

---

### Detailed Validation Results

#### ✅ 1. Problem Definition & Context (PASS - 100%)

**Strengths:**
- Clear problem statement: Traditional service desks are expensive, form-heavy, lack AI
- Target audience well-defined: Small IT teams, startups, freelancers, open-source community
- Competitive landscape analyzed (Mary's assessment documented)
- Business model defined: Open-core (AGPLv3) with proprietary SaaS layer
- Differentiation clear: AI-native, chat-first, truly free vs incumbents
- ✅ **Quantified success metrics added:** GitHub stars (2,000+), deployments (200+), contributors (5+), conversion signals (10+), KB growth, plugin adoption

**Status:** All gaps addressed - metrics now quantified with 6-month targets

---

#### ✅ 2. MVP Scope Definition (PASS - 90%)

**Strengths:**
- Core functionality clearly distinguished from nice-to-haves
- Post-MVP Roadmap (Section 6.5) documents deferred features (gamification, AI agents, omnichannel)
- Rationale for scope decisions well-documented (e.g., dark mode deferred, mobile web not native apps)
- MVP timeline realistic: 6 epics over 3 months (~2 weeks per epic)
- Features tied directly to problem statement (chat-first, AI automation, auto KB generation)

**Scope Validation:**
- Epic 1: Foundation - Essential ✅
- Epic 2: Tickets - Core value ✅
- Epic 3: AI - Key differentiator ✅
- Epic 4: Knowledge Base - Builds moat ✅
- Epic 5: SLA/Analytics - Valuable for managers ✅
- Epic 6: Plugins/Launch - Necessary polish ✅

**Potential Optimizations:**
- Epic 5 (SLA/Analytics) could be simplified: Defer agent leaderboards, trending topics analysis
- Epic 6 Story 6.2 (Duplicate Detection) could move to Phase 2 if timeline tight
- These are optimizations, not requirements - current scope is viable

**Recommendation:**
- Current scope is appropriate for 3-month MVP with small team
- If timeline slips, consider Epic 5 & 6 story deferrals noted above

---

#### ✅ 3. User Experience Requirements (PASS - 95%)

**Strengths:**
- Overall UX Vision articulated: "Slack for support tickets"
- Key interaction paradigms documented (chat-based, realtime, keyboard shortcuts, command palette)
- Core screens enumerated for all user types (end users, agents, managers, admins)
- Accessibility target defined: WCAG 2.1 Level AA
- Branding strategy comprehensive: ping.me ecosystem, color palette, typography, terminology guide
- Platform strategy clear: Web responsive primary, mobile web secondary, no native apps in MVP

**Minor Gaps:**
- User flows not explicitly diagrammed (acceptable - architect/UX will create)
- Edge cases identified in stories but not centralized list

**Recommendations:**
- UX Expert should create user flow diagrams for primary journeys during architecture phase
- Consider creating Figma mockups for "My Pings" chat-style conversation list (key differentiator)

---

#### ✅ 4. Functional Requirements (PASS - 100%)

**Strengths:**
- 37 Functional Requirements clearly enumerated and categorized
- Requirements focus on WHAT not HOW (appropriate for PRD)
- All requirements testable and verifiable
- Requirements use consistent terminology ("ping" vs "ticket", "tenant_id", "RLS")
- User stories follow standard format: "As a [role], I want [action], so that [benefit]"
- Acceptance criteria specific, measurable, and testable (avg 7-8 ACs per story)
- Dependencies between stories identified (e.g., Epic 3 builds on Epic 2 tickets)

**Story Quality:**
- 42 total stories across 6 epics
- Stories appropriately sized (none too large for AI agent execution)
- Stories are vertical slices delivering user value
- Stories include necessary context in goal statements

**Validation:**
- Epic 1 includes all necessary setup (✅ project scaffolding, DB schema, auth, Docker, health check)
- Stories are sequential and logical within epics
- No circular dependencies identified
- Technical jargon explained (e.g., RLS, pgvector, BYOK)

**No issues found.**

---

#### ✅ 5. Non-Functional Requirements (PASS - 95%)

**Strengths:**
- 31 Non-Functional Requirements comprehensively documented
- Performance: Load times, realtime latency, AI processing times specified
- Security: RLS, encryption, HTTPS, rate limiting, XSS/SQL injection prevention
- Scalability: 100 concurrent users, 50K tickets per tenant
- Deployment: Docker one-command deployment, system requirements specified
- Open source: AGPLv3 license, no telemetry without consent
- Data privacy: Self-hosted option, no external dependencies (except BYOK AI)
- Testing: 70% unit coverage, integration tests for critical flows

**Minor Gaps:**
- Specific backup/restore procedures not detailed (acceptable - architect will define)
- Disaster recovery RPO/RTO not specified (acceptable for MVP)

**Recommendations:**
- Architect should define backup strategy (Supabase backup mechanisms)
- Document simple DR procedure in Admin Guide (Story 6.4)

---

#### ✅ 6. Epic & Story Structure (PASS - 100%)

**Strengths:**
- Epics represent cohesive units of functionality delivering end-to-end value
- Epic goals clearly articulated (2-3 sentence goal statements)
- Epics appropriately sized for 2-week sprints
- Epic sequence logical and follows agile best practices:
  1. Foundation first (infrastructure, auth, deployment)
  2. Core value second (tickets, conversations)
  3. AI differentiation third
  4. Knowledge base fourth (builds on resolved tickets)
  5. Management visibility fifth (SLA, analytics)
  6. Polish and launch sixth (known issues, plugins, docs)
- Epic dependencies identified (no epic depends on later epic work)

**Story Breakdown Quality:**
- Stories broken down to appropriate size (7 stories per epic average)
- Stories have clear, independent value (vertical slices)
- Stories include comprehensive acceptance criteria (7-19 ACs per story)
- Story dependencies and sequence documented within epics
- Stories aligned with epic goals

**First Epic Completeness:**
- ✅ Project scaffolding (Story 1.1)
- ✅ Database schema and migrations (Story 1.2)
- ✅ Authentication (Story 1.3, 1.4)
- ✅ Docker deployment (Story 1.5)
- ✅ Setup wizard (Story 1.6)
- ✅ Basic dashboard and health check (Story 1.7)
- ✅ Delivers testable, deployable functionality (health endpoint, login flow)

**No issues found. Epic structure is exemplary.**

---

#### ✅ 7. Technical Guidance (PASS - 100%)

**Strengths:**
- Architecture direction comprehensive:
  - Multi-tenancy strategy detailed (schema-ready, orchestration proprietary)
  - Open-core business model clearly articulated (open vs proprietary boundaries)
  - Repository structure defined (monorepo with Turborepo + pnpm)
  - Service architecture specified (Next.js + Supabase BaaS)
  - Technology stack enumerated (frontend, backend, AI, infrastructure)
- Technical constraints clearly communicated:
  - AGPLv3 license implications
  - BYOK model for AI (no platform API keys in open source)
  - Multi-tenant database schema (tenant_id + RLS)
  - Plugin framework extensibility requirements
- Integration points identified:
  - Supabase (auth, database, storage, realtime)
  - AI providers (OpenAI, Anthropic, Azure)
  - Plugin webhooks and event hooks
- Performance considerations highlighted (NFR1-4, Story 6.5)
- Security requirements articulated (NFR5-10, Story 6.6)
- Technical risks flagged:
  - Multi-tenant complexity (mitigated with RLS policies)
  - Plugin security (sandbox and permissions system)
  - AI reliability (graceful degradation, BYOK model)

**Trade-offs Documented:**
- Supabase dependency vs custom backend (chose Supabase for speed to market)
- Next.js complexity vs simple React SPA (chose Next.js for SSR and routing)
- BYOK friction vs running AI infrastructure (chose BYOK for cost control)
- Multi-tenant overhead vs future SaaS migration (chose multi-tenant schema for future-proofing)
- Monolith vs microservices (chose monolith for MVP simplicity)

**Technical Decision Framework:**
- Rationale provided for all major technology choices (Why Next.js, Why Supabase, Why TypeScript, Why shadcn/ui, Why AGPLv3)
- Alternatives considered and documented (MIT/Apache vs AGPLv3, Fair Source vs open source)
- Non-negotiable requirements highlighted (multi-tenancy, RLS, open-core model)
- Areas for architect investigation: Database schema design, plugin sandbox implementation, performance optimization

**No issues found. Architect has clear guidance.**

---

#### ⚠️ 8. Cross-Functional Requirements (PARTIAL - 75%)

**Strengths:**
- Data entities identified (organizations, tickets, users, kb_articles, sla_policies, plugins, known_issues)
- Example database schema provided (multi-tenant pattern with RLS policies)
- Data relationships described (tenant_id foreign keys, CASCADE deletion)
- Data retention policies mentioned (90-day auto-archive for resolved tickets, soft-delete for KB articles)
- Integration requirements documented (AI providers, plugin webhooks, Supabase services)
- API requirements outlined (REST API, plugin SDK, scoped permissions)
- Deployment expectations set (Docker Compose, CI/CD with GitHub Actions)
- Monitoring needs identified (health checks, error tracking, metrics, audit logs)

**Gaps:**
- Full database schema not documented (intentionally deferred to architect)
- Data migration strategy not detailed (acceptable - no legacy system to migrate from)
- API endpoint specifications not enumerated (acceptable - architect will design)

**Recommendations:**
- Architect should create comprehensive ERD (Entity Relationship Diagram) with all tables
- Architect should define API endpoints and document with OpenAPI/Swagger schema
- These are normal architect responsibilities, not PRD deficiencies

**Verdict:** PARTIAL is appropriate - high-level data requirements documented, detailed schema deferred to architect as intended.

---

#### ✅ 9. Clarity & Communication (PASS - 100%)

**Strengths:**
- Documents use clear, consistent language throughout
- Well-structured with logical sections: Goals → Requirements → UI/UX → Technical Assumptions → Epics → Roadmap → Next Steps
- ✅ **Table of contents added** with anchor links for easy navigation through 2,700+ line document
- Technical terms defined where introduced (RLS, BYOK, pgvector, shadcn/ui, etc.)
- Consistent terminology enforced (ping vs ticket, tenant_id, organizations table)
- Markdown formatting excellent (headers, tables, lists, code blocks)
- Document versioned (v0.1 in change log)

**Communication Quality:**
- Target audience clear (architect, UX expert, developers, stakeholders)
- Stakeholder perspectives included (open source community, ServicePing.me customers)
- Areas of strategic importance highlighted (multi-tenancy, open-core model, plugin architecture)
- Rationale provided for key decisions

**Optional Enhancement:**
- Consider using shard-prd command to split into epic-specific files (docs/prd/epic-1-foundation.md, etc.) if preferred

---

### Top Issues by Priority

#### 🚫 BLOCKERS (Must Fix Before Architect Proceeds)

**None identified.** PRD is ready for architecture phase.

#### 🔶 HIGH Priority (Should Fix for Quality)

1. **Quantify Success Metrics**
   - **Issue:** Goals state desired outcomes but lack specific targets
   - **Impact:** Harder to measure MVP success objectively
   - **Fix:** Add to Goals section:
     - GitHub stars: 2,000 in 6 months
     - Active deployments: 200 in 6 months
     - Community contributors: 5+ in 6 months
     - Conversion signals: 10+ "we'd pay for hosted" inquiries
   - **Effort:** 5 minutes

#### 🔷 MEDIUM Priority (Would Improve Clarity)

1. **Add Table of Contents**
   - **Issue:** 1900+ line document, navigation could be easier
   - **Fix:** Auto-generate TOC with markdown anchors
   - **Effort:** 10 minutes

2. **Clarify Backup/Restore Procedures**
   - **Issue:** NFR16 mentions backup but not detailed
   - **Fix:** Add to Story 6.6 (Security) or Story 6.4 (Documentation) acceptance criteria
   - **Effort:** Add 1 AC - "Backup/restore procedures documented in Admin Guide"

#### 🔵 LOW Priority (Nice to Have)

1. **Consider Epic 5/6 Story Deferrals**
   - **Issue:** If timeline becomes tight, some stories could move to Phase 2
   - **Candidates:** Story 5.6 (Trending Topics), Story 6.2 (Duplicate Detection)
   - **Benefit:** Reduces scope if needed
   - **Trade-off:** Less polish in initial launch

---

### MVP Scope Assessment

#### Features Well-Scoped for MVP ✅

- Epic 1: Foundation & Authentication (essential baseline)
- Epic 2: Ticket Creation & Threading (core value prop)
- Epic 3: AI Integration (key differentiator)
- Epic 4: Knowledge Base (builds competitive moat)
- Epic 5: SLA Tracking & Analytics (manager visibility, valuable for enterprise conversion)
- Epic 6: Plugins & Launch Prep (necessary for ecosystem, documentation essential)

#### Features That Could Be Cut (If Needed) ✂️

- Story 5.6: Ticket Trends & Recurring Issues → Move to Phase 2
- Story 6.2: Duplicate Ticket Detection → Move to Phase 2
- Agent performance leaderboards → Already basic in Story 5.5, could simplify further

**Current Assessment:** Scope is **Just Right** for 3-month timeline. Above items are optimizations if timeline slips, not recommended cuts for current plan.

#### Missing Features That Are Essential ❌

**None identified.** All critical features for EasyPing MVP are present.

#### Complexity Concerns 🔧

1. **Plugin Framework (Story 6.3)** - Most complex story with 19 acceptance criteria
   - **Mitigation:** Well-documented, example plugin included, TypeScript SDK published
   - **Recommendation:** Architect should allocate extra time for plugin architecture design

2. **Multi-Tenant Database Schema (Story 1.2)** - RLS policies can be tricky
   - **Mitigation:** Example schema provided, RLS pattern well-documented
   - **Recommendation:** Architect should review Supabase RLS documentation thoroughly

3. **AI Integration (Epic 3)** - Provider abstraction, graceful degradation
   - **Mitigation:** BYOK model reduces infrastructure complexity
   - **Recommendation:** Build provider abstraction early, test with all 3 providers (OpenAI, Anthropic, Azure)

**Overall Complexity:** Moderate. No show-stopping technical challenges. Team should have modern web dev experience (React, TypeScript, Supabase/PostgreSQL).

#### Timeline Realism 📅

**Target:** 3 months (12 weeks) for 6 epics = 2 weeks per epic

**Assumptions:**
- Team size: 1-2 full-time developers + 1 part-time designer
- Developer skill level: Senior (familiar with Next.js, React, Supabase, TypeScript)
- Working style: Agile sprints, daily standups, weekly demos

**Risk Factors:**
- Epic 3 (AI Integration) may take 3 weeks if provider abstraction is complex
- Epic 6 (Launch Prep) often expands with last-minute polish
- Buffer time: Build in 2-week buffer for unexpected issues

**Realistic Timeline:** 3-4 months (12-16 weeks) with 2-week buffer

**Recommendation:** Plan for 3.5 months (14 weeks). If ahead of schedule, add polish stories from Post-MVP Roadmap.

---

### Technical Readiness

#### Clarity of Technical Constraints ✅

**Excellent.** Technical Assumptions section (Section 4) provides comprehensive guidance:
- Open-core business model clearly defined
- License strategy (AGPLv3) explained with rationale
- Multi-tenancy approach documented (schema-ready, orchestration proprietary)
- Technology stack fully specified (Next.js, Supabase, TypeScript, shadcn/ui, etc.)
- Deployment model defined (Docker Compose, self-hosted, future Kubernetes)
- Testing requirements articulated (70% unit coverage, integration tests)

Architect has sufficient clarity to begin design work.

#### Identified Technical Risks 🚨

1. **Multi-Tenant RLS Policies**
   - **Risk:** RLS policies can have subtle bugs leading to data leaks
   - **Mitigation:** Comprehensive testing (Story 6.6 AC #2), audit during security review
   - **Severity:** MEDIUM (mitigated by testing)

2. **Plugin Sandbox Security**
   - **Risk:** Plugins could access unauthorized data or system resources
   - **Mitigation:** Permission system (Story 6.3 AC #16-19), consider Deno runtime for isolation
   - **Severity:** MEDIUM (well-documented, deferred to Phase 2 for full sandbox)

3. **AI Provider Reliability**
   - **Risk:** AI failures could block core features (categorization, copilot)
   - **Mitigation:** Graceful degradation (Story 3.1 AC #6), BYOK model, manual overrides
   - **Severity:** LOW (well-mitigated)

4. **Supabase Dependency**
   - **Risk:** Tight coupling to Supabase could make migration difficult
   - **Mitigation:** Self-hostable Supabase, PostgreSQL standard, plugin SDK abstraction (Story 6.3 guidance)
   - **Severity:** LOW (acceptable trade-off for speed to market)

**Overall Risk Level:** LOW-MEDIUM. No critical risks that would block MVP launch.

#### Areas Needing Architect Investigation 🔍

1. **Database Schema Design**
   - Tables, columns, indexes, constraints, RLS policies
   - Expected output: ERD (Entity Relationship Diagram) + SQL migration files

2. **Plugin Architecture**
   - Event hook system, webhook delivery, UI extension points, background jobs, data storage
   - Expected output: Plugin SDK design doc + TypeScript interfaces

3. **AI Provider Abstraction**
   - Interface design, provider implementations, error handling, rate limiting
   - Expected output: `packages/ai` architecture + provider strategy pattern

4. **Performance Optimization Strategy**
   - Database indexing, query optimization, caching, code splitting, lazy loading
   - Expected output: Performance testing plan + optimization checklist

5. **Deployment Pipeline**
   - Docker build process, CI/CD pipeline, Docker Hub publishing, environment management
   - Expected output: GitHub Actions workflow + deployment documentation

**Recommendation:** Architect should tackle #1 (Database Schema) and #3 (AI Provider Abstraction) first, as these are foundational for Epic 1-3 implementation.

---

### Recommendations

#### Immediate Actions (Before Architect Handoff)

1. ✅ **Quantify Success Metrics** (5 minutes)
   - Add specific targets to Goals section: GitHub stars, deployments, contributors
   - Update change log to v0.2

2. ✅ **Add Backup/Restore to Documentation** (2 minutes)
   - Add acceptance criterion to Story 6.4 or 6.6: "Backup and restore procedures documented"

#### During Architecture Phase

3. **Generate Table of Contents** (10 minutes)
   - Auto-generate TOC with markdown anchors for easier navigation
   - Consider using markdown TOC generator tool

4. **Architect Deep Dives** (Architect responsibility)
   - Database schema & ERD
   - Plugin architecture design
   - AI provider abstraction pattern
   - Performance optimization strategy
   - CI/CD pipeline design

#### During Implementation

5. **Monitor Epic 3 & 6 Complexity** (PM responsibility)
   - Epic 3 (AI Integration): Allocate extra time if provider abstraction proves complex
   - Epic 6 (Launch Prep): Watch for scope creep, timebox polish activities

6. **Build in Buffer Time** (PM responsibility)
   - Plan for 14 weeks (3.5 months) instead of 12 weeks to accommodate unknowns
   - Use buffer for quality improvements if ahead of schedule

---

### Final Decision

**✅ READY FOR ARCHITECT**

The PRD and epics are comprehensive, properly structured, and ready for architectural design. The product vision is clear, scope is well-defined, technical constraints are documented, and the epic/story breakdown follows agile best practices.

**Confidence Level:** 95%

**Next Steps:**
1. PM: Add quantified success metrics to Goals section (5 min fix)
2. PM: Hand off PRD to UX Expert for user flow diagrams and mockups
3. PM: Hand off PRD to Architect for database schema, API design, and technical architecture
4. PM: Schedule kickoff meeting to align team on vision, scope, and timeline

**Estimated Time to Start Implementation:** 1-2 weeks (architecture phase)

**Projected MVP Launch:** 3.5-4 months from project kickoff

---

## 8. Next Steps

### UX Expert Prompt

**Task:** Create user experience design artifacts for EasyPing MVP based on this PRD.

**Context:**
You are designing the UX for **EasyPing**, the first AI-native, chat-first, truly free service desk. The core differentiator is a conversational, Slack-like experience that eliminates form friction. Review the complete PRD at `docs/prd.md`, paying special attention to:
- Section 3: User Interface Design Goals (UX Vision, interaction paradigms, core screens, branding)
- Section 2: Requirements (FR1-FR37 functional requirements)
- Section 6: Epic Details (42 user stories with acceptance criteria)

**Key UX Principles:**
- **Chat-first, not form-first**: Users describe issues naturally, not through dropdowns and text fields
- **Ping metaphor**: Use "ping" terminology throughout (My Pings, Send a ping, etc.)
- **Realtime & responsive**: Updates appear instantly, conversations feel live (like Slack/iMessage)
- **Progressive disclosure**: Simple by default, powerful when needed
- **Keyboard-first for agents**: Full keyboard navigation, command palette (Cmd+K)

**Deliverables:**

1. **User Flow Diagrams** (Figma or Miro)
   - End user: Creating first ping → AI suggestions → Agent response → Resolution
   - Agent: Reviewing inbox → Opening ticket → AI copilot assistance → Responding → Closing
   - Manager: Viewing analytics → Identifying SLA breach → Reassigning ticket

2. **Wireframes for Critical Screens** (Figma)
   - **My Pings (End User)**: Chat-style conversation list (like iMessage) with status badges, last message preview, timestamp
   - **Create Ping**: Simple message input with KB article suggestions appearing as user types
   - **Agent Inbox**: Split view - ticket list (left) + conversation thread (right) + AI copilot (side panel)
   - **Ticket Detail View**: AI summary pinned at top, threaded conversation, file attachments, status/priority controls
   - **Knowledge Base Search**: Semantic search with instant results, article previews
   - **Analytics Dashboard**: Key metrics cards, charts (ticket volume, resolution time, SLA compliance)

3. **High-Fidelity Mockups** (1-2 Key Screens)
   - Focus on **My Pings** (chat conversation list) - this is the signature EasyPing experience
   - Apply ping.me branding: Blue primary (#3B82F6), Inter font, Lucide icons, clean/modern aesthetic

4. **Component Library Guidance**
   - Recommend specific shadcn/ui components for each screen element
   - Define custom components needed (e.g., PingConversationItem, AICoil Suggestion, SLATimer)
   - Accessibility notes for key interactions (keyboard nav, screen reader labels)

5. **Interaction Specifications**
   - Realtime behaviors (typing indicators, message appearing animations)
   - Microinteractions (emoji reactions, quick actions, inline status changes)
   - Empty states (no pings yet, no KB articles, no search results)
   - Error states (AI unavailable, network error, file upload failed)
   - Loading states (AI processing, search in progress, ticket loading)

**Design Constraints:**
- **Platform**: Web responsive (desktop primary 1280px+, mobile web secondary)
- **Accessibility**: WCAG 2.1 Level AA minimum
- **Component Library**: shadcn/ui + Radix UI primitives + Tailwind CSS
- **Branding**: ping.me ecosystem colors, Inter font, Lucide icons
- **No dark mode** in MVP (defer to Phase 2)

**Timeline:** 1 week for wireframes + flows, 1 week for high-fidelity mockups

**Questions for PM:**
- Review Section 3 (UI Design Goals) for any ambiguities
- Clarify priority if timeline is tight (wireframes > mockups)
- Request access to any existing brand assets or style guides

**Output:** Share Figma file with PM and Architect for review before dev team starts Epic 1-2 implementation.

---

### Architect Prompt

**Task:** Design the technical architecture for EasyPing MVP based on this PRD.

**Context:**
You are architecting **EasyPing**, an open-core (AGPLv3), AI-native service desk built on Next.js + Supabase. The architecture must support future migration to **ServicePing.me** (hosted SaaS) without major refactoring. Review the complete PRD at `docs/prd.md`, paying special attention to:
- Section 4: Technical Assumptions (multi-tenancy, open-core model, tech stack, testing requirements)
- Section 2: Requirements (37 functional + 31 non-functional requirements)
- Section 6: Epic Details (42 user stories defining implementation scope)
- Section 6.5: Post-MVP Roadmap (future plugins and features that influence architecture)

**Key Architectural Principles:**
- **Multi-tenant database schema** with single-tenant mode (tenant_id + RLS policies everywhere)
- **Open-core separation**: Core features open source (AGPLv3), SaaS orchestration proprietary
- **Plugin extensibility**: Framework supports UI components, actions, background jobs, data storage
- **AI provider abstraction**: Swappable providers (OpenAI, Anthropic, Azure) with BYOK model
- **Self-hostable first**: Docker Compose one-command deployment

**Deliverables:**

1. **Database Schema & ERD** (dbdiagram.io or draw.io)
   - Complete entity-relationship diagram with all tables, columns, types, constraints
   - **Critical tables**: organizations, users, tickets, ticket_messages, kb_articles, sla_policies, plugins, known_issues, agent_certifications (future), action_audit_log (future)
   - Multi-tenant pattern: Every data table includes `tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`
   - RLS policies for each table (example SQL provided in PRD Section 4)
   - Indexes: Composite indexes on (tenant_id, frequently_queried_column)
   - Soft deletes where appropriate (deleted_at TIMESTAMPTZ)
   - JSON columns for extensibility (plugin config, custom metadata)
   - pgvector columns for semantic search (kb_articles.embedding, tickets.embedding for duplicate detection)

2. **Repository Structure & Monorepo Setup** (`easyping/` project)
   ```
   easyping/
   ├── apps/
   │   └── web/              # Next.js 14+ (App Router, TypeScript strict)
   ├── packages/
   │   ├── database/         # Supabase migrations, seed data, RLS policies
   │   ├── ai/               # AI provider abstraction layer
   │   ├── ui/               # Shared shadcn/ui components
   │   └── types/            # Shared TypeScript types (auto-generated from Supabase)
   ├── docker/
   │   └── docker-compose.yml # Supabase stack + Next.js app
   ├── .github/workflows/
   │   └── ci.yml            # Lint, typecheck, test, build, Docker publish
   └── scripts/              # Build scripts, DB migration helpers
   ```
   - Package manager: **pnpm** (workspaces)
   - Monorepo tool: **Turborepo** (caching, parallel tasks)
   - Linting: ESLint + Prettier + Husky pre-commit hooks

3. **AI Provider Abstraction (`packages/ai/`)**
   - **Interface**: `AIProvider` with methods:
     ```typescript
     interface AIProvider {
       categorize(message: string, categories: Category[]): Promise<CategoryResult>
       summarize(messages: Message[]): Promise<string>
       suggestResponse(context: TicketContext): Promise<string>
       generateEmbedding(text: string): Promise<number[]>
       detectDuplicates(embedding: number[], threshold: number): Promise<Ticket[]>
     }
     ```
   - **Implementations**: OpenAIProvider, AnthropicProvider, AzureOpenAIProvider
   - **Configuration**: Stored encrypted in database (organizations.ai_config JSONB)
   - **Graceful degradation**: Catch provider errors, log, return fallback (e.g., category="Other", summary="unavailable")
   - **Rate limiting**: Track API usage per org, warn when approaching limits

4. **Plugin Architecture (`packages/plugins/` or in web app)**
   - **Plugin Manifest** (JSON schema):
     ```json
     {
       "name": "system-uptime-monitor",
       "version": "1.0.0",
       "permissions": ["read_tickets", "write_ui_components", "background_jobs"],
       "hooks": ["ticket.created", "message.sent"],
       "ui_components": {
         "ticket_sidebar": "./components/StatusBadge.tsx",
         "standalone_page": "./pages/Dashboard.tsx"
       },
       "actions": [
         { "id": "ping_system", "label": "Ping System", "handler": "./actions/ping.ts" }
       ],
       "background_jobs": [
         { "cron": "*/5 * * * *", "handler": "./jobs/poll_systems.ts" }
       ]
     }
     ```
   - **Event Hook System**: Webhook delivery with retry logic (use job queue like pg-boss or BullMQ)
   - **UI Extension Points**: React component slots in ticket sidebar, message thread, settings pages
   - **Action Execution**: Permission-checked, audit-logged execution of plugin actions
   - **Data Storage**: Plugin-specific database tables (namespaced: `plugin_{plugin_id}_data`)
   - **SDK Package**: `@easyping/plugin-sdk` (TypeScript interfaces, helper functions)
   - **Security**: Permissions model, sandbox execution (consider Deno for isolation in future)

5. **API Design & Routing** (Next.js API routes + Supabase PostgREST)
   - **Authentication**: Supabase Auth with JWT tokens, middleware for protected routes
   - **Authorization**: Role-based (end_user, agent, manager, owner) + RLS at database level
   - **Endpoints** (examples):
     - `POST /api/tickets` - Create ticket
     - `GET /api/tickets/:id` - Get ticket with messages
     - `POST /api/tickets/:id/messages` - Add message to ticket
     - `PATCH /api/tickets/:id` - Update status/priority/assignment
     - `POST /api/kb/search` - Semantic search knowledge base
     - `POST /api/ai/categorize` - AI categorization (internal)
     - `POST /api/webhooks/plugin/:plugin_id` - Plugin webhook handler
   - **Rate Limiting**: 100 requests/min per IP for API routes (use middleware)
   - **OpenAPI/Swagger**: Document all endpoints for plugin developers

6. **Deployment Architecture** (Docker Compose for MVP)
   ```yaml
   # docker-compose.yml (simplified)
   services:
     # Supabase stack (postgres, auth, storage, realtime, rest, etc.)
     postgres:
       image: supabase/postgres:15
       environment:
         - POSTGRES_PASSWORD=${DB_PASSWORD}
       volumes:
         - postgres_data:/var/lib/postgresql/data

     supabase-auth:
       image: supabase/gotrue
       depends_on: [postgres]

     # ... other Supabase services

     # EasyPing Next.js app
     web:
       build: ./apps/web
       ports:
         - "3000:3000"
       environment:
         - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
         - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
       depends_on: [postgres, supabase-auth]

     # Caddy reverse proxy (HTTPS)
     caddy:
       image: caddy:2
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./Caddyfile:/etc/caddy/Caddyfile

   volumes:
     postgres_data:
   ```
   - **Environment Management**: `.env` file with secrets (DB password, API keys, etc.)
   - **Health Checks**: `/api/health` endpoint checks DB, auth, storage connectivity
   - **Backup Strategy**: Supabase backup mechanisms (pg_dump scheduled via cron)

7. **CI/CD Pipeline** (GitHub Actions)
   - **On PR**: Lint (ESLint), Typecheck (tsc), Test (Vitest), Build (Next.js build)
   - **On Merge to Main**: Build Docker image, push to Docker Hub (`easyping/easyping:latest`), tag with version
   - **Release**: Create GitHub release, publish changelog, Docker Compose file with versioned image

8. **Testing Strategy**
   - **Unit Tests** (Vitest): 70% coverage minimum
     - AI provider abstraction: 90%+
     - Business logic (categorization, routing, SLA calculations): 80%+
     - Utilities: 80%+
   - **Integration Tests** (Playwright): Critical user flows
     - User creates ticket → AI categorizes → Agent responds → User sees response
     - Agent resolves ticket → KB article draft generated
     - SLA breach → Notification sent
   - **Database**: Supabase local dev environment with test data
   - **Mocking**: Mock AI provider APIs in unit tests

9. **Performance Optimization Plan**
   - **Database**:
     - Composite indexes on (tenant_id, status), (tenant_id, created_at), (tenant_id, assigned_to)
     - pgvector indexes for semantic search (IVFFlat or HNSW)
     - Connection pooling (Supabase Pooler)
   - **Frontend**:
     - Code splitting (Next.js automatic, lazy load heavy components)
     - Image optimization (Next.js Image component, compress uploads to 1920px max)
     - Bundle analysis (keep main bundle <500KB gzipped)
   - **Realtime**:
     - Lazy subscriptions (only subscribe when viewing ticket/inbox)
     - Connection pooling (reuse Supabase Realtime connections)
   - **Caching**:
     - KB article search results (cache for 5 min)
     - User sessions (Supabase Auth handles)
     - Static assets (CDN via Vercel or CloudFront in future)

10. **Security Implementation Checklist**
    - RLS policies tested (no cross-tenant data leaks)
    - Input validation (Zod schemas on all forms and API routes)
    - API keys encrypted (Supabase Vault or crypto library)
    - Rate limiting (middleware on API routes)
    - CSRF protection (Next.js built-in tokens)
    - Security headers (CSP, X-Frame-Options, HSTS via Caddy)
    - Dependency scanning (Dependabot, npm audit in CI)
    - Docker image scanning (Trivy or Snyk in CI)

**Timeline:** 1-2 weeks for architecture design, ERD, and repository setup

**Questions for PM:**
- Clarify any technical requirements from Section 4 (Technical Assumptions)
- Confirm priority if timeline is tight (Database schema > Plugin architecture > Performance plan)
- Review Section 7 (Checklist Report) for identified technical risks

**Output:**
- Share ERD, repository structure, and architecture docs with PM and dev team for review
- Create initial database migration files (Story 1.2)
- Set up monorepo scaffold (Story 1.1)
- Ready to hand off to dev team for Epic 1 implementation

---

**End of Product Requirements Document**

**Document Version:** 1.0
**Last Updated:** 2025-01-21
**Status:** ✅ Ready for Architecture Phase (98% Complete)
**Recent Updates:**
- ✅ Quantified success metrics added (6-month targets)
- ✅ Table of contents with anchor links added
- ✅ All checklist recommendations addressed

**Next Review:** After architecture design is complete (1-2 weeks)
