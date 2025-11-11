# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EasyPing** is an AI-native, chat-first, open-source service desk built as an alternative to traditional ticketing systems. The project is AGPLv3 licensed and designed for self-hosted deployment via Docker Compose.

**Key Differentiators:**
- Chat-first ticket creation (no forms)
- AI auto-categorization, routing, and response suggestions
- Auto-generated knowledge base from resolved tickets
- Plugin ecosystem with UI extension points
- Multi-tenant database schema (single-tenant deployment for community edition)

**Project Status:** Pre-development (Story 1.1 drafted, implementation not started)

## Architecture Overview

### Monorepo Structure

This is a **Turborepo + pnpm workspace** monorepo. The codebase is organized as:

```
apps/web/          # Next.js 14+ App Router frontend
packages/database/ # Supabase migrations & schemas
packages/ai/       # AI provider abstraction (OpenAI, Anthropic, Azure)
packages/ui/       # Shared shadcn/ui components
packages/types/    # Shared TypeScript types
```

### Technology Stack (Strictly Enforced)

**Critical:** All development MUST use these exact technologies:

- **Framework:** Next.js 14+ with App Router (NOT Pages Router)
- **Language:** TypeScript 5.3+ with strict mode
- **Package Manager:** pnpm 8.0+ (NOT npm or yarn)
- **Backend:** Supabase BaaS (database, auth, storage, realtime)
- **Database:** PostgreSQL 15+ with pgvector extension
- **UI:** shadcn/ui + Radix UI + Tailwind CSS 3.4+
- **Testing:** Vitest (unit/integration), Playwright (e2e)
- **Build:** Turborepo for monorepo orchestration

**Full tech stack:** See `docs/architecture/tech-stack.md`

### Key Architectural Patterns

**Multi-Tenant Schema Design:**
- All data tables include `tenant_id` referencing `organizations.id`
- Row Level Security (RLS) enforces tenant isolation
- Community edition runs single-tenant; schema enables future SaaS migration

**Route Groups (App Router):**
- `app/(auth)/` - Authentication pages (login, signup)
- `app/(dashboard)/` - Protected dashboard routes (tickets, KB, analytics)
- Layouts defined per route group

**Port Configuration & Constraints:**

⚠️ **CRITICAL:** Ports 3000-3999 are RESERVED for other projects on this machine. DO NOT use these ports.

- **Local Development (pnpm dev):** Port **4000** (configured in apps/web/package.json)
- **Docker Production:** Port **8000** internally, **80/443** externally via Caddy
- **Docker Development:** Port **8000** internally with hot reload
- **Local Supabase:** Uses ports 54321, 54322, etc. (NOT 3000 series)

**When working with Docker:**
- Next.js containers use port 8000 internally (NOT 3000)
- Caddy reverse proxy exposes ports 80 (HTTP) and 443 (HTTPS) to host
- All other services (Postgres, Auth, Storage, etc.) communicate on internal Docker network
- Never expose or reference ports 3000-3999 in Docker configurations

**AI Provider Abstraction:**
- `packages/ai/` defines provider-agnostic interface
- Implementations for OpenAI, Anthropic, Azure OpenAI
- Users bring their own API keys (BYOK model)

**Supabase Integration:**
- Auto-generated REST API via PostgREST
- Custom logic in Next.js API routes (`app/api/`)
- Realtime subscriptions for live ticket updates
- Type generation from database schema: `pnpm db:types`

## Development Commands

### Setup & Installation

```bash
# Prerequisites: Node.js 18+, pnpm 8+, Docker, Supabase CLI

# Install dependencies
pnpm install

# Start local Supabase
supabase start

# Copy environment template
cp .env.example .env.local

# Generate TypeScript types from database
pnpm db:types

# Start dev server (runs on port 4000)
pnpm dev
```

**Port Configuration:**
- Local dev server: `http://localhost:4000` (configured in package.json)
- Supabase local instance: `http://localhost:54321`
- Docker deployment: `http://localhost` (ports 80/443)
- **IMPORTANT:** Ports 3000-3999 are OFF-LIMITS (reserved for other projects)

### Build & Test

```bash
# Build all packages
pnpm build

# Lint all packages
pnpm lint

# Type-check all packages
pnpm typecheck

# Format code
pnpm format

# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run e2e tests
pnpm test:e2e

# Run e2e tests in headed mode
pnpm test:e2e --headed
```

### Monorepo Commands

```bash
# Run command in specific package
pnpm --filter @easyping/ai test

# Build specific package
pnpm --filter @easyping/types build

# Add dependency to specific package
pnpm --filter @easyping/web add lucide-react
```

### Database

```bash
# Generate TypeScript types from Supabase schema
pnpm db:types

# Create new migration
supabase migration new <migration_name>

# Apply migrations (IMPORTANT: Use push to preserve test data)
npx supabase db push --local

# Reset database (WARNING: Wipes all data - only use when necessary)
npx supabase db reset --local

# Seed database
pnpm db:seed
```

**CRITICAL - Database Migration Workflow:**

⚠️ **ALWAYS use `npx supabase db push --local` instead of `npx supabase db reset --local`**

