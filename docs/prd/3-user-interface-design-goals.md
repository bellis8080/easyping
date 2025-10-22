# 3. User Interface Design Goals

## Overall UX Vision

EasyPing's UX should feel like **"Slack for support tickets"** — a modern, chat-first interface that eliminates the cognitive overhead of traditional ticketing systems. Users should be able to describe their problem naturally in a conversation, not hunt through dropdown menus or mandatory form fields. The experience should be **frictionless, familiar, and fast**.

**Key UX Principles:**

- **Conversational by default**: Every interaction starts with a message, not a form
- **Realtime and responsive**: Updates appear instantly without page refreshes (WebSocket-driven)
- **Progressive disclosure**: Simple by default, powerful when needed (hide complexity until required)
- **AI-augmented, not AI-gated**: AI assists agents but never blocks workflows if it fails
- **Clean and uncluttered**: Generous whitespace, clear visual hierarchy, focused attention
- **Keyboard-first for power users**: Full keyboard navigation for agents who live in the tool

The overall aesthetic should be **modern SaaS product** — think Linear, Notion, or Vercel's design language — not enterprise software from 2010.

---

## Key Interaction Paradigms

**Primary Interactions:**

1. **Chat-based ticket creation**: Users type freely in a message box, system captures context and creates ticket automatically
2. **Threaded conversations**: Each ticket is a persistent chat thread with chronological message history
3. **Inline AI suggestions**: Agents see AI-generated response suggestions as "ghost text" they can accept/edit/ignore
4. **Drag-and-drop attachments**: Files can be dropped directly into conversation threads
5. **Quick actions via emoji reactions**: Mark resolved, escalate, or assign tickets with reaction-style buttons (⚡ for quick actions)
6. **Live typing indicators**: Show when agents or users are composing responses
7. **Command palette**: Keyboard shortcut (Cmd+K) to search tickets, navigate, or execute actions
8. **Smart autocomplete**: Auto-suggest ticket IDs, user names, KB articles as users type

**Navigation Model:**

- **Sidebar navigation**: Persistent left sidebar with Inbox, My Pings, All Tickets, Known Issues, Knowledge Base, Settings
- **Ticket detail view**: Right-side panel shows full conversation thread with AI summary pinned at top
- **Contextual actions**: Toolbar at top of ticket with status, assignment, priority, SLA timer

---

## Core Screens and Views

**For End Users:**

1. **Create Ticket Screen**: Simple chat interface with "Send a ping..." or "What can we help with?" prompt
2. **My Pings**: **Chat-style conversation list** showing active pings with:
   - Contact/agent avatar and name
   - Last message preview
   - Status indicator badge (🟢 New, 🟡 In Progress, 🔵 Waiting on You, ✅ Resolved)
   - Timestamp of last activity
   - Unread message count
   - **Auto-archive behavior**: Resolved pings automatically fall off the list after 7 days (configurable)
3. **Ticket Conversation View**: Full thread view with message history, attachments, status updates
4. **Known Issues Board**: Public-facing board showing ongoing incidents with follow/subscribe options
5. **Knowledge Base Search**: Self-service search interface with article previews (could brand as "Help Center" or "Answers")

**For Agents:**

6. **Agent Inbox**: Unified queue of assigned pings with SLA indicators and filters (by status, priority, category)
7. **Ticket Detail Panel**: Split view - ping list on left, conversation thread on right with AI copilot suggestions
8. **Knowledge Base Editor**: Interface to review AI-generated KB drafts and publish articles
9. **Agent Dashboard**: Personal metrics (pings resolved today, avg resolution time, SLA compliance)

**For Managers:**

10. **Analytics Dashboard**: High-level metrics (ping volume trends, SLA performance, top categories, agent performance)
11. **Team Overview**: See all open pings across team with assignment and status
12. **SLA Configuration**: Interface to define and edit SLA policies

**Admin/Owner:**

13. **Settings & Configuration**: System settings, user management, branding, AI provider setup
14. **Plugin Management**: Enable/disable plugins, configure plugin settings
15. **First-Run Setup Wizard**: Initial configuration flow for Docker deployment (company name, admin user, AI keys)

---

## Accessibility

**Target Level: WCAG 2.1 Level AA**

**Key Requirements:**

