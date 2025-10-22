# Epic 1: Foundation & Authentication

**Goal:** Establish the foundational project infrastructure with modern development tools (monorepo, Next.js, Supabase), implement multi-tenant database schema designed for future SaaS while running in single-tenant mode, provide user authentication and role-based access control, and deliver a fully deployable Docker image with working health check. This epic delivers minimal but complete functionality: users can sign up, log in, and access a basic authenticated dashboard, proving the deployment and authentication systems work end-to-end.

## Story 1.1: Project Setup & Monorepo Infrastructure

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
9. **Performance budgets and optimization guidelines established:**
   - **Bundle size budget:** Main JavaScript bundle <500KB gzipped (enforced via Next.js build warnings)
   - **Page load budget:** Time to Interactive (TTI) <2 seconds on 4G connection
   - **API response budget:** 95th percentile <500ms for database queries, <2s for API endpoints
   - **Image optimization:** All uploaded images auto-compressed (max 1920px width, JPEG quality 85%, WebP format preferred)
   - **Asset optimization:** SVG icons minified, CSS purged via Tailwind, unused imports removed
   - **Bundle analyzer:** `@next/bundle-analyzer` configured to run on builds
   - **Performance monitoring:** Lighthouse CI configured to fail PR if scores drop below thresholds (Performance: 90, Accessibility: 95)
10. **Coding standards documented:**
    - TypeScript strict mode enforced (no `any` types without justification)
    - Component naming: PascalCase for components, camelCase for utilities
    - File structure: co-locate tests with source files (`*.test.ts` next to `*.ts`)
    - Import organization: external libs → internal packages → relative imports
    - ESLint rules enforce: no unused vars, prefer const, consistent return types

## Story 1.2: Supabase Integration & Multi-Tenant Schema

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

## Story 1.3: User Authentication (Email/Password & OAuth)

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
9. **Email service configured for password reset and notifications:**
   - **Option 1 (Default):** Use Supabase Auth built-in email for password resets (zero config, SMTP via Supabase)
   - **Option 2 (Production):** External SMTP provider configuration (SendGrid, Mailgun, AWS SES) for custom branded emails
   - **Environment variables documented:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`
   - **Fallback behavior:** If external SMTP fails, fall back to in-app notifications only
   - **Email templates created:** Password reset, welcome email, email verification

## Story 1.4: Role-Based Access Control (RBAC)

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

## Story 1.5: Docker Compose Deployment

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

## Story 1.6: First-Run Setup Wizard

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

## Story 1.7: Basic Dashboard & Health Check

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
8. **Basic monitoring and logging configured:**
   - **Docker health checks:** All services (Postgres, Next.js, Caddy) have health check commands in docker-compose.yml
   - **Error logging:** Structured logging with severity levels (ERROR, WARN, INFO, DEBUG) using console with JSON format
   - **Log aggregation:** Docker logs accessible via `docker-compose logs -f <service>`
   - **Uptime monitoring (optional):** Documentation for connecting external uptime monitor (UptimeRobot, Healthchecks.io, etc.)
   - **Error alerting:** Environment variable `ERROR_WEBHOOK_URL` to send critical errors to Slack/Discord (optional)
   - **Performance logging:** Log slow database queries (>500ms), slow API requests (>2s), and failed AI calls

## Story 1.8: Testing Infrastructure Setup

**As a** developer,
**I want** comprehensive testing infrastructure configured before building features,
**so that** code quality is maintained and regressions are caught early.

**Acceptance Criteria:**

**Unit & Integration Testing (Vitest):**

1. Vitest configured in all packages (`ai`, `types`, `database`, `web`)
2. Test scripts added to package.json: `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`
3. Vitest configuration files created (vitest.config.ts) with TypeScript support
4. Test utilities package created with common mocks and fixtures
5. Mock Supabase client created for testing database operations
6. Sample unit tests written for each package to validate setup:
   - `packages/types`: Test TypeScript interfaces compile correctly
   - `packages/ai`: Test AI provider interface with mocked responses
   - `packages/database`: Test database schema validation
   - `apps/web`: Test utility functions and React hooks
7. Code coverage thresholds configured (minimum 70% for new code)
8. CI/CD pipeline runs tests on every PR (GitHub Actions)

**End-to-End Testing (Playwright):**

9. Playwright installed and configured in `apps/web/tests/e2e`
10. Playwright configuration created (playwright.config.ts) with browsers (Chromium, Firefox, WebKit)
11. Test database seeding scripts created for e2e test isolation
12. Sample e2e tests created to validate setup:
    - Authentication flow (signup, login, logout)
    - Dashboard access (protected route redirects)
    - Health check endpoint returns 200
13. E2E tests run against local Docker Compose stack
14. CI/CD pipeline runs e2e tests after unit tests pass
15. Screenshot/video recording on test failures for debugging

**Test Documentation:**

16. Testing guidelines added to CONTRIBUTING.md:
    - How to write unit tests
    - How to run e2e tests locally
    - Mocking best practices
    - Test naming conventions
17. README updated with testing commands and coverage badges

---