- **`db push`**: Applies new migrations WITHOUT wiping data (non-destructive)
- **`db reset`**: Wipes entire database and replays all migrations (destructive)

**When to use each:**
- ✅ **Use `db push`** for normal development (99% of the time)
- ❌ **Avoid `db reset`** unless you need to completely wipe and rebuild the database

**Workflow:**
1. Create migration: `npx supabase migration new my_migration_name`
2. Write migration SQL in `packages/database/supabase/migrations/`
3. Apply migration: `npx supabase db push --local` (preserves test data)
4. Generate types: `pnpm db:types`

**Why this matters:**
- Test data takes time to create (manual form filling, API calls, etc.)
- Resetting the database requires recreating all test data
- `db push` allows iterative development without losing progress

**Accessing Local Database:**

The local Supabase database runs in a Docker container. To access it directly:

```bash
# Find the database container name (should be supabase_db_pingdb)
docker ps --filter "name=db" --format "{{.Names}}"

# Execute SQL queries directly
docker exec supabase_db_pingdb psql -U postgres -c "SELECT * FROM users;"

# Open interactive psql session
docker exec -it supabase_db_pingdb psql -U postgres

# Dump current schema
npx supabase db dump --schema public --local
```

**Important Notes:**
- Container name pattern: `supabase_db_<project_name>` (e.g., `supabase_db_pingdb`)
- Default credentials: username `postgres`, password `postgres`
- Database port: `54322` (mapped from container's 5432)
- **DO NOT use `mcp__supabase__*` MCP tools** - they may be connected to a different project
- Always use Supabase CLI or Docker commands for this project's database
- Other MCP tools (e.g., GitHub) are fine to use

### Performance Analysis

```bash
# Analyze bundle size
ANALYZE=true pnpm build

# Run Lighthouse CI
pnpm lighthouse
```

## Documentation Structure

**Critical Documentation Hierarchy:**

1. **`docs/prd/`** - Product Requirements (sharded by section)
   - Epic details in `docs/prd/epics/epic-{n}-*.md`
   - Always reference PRD for feature requirements

2. **`docs/architecture/`** - Architecture Documentation (sharded by topic)
   - **`tech-stack.md`** - Definitive technology selections
   - **`source-tree.md`** - Directory structure and file organization
   - **`ubiquitous-language.md`** - Domain terminology and naming conventions (CRITICAL: read this first!)
   - **`coding-standards.md`** - TypeScript/React standards
   - **`database-schema.md`** - PostgreSQL schema with RLS policies
   - **`api-specification.md`** - REST API patterns and endpoints

3. **`docs/stories/`** - User stories for AI development
   - Format: `{epic}.{story}.{title}.md` (e.g., `1.1.project-setup.md`)
   - Stories contain detailed task breakdowns and implementation context

4. **`CONTRIBUTING.md`** - Code review, commit conventions, Definition of Done

5. **`DEPLOYMENT.md`** - DNS setup, SSL, Docker deployment, troubleshooting

**When Implementing Features:**
1. **Read `docs/architecture/ubiquitous-language.md` FIRST** - Understand domain terminology
2. Read the story file in `docs/stories/`
3. Reference architecture docs for technical details
4. Follow coding standards from `CONTRIBUTING.md`
5. Update story file with completion notes

## Ubiquitous Language (CRITICAL)

**ALWAYS use the correct domain terminology defined in `docs/architecture/ubiquitous-language.md`**

EasyPing uses Domain-Driven Design (DDD) principles with a strict ubiquitous language. Using incorrect terminology creates confusion and inconsistency.

**Core Terms (NEVER deviate from these):**
- ✅ **Ping** (NOT "ticket", "issue", or "request")
- ✅ **Ping Number** (NOT "ticket number")
- ✅ **End User** (NOT "customer")
- ✅ **Agent** (NOT "technician" or "operator")
- ✅ **Reply / Replying** (NOT "type", "typing", or "send message")
- ✅ **Ping Messages** (NOT "ticket messages")

**Examples:**
```typescript
// ✅ Correct
function createPing(title: string, userId: string): Ping {
  return { id: uuid(), title, created_by: userId };
}

// Component: ReplyingIndicator.tsx
// Message: "John is replying..."
// API: POST /api/pings/[pingNumber]/messages

// ❌ Incorrect
function createTicket(title: string, userId: string): Ticket {
  return { id: uuid(), title, created_by: userId };
}

// Component: TypingIndicator.tsx
// Message: "John is typing..."
// API: POST /api/tickets/[ticketNumber]/messages
```

**Before writing ANY code:**
1. Check `docs/architecture/ubiquitous-language.md` for correct terminology
2. Use exact terms in variable names, function names, file names, UI text, comments
3. If you're unsure about a term, reference the ubiquitous language doc
4. NEVER use synonyms or abbreviations not defined in the ubiquitous language

## Coding Standards

### TypeScript

```typescript
// ✅ Good - Explicit types, strict mode
function createTicket(title: string, userId: string): Ticket {
  return { id: uuid(), title, created_by: userId };
}

// ❌ Bad - Implicit any
function createTicket(title, userId) {
  return { id: uuid(), title, created_by: userId };
}
```

**Strict Mode Enforced:**
- No `any` types without `// @ts-expect-error` justification
- Explicit return types for functions
- Prefer interfaces over types for object shapes

### File Naming

- React components: `PascalCase.tsx` (e.g., `TicketCard.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Tests: `*.test.ts` or `*.test.tsx` (co-located with source)

### Import Organization

```typescript
// 1. External libraries
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Internal packages
import { Ticket, TicketStatus } from '@easyping/types';
import { Button, Badge } from '@easyping/ui';

// 3. Relative imports
import { useTickets } from '@/hooks/use-tickets';
import { formatDate } from '@/lib/utils';
```

### Performance Budgets (Enforced in CI)

- **Bundle size:** <500KB gzipped
- **Page load (TTI):** <2 seconds on 4G
- **Lighthouse Performance:** 90+
- **Lighthouse Accessibility:** 95+

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

Examples:
feat(tickets): add semantic search to ticket list
fix(auth): resolve session expiration bug
docs(deployment): add DNS setup instructions
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Pre-commit hooks:**
- ESLint auto-fix
- Prettier formatting
- TypeScript type-check

## BMAD Agent Workflow

This project uses BMAD™ Core for AI-driven development workflows.

**Agent Personas:**
- `/BMad:agents:po` - Product Owner (Sarah) - Story validation, checklist execution
- `/BMad:agents:sm` - Scrum Master (Bob) - Story creation from epics
- `/BMad:agents:dev` - Developer (future) - Story implementation

**Story Workflow:**
1. Product Owner validates epics against PRD
2. Scrum Master creates detailed stories with implementation context
3. Developer implements stories following task breakdown
4. QA validates implementation against acceptance criteria

**Configuration:** `.bmad-core/core-config.yaml`

## Key Patterns & Anti-Patterns

### ✅ Do

**Next.js App Router:**
- Use Server Components by default
- Add `'use client'` only when needed (state, effects, event handlers)
- Use Next.js Image component for images
- Use route groups: `(auth)` and `(dashboard)`

**Supabase:**
- Generate types after schema changes: `pnpm db:types`
- Use RLS policies for tenant isolation
- Prefer PostgREST for CRUD, Next.js API routes for complex logic

**Testing:**
- Co-locate tests with source files
- 70% minimum coverage for new code
- Mock Supabase client in tests

**Monorepo:**
- Share types via `@easyping/types`
- Share UI via `@easyping/ui`
- Keep packages focused (single responsibility)

### ❌ Don't

- Don't use Next.js Pages Router (use App Router)
- Don't use npm or yarn (use pnpm)
- Don't hardcode tenant IDs (use RLS context)
- Don't create new state management (use Zustand or React Context)
- Don't add dependencies without checking bundle impact
- Don't commit without running pre-commit hooks

## Story Implementation Notes

**When implementing a story:**

1. **Read story file** in `docs/stories/{epic}.{story}.*.md`
2. **Follow task breakdown** sequentially
3. **Reference architecture docs** cited in "Dev Notes" section
4. **Update story file** with:
   - Agent model used
   - Files created/modified
   - Completion notes
   - Debug log references (if issues encountered)
5. **Run validation:**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```

**Definition of Done (from CONTRIBUTING.md):**
- Code follows coding standards
- Tests written (70%+ coverage)
- Linting passes
- Type-checking passes
- Build succeeds
- Documentation updated
- Story file updated with completion notes

## Plugin Architecture

**Extension Points (Epic 6.3):**
- UI components in ticket sidebar, message thread, settings pages
- Custom actions callable from UI
- Background jobs (cron-style)
- Webhooks for event notifications

**Plugin Manifest:** JSON schema in `packages/plugins/` (created in Epic 6)

## Common Gotchas

**Supabase Local vs Production:**
- Local: `supabase start` runs containers on localhost
- `.env.local` should point to local instance
- Production: Separate Supabase project with different URLs/keys

**TypeScript Strict Mode:**
- Enforced project-wide
- `any` types trigger lint warnings
- Use `unknown` with type guards instead

**Turborepo Caching:**
- Builds are cached for speed
- If stale, clear cache: `pnpm turbo run build --force`

**pnpm Workspaces:**
- Dependencies hoisted to root `node_modules`
- Package-specific deps in package `node_modules`
- Use `pnpm why <package>` to debug dependency issues

## Environment Variables

**Required (`.env.local`):**
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start>
NEXT_PUBLIC_APP_URL=http://localhost:4000
```

**Optional (configured later):**
- AI provider keys (OPENAI_API_KEY, etc.)
- SMTP settings for email
- Error webhook URL for monitoring

See `.env.example` for complete list.

## Related Resources

- **PRD:** `docs/prd/` (sharded sections)
- **Architecture:** `docs/architecture/` (sharded by topic)
- **Contributing Guide:** `CONTRIBUTING.md`
- **Deployment Guide:** `DEPLOYMENT.md`
- **Story Template:** `.bmad-core/templates/story-tmpl.yaml`
