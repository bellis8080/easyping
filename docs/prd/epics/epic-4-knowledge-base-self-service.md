# Epic 4: Knowledge Base & Self-Service

**Goal:** Build a self-service knowledge base that automatically captures support knowledge from resolved tickets. AI converts successful resolutions into article drafts, agents review and publish, and users search KB before creating tickets. Semantic search using pgvector enables intelligent article discovery. This epic reduces repetitive questions and builds a living documentation system that grows with every resolved ticket.

## Story 4.1: KB Database Schema & Article Management

**As a** developer,
**I want** a knowledge base schema with articles, categories, and usage tracking,
**so that** we can store and organize support knowledge.

**Acceptance Criteria:**

1. `kb_articles` table created with: id, tenant_id, title, content (markdown), category, status (draft/published), source_ticket_id, created_by, created_at, updated_at
2. `kb_categories` table with predefined categories (Hardware, Software, Network, etc.)
3. `kb_article_views` table tracks article usage (article_id, user_id, viewed_at)
4. RLS policies enforce tenant isolation
5. Articles soft-deleted (deleted_at column) not hard-deleted
6. Full-text search index on title and content (tsvector + GIN index)
7. Database migration creates seed categories

## Story 4.2: KB Article Generation from Resolved Pings

This story has been split into three sub-stories for incremental implementation:

### Story 4.2.1: Agent Private Notes

**As an** agent,
**I want** to add private notes to pings that only other agents can see,
**so that** I can document resolution steps and share context with teammates without cluttering the user conversation.

**Acceptance Criteria:**

1. Agent message input shows two send options: "Send" (public message to user) and "Private" (internal note)
2. Private notes are stored in `ping_messages` with a visibility flag
3. Private notes are visible to agents, managers, and owners only
4. End users cannot see private notes exist (no indicators, no count, completely hidden)
5. Private notes display with distinct visual styling (e.g., different background color, "Private" badge)
6. When agent resolves a ping without any private notes, Echo prompts: "Add resolution notes for the knowledge base?"
7. Echo's resolution prompt includes a quick-add note input
8. Private notes are included in ping exports and internal reporting

### Story 4.2.2: Auto-Generate KB Articles from Resolved Pings

**As an** agent,
**I want** to generate a KB article draft when resolving a ping,
**so that** solutions can be captured and reused for future similar issues.

**Acceptance Criteria:**

1. Resolve confirmation modal shows checkbox: "Generate KB article from this ping"
2. When opted in, AI generates KB article draft with TWO resolution sections:
   - **User Resolution** (public): Self-service steps end users can perform, OR "Contact support" if agent intervention required
   - **Agent Resolution** (internal): Technical steps from private notes, visible only to agents
3. Generated articles include: title, public content, internal content, and suggested category
4. Draft is saved to `kb_articles` table with `status='draft'` and `source_ping_id` linked
5. Agent is redirected to KB editor to review/edit the draft
6. If AI generation fails, show error toast but still allow ping resolution
7. Generation happens asynchronously (non-blocking UI)
8. End users see only the public content; agents see both public + internal sections
9. Internal content stored in new `agent_content` column (not visible via public API)

### Story 4.2.3: KB Article Comparison & Enhancement

**As an** agent,
**I want** the system to compare my resolved ping against existing KB articles,
**so that** I can enhance existing articles instead of creating duplicates.

**Acceptance Criteria:**

1. Before generating a new KB article, system searches existing KB for similar content
2. If similar article found (>70% semantic match), show agent the match with options: "Enhance existing article", "Create new article anyway", "Skip KB generation"
3. "Enhance existing" creates a NEW draft version (preserves original until approved)
4. Enhanced draft includes diff-style view showing what changed
5. When agent approves enhanced draft, it REPLACES the original article
6. Original article's view_count, helpful_count preserved after replacement
7. If no similar article found, proceed with normal new article generation
8. Similarity search uses category as primary filter, then content matching

## Story 4.3: KB Article Editor for Agents

**As an** agent,
**I want** to review, edit, and publish KB article drafts,
**so that** I can ensure quality before making articles public.

**Acceptance Criteria:**

1. KB section in sidebar navigation (agents only)
2. KB dashboard shows tabs: Published, Drafts, Archived
3. Draft articles list shows title, category, source ticket, created date
4. Clicking draft opens editor with markdown support (WYSIWYG or split-pane)
5. Editor toolbar includes: bold, italic, headers, lists, code blocks, links, images
6. Live preview pane shows rendered markdown
7. "Publish" button changes status to published and makes visible to users
8. "Save Draft" button saves without publishing
9. "Delete" button soft-deletes article
10. Published articles display publish date and author name

