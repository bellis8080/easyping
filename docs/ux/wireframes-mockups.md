# Wireframes & Mockups

**Primary Design Files:** High-fidelity mockups will be created in Figma (link to be added once created)

**Design Tool Recommendations:**
- **Figma** for collaborative design and prototyping
- **v0 by Vercel** or **Lovable** for AI-generated component prototypes using shadcn/ui
- **Excalidraw** for quick low-fidelity wireframes and flow diagrams

## Key Screen Layouts

### Screen 1: My Pings (End User Conversation List)

**Purpose:** Primary home screen for end users showing all their active support conversations

**Key Elements:**
- **Header:** "My Pings" title, Create Ping button (prominent, top-right)
- **Filter Tabs:** All (default), Active, Resolved, Archived
- **Conversation List:** Similar to iMessage/Slack conversation list:
  - Each item shows:
    - Agent avatar (left side)
    - Ping ID + Status badge (e.g., "#PING-042" with 🟡 In Progress)
    - Last message preview (truncated to 2 lines)
    - Timestamp (relative: "2m ago", "Yesterday", "Jan 15")
    - **NO SLA timers** (end users don't see countdown clocks)
    - Unread count badge (if unread messages)
  - Hover state reveals quick actions (archive, mark resolved)
  - Click opens ping detail view
- **Empty State:** "No pings yet. Need help? Send your first ping!" with Create Ping CTA
- **Sidebar Navigation:** Persistent left sidebar (see IA section)

**Interaction Notes:**
- List items are clickable rows with subtle hover effect (background lightens)
- Unread pings appear with bold text and colored left border accent
- Realtime updates: New messages appear at top, timestamps update live
- Infinite scroll or "Load More" for pings beyond 50
- Keyboard navigation: Arrow keys move selection, Enter opens ping
- **Static expectations shown instead of timers:** "Typically resolved within 8 hours" (on ticket creation confirmation)

**Design File Reference:** [Figma frame to be linked]

---

### Screen 2: Create Ping (Chat-First Ticket Creation)

**Purpose:** Allow users to describe their issue naturally without forms

**Key Elements:**
- **Header:** "Send a Ping" title, close button (X) to return to My Pings
- **Message Input Area (Primary):**
  - Large textarea with placeholder: "Describe your issue... what can we help with?"
  - Character count indicator (optional, if there's a limit)
  - Attachment button (paperclip icon) below textarea
  - Send button (primary blue, right-aligned) and Cancel link (left-aligned)
- **KB Suggestions Sidebar (Right, 30% width):**
  - Title: "Related articles"
  - List of 3-5 KB article suggestions (updated as user types, debounced 300ms)
  - Each suggestion shows: article title, snippet (1-2 lines), "Read more" link
  - If no suggestions: "No related articles found"
- **Attachment Preview:** Shows selected files with filename, size, remove button

**Interaction Notes:**
- Auto-focus on textarea on page load
- Enter sends message (Shift+Enter for new line)
- KB suggestions use semantic search, update dynamically as user types
- Clicking KB article opens in modal (overlay) without losing draft
- Draft auto-saved to localStorage every 5 seconds
- File upload: Drag-drop onto textarea or click paperclip to browse
- Validation: Show inline error if message is empty on submit

**Design File Reference:** [Figma frame to be linked]

---

### Screen 3: Agent Inbox (Split View with Echo)

**Purpose:** Unified queue for agents to triage and respond to tickets efficiently

**Key Elements:**
- **Left Panel (Ticket List, 35% width):**
  - Header: "Inbox" title, filter dropdown (All, Assigned to Me, Unassigned, Urgent), sort by "SLA Risk"
  - Ticket cards in list:
    - Ping ID, user name, user avatar
    - Subject line (first message truncated)
    - Status badge, priority indicator
    - **SLA Timer Badge (most urgent):** Color-coded badge showing either First Response or Resolution timer
      - If First Response not met: "🟡 1h 23m" (First Response timer)
      - If First Response met: "🟢 6h 15m" (Resolution timer)
      - If breached: "🔴 23m" (shows breached timer in red)
    - Category tag
    - Last activity timestamp
  - Hover state shows:
    - Quick actions (assign, change priority)
    - **Tooltip with both SLA timers:** "✅ First response: 23m (within 2h SLA) | 🟡 Resolution: 1d 14h remaining"
  - Selected ticket highlighted with left accent border
- **Right Panel (Ticket Detail, 45% width):**
  - **Toolbar (Top):**
    - Status dropdown, assignment dropdown, priority dropdown
    - **Dual SLA Timer Display:**
      - Before first response: "🟡 First response due in 1h 23m" + "🟢 Resolution due in 2d 18h"
      - After first response: "✅ First response: 45m (within SLA)" + "🟡 Resolution due in 2d 6h"
      - When Waiting on User: "✅ First response: 45m" + "⏸️ Resolution timer paused (waiting on user)"
      - When breached: "🔴 First response BREACHED (2h 15m ago)"
  - **Pinned AI Summary:** Collapsed by default, expandable
  - **Conversation Thread:** Chronological message list, alternating left/right for user/agent
  - **Message Input:** Bottom-fixed textarea with Send button
- **Echo Panel (Far Right, 20% width, collapsible):**
  - Title: "Echo" (your AI assistant)
  - Response suggestion with "Use this response" button
  - Suggested KB articles to share
  - Suggested category/priority changes
  - Collapse button to hide panel and expand ticket detail

**Interaction Notes:**
- Keyboard shortcuts: `j/k` to navigate ticket list, `c` to compose reply, `Cmd+Enter` to send
- Realtime: New tickets appear at top with subtle slide-in animation
- **SLA timer auto-updates:** Refreshes every 60 seconds, color transitions (green → yellow → red)
- **SLA breach toast:** Notification appears when ticket enters red zone or breaches
- Agent can drag-drop files into message input
- Typing indicator shows to user when agent is composing
- Echo panel can be toggled with `Cmd+Shift+E`
- **Sort by SLA Risk:** Breached tickets first, then at-risk (yellow), then on-track (green)

**Design File Reference:** [Figma frame to be linked]

---

### Screen 4: Knowledge Base Search (Self-Service)

**Purpose:** Allow users to find answers without creating tickets

**Key Elements:**
- **Header:** "Knowledge Base" title, breadcrumb (if in category)
- **Search Bar (Prominent, Top Center):**
  - Large search input with placeholder: "Search for help..."
  - Magnifying glass icon (left side)
  - Voice search icon (optional, right side)
  - Search happens on-type (debounced 300ms) with semantic search
- **Search Results:** List of article cards:
  - Article title (clickable)
  - Snippet (2-3 lines with search term highlighted)
  - Category tag
  - Helpful count (e.g., "👍 42 people found this helpful")
  - Last updated timestamp
- **Categories Sidebar (Left, if no search query):**
  - List of KB categories with article counts
  - Clickable to filter results
- **Empty State:** "No articles found. Try different keywords or contact support."

**Interaction Notes:**
- Search results update in realtime as user types
- Clicking article opens detail page
- Breadcrumbs: Knowledge Base > Category Name > Article Title
- "Was this helpful?" feedback buttons at end of each article
- Keyboard navigation: Tab through results, Enter to open article

**Design File Reference:** [Figma frame to be linked]

---

### Screen 5: Analytics Dashboard (Manager)

**Purpose:** Provide managers with actionable insights into team performance and ticket trends

**Key Elements:**
- **Header:** "Analytics" title, date range selector (Last 7 days, Last 30 days, Custom)
- **Key Metrics Cards (Top Row, 4 cards):**
  - Total Pings (with trend indicator: ↑ +12% vs last period)
  - Avg Resolution Time (hours)
  - SLA Compliance Rate (percentage with progress bar)
  - Agent Utilization (percentage)
- **Charts (Middle Section, 2 columns):**
  - Left: Ping Volume Over Time (line chart)
  - Right: Pings by Category (pie chart or bar chart)
- **Tables (Bottom Section):**
  - Top Categories by volume (table with 5 rows)
  - Agent Performance (table: agent name, pings resolved, avg time, SLA compliance)
- **Filters:** Category filter, agent filter, status filter (dropdowns above charts)

**Interaction Notes:**
- All charts are interactive (hover for tooltips, click to drill down)
- Date range selector updates all metrics and charts
- Export button (top-right) downloads data as CSV
- Clicking metric card navigates to filtered ticket view
- Responsive: On mobile, cards stack vertically, charts become scrollable

**Design File Reference:** [Figma frame to be linked]
