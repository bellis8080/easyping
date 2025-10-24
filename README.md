# EasyPing

> AI-native, chat-first service desk for modern teams

EasyPing is an open-source, self-hostable service desk platform that reimagines IT support through conversational interfaces and AI-powered automation. Built for agile teams who need fast, flexible support without enterprise complexity.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-BaaS-green)](https://supabase.com/)

---

## Features

- **Chat-First Tickets**: Create and manage tickets through natural conversation
- **AI-Powered Routing**: Intelligent ticket categorization and assignment
- **Multi-Tenant Ready**: Designed for SaaS deployment (currently single-tenant)
- **Self-Hostable**: Full control over your data with AGPLv3 license
- **Real-time Updates**: Live ticket status updates via Supabase Realtime
- **Modern Stack**: Built with Next.js 15+, TypeScript, and Tailwind CSS

---

## Quick Start

### Prerequisites

- **Node.js 18+** and **pnpm 8+**
- **Docker** and **Docker Compose** (for local Supabase)
- **Git** for version control

### Installation

```bash
# Clone the repository
git clone https://github.com/bellis8080/easyping.git
cd easyping

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start Supabase (Story 1.2 - not yet implemented)
# pnpm supabase:start

# Generate TypeScript types (Story 1.2 - not yet implemented)
# pnpm db:types

# Start development server
pnpm dev
```

Access the app at **http://localhost:4000**

---

## Development

### Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials (after completing Story 1.2):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

3. (Optional) Configure AI provider for intelligent routing (Story 3.1):
   ```bash
   AI_PROVIDER=openai
   OPENAI_API_KEY=your_api_key
   ```

### Running Locally

```bash
# Start all services in development mode
pnpm dev

# Run linting
pnpm lint

# Run type checking
pnpm typecheck

# Run tests (Story 1.8 - not yet implemented)
pnpm test

# Build for production
pnpm build
```

### Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all packages in development mode |
| `pnpm build` | Build all packages for production |
| `pnpm lint` | Lint all packages with ESLint |
| `pnpm format` | Format code with Prettier |
| `pnpm typecheck` | Type-check all packages with TypeScript |
| `pnpm test` | Run tests across all packages (TBD) |
| `pnpm analyze` | Analyze Next.js bundle size |
| `pnpm lighthouse` | Run Lighthouse CI performance checks |

---

## Project Structure

EasyPing uses a **pnpm workspaces + Turborepo** monorepo setup:

```
easyping/
├── apps/
│   └── web/                 # Next.js 15+ web application (App Router)
│       ├── src/
│       │   ├── app/         # Next.js app directory
│       │   │   ├── (auth)/  # Auth route group (login, signup)
│       │   │   └── (dashboard)/  # Dashboard route group
│       │   ├── components/  # React components (TBD)
│       │   └── lib/         # Utilities and helpers (TBD)
│       └── public/          # Static assets
├── packages/
│   ├── ai/                  # AI provider abstraction (Story 3.1)
│   ├── database/            # Supabase schemas & migrations (Story 1.4)
│   ├── types/               # Shared TypeScript types
│   └── ui/                  # Shared UI components (shadcn/ui) (Story 1.5)
├── docs/
│   ├── prd/                 # Product Requirements Documents
│   ├── stories/             # User stories and implementation plans
│   └── architecture/        # Architecture documentation
├── .github/
│   └── workflows/           # CI/CD workflows
└── turbo.json               # Turborepo configuration
```

### Monorepo Architecture

- **Apps**: Full-stack applications (currently just `web`)
- **Packages**: Shared libraries used by apps
- **Turborepo**: Orchestrates builds, tests, and linting across packages
- **pnpm Workspaces**: Manages dependencies and linking between packages

---

## Performance Budgets

EasyPing is designed for speed and efficiency:

- **Bundle Size**: < 500KB gzipped for initial page load
- **Time to Interactive (TTI)**: < 2s on 4G connection
- **Lighthouse Scores**:
  - Performance: 90+
  - Accessibility: 95+
  - Best Practices: 90+
  - SEO: 95+

Run performance analysis:
```bash
# Analyze bundle size
pnpm analyze

# Run Lighthouse CI
pnpm build
pnpm lighthouse
```

---

## Tech Stack

### Frontend
- **Next.js 15+** - React framework with App Router
- **TypeScript 5.3+** - Type-safe development
- **Tailwind CSS 3.4+** - Utility-first styling
- **shadcn/ui** - Accessible component library (Radix UI primitives)

### Backend & Infrastructure
- **Supabase** - Backend-as-a-Service (Postgres, Auth, Storage, Realtime)
- **Docker** - Containerization for deployment
- **GitHub Actions** - CI/CD pipelines

### AI & Integrations
- **OpenAI / Anthropic** - AI provider abstraction (Story 3.1)
- **Langchain** - LLM orchestration (Story 3.2)

### Development Tools
- **Turborepo** - Monorepo build system
- **pnpm** - Fast, disk-efficient package manager
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks for pre-commit checks
- **Lighthouse CI** - Performance monitoring

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- Development workflow
- Coding standards
- Pull request process
- Code review guidelines
- Commit message conventions

### Key Guidelines

1. Follow [coding standards](./docs/architecture/coding-standards.md)
2. Write tests for new features (Story 1.8)
3. Ensure CI passes (lint, typecheck, build)
4. Get 1-2 code reviews before merging
5. Use [Conventional Commits](https://www.conventionalcommits.org/)

---

## License

EasyPing is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

This means:
- ✅ Free to use, modify, and distribute
- ✅ Commercial use allowed
- ⚠️ **Network use = distribution** (if you run a modified version publicly, you must share your changes)
- ⚠️ Must disclose source code for any modified versions
- ⚠️ Must keep the same license

See [LICENSE](./LICENSE) for full terms.

### Why AGPL?

We chose AGPL to ensure that if anyone offers EasyPing as a service, the community benefits from improvements. If you enhance EasyPing for your organization and offer it to users (even internally), please contribute back!

---

## Roadmap

**Current Phase: Epic 1 - Foundation & Authentication**

- [x] Story 1.1: Project Setup & Monorepo Infrastructure
- [ ] Story 1.2: Supabase Local Setup (In Progress)
- [ ] Story 1.3: Authentication Flow
- [ ] Story 1.4: Database Schema Design
- [ ] Story 1.5: UI Component Library
- [ ] Story 1.6: Role-Based Access Control (RBAC)
- [ ] Story 1.7: Deployment & Infrastructure
- [ ] Story 1.8: Testing Infrastructure

See [docs/prd/epics/](./docs/prd/epics/) for detailed product requirements.

---

## Support & Community

- **Issues**: [GitHub Issues](https://github.com/bellis8080/easyping/issues)
- **Discussions**: [GitHub Discussions](https://github.com/bellis8080/easyping/discussions)
- **Documentation**: [docs/](./docs/)

---

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - The React Framework
- [Supabase](https://supabase.com/) - Open Source Firebase Alternative
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful Accessible Components
- [Radix UI](https://www.radix-ui.com/) - Unstyled Accessible Primitives
- [Tailwind CSS](https://tailwindcss.com/) - Utility-First CSS Framework

---

**Built with ❤️ by the EasyPing team**

## Local Development Ports

EasyPing uses the following port configuration to avoid conflicts with other projects:

| Service | Port | URL |
|---------|------|-----|
| **Next.js Web App** | 4000 | http://localhost:4000 |
| **Supabase API (Kong)** | 54321 | http://localhost:54321 |
| **PostgreSQL Database** | 54322 | postgresql://postgres:postgres@localhost:54322/postgres |
| **Supabase Studio** | 54323 | http://localhost:54323 |
| **Mailpit (Email Testing)** | 54324 | http://localhost:54324 |

### Docker Containers

The local development stack uses Docker containers with the project ID `pingdb`:
- Database: `supabase_db_pingdb` (PingDB)
- All Supabase services: `supabase_*_pingdb`
