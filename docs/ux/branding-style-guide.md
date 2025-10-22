# Branding & Style Guide

**Brand Guidelines:** EasyPing is part of the **ping.me ecosystem**. All visual design should reinforce the "ping" metaphor (signals, connections, communication) while maintaining a modern SaaS aesthetic.

## Visual Identity

**Brand Positioning:**
- Modern and professional, not corporate/sterile
- Open-source friendly and welcoming
- Clean, minimalist design with purposeful details
- "Slack for support tickets" visual language

**Logo Concept:**
- Simple, memorable icon suggesting ping/wave/signal
- Potential concepts: concentric circles, radio waves, chat bubble with ripple effect
- Works in monochrome and color
- Scalable from 16px favicon to large format

## Color Palette

| Color Type | Hex Code | Usage |
|------------|----------|-------|
| **Primary** | `#3B82F6` | Primary buttons, links, brand elements, focus states |
| **Primary Hover** | `#2563EB` | Hover state for primary buttons |
| **Secondary** | `#8B5CF6` | Accent elements, secondary emphasis |
| **Success** | `#10B981` | Positive feedback, confirmations, resolved status |
| **Warning** | `#F59E0B` | Cautions, important notices, in-progress status |
| **Error** | `#EF4444` | Errors, destructive actions, SLA breaches |
| **Info** | `#3B82F6` | Informational messages (same as primary) |
| **Neutral 50** | `#F9FAFB` | Background, subtle surfaces |
| **Neutral 100** | `#F3F4F6` | Hover backgrounds, disabled states |
| **Neutral 200** | `#E5E7EB` | Borders, dividers |
| **Neutral 400** | `#9CA3AF` | Placeholder text, disabled text |
| **Neutral 600** | `#4B5563` | Secondary text, labels |
| **Neutral 900** | `#111827` | Primary text, headings |

**Status Color Mapping:**
- 🟢 Resolved: Success green (#10B981)
- 🟡 In Progress: Warning yellow (#F59E0B)
- 🔵 Waiting on User: Info blue (#3B82F6)
- 🔴 SLA Breach: Error red (#EF4444)
- ⚪ New: Neutral gray (#9CA3AF)

**SLA Timer Color Mapping (Agent-Only):**
- 🟢 Green: >50% time remaining (#10B981) - On track, low urgency
- 🟡 Yellow: 20-50% time remaining (#F59E0B) - At risk, moderate urgency
- 🔴 Red: <20% time remaining or breached (#EF4444) - Critical, high urgency
- ⏸️ Paused: Gray (#9CA3AF) - Resolution timer paused (Waiting on User status)

## Typography

### Font Families

- **Primary:** Inter (Google Fonts) - Used for all UI text, headings, body copy
- **Secondary:** Inter (same family for consistency)
- **Monospace:** `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace` - Used for code snippets, ticket IDs, technical data

### Type Scale

| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| **H1** | 36px (2.25rem) | 700 (Bold) | 40px (1.1) | Page titles, main headings |
| **H2** | 30px (1.875rem) | 600 (Semibold) | 36px (1.2) | Section headings |
| **H3** | 24px (1.5rem) | 600 (Semibold) | 32px (1.33) | Subsection headings |
| **H4** | 20px (1.25rem) | 600 (Semibold) | 28px (1.4) | Card titles, component headings |
| **Body** | 16px (1rem) | 400 (Regular) | 24px (1.5) | Default paragraph text, UI labels |
| **Body Small** | 14px (0.875rem) | 400 (Regular) | 20px (1.43) | Secondary text, timestamps |
| **Caption** | 12px (0.75rem) | 400 (Regular) | 16px (1.33) | Metadata, helper text |
| **Button** | 14px (0.875rem) | 500 (Medium) | 20px (1.43) | Button text |

**Tailwind CSS Mapping:**
- H1: `text-4xl font-bold`
- H2: `text-3xl font-semibold`
- H3: `text-2xl font-semibold`
- H4: `text-xl font-semibold`
- Body: `text-base font-normal`
- Small: `text-sm font-normal`
- Caption: `text-xs font-normal`

## Iconography

**Icon Library:** Lucide React (lucide-react npm package)

**Icon Guidelines:**
- Use 24px icons for primary actions and navigation
- Use 20px icons for inline text and small buttons
- Use 16px icons for compact displays and metadata
- Stroke width: 2px (default Lucide)
- Always include ARIA labels for icon-only buttons
- Pair icons with text labels for clarity (icon alone only for common actions like close, search)

**Common Icon Mappings:**
- Create Ping: `MessageSquarePlus` or `Send`
- Inbox: `Inbox`
- Knowledge Base: `BookOpen` or `Library`
- Settings: `Settings`
- User Profile: `User`
- Notifications: `Bell`
- Search: `Search`
- Filter: `Filter`
- Status (resolved): `CheckCircle2`
- Status (in progress): `Clock`
- Priority (urgent): `AlertCircle`
- Attachment: `Paperclip`
- AI Copilot: `Sparkles` or `Zap`

## Spacing & Layout

**Grid System:** 12-column grid for desktop layouts

**Container Widths:**
- Max content width: 1280px (centered with auto margins)
- Sidebar width: 240px (fixed)
- Ticket list panel: 35% of viewport width (min 320px)
- Ticket detail panel: 45% of viewport width
- AI Copilot panel: 20% of viewport width (collapsible)

**Spacing Scale (Tailwind):**
- `space-1`: 4px - Tight spacing (icon to text)
- `space-2`: 8px - Close spacing (form label to input)
- `space-3`: 12px - Default spacing (between related elements)
- `space-4`: 16px - Standard spacing (between components)
- `space-6`: 24px - Medium spacing (between sections)
- `space-8`: 32px - Large spacing (between major sections)
- `space-12`: 48px - Extra large spacing (page top/bottom padding)

**Border Radius:**
- `rounded-sm`: 2px - Subtle rounding (badges, tags)
- `rounded`: 4px - Default rounding (buttons, inputs, cards)
- `rounded-md`: 6px - Medium rounding (modals, larger cards)
- `rounded-lg`: 8px - Large rounding (prominent features)
- `rounded-full`: 9999px - Pills, avatars, notification badges

## Shadows & Elevation

**Shadow System (Tailwind):**
- `shadow-sm`: Subtle elevation for inputs, cards
- `shadow`: Default elevation for dropdowns, tooltips
- `shadow-md`: Medium elevation for modals, popovers
- `shadow-lg`: High elevation for command palette, overlays
- `shadow-xl`: Maximum elevation for toasts, notifications

**Usage Guidelines:**
- Use shadows sparingly for z-axis hierarchy
- Modals and overlays use `shadow-lg` or `shadow-xl`
- Interactive elements (buttons, cards) use `shadow-sm` on hover

## Brand Customization for Self-Hosted Users

EasyPing allows self-hosted users to customize branding:

**Customizable Elements:**
- Company logo (replaces EasyPing logo in header, login screen)
- Primary brand color (replaces #3B82F6 throughout interface)
- Company name (appears in page titles, email notifications)
- Domain (self-hosted instances run on customer domain)

**Non-Customizable Elements (MVP):**
- Typography (Inter font)
- Component shapes and layouts
- Spacing and grid system
- "Powered by EasyPing" footer link (required for open-source license)

**Implementation:**
- Brand settings stored in `organizations` table
- CSS variables dynamically generated from settings
- Logo uploaded to Supabase Storage
- Changes apply immediately via realtime config updates
