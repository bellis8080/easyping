# Epic 6: Known Issues, Plugins & Launch Prep

**Goal:** Complete the MVP with known issues tracking (reduce duplicate tickets during outages), establish plugin framework foundation for extensibility, write comprehensive documentation for users, admins, and developers, optimize performance for production, conduct security review, and prepare for public launch. This epic delivers the final polish and infrastructure needed to go live.

## Story 6.1: Known Issues Board

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

## Story 6.2: Duplicate Ticket Detection

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

## Story 6.3: Plugin Framework Foundation

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

## Story 6.4: Comprehensive Documentation

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

## Story 6.5: Performance Optimization

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

## Story 6.6: Security Review & Hardening

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

## Story 6.7: Launch Preparation & Docker Image Publishing

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
