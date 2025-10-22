# 5. Epic List

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
