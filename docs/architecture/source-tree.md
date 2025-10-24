# Unified Project Structure

Complete monorepo structure showing all packages, applications, and configuration files.

```
easyping/
├── .github/                          # GitHub configuration
│   └── workflows/
│       ├── ci.yml                    # Lint, typecheck, test on PR
│       ├── build.yml                 # Build Docker image on merge
│       └── release.yml               # Publish releases to Docker Hub
│
├── apps/
│   └── web/                          # Next.js 14+ frontend application
│       ├── src/
│       │   ├── app/                  # App Router pages
│       │   │   ├── (auth)/           # Auth route group
│       │   │   │   ├── login/
│       │   │   │   ├── signup/
│       │   │   │   └── layout.tsx
│       │   │   ├── (dashboard)/      # Dashboard route group (protected)
│       │   │   │   ├── tickets/
│       │   │   │   │   ├── page.tsx              # Ticket list
│       │   │   │   │   ├── [id]/page.tsx         # Ticket detail
│       │   │   │   │   └── new/page.tsx          # Create ticket
│       │   │   │   ├── kb/
│       │   │   │   │   ├── page.tsx              # KB search
│       │   │   │   │   └── [slug]/page.tsx       # Article detail
│       │   │   │   ├── analytics/
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── settings/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   ├── categories/page.tsx
│       │   │   │   │   ├── sla/page.tsx
│       │   │   │   │   └── ai/page.tsx
│       │   │   │   └── layout.tsx                # Dashboard layout with sidebar
│       │   │   ├── api/               # Next.js API routes
│       │   │   │   ├── tickets/
│       │   │   │   │   └── route.ts              # POST /api/tickets
│       │   │   │   ├── ai/
│       │   │   │   │   ├── categorize/route.ts   # AI categorization
│       │   │   │   │   ├── summarize/route.ts    # AI summarization
│       │   │   │   │   └── suggest/route.ts      # AI response suggestions
│       │   │   │   ├── kb/
│       │   │   │   │   └── search/route.ts       # Semantic search
│       │   │   │   ├── webhooks/
│       │   │   │   │   └── plugin/[id]/route.ts  # Plugin webhooks
│       │   │   │   └── health/route.ts           # Health check endpoint
│       │   │   ├── layout.tsx         # Root layout
│       │   │   ├── page.tsx           # Landing page
│       │   │   └── globals.css        # Global styles (Tailwind)
│       │   ├── components/            # React components
│       │   │   ├── tickets/
│       │   │   │   ├── ticket-list.tsx
│       │   │   │   ├── ticket-detail.tsx
│       │   │   │   ├── ticket-message.tsx
│       │   │   │   └── ticket-create-form.tsx
│       │   │   ├── kb/
│       │   │   │   ├── kb-search.tsx
│       │   │   │   ├── kb-article-card.tsx
│       │   │   │   └── kb-editor.tsx
│       │   │   ├── analytics/
│       │   │   │   ├── dashboard-cards.tsx
│       │   │   │   └── ticket-chart.tsx
│       │   │   ├── layout/
│       │   │   │   ├── sidebar.tsx
│       │   │   │   ├── header.tsx
│       │   │   │   └── command-palette.tsx
│       │   │   └── ui/                # shadcn/ui components (from packages/ui)
│       │   ├── hooks/                 # Custom React hooks
│       │   │   ├── use-tickets.ts
│       │   │   ├── use-realtime-subscription.ts
│       │   │   ├── use-auth.ts
│       │   │   └── use-debounce.ts
│       │   ├── lib/                   # Utilities and configuration
│       │   │   ├── supabase/
│       │   │   │   ├── client.ts      # Supabase browser client
│       │   │   │   ├── server.ts      # Supabase server client (SSR)
│       │   │   │   └── middleware.ts  # Auth middleware
│       │   │   ├── ai/
│       │   │   │   └── client.ts      # AI provider client (imports from @easyping/ai)
│       │   │   └── utils.ts           # Utility functions
│       │   ├── stores/                # Zustand state management
│       │   │   ├── auth-store.ts
│       │   │   ├── ticket-store.ts
│       │   │   └── settings-store.ts
│       │   └── middleware.ts          # Next.js middleware (auth)
│       ├── public/                    # Static assets
│       │   ├── favicon.ico
│       │   ├── logo.svg
│       │   └── images/
│       ├── tests/                     # Frontend tests
│       │   ├── unit/                  # Vitest unit tests
│       │   │   └── components/
│       │   └── e2e/                   # Playwright e2e tests
│       │       └── tickets.spec.ts
│       ├── .env.example               # Environment variables template
│       ├── .env.local                 # Local environment (gitignored)
│       ├── next.config.js             # Next.js configuration
│       ├── tailwind.config.ts         # Tailwind CSS configuration
│       ├── tsconfig.json              # TypeScript configuration
│       ├── package.json               # App dependencies
│       └── vitest.config.ts           # Vitest configuration
│
├── packages/
│   ├── database/                      # Supabase migrations and schemas
│   │   ├── migrations/                # SQL migration files
│   │   │   ├── 20250121000001_create_organizations.sql
│   │   │   ├── 20250121000002_create_users.sql
│   │   │   ├── 20250121000003_enable_rls.sql
│   │   │   └── ...
│   │   ├── seed/                      # Seed data for development
│   │   │   └── dev-seed.sql
│   │   ├── supabase/
│   │   │   └── config.toml            # Supabase project configuration
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── ai/                            # AI provider abstraction layer
│   │   ├── src/
│   │   │   ├── providers/
│   │   │   │   ├── base.ts            # AIProvider interface
│   │   │   │   ├── openai.ts          # OpenAI implementation
│   │   │   │   ├── anthropic.ts       # Anthropic implementation
│   │   │   │   └── azure.ts           # Azure OpenAI implementation
│   │   │   ├── factory.ts             # Provider factory
│   │   │   ├── embeddings.ts          # Embedding generation
│   │   │   └── index.ts               # Public API
│   │   ├── tests/
│   │   │   └── providers.test.ts      # Unit tests with mocked providers
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                            # Shared UI components (shadcn/ui)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   └── ...                # All shadcn/ui components
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── types/                         # Shared TypeScript types
│       ├── src/
│       │   ├── supabase.ts            # Auto-generated from Supabase schema
│       │   ├── models.ts              # Data model interfaces (Organization, User, Ticket, etc.)
│       │   ├── api.ts                 # API request/response types
│       │   ├── enums.ts               # Enums (UserRole, TicketStatus, etc.)
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docker/
│   ├── docker-compose.yml             # Full Supabase + Next.js stack
│   ├── docker-compose.dev.yml         # Development override
│   ├── Dockerfile                     # Next.js app Dockerfile
│   ├── Caddyfile                      # Caddy reverse proxy config
│   └── README.md                      # Deployment instructions
│
├── scripts/
│   ├── setup.sh                       # First-time setup script
│   ├── generate-types.sh              # Generate TS types from Supabase
│   ├── seed-db.sh                     # Seed development database
│   └── build-docker.sh                # Build Docker image
│
├── docs/                              # Documentation
│   ├── prd/                           # Product Requirements (sharded)
│   │   ├── index.md
│   │   ├── 1-goals-and-background-context.md
│   │   ├── 2-requirements.md
│   │   └── ...
│   ├── architecture.md                # This file
│   ├── CONTRIBUTING.md                # Contribution guidelines
│   ├── DEPLOYMENT.md                  # Deployment guide
│   └── PLUGIN_DEVELOPMENT.md          # Plugin development guide
│
├── .husky/                            # Git hooks
│   ├── pre-commit                     # Run lint-staged
│   └── commit-msg                     # Validate commit messages
│
├── .vscode/                           # VS Code configuration
│   ├── settings.json                  # Workspace settings
│   ├── extensions.json                # Recommended extensions
│   └── launch.json                    # Debug configurations
│
├── .env.example                       # Root environment template
├── .gitignore
├── .prettierrc                        # Prettier configuration
├── .eslintrc.js                       # ESLint configuration
├── turbo.json                         # Turborepo pipeline configuration
├── pnpm-workspace.yaml                # pnpm workspace configuration
├── package.json                       # Root package.json (workspace scripts)
├── tsconfig.json                      # Root TypeScript configuration
├── LICENSE                            # AGPLv3 license
└── README.md                          # Project README

```

**Key Directory Decisions:**

- **Monorepo structure:** All code in one repository for simplified development
- **App Router pattern:** Next.js 14+ App Router for modern React patterns
- **Route groups:** `(auth)` and `(dashboard)` for layout organization
- **API routes:** Colocated with pages in `/api` directory
- **Shared packages:** Types, UI components, and AI abstraction shared across apps
- **Docker-first:** All deployment configs in `/docker` directory
- **Migration-driven:** Database schema managed via Supabase migrations
- **Test colocation:** Tests live alongside source code in each package

---
