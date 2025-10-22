# Responsiveness Strategy

## Breakpoints

| Breakpoint | Min Width | Max Width | Target Devices | Layout Changes |
|------------|-----------|-----------|----------------|----------------|
| **Mobile** | 320px | 767px | Phones (portrait) | Single column, hamburger menu, bottom navigation |
| **Tablet** | 768px | 1023px | Tablets, small laptops | Two columns, collapsible sidebar, touch-optimized controls |
| **Desktop** | 1024px | 1279px | Laptops, desktops | Full layout, persistent sidebar, keyboard shortcuts prominent |
| **Wide** | 1280px | - | Large desktops, external monitors | Max content width 1280px, additional whitespace |

**Tailwind CSS Breakpoints:**
- Mobile: default (no prefix)
- Tablet: `md:` prefix
- Desktop: `lg:` prefix
- Wide: `xl:` prefix

## Adaptation Patterns

**Layout Changes:**
- **Mobile:** Stacked single-column layout, collapsible sections
  - Sidebar becomes slide-out drawer (triggered by hamburger menu)
  - Ticket list and detail views switch between full-screen modes (not split)
  - AI Copilot suggestions appear as bottom sheet, not side panel
- **Tablet:** Hybrid layout with collapsible panels
  - Sidebar can be toggled on/off
  - Split view for inbox (list + detail) with reduced panel widths
- **Desktop:** Full three-panel layout (sidebar + list + detail + optional AI copilot)

**Navigation Changes:**
- **Mobile:** Bottom tab bar with 5 key actions (Home, Create, Inbox, KB, Profile)
  - Hamburger menu for additional navigation
  - Top bar shows page title and back button
- **Tablet:** Collapsible sidebar (toggle button in top-left)
  - Swipe from left edge to open sidebar
- **Desktop:** Persistent left sidebar, always visible
  - Command palette (Cmd+K) for quick navigation

**Content Priority:**
- **Mobile:** Hide secondary metadata (category tags, timestamps) until user taps "Show Details"
  - Truncate long text (names, messages) with ellipsis
  - Lazy load images and attachments
- **Tablet:** Show more metadata inline, but still hide AI Copilot by default
- **Desktop:** Show all metadata, AI Copilot visible by default

**Interaction Changes:**
- **Mobile:** Touch-optimized controls (44px minimum touch targets)
  - Swipe gestures for navigation (swipe right to go back)
  - Pull-to-refresh on lists
  - Long-press for context menus
- **Tablet:** Hybrid touch/mouse interactions
  - Touch targets still generous (40px+)
  - Support for hover states
- **Desktop:** Mouse and keyboard primary interactions
  - Hover states reveal additional actions
  - Keyboard shortcuts prominently displayed
  - Drag-and-drop fully supported

## Responsive Component Examples

**Agent Inbox:**
- **Mobile:** List view only; tap ticket opens full-screen detail view
- **Tablet:** 50/50 split (list left, detail right)
- **Desktop:** 35/45/20 split (list / detail / AI copilot)

**Analytics Dashboard:**
- **Mobile:** Cards stack vertically, charts full-width, scrollable
- **Tablet:** 2-column grid for metric cards, charts stack vertically
- **Desktop:** 4-column grid for metric cards, charts side-by-side

**Create Ping:**
- **Mobile:** Full-screen message input, KB suggestions in bottom sheet
- **Tablet:** Message input with KB suggestions in right panel (30% width)
- **Desktop:** Same as tablet with larger viewport
