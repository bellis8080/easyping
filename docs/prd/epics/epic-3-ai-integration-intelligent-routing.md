# Epic 3: AI Integration & Intelligent Routing

**Goal:** Transform EasyPing from basic ticketing to AI-native support desk. Integrate multiple AI providers (OpenAI, Anthropic, Azure) with bring-your-own-key model, automatically categorize and route incoming tickets, generate AI summaries pinned at top of threads, and provide agent copilot with suggested responses. This epic delivers the core AI value proposition that differentiates EasyPing from traditional help desks.

## Story 3.1: AI Provider Abstraction Layer

**As a** developer,
**I want** an abstraction layer supporting multiple AI providers,
**so that** users can choose their preferred provider and we can swap models easily.

**Acceptance Criteria:**

1. AI provider interface defined in `packages/ai` with methods: `categorize()`, `summarize()`, `suggestResponse()`, `generateEmbedding()`
2. OpenAI provider implementation (GPT-3.5-turbo, GPT-4)
3. Anthropic provider implementation (Claude 3.5 Sonnet, Claude 3 Haiku)
4. Azure OpenAI provider implementation
5. Provider configuration stored in database (encrypted API keys, model selection)
6. Graceful fallback when AI unavailable (error logged, feature disabled temporarily)
7. Provider selection configurable per organization in settings
8. Unit tests with mocked API responses (90%+ coverage)

## Story 3.2: AI Provider Configuration UI

**As an** organization owner,
**I want** to configure my AI provider API keys and model preferences,
**so that** AI features work with my own API account.

**Acceptance Criteria:**

1. Settings page includes "AI Configuration" section
2. Form to input API key for OpenAI, Anthropic, or Azure OpenAI
3. Provider selection dropdown (OpenAI, Anthropic, Azure)
4. Model selection dropdown (GPT-3.5-turbo, GPT-4, Claude 3.5 Sonnet, etc.)
5. "Test Connection" button validates API key and shows success/error message
6. API keys encrypted before storing in database
7. Option to disable AI features if no key configured
8. Warning shown when AI credits low (if provider API returns usage info)
9. **Enhanced AI provider error handling and rate limiting:**
   - **Rate limit detection:** When provider returns 429 (rate limit exceeded), show user-friendly error: "AI provider rate limit reached. Try again in X minutes"
   - **Automatic retry with exponential backoff:** Failed AI calls retry 3 times with delays (1s, 2s, 4s) before failing
   - **Fallback queue:** When rate limited, queue AI requests (max 100) and process when limits reset
   - **Cost estimation dashboard:** Display estimated monthly costs based on current usage (tickets/day × avg tokens/ticket × provider pricing)
   - **Usage alerts:** Email owner when approaching configured spending threshold (default: $50/month)
   - **Rate limit configuration:** Allow owner to set max AI calls per hour/day to control costs
   - **Graceful degradation modes:**
     - **Mode 1:** AI temporarily unavailable → disable auto-categorization, agents categorize manually
     - **Mode 2:** Embedding API down → KB search falls back to full-text search (PostgreSQL tsvector)
     - **Mode 3:** Summarization fails → show first message as ticket summary
   - **Error logging:** All AI failures logged with provider response, request context, and retry count
   - **Provider status page:** Settings shows last 24h AI success rate (e.g., "98.5% successful, 3 rate limit errors")
10. **Multi-provider failover (optional):**
    - Allow configuring backup AI provider (e.g., OpenAI primary, Anthropic backup)
    - Automatically switch to backup when primary fails >5 times in 10 minutes
    - Admin notification when failover triggered

## Story 3.3: Auto-Categorization of Tickets with Conversational Clarification

**As an** agent,
**I want** tickets automatically categorized (Hardware, Software, Network, Access Request, etc.) with sufficient detail,
**so that** I can quickly understand ticket type and route appropriately without requesting additional information.

**Acceptance Criteria:**

1. Default categories created on setup: Hardware, Software, Network, Access Request, Password Reset, Other, Needs Review
2. **During ticket creation flow, AI analyzes user message for clarity and category confidence BEFORE creating ticket**
3. **If confidence low (<70%) or message lacks detail, AI engages in conversational clarification:**
   - AI asks 1-3 targeted questions specific to suspected category (e.g., "Are you unable to send or receive emails?" for potential Email/Software issue)
   - AI maintains conversation context across clarifying questions
   - User responses analyzed to improve categorization confidence
   - Maximum 3 clarification rounds before ticket creation
   - If AI analysis times out (>5s), create ticket with category "Needs Review"
