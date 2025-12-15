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

## Story 4.2: Auto-Generate KB Articles from Resolved Tickets

**As an** agent,
**I want** resolved tickets to automatically generate KB article drafts,
**so that** I can capture solutions without manual writing.

**Acceptance Criteria:**

1. When ticket marked Resolved, AI analyzes conversation thread
2. AI generates KB article draft with: title (issue summary), content (solution steps), category (matches ticket category)
3. Draft saved to database with status=draft, source_ticket_id linked
4. Agent receives notification: "KB article draft created from Ping #123"
5. Draft not visible to end users (only agents see drafts)
6. AI extracts key information: problem statement, solution steps, prerequisites, related issues
7. Article generation takes <5 seconds

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