- Keyboard navigation for all interactive elements
- ARIA labels for screen readers on dynamic content (chat messages, notifications)
- Color contrast ratios meeting AA standards (4.5:1 for normal text, 3:1 for large text)
- Focus indicators clearly visible for keyboard users
- Alt text for all images and icons
- Support for browser zoom up to 200% without breaking layout
- Captions/transcripts for any video help content

---

## Branding

**Ping.me Ecosystem Identity:**

EasyPing is part of the **ping.me ecosystem**, and the branding should reinforce this across all products:

- **EasyPing.me** - Community edition (this product)
- **ServicePing.me** - Enterprise edition (future)
- **ProductPing.me** - Innovation management (future)
- **OpsPing.me** - Incident + release management (future)

**Core Brand Concept: "Ping"**

The term **"ping"** should permeate the user experience:

- **User-facing language**: "Send a ping" instead of "Create a ticket"
- **Conversation list**: "My Pings" instead of "My Tickets"
- **Notifications**: "You received a ping from IT" instead of "New ticket response"
- **Agent language**: Can use "ticket" internally for agents, but "ping" for user-facing UI
- **Tagline**: *"No forms. No friction. Just EasyPing."*

**Visual Style:**

- **Modern and professional**: Clean, minimalist design with professional polish
- **Ping metaphor**: Visual language could incorporate waves, ripples, signals, or connection imagery
- **Open-source friendly**: Welcoming and transparent, not corporate/sterile
- **Light mode primary**: Default to light theme, dark mode as stretch goal for v2
- **Component library**: Use shadcn/ui + Tailwind for modern React stack consistency

**Brand Customization (for self-hosted users):**

- Configurable company logo (header and login screen)
- Configurable primary brand color (used for buttons, links, highlights)
- Configurable company name (appears in page titles, emails, headers)
- **Domain customization**: Self-hosted instances run on user's domain, but powered by EasyPing
- Default EasyPing.me branding where user hasn't customized

**Default EasyPing Branding:**

- **Domain**: EasyPing.me (community edition hosted/demo)
- **Color palette**:
  - Primary: `#3B82F6` (Tailwind blue-500) - suggests "ping" signal/connectivity
  - Accent: `#8B5CF6` (Tailwind violet-500) - adds visual interest
  - Status colors: Green (resolved), Yellow (in progress), Blue (waiting), Red (SLA breach)
- **Logo concept**: Simple, memorable icon suggesting ping/wave/signal (e.g., concentric circles, radio waves, or chat bubble with ripple effect)
- **Typography**: Inter font family (clean, modern, excellent readability)
- **Iconography**: Lucide icons or similar clean, minimal icon set

**Branding Consistency Across Ecosystem:**

All ping.me products should share visual DNA:
- Consistent color palette with product-specific accent colors
- Shared ping/wave/signal visual metaphor
- Unified typography and component styling
- Clear product differentiation through accent colors:
  - EasyPing: Blue (approachable, community)
  - ServicePing: Navy/Professional (enterprise)
  - ProductPing: Purple (innovation)
  - OpsPing: Orange/Red (urgency, ops)

**Terminology Guide:**

| Traditional Ticketing Term | EasyPing Term (User-Facing) | Agent Term (Internal) |
|----------------------------|----------------------------|----------------------|
| Create ticket | Send a ping | Create ticket |
| My tickets | My pings | My queue |
| Ticket #1234 | Ping #1234 | Ticket #1234 |
| New ticket notification | New ping from [user] | New ticket assigned |
| Ticket resolved | Ping resolved | Ticket closed |
| Ticket list | Conversations | Queue |

---

## Target Device and Platforms

**Primary Target: Web Responsive (Desktop + Mobile Web)**

**Desktop Experience (Primary):**

- Optimized for 1280px+ resolution
- Agents will primarily use desktop browsers
- Support for Chrome, Firefox, Safari, Edge (latest 2 versions)
- Full feature set available on desktop

**Mobile Web Experience (Secondary):**

- Responsive layout that works on mobile browsers (iOS Safari, Chrome Android)
- Streamlined interface for ticket viewing and basic responses
- Touch-friendly targets (minimum 44px tap areas)
- Users can create tickets and view status on mobile
- Agent features accessible but not optimized (agents primarily work on desktop)

**NOT in scope for MVP:**

- Native mobile apps (iOS/Android)
- PWA offline capabilities
- Tablet-specific layouts (use responsive web)
- Desktop applications (Electron)

---