4. **Once sufficient information gathered (confidence ≥70%), AI assigns category and creates ticket**
5. Category determination (including clarification) completes within 10 seconds total
6. **AI generates problem statement summary from conversation and pins it to top of ticket**
7. Category displayed as badge in ticket list and ticket detail view
8. Agents can manually override AI category selection (dropdown in toolbar showing all active categories)
9. System message created when category assigned: "AI categorized as: Software" (with confidence %, e.g., "AI categorized as: Software (92% confidence)")
10. **If user abandons clarification (no response for 2 questions), ticket created with category "Needs Clarification"**
11. **All conversation messages (user + AI clarifications) stored as initial ticket thread entries**
12. Category statistics shown in analytics dashboard (coming in Epic 5)

## Story 3.4: Category Management

**As a** manager or owner,
**I want** to add, edit, and delete ticket categories,
**so that** I can customize categories to match my organization's support structure.

**Acceptance Criteria:**

1. Settings page includes "Categories" section (manager/owner only)
2. Categories list shows: Category name, color (for badge), ticket count, active/archived status
3. "Add Category" button opens form: Name (required), Description (optional), Color picker, Icon (optional)
4. Manager can edit existing category name, description, color, and icon
5. Manager can archive category (soft-delete) - tickets keep category, but not available for new tickets
6. Cannot delete category if tickets currently use it (must archive instead)
7. "Other" category is system-reserved and cannot be deleted (can be renamed)
8. Category changes immediately reflected in ticket creation, routing rules, and analytics
9. Maximum 50 active categories per organization (prevent overwhelming dropdown)
10. Categories sortable via drag-and-drop to control display order

## Story 3.5: Automatic Ticket Routing

**As a** manager,
**I want** tickets automatically routed to appropriate agent queues based on category,
**so that** specialized agents receive relevant tickets.

**Acceptance Criteria:**

1. Routing rules configurable in settings: Map categories to agent queues or specific agents
2. Example rule: "Hardware → Hardware Team queue", "Password Reset → assign to Agent Bob"
3. When ticket categorized, routing rule applied automatically
4. Ticket assigned to queue or agent based on rule (if rule exists)
5. System message created: "Auto-routed to Hardware Team"
6. If no routing rule matches, ticket remains unassigned
7. Managers can edit routing rules via settings UI (add/remove/reorder rules)

## Story 3.6: AI-Pinned Ticket Summaries

**As an** agent,
**I want** an AI-generated summary pinned at top of ticket threads,
**so that** I can quickly understand issue context without reading entire conversation.

**Acceptance Criteria:**

1. Summary section pinned at top of ticket detail view (above conversation thread)
2. Summary includes: Issue description (2-3 sentences), key details extracted, current status, next steps
3. Summary generated when ticket has 3+ messages in thread
4. Summary re-generated when significant updates occur (status change, new info added)
5. "Refresh Summary" button allows manual regeneration
6. Summary shown in collapsible card (can minimize to save space)
7. Loading state shown while AI generates summary
8. Fallback message if AI unavailable: "Summary unavailable"

## Story 3.7: Agent Copilot - Response Suggestions

**As an** agent,
**I want** AI to suggest response drafts while composing replies,
**so that** I can respond faster and more consistently.

**Acceptance Criteria:**

1. When agent focuses on message input box, AI analyzes ticket context
2. Suggested response appears as "ghost text" (light gray, italic) in input box or side panel
3. Agent can press Tab or click "Use Suggestion" to accept AI draft
4. Agent can edit AI suggestion before sending
5. "Generate Another" button requests alternative suggestion
6. Suggestions based on ticket history, category, and KB articles
7. Suggestions appear within 2 seconds of focusing input
8. Agent can disable copilot in personal settings if preferred

## Story 3.8: KB Article Suggestions During Resolution

**As an** agent,
**I want** AI to suggest relevant KB articles while resolving tickets,
**so that** I can reference existing solutions quickly.

**Acceptance Criteria:**

1. Side panel in ticket detail view shows "Related Articles" section
2. AI searches KB for articles matching ticket content (semantic search using embeddings)
3. Top 3 most relevant articles displayed with title and preview
4. Clicking article opens in modal or new tab
5. Agent can insert KB article link into response with one click
6. "No relevant articles found" message if KB empty or no matches
7. KB suggestions refresh when ticket content changes significantly

---
