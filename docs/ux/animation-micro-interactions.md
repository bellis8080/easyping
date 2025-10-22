# Animation & Micro-interactions

## Motion Principles

1. **Purposeful, not decorative** - Animations should guide attention and provide feedback, not distract
2. **Fast and subtle** - Durations 150-300ms for most interactions; users shouldn't wait for animations
3. **Respect user preferences** - Honor `prefers-reduced-motion` media query for users with vestibular disorders
4. **Consistent easing** - Use consistent easing functions across the application

**Easing Functions:**
- `ease-in-out` - Default for most transitions
- `ease-out` - For elements entering the view (modals, toasts)
- `ease-in` - For elements leaving the view (dismissing notifications)

## Key Animations

**Page Transitions:**
- **Type:** Fade-in with subtle slide up
- **Duration:** 200ms
- **Easing:** ease-out
- **Usage:** When navigating between pages
- **Implementation:** CSS transition on opacity + transform

**New Message Appears:**
- **Type:** Slide-in from bottom with fade
- **Duration:** 250ms
- **Easing:** ease-out
- **Usage:** When new message arrives in conversation thread
- **Implementation:** Framer Motion or CSS animation

**Button Press:**
- **Type:** Scale down slightly + ripple effect
- **Duration:** 150ms
- **Easing:** ease-out
- **Usage:** On all button clicks
- **Implementation:** CSS transform scale(0.98) on active state

**Toast Notification:**
- **Type:** Slide-in from bottom-right
- **Duration:** 300ms enter, 200ms exit
- **Easing:** ease-out (enter), ease-in (exit)
- **Usage:** Success/error/info notifications
- **Implementation:** React Spring or Framer Motion

**Modal Open/Close:**
- **Type:** Backdrop fade + modal scale up from 0.95 to 1.0
- **Duration:** 250ms
- **Easing:** ease-out
- **Usage:** All modal dialogs
- **Implementation:** CSS transition on opacity + transform

**Loading Skeleton:**
- **Type:** Shimmer effect (gradient animation left to right)
- **Duration:** 1500ms loop
- **Easing:** ease-in-out
- **Usage:** While content loads
- **Implementation:** CSS linear-gradient animation

**SLA Timer Countdown:**
- **Type:** Color transition from green → yellow → red as time runs out
- **Duration:** 500ms per color change
- **Easing:** ease-in-out
- **Usage:** SLA timer in ticket toolbar
- **Implementation:** CSS transition on background-color

**Typing Indicator:**
- **Type:** Three dots pulsing in sequence
- **Duration:** 1400ms loop (staggered)
- **Easing:** ease-in-out
- **Usage:** When agent/user is composing message
- **Implementation:** CSS animation on opacity

**Focus Ring:**
- **Type:** Instant appearance (no animation)
- **Duration:** 0ms
- **Usage:** All keyboard focus states
- **Rationale:** Focus indicators should appear immediately for accessibility

**Hover State Transitions:**
- **Type:** Background color + shadow change
- **Duration:** 150ms
- **Easing:** ease-in-out
- **Usage:** Buttons, cards, list items
- **Implementation:** CSS transition on background-color, box-shadow

## Reduced Motion Support

For users with `prefers-reduced-motion: reduce`:
- Disable all animations and transitions
- Replace slide/scale animations with instant opacity changes
- Keep essential feedback (loading spinners, focus indicators)
- Example CSS:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
