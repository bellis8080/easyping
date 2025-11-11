# Ubiquitous Language

This document defines the shared vocabulary used across EasyPing - in code, documentation, conversations, and user interfaces. Following Eric Evans' Domain-Driven Design principles, we use a **ubiquitous language** to ensure consistency and reduce cognitive load for developers, users, and stakeholders.

## Core Domain Terms

### Ping

**Definition:** A support request submitted by an end user describing an issue, question, or request for help.

**Technical Implementation:**
- Database table: `pings`
- TypeScript interface: `Ping`
- API endpoints: `/api/pings`
- File paths: `/pings/new`, `/pings/{id}`
- Components: `PingDetail`, `PingMessage`, `PingListItem`

**Usage:**
- ✅ Correct: "User creates a ping", "The ping was resolved", "Ping #PING-123"
- ❌ Incorrect: "User creates a ticket", "The ticket was resolved", "Ticket #PING-123"

**Industry Equivalent:** In traditional ITSM systems, this would be called a "ticket" or "support request". We use "ping" to reflect our modern, conversational approach and brand identity (Easy**Ping**).

**Why "Ping" not "Ticket":**
- Brand consistency with product name (EasyPing)
- Reflects conversational, lightweight nature vs. bureaucratic "ticket"
- Differentiates from legacy help desk software
- User mental model: "sending a ping" feels friendly and quick

---

### Ping Number

**Definition:** An auto-incrementing, tenant-scoped identifier for pings, displayed as `#PING-001`, `#PING-002`, etc.

**Technical Implementation:**
- Database column: `ping_number` (SERIAL, auto-generated via trigger)
- Display format: `#PING-{number}` (e.g., `#PING-123`)
- Function: `generate_ping_number()` (PostgreSQL trigger function)

**Usage:**
- ✅ Correct: "Ping #PING-123", `ping.ping_number`
- ❌ Incorrect: "Ticket #PING-123", `ping.ticket_number`

---

### Ping Message

**Definition:** A single message within a ping conversation thread, sent by a user, agent, or system.

**Technical Implementation:**
- Database table: `ping_messages`
- TypeScript interface: `PingMessage`
- Foreign key: `ping_id` (references `pings.id`)

**Message Types:**
- `user`: Message from end user
- `agent`: Message from support agent
- `system`: Automated message (e.g., "Status changed to Resolved")

**Usage:**
- ✅ Correct: "The ping has 3 messages", `ping_messages` table
- ❌ Incorrect: "The ticket has 3 messages", `ticket_messages` table

---

### Organization

**Definition:** A tenant in the multi-tenant data model. Represents a company, team, or entity using EasyPing.

**Technical Implementation:**
- Database table: `organizations`
- TypeScript interface: `Organization`
- Column: `tenant_id` (foreign key in all multi-tenant tables)

**Usage:**
- Also referred to as "tenant" in technical contexts (RLS policies, database design)
- User-facing term: "Organization"

---

### End User

**Definition:** A person who creates pings to request help. Primary persona for the ping creation flow.

**Technical Implementation:**
- Database: `users` table with `role = 'end_user'`
- Permissions: Can create pings, view own pings, message on own pings

**Usage:**
- ✅ Correct: "End user creates a ping"
- ❌ Incorrect: "Customer creates a ticket"

---

### Agent

**Definition:** A support team member who responds to pings and helps resolve user issues.

**Technical Implementation:**
- Database: `users` table with `role = 'agent'`
- Permissions: Can view all pings, respond to pings, update ping status/priority

**Usage:**
- Also called "support agent" in documentation
- Not "operator", "technician", or "support rep"

---

### Ping Status

**Definition:** The current state of a ping in its lifecycle.

**Valid Values:**
- `new`: Ping just created, not yet triaged
- `in_progress`: Agent actively working on the ping
- `waiting_on_user`: Awaiting response from end user
- `resolved`: Issue fixed, awaiting user confirmation
- `closed`: Ping completed and archived

**Technical Implementation:**
- Database column: `pings.status` (CHECK constraint)
- TypeScript enum: `PingStatus`

---

### Ping Priority

**Definition:** The urgency level of a ping, used for SLA calculation and routing.

**Valid Values:**
- `low`: Non-urgent request
- `normal`: Standard priority (default)
- `high`: Important, time-sensitive
- `urgent`: Critical, requires immediate attention

**Technical Implementation:**
- Database column: `pings.priority` (CHECK constraint)
- TypeScript enum: `PingPriority`

---

### Category

**Definition:** A classification tag for pings (e.g., Hardware, Software, Network) used for routing and reporting.

**Technical Implementation:**
- Database table: `categories`
- TypeScript interface: `Category`
- Visual: Badge with custom color and icon

