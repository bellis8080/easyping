# Introduction

This document outlines the complete fullstack architecture for **EasyPing**, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for modern fullstack applications where these concerns are increasingly intertwined.

**EasyPing Context:**

EasyPing is an open-core (AGPLv3), AI-native service desk built as a chat-first alternative to traditional ticketing systems. The architecture must support:
- Single-tenant self-hosted deployment via Docker Compose
- Multi-tenant database schema (future-ready for ServicePing.me SaaS)
- Plugin extensibility with UI components, actions, and background jobs
- AI provider abstraction (OpenAI, Anthropic, Azure) with BYOK (Bring Your Own Key)
- Realtime updates via WebSockets (Supabase Realtime)

## Starter Template or Existing Project

**Status:** N/A - Greenfield project

This is a greenfield project with well-defined technology choices specified in the PRD. While no existing starter template is being used, the architecture follows industry best practices from:
- T3 Stack principles (TypeScript, Next.js, Tailwind CSS)
- Turborepo patterns for monorepo organization
- Supabase Next.js reference architectures for authentication

**Rationale:** Building from scratch provides maximum flexibility for the open-core model and plugin architecture requirements, which would be constrained by opinionated starter templates.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-21 | 0.1 | Initial architecture draft from PRD v1.0 | Winston (Architect) |

---
