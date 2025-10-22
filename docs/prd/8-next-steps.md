# 8. Next Steps

## UX Expert Prompt

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

## Architect Prompt

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
