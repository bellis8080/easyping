# Tech Stack

This is the **definitive technology selection** for EasyPing. All development must use these exact technologies and versions.

## Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| **Frontend Language** | TypeScript | 5.3+ | Type-safe JavaScript for frontend | Industry standard for large codebases, catches errors at compile time, excellent IDE support |
| **Frontend Framework** | Next.js | 14+ (App Router) | React framework with SSR/SSG | Modern App Router, built-in optimization, excellent DX, Vercel deployment ready |
| **UI Component Library** | shadcn/ui + Radix UI | Latest | Accessible component primitives | Unstyled, accessible components with full customization, no runtime JS overhead |
| **State Management** | React Hooks + Zustand | Zustand 4.4+ | Global state management | Lightweight, simple API, avoids Redux complexity, sufficient for MVP scope |
| **Backend Language** | TypeScript | 5.3+ | Type-safe server-side code | Shared types between frontend/backend, single language across stack |
| **Backend Framework** | Supabase BaaS | Latest | Database, auth, storage, realtime | Eliminates custom backend development, self-hostable, production-ready |
| **API Style** | REST (Supabase PostgREST) + Next.js API Routes | N/A | Auto-generated REST API + custom endpoints | PostgREST provides instant CRUD, Next.js routes for AI/plugin logic |
| **Database** | PostgreSQL | 15+ | Relational database with pgvector | Industry standard, RLS support, pgvector for embeddings, Supabase-managed |
| **Cache** | None (MVP) | N/A | Caching layer | Defer to post-MVP, PostgreSQL query performance sufficient initially |
| **File Storage** | Supabase Storage | Latest | Object storage for attachments | S3-compatible, integrated with Supabase auth, simple upload/download APIs |
| **Authentication** | Supabase Auth | Latest | User authentication + OAuth | Built-in email/password, social OAuth (Google), JWT tokens, secure session management |
| **Frontend Testing** | Vitest | Latest | Fast unit testing framework | Vite-compatible, faster than Jest, modern API, excellent TypeScript support |
| **Backend Testing** | Vitest | Latest | Backend unit tests | Same framework as frontend for consistency, mocks Supabase client |
| **E2E Testing** | Playwright | Latest | End-to-end testing | Cross-browser support, reliable, excellent debugging tools |
| **Build Tool** | Turborepo | Latest | Monorepo task orchestration | Intelligent caching, parallel execution, simple configuration |
| **Package Manager** | pnpm | 8.0+ | Fast, efficient package management | Workspace support, faster than npm/yarn, efficient disk usage |
| **Bundler** | Next.js Built-in (Turbopack) | N/A | JavaScript bundler | Next.js 14+ uses Turbopack, faster than Webpack, zero config needed |
| **IaC Tool** | Docker Compose | Latest | Infrastructure as code | Simple YAML config, single-command deployment, portable across environments |
| **CI/CD** | GitHub Actions | N/A | Continuous integration/deployment | Free for open source, integrated with GitHub, simple workflow YAML |
| **Monitoring** | None (MVP) | N/A | Application monitoring | Defer to post-MVP, rely on Docker logs initially |
| **Logging** | Console + Docker Logs | N/A | Application logging | Built-in logging sufficient for MVP, structured logs via Next.js |
| **CSS Framework** | Tailwind CSS | 3.4+ | Utility-first CSS framework | Rapid styling, excellent DX, purges unused CSS, shadcn/ui compatible |
| **Forms** | React Hook Form + Zod | Latest | Form validation | Performant, minimal re-renders, Zod provides TypeScript-first schema validation |
| **Icons** | Lucide React | Latest | Icon library | Modern, consistent, tree-shakeable, excellent Next.js support |
| **Date/Time** | date-fns | 3.0+ | Date manipulation library | Lightweight, immutable, modular, simpler than Moment.js |
| **AI Providers** | OpenAI SDK, Anthropic SDK, Azure OpenAI | Latest | AI provider integration | Official SDKs for categorization, summarization, embeddings |
| **Vector Search** | pgvector (PostgreSQL extension) | 0.5+ | Semantic search via embeddings | Native PostgreSQL extension, no separate vector DB needed |

**Additional Development Tools:**
- **Linting:** ESLint + Prettier (enforced via Husky pre-commit hooks)
- **Git Hooks:** Husky + lint-staged (runs lint and type-check before commit)
- **Versioning:** Semantic versioning (semver) for releases
- **Container Registry:** Docker Hub (public images for community downloads)

---
