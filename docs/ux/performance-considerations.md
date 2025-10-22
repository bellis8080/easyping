# Performance Considerations

## Performance Goals

- **Page Load (Initial):** < 2 seconds on 3G connection
- **Interaction Response:** < 100ms for all interactions (button clicks, typing)
- **Animation FPS:** 60 FPS for all animations and scrolling
- **Time to Interactive (TTI):** < 3 seconds on mid-range devices
- **First Contentful Paint (FCP):** < 1.5 seconds

## Design Strategies for Performance

**Lazy Loading:**
- Images: Use Next.js `<Image>` component with lazy loading enabled
- Routes: Next.js automatic code-splitting by route
- Modals: Load modal content only when opened (dynamic imports)
- Below-the-fold content: Intersection Observer for lazy rendering

**Image Optimization:**
- Compress all images to WebP format (fallback to PNG/JPG)
- Responsive images: Multiple sizes for different breakpoints
- Limit image dimensions: Max 1920px width, compress to <200KB
- Use SVG for icons and simple graphics (smaller file size)

**Bundle Size Management:**
- Keep main bundle < 500KB gzipped
- Code-split by route (automatic with Next.js App Router)
- Tree-shake unused dependencies (use named imports)
- Lazy load heavy components (charts, rich text editors)

**Realtime Updates:**
- Throttle/debounce rapid updates (e.g., typing indicators debounced 300ms)
- Batch database writes (don't write on every keystroke)
- Unsubscribe from realtime channels when leaving page
- Limit number of simultaneous realtime subscriptions

**Rendering Performance:**
- Use React.memo for expensive components
- Virtualize long lists (react-window for 100+ items)
- Avoid inline styles and dynamic CSS (use Tailwind classes)
- Minimize re-renders with proper state management (Zustand, React Context)

**Perceived Performance:**
- Show loading skeletons instead of spinners (users perceive faster)
- Optimistic UI updates (show success immediately, revert on error)
- Instant feedback on interactions (button press animations)
- Progressive loading (show content as it arrives, don't wait for everything)

## Metrics to Track

- **Core Web Vitals:**
  - LCP (Largest Contentful Paint): < 2.5s
  - FID (First Input Delay): < 100ms
  - CLS (Cumulative Layout Shift): < 0.1
- **Custom Metrics:**
  - Time to send first ping
  - Time to load inbox (50 tickets)
  - AI copilot suggestion latency
  - Realtime message delivery latency
