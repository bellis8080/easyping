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

# Start dev server
pnpm dev
```

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

# Apply migrations
supabase db reset

# Seed database
pnpm db:seed
```

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
   - **`unified-project-structure.md`** - Directory structure
   - **`coding-standards.md`** - TypeScript/React standards (when created)
   - **`testing-strategy.md`** - Test requirements (when created)

3. **`docs/stories/`** - User stories for AI development
   - Format: `{epic}.{story}.{title}.md` (e.g., `1.1.project-setup.md`)
   - Stories contain detailed task breakdowns and implementation context

4. **`CONTRIBUTING.md`** - Code review, commit conventions, Definition of Done

5. **`DEPLOYMENT.md`** - DNS setup, SSL, Docker deployment, troubleshooting

**When Implementing Features:**
1. Read the story file in `docs/stories/`
2. Reference architecture docs for technical details
3. Follow coding standards from `CONTRIBUTING.md`
4. Update story file with completion notes

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
NEXT_PUBLIC_APP_URL=http://localhost:3000
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
