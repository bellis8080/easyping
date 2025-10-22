# Component Library / Design System

**Design System Approach:** EasyPing uses **shadcn/ui** as the foundation, built on Radix UI primitives with Tailwind CSS styling. This provides accessible, unstyled components that can be fully customized to match EasyPing branding without runtime JS overhead. Components are copied into the codebase (not installed as npm dependency), allowing full control and customization.

**Benefits of this approach:**
- Accessible by default (ARIA labels, keyboard navigation, screen reader support)
- Fully customizable via Tailwind classes
- No lock-in to external library versions
- Tree-shakeable (only include what you use)
- TypeScript-first with excellent type safety

## Core Components

### Component: Button

**Purpose:** Primary interaction element for actions and navigation

**Variants:**
- `default` - Primary blue background (#3B82F6)
- `secondary` - Gray background for secondary actions
- `outline` - Transparent with border
- `ghost` - Transparent, appears on hover
- `destructive` - Red background for dangerous actions (delete, close)
- `link` - Styled as hyperlink

**States:**
- `default` - Normal state
- `hover` - Slightly darker background
- `focus` - Visible focus ring for keyboard navigation
- `active` - Pressed state
- `disabled` - Grayed out, not clickable

**Usage Guidelines:**
- Use `default` for primary actions (Send, Save, Create)
- Use `outline` or `ghost` for secondary actions (Cancel, Back)
- Use `destructive` sparingly, always with confirmation modal
- Minimum touch target: 44px height on mobile
- Include loading spinner for async actions

---

### Component: Input / Textarea

**Purpose:** Text entry fields for forms and message composition

**Variants:**
- `text` - Single-line text input
- `textarea` - Multi-line text input (resizable)
- `email` - Email validation
- `password` - Obscured text with show/hide toggle
- `search` - Search icon, clear button

**States:**
- `default` - Empty or filled
- `focus` - Border highlights in blue
- `error` - Red border with error message below
- `disabled` - Grayed out, not editable
- `readonly` - Visible but not editable

**Usage Guidelines:**
- Always pair with visible label (not just placeholder)
- Use placeholder text for examples, not instructions
- Show character count for limited fields
- Inline validation on blur, not on every keystroke
- Error messages should be specific ("Email is required" not "Invalid input")

---

### Component: Select / Dropdown

**Purpose:** Choose from predefined options (status, assignment, category, etc.)

**Variants:**
- `single` - Select one option
- `multi` - Select multiple options with checkboxes
- `searchable` - Large lists with search/filter capability
- `creatable` - Allow user to add new options (e.g., category management)

**States:**
- `closed` - Shows selected value or placeholder
- `open` - Dropdown menu visible
- `focus` - Keyboard navigation highlights option
- `disabled` - Grayed out, not clickable

**Usage Guidelines:**
- Use for 4-20 options; radio buttons for <4, autocomplete for >20
- Show current selection prominently
- Keyboard navigation: Arrow keys, Enter to select, Esc to close
- Search triggers after 3 characters typed
- Group related options with section headings

---

### Component: Badge / Tag

**Purpose:** Display status, category, priority, or metadata

**Variants:**
- `default` - Neutral gray
- `status` - Color-coded by ticket status (green=resolved, yellow=in progress, etc.)
- `priority` - Color-coded by urgency (red=urgent, orange=high, etc.)
- `category` - Consistent color per category for visual recognition
- `removable` - Includes X button to remove (for filters, selections)

**States:**
- `default` - Static display
- `interactive` - Clickable (e.g., filter by this category)
- `removable` - Shows X on hover

**Usage Guidelines:**
- Use sparingly to avoid visual clutter
- Color-code consistently (status colors defined in branding section)
- Keep text short (1-2 words max)
- Use icons sparingly within badges

---

### Component: Modal / Dialog

**Purpose:** Focus user attention on important tasks or information

**Variants:**
- `alert` - Non-dismissible, requires action
- `confirm` - Confirm destructive action with Cancel/Confirm buttons
- `form` - Larger modal with multi-field form
- `slideout` - Side panel that slides in from right (for ticket detail, AI copilot)

**States:**
- `open` - Modal visible with overlay backdrop
- `closed` - Hidden

**Usage Guidelines:**
- Use sparingly; prefer inline editing over modals
- Always provide clear close affordance (X button, Cancel button, Esc key)
- Destructive actions require confirmation modal
- Focus trap: Tab cycles through modal elements only
- Backdrop click closes modal (except for alert variant)
- Overlay backdrop darkens background (rgba(0,0,0,0.5))

---

### Component: Toast / Notification

**Purpose:** Provide feedback for actions without interrupting workflow

**Variants:**
- `success` - Green check icon, success message
- `error` - Red X icon, error message with optional retry button
- `warning` - Yellow alert icon, cautionary message
- `info` - Blue info icon, informational message
- `loading` - Spinner icon, for long-running operations

**States:**
- `visible` - Toast appears with slide-in animation
- `dismissed` - Fades out after timeout or manual dismissal

**Usage Guidelines:**
- Auto-dismiss after 3-5 seconds (except error toasts with actions)
- Stack multiple toasts vertically (max 3 visible)
- Position: Bottom-right for desktop, top-center for mobile
- Include action button for undo-able operations
- Use sparingly; don't toast every minor action

---

### Component: Command Palette (Cmd+K)

**Purpose:** Keyboard-first navigation and search for power users

**Variants:**
- `default` - Search tickets, navigate screens, execute actions

**States:**
- `open` - Overlay modal with search input and results
- `closed` - Hidden

**Usage Guidelines:**
- Trigger: Cmd+K (Mac) or Ctrl+K (Windows/Linux)
- Search as you type with instant results
- Group results by type (Tickets, Pages, Actions, KB Articles)
- Keyboard navigation: Arrow keys, Enter to select, Esc to close
- Show keyboard shortcuts for common actions
- Recent searches appear when palette opens

---

### Component: Avatar

**Purpose:** Visual representation of users and agents

**Variants:**
- `image` - User-uploaded profile picture
- `initials` - Generated from user name (fallback if no image)
- `icon` - Generic user icon (fallback for system messages)

**States:**
- `default` - Normal display
- `online` - Green indicator dot for active users (realtime presence)
- `offline` - No indicator

**Usage Guidelines:**
- Size variants: `xs` (24px), `sm` (32px), `md` (40px), `lg` (64px)
- Use `md` for inbox/thread lists, `lg` for profile pages
- Generate consistent background colors from user ID (hash-based color)
- Alt text: User's full name for screen readers

---

### Component: Loading Skeleton

**Purpose:** Show content placeholders while data loads

**Variants:**
- `text` - Gray bars mimicking text lines
- `card` - Rectangle mimicking card shape
- `list` - Multiple rows for lists
- `avatar` - Circle mimicking avatar

**States:**
- `loading` - Animated shimmer effect
- `loaded` - Replaced with actual content

**Usage Guidelines:**
- Use for initial page loads and long data fetches (>500ms)
- Match skeleton shape to actual content layout
- Subtle animation (shimmer effect, not pulsing)
- Remove immediately when data arrives (no fade-out delay)

---

### Component: SLA Timer (Agent-Only)

**Purpose:** Display SLA countdown timers to help agents prioritize tickets

**Variants:**
- `first-response` - Shows time until first response SLA breach
- `resolution` - Shows time until resolution SLA breach
- `completed` - Shows completed SLA (e.g., "First response: 23m (within SLA)")
- `breached` - Shows breached SLA (e.g., "BREACHED (2h 15m ago)")
- `paused` - Shows paused Resolution SLA when status is "Waiting on User"

**States:**
- `green` - More than 50% time remaining (low urgency)
- `yellow` - 20-50% time remaining (moderate urgency)
- `red` - Less than 20% time remaining or breached (high urgency)

**Display Formats:**
- **Compact (ticket list):** Color badge + time: "🟡 1h 23m"
- **Full (ticket detail):** Label + time + context: "🟡 First response due in 1h 23m"
- **Tooltip (hover):** Both timers: "✅ First response: 23m (within 2h SLA) | 🟡 Resolution: 1d 14h remaining"

**Usage Guidelines:**
- **Ticket list:** Show ONLY most urgent timer (First Response if not met, otherwise Resolution)
- **Ticket detail:** Show BOTH timers with full context
- **Color transitions:** Update color in real-time as time elapses (green → yellow → red)
- **Paused state:** Show "⏸️" icon when Resolution timer paused (status = Waiting on User)
- **Never show to end users:** SLA timers are agent-only feature
- **Auto-refresh:** Update every 60 seconds or use countdown animation
- **Breach notification:** Toast notification when timer crosses into red zone

**Time Formatting:**
- `< 1 hour`: Show minutes (e.g., "23m")
- `1-24 hours`: Show hours + minutes (e.g., "1h 23m")
- `> 24 hours`: Show days + hours (e.g., "2d 6h")
- `Breached`: Show "BREACHED (X over)" (e.g., "BREACHED (2h 15m ago)")