**Usage:**
- Pings can have 0 or 1 category (optional `category_id` foreign key)
- AI auto-assigns categories in Epic 3

---

### Knowledge Base Article (KB Article)

**Definition:** A help article generated from resolved pings or manually authored by agents, used for self-service support.

**Technical Implementation:**
- Database table: `knowledge_base_articles`
- TypeScript interface: `KnowledgeBaseArticle`
- Search: Vector embeddings (pgvector) for semantic search

**Usage:**
- Abbreviated as "KB article" in documentation
- Full term "Knowledge Base Article" in user-facing UI

---

### Known Issue

**Definition:** A publicly announced outage, incident, or system-wide problem that users can follow instead of creating duplicate pings.

**Technical Implementation:**
- Database table: `known_issues`
- TypeScript interface: `KnownIssue`
- Followers: Many-to-many relationship with users

**Usage:**
- Status page integration (future epic)
- Reduces duplicate ping creation

---

## Technical Terms

### Tenant ID

**Definition:** UUID foreign key referencing an organization, used in all multi-tenant tables to enforce data isolation.

**Technical Implementation:**
- Database column: `tenant_id` (UUID, references `organizations.id`)
- RLS policies: `tenant_id = current_setting('app.tenant_id')::UUID`

**Usage:**
- Always included in database queries via RLS (Row Level Security)
- Set via `set_tenant_context()` function in middleware

---

### RLS (Row Level Security)

**Definition:** PostgreSQL feature that enforces tenant isolation at the database level, ensuring users only see data for their organization.

**Technical Implementation:**
- Enabled on all multi-tenant tables
- Policies defined in migration files
- Context set via `app.tenant_id` setting

---

### Supabase

**Definition:** Backend-as-a-Service (BaaS) platform providing PostgreSQL database, authentication, storage, and realtime subscriptions.

**Components:**
- **PostgREST**: Auto-generated REST API from database schema
- **Auth**: User authentication (email/password, OAuth)
- **Storage**: File uploads (ping attachments)
- **Realtime**: Live database subscriptions

**Usage:**
- Not "Supabase database" (redundant - Supabase IS the database + services)
- Correct: "Supabase client", "Supabase Auth", "Supabase Storage"

---

## Anti-Patterns (Don't Use)

| ❌ Avoid | ✅ Use Instead | Reason |
|---------|---------------|--------|
| Ticket | Ping | Ubiquitous language consistency |
| Ticket number | Ping number | Matches data model |
| Ticket messages | Ping messages | Matches table name |
| Customer | End user | Reflects role-based terminology |
| Technician | Agent | Consistent with user roles |
| Issue | Ping (when referring to support request) | Reserve "issue" for Known Issues |
| Request | Ping | Too generic |
| Conversation | Ping thread / Ping messages | More specific |
| Thread | Ping conversation / Ping messages | Avoids ambiguity |

---

## Glossary Quick Reference

| Term | Database | TypeScript | UI Display |
|------|----------|-----------|-----------|
| Ping | `pings` | `Ping` | "Ping #PING-123" |
| Ping Message | `ping_messages` | `PingMessage` | Message bubble in thread |
| Ping Number | `ping_number` | `ping.ping_number` | "#PING-123" |
| Ping Status | `pings.status` | `PingStatus` | Status badge (New, In Progress, etc.) |
| Ping Priority | `pings.priority` | `PingPriority` | Priority badge (Low, Normal, High, Urgent) |
| Organization | `organizations` | `Organization` | Organization name in header |
| End User | `users` (role='end_user') | `User` | User's full name |
| Agent | `users` (role='agent') | `User` | Agent's full name + "Agent" label |
| Category | `categories` | `Category` | Colored badge with icon |
| KB Article | `knowledge_base_articles` | `KnowledgeBaseArticle` | Article title in sidebar |
| Known Issue | `known_issues` | `KnownIssue` | Issue title on status page |

---

## When to Update This Document

Add new terms when:
- Introducing a new core domain concept (e.g., "Escalation", "SLA Policy")
- Creating a new database table or entity
- Defining a new user role or permission
- Establishing a new technical pattern

Update existing terms when:
- Renaming a concept (follow full migration checklist)
- Clarifying ambiguous usage
- Adding new technical implementation details

---

## Related Documentation

- **Data Models:** `docs/architecture/data-models.md` - TypeScript interfaces and ERD
- **Database Schema:** `docs/architecture/database-schema.md` - PostgreSQL tables and RLS policies
- **Coding Standards:** `docs/architecture/coding-standards.md` - Naming conventions and style guide

---

**Last Updated:** 2025-11-10 by Winston (Architect)
