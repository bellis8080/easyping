# 4. Technical Assumptions

## Open-Core Business Model

**EasyPing is Open-Core, NOT Fully Open Source SaaS**

EasyPing follows an **open-core model**: the core product is open source (AGPLv3), but the SaaS orchestration, billing, and enterprise features remain **proprietary** for ServicePing.me.

**What This Means:**

- **Open Source Core** (EasyPing): Anyone can self-host, modify, and extend
- **Proprietary SaaS Layer** (ServicePing.me): Multi-tenant orchestration, billing, enterprise features closed-source
- **Commercial Protection**: License prevents competitors from offering hosted EasyPing as a service without releasing modifications
- **Community Value**: Users get full-featured, production-ready software for free
- **Business Sustainability**: We monetize hosting, support, and enterprise features

---

## License Strategy: AGPLv3

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

## Multi-Tenancy Strategy: Schema-Ready, Orchestration Proprietary

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

## Open vs Proprietary: Clear Boundaries

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

## Repository Structure: Monorepo

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

## Service Architecture: Monolithic Frontend + Supabase BaaS

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

## Testing Requirements: Unit + Integration Testing

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

## Technology Stack Details

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

## Security Considerations

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

## Plugin Framework Architecture

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

## Observability & Monitoring

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

## Database Schema Principles

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

## Localization (Future)

**Deferred to Post-MVP:**

- **i18n Framework**: next-intl
- **Initial Language**: English only
- **Future Languages**: Community-contributed translations
- **ServicePing.me**: Professional translations for major languages (ES, FR, DE, PT, JP)

---

## Technical Rationale Summary

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