## Story 4.3.5: KB Browse Page & Category Filtering

**As a** user or agent,
**I want** to browse the knowledge base with category filtering and see popular articles,
**so that** I can discover relevant support articles and self-serve before creating a ping.

**Acceptance Criteria:**

1. `/kb` route displays the Knowledge Base browse page accessible from sidebar navigation
2. Published articles displayed as cards showing: title, snippet, category badge, view count, helpfulness percentage, last updated date
3. Categories sidebar (right side) shows all categories with article counts, clicking filters the list
4. "All" category option shows all published articles (default view)
5. Popular Articles widget shows top 5 articles by view count
6. Search bar at top with placeholder "Search articles, guides, and FAQs..."
7. Search uses full-text search with debounced input (300ms)
8. Results show count: "X articles found"
9. Empty state when no articles: "No articles published yet. Check back soon!"
10. Empty search results: "No articles found. Try different keywords or create a ping."
11. Articles sorted by most recently updated by default
12. Clicking an article card navigates to `/kb/[slug]` (detail page, Story 4.5)
13. KB page accessible to all authenticated users (end users, agents, managers, owners)
14. End users see only public content; internal/agent-only articles hidden

## Story 4.4: Semantic Search with pgvector

**As a** user or agent,
**I want** to search KB articles using natural language,
**so that** I can find solutions even if I don't know exact keywords.

**Acceptance Criteria:**

1. `kb_articles` table includes `embedding` column (vector type from pgvector)
2. When article published, AI generates embedding from title + content
3. Search query generates embedding and finds similar articles (cosine similarity)
4. Search returns top 10 most relevant articles ranked by similarity
5. Search also includes traditional full-text search as fallback
6. Results show: title, excerpt with highlighted keywords, category badge, view count
7. Search box in KB page with instant results (debounced, updates as user types)
8. Empty state if no results: "No articles found. Try different keywords or create a ping."

## Story 4.5: KB Article Detail Page

**As a** user,
**I want** to view full KB article content,
**so that** I can self-serve and resolve issues without creating tickets.

**Acceptance Criteria:**

1. Clicking article from search results navigates to article detail page
2. Detail page shows: title, category badge, publish date, author, full content (rendered markdown)
3. "Was this helpful?" feedback widget (Yes/No thumbs up/down)
4. Related articles section at bottom (based on category or semantic similarity)
5. "Still need help? Create a ping" button if article doesn't solve issue
6. Article view tracked in `kb_article_views` table
7. View count displayed on article (e.g., "Viewed 127 times")
8. Breadcrumb navigation: Knowledge Base > Category > Article Title

## Story 4.6: KB Suggestions During Ticket Creation

**As a** user,
**I want** to see relevant KB articles while describing my issue,
**so that** I can self-solve without submitting a ticket.

**Acceptance Criteria:**

1. As user types in "Create Ping" message box, system searches KB in real-time
2. "Related Articles" panel appears below message box if matches found
3. Top 3 articles displayed with title and short preview
4. User can click article to view in modal overlay
5. Modal includes "This solved my issue" button (closes ticket creation flow)
6. If user continues typing after viewing article, ticket creation proceeds normally
7. Debounced search (waits 500ms after typing stops before searching)
8. "View all X results" link expands to full search page

## Story 4.7: KB Analytics & Popular Articles

**As a** manager,
**I want** to see which KB articles are most viewed and helpful,
**so that** I can identify valuable content and gaps.

**Acceptance Criteria:**

1. KB dashboard shows "Popular Articles" section (top 10 by views)
2. "Most Helpful" section shows articles with highest thumbs-up ratio
3. "Least Helpful" section shows articles with low ratings (need improvement)
4. Article creation timeline chart (articles published per week/month)
5. Category breakdown chart (articles by category)
6. Export KB analytics to CSV

## Story 4.8: KB Article Suggestions During Resolution

**As an** agent,
**I want** AI to suggest relevant KB articles while resolving pings,
**so that** I can reference existing solutions and respond faster.

**Acceptance Criteria:**

1. Echo panel shows "Related KB Articles" section below response suggestions
2. AI searches KB for articles matching ping content using semantic search (embeddings)
3. Top 3 most relevant published articles displayed with title and preview snippet
4. Clicking article opens in modal overlay with full content
5. "Insert Link" button adds KB article reference to agent's response
6. "No relevant articles found" message if KB empty or no matches above similarity threshold
7. KB suggestions refresh when ping conversation is updated with new messages
8. Only published articles shown (not drafts)

---
