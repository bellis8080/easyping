# Contributing to EasyPing

Thank you for your interest in contributing to EasyPing! We welcome contributions from the community and are excited to work with you.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Pull Request Process](#pull-request-process)
6. [Code Review Guidelines](#code-review-guidelines)
7. [Testing Requirements](#testing-requirements)
8. [Technical Debt Management](#technical-debt-management)
9. [Commit Message Conventions](#commit-message-conventions)
10. [Definition of Done](#definition-of-done)
11. [Communication Channels](#communication-channels)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors. We expect all participants to:

- Be respectful and considerate in communication
- Accept constructive criticism gracefully
- Focus on what is best for the community and project
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or offensive language
- Personal attacks or trolling
- Publishing private information without permission
- Any conduct that would be inappropriate in a professional setting

**Reporting:** If you experience or witness unacceptable behavior, please contact the maintainers at [conduct@easyping.me].

---

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm 8+
- Docker and Docker Compose
- Supabase CLI
- Git 2.30+

### Initial Setup

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/easyping.git
cd easyping

# Add upstream remote
git remote add upstream https://github.com/easyping/easyping.git

# Install dependencies
pnpm install

# Start Supabase locally
supabase start

# Copy environment variables
cp .env.example .env.local

# Generate TypeScript types
pnpm db:types

# Start development server
pnpm dev
```

**Access the app:** http://localhost:3000

### Keeping Your Fork Updated

```bash
# Fetch latest changes from upstream
git fetch upstream

# Merge upstream main into your local main
git checkout main
git merge upstream/main

# Push to your fork
git push origin main
```

---

## Development Workflow

### 1. Create a Feature Branch

```bash
# Always branch from main
git checkout main
git pull upstream main

# Create feature branch (use descriptive name)
git checkout -b feature/add-ticket-search
# or
git checkout -b fix/auth-session-bug
```

**Branch Naming Conventions:**
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/updates
- `chore/description` - Maintenance tasks

### 2. Make Changes

- Write code following our [Coding Standards](#coding-standards)
- Add/update tests for your changes
- Update documentation if needed
- Test locally to ensure nothing breaks

### 3. Commit Your Changes

```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat(tickets): add semantic search to ticket list"
```

See [Commit Message Conventions](#commit-message-conventions) for details.

### 4. Push to Your Fork

```bash
git push origin feature/add-ticket-search
```

### 5. Open Pull Request

1. Navigate to your fork on GitHub
2. Click "Compare & pull request"
3. Fill out PR template (see [Pull Request Process](#pull-request-process))
4. Submit PR for review

---

## Coding Standards

### TypeScript

**Strict Mode Enforced:**
```typescript
// ✅ Good - Explicit types
function createTicket(title: string, userId: string): Ticket {
  return { id: uuid(), title, created_by: userId };
}

// ❌ Bad - Implicit any
function createTicket(title, userId) {
  return { id: uuid(), title, created_by: userId };
}
```

**No `any` Without Justification:**
```typescript
// ✅ Good - Use unknown and type guard
function parseJSON(input: string): unknown {
  return JSON.parse(input);
}

// ❌ Bad - Unnecessary any
function parseJSON(input: string): any {
  return JSON.parse(input);
}
```

**Prefer Const and Immutability:**
```typescript
// ✅ Good
const tickets = [...existingTickets, newTicket];

// ❌ Bad
let tickets = existingTickets;
tickets.push(newTicket);
```

### React Components

**Functional Components with TypeScript:**
```tsx
// ✅ Good - Typed props interface
interface TicketCardProps {
  ticket: Ticket;
  onStatusChange: (ticketId: string, status: TicketStatus) => void;
}

export function TicketCard({ ticket, onStatusChange }: TicketCardProps) {
  return <div>...</div>;
}

// ❌ Bad - No prop types
export function TicketCard({ ticket, onStatusChange }) {
  return <div>...</div>;
}
```

**Component Naming:**
- Components: `PascalCase` (e.g., `TicketList.tsx`)
- Utilities: `camelCase` (e.g., `formatDate.ts`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`)

### File Structure

**Co-locate Tests:**
```
src/
  components/
    TicketCard.tsx
    TicketCard.test.tsx  ✅ Test next to component
  utils/
    formatDate.ts
    formatDate.test.ts   ✅ Test next to utility
```

**Import Organization:**
```typescript
// 1. External libraries
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Internal packages
import { Ticket, TicketStatus } from '@easyping/types';
import { Button, Badge } from '@easyping/ui';

// 3. Relative imports
import { useTickets } from '@/hooks/use-tickets';
import { formatDate } from '@/lib/utils';
```

### Performance Optimization

**Image Optimization:**
```tsx
// ✅ Good - Use Next.js Image
import Image from 'next/image';

<Image
  src={avatar}
  alt="User avatar"
  width={48}
  height={48}
  quality={85}
/>

// ❌ Bad - Direct img tag
<img src={avatar} alt="User avatar" />
```

**Bundle Size Management:**
- Lazy load heavy components: `const Chart = lazy(() => import('./Chart'));`
- Tree-shake unused imports: Import only what you need
- Avoid large dependencies: Check bundle impact with `@next/bundle-analyzer`

**Performance Budgets (Enforced in CI):**
- Main bundle: <500KB gzipped
- Page load (TTI): <2 seconds on 4G
- API response (p95): <500ms database, <2s total

---

## Pull Request Process

### Before Opening PR

**Checklist:**
- [ ] Code follows coding standards
- [ ] Tests written and passing (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Documentation updated (if applicable)
- [ ] No merge conflicts with main branch
- [ ] Self-review completed

### PR Title Format

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): brief description

Examples:
feat(tickets): add semantic search to ticket list
fix(auth): resolve session expiration bug
docs(deployment): add DNS setup instructions
refactor(ai): extract provider factory to separate file
test(tickets): add e2e tests for ticket creation
chore(deps): upgrade Next.js to 14.1
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, no logic change)
- `refactor` - Code refactoring (no functionality change)
- `perf` - Performance improvements
- `test` - Test additions or updates
- `chore` - Maintenance tasks, dependency updates

**Scopes:**
- `tickets`, `auth`, `kb`, `ai`, `analytics`, `settings`, `deployment`, `docs`, etc.

### PR Description Template

```markdown
## Description
Brief explanation of what this PR does and why.

## Related Issue
Closes #123 (if applicable)

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing Performed
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

**Test Cases:**
1. Created ticket via chat interface
2. Verified AI categorization works
3. Checked realtime updates in ticket list

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Performance Impact
- Bundle size change: +5KB gzipped
- API response time: No change
- Database queries: Added index on tickets.created_at

## Technical Debt
- [ ] No technical debt introduced
- [ ] Technical debt documented in GitHub Issues (#456)

## Checklist
- [ ] Code follows project coding standards
- [ ] Self-review completed
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] No breaking changes (or migration guide provided)
```

---

## Code Review Guidelines

### For Authors

**Prepare for Review:**
1. **Self-review first:** Read your own code changes before requesting review
2. **Keep PRs focused:** One feature/fix per PR (max 400 lines changed)
3. **Provide context:** Explain the "why" in PR description
4. **Test thoroughly:** Don't rely on reviewers to catch bugs
5. **Update documentation:** Inline comments, README, API docs

**Respond to Feedback:**
- Respond to all comments (even if just "Done" or "Fixed")
- Push additional commits addressing feedback (don't force push)
- Be open to suggestions and alternative approaches
- Ask questions if feedback is unclear

### For Reviewers

**Review Requirements:**
- **Small PRs (<100 lines):** 1 reviewer approval required
- **Medium PRs (100-400 lines):** 1 reviewer approval required
- **Large PRs (>400 lines):** 2 reviewer approvals required
- **Breaking changes:** 2 reviewers + maintainer approval

**What to Review:**

**1. Correctness:**
- Logic is sound and meets requirements
- Edge cases handled
- Error handling implemented
- No security vulnerabilities

**2. Code Quality:**
- Follows coding standards
- Clear variable/function names
- Appropriate abstractions
- No code duplication
- Comments explain "why", not "what"

**3. Testing:**
- Unit tests cover new/changed code
- E2E tests for user-facing features
- Test cases are meaningful (not just coverage)

**4. Performance:**
- No unnecessary re-renders (React)
- Database queries optimized
- Large operations chunked/paginated
- Bundle size impact acceptable

**5. Documentation:**
- API endpoints documented (inline JSDoc)
- Complex logic explained in comments
- README updated if needed

**Review Etiquette:**
- Be kind and constructive
- Explain the "why" behind suggestions
- Offer alternatives, not just criticism
- Approve if minor nitpicks remain (author can fix before merge)
- Request changes if issues are significant

**Comment Tags:**
- `[nit]` - Minor nitpick, can be ignored
- `[question]` - Seeking clarification
- `[suggestion]` - Nice-to-have improvement
- `[blocking]` - Must be addressed before merge

### Example Review Comments

**✅ Good:**
```
[suggestion] Consider extracting this logic into a separate `validateTicketInput()` function for reusability and testing.

This would make it easier to test validation logic in isolation.
```

**❌ Bad:**
```
This is bad. Fix it.
```

---

## Testing Requirements

### Unit Tests (Vitest)

**Coverage Requirements:**
- New code: Minimum 70% coverage
- Critical paths (auth, payments): Minimum 90% coverage

**Run Tests:**
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run tests for specific package
pnpm test --filter @easyping/ai
```

**Test Naming:**
```typescript
// ✅ Good - Descriptive test names
describe('createTicket', () => {
  it('should create ticket with auto-incremented number', () => {
    // ...
  });

  it('should assign default category when AI categorization fails', () => {
    // ...
  });
});

// ❌ Bad - Vague test names
describe('createTicket', () => {
  it('works', () => {
    // ...
  });
});
```

### E2E Tests (Playwright)

**When to Write E2E Tests:**
- User-facing features (ticket creation, login, search)
- Critical workflows (signup → create ticket → agent responds)
- Complex interactions (drag-and-drop, file uploads)

**Run E2E Tests:**
```bash
# Run e2e tests
pnpm test:e2e

# Run e2e tests in headed mode (watch browser)
pnpm test:e2e --headed

# Run specific test file
pnpm test:e2e tests/e2e/tickets.spec.ts
```

**E2E Test Example:**
```typescript
test('user can create ticket and receive agent response', async ({ page }) => {
  // Login as user
  await page.goto('/login');
  await page.fill('[name="email"]', 'user@test.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Create ticket
  await page.click('text=Create Ping');
  await page.fill('[placeholder="Send a ping..."]', 'My laptop won\'t turn on');
  await page.press('[placeholder="Send a ping..."]', 'Enter');

  // Verify ticket created
  await expect(page.locator('text=PING-')).toBeVisible();

  // Agent responds (simulate in different context)
  // ...
});
```

---

## Technical Debt Management

### What is Technical Debt?

Technical debt refers to shortcuts, workarounds, or suboptimal solutions implemented to meet deadlines, with the understanding that they will be refactored later.

**Examples:**
- Hardcoded values that should be configurable
- Missing error handling
- Incomplete test coverage
- Performance optimizations deferred
- Commented-out code left for "reference"

### Documenting Technical Debt

**When introducing debt:**
1. Add inline comment with `TODO:` or `FIXME:` tag
2. Create GitHub issue with `tech-debt` label
3. Link issue in PR description

**Inline Comment Format:**
```typescript
// TODO(#456): Replace hardcoded categories with database query
// This is temporary until Story 3.4 (Category Management) is implemented
const DEFAULT_CATEGORIES = ['Hardware', 'Software', 'Network'];
```

**GitHub Issue Template (Tech Debt):**
```markdown
**Title:** [Tech Debt] Extract email template logic into separate package

**Labels:** `tech-debt`, `refactoring`

**Description:**
Email templates are currently hardcoded in API routes. This should be extracted into a separate `@easyping/emails` package for reusability and testing.

**Context:**
Introduced in PR #123 to meet Epic 1 deadline. Email functionality works but is not modular.

**Acceptance Criteria:**
- [ ] Create `packages/emails` with template components
- [ ] Migrate existing email templates to new package
- [ ] Add unit tests for email rendering
- [ ] Update API routes to use new package

**Estimated Effort:** 2-3 days

**Priority:** Medium (should fix in next sprint)

**Related PRs/Issues:** #123
```

### Technical Debt Review Process

**Monthly Review:**
- Product Owner and Tech Lead review all `tech-debt` issues
- Prioritize top 5 items for upcoming sprint
- Close stale/resolved issues

**Prioritization Criteria:**
- **High Priority:** Blocks new features, security risk, frequent pain point
- **Medium Priority:** Slows development, moderate tech risk
- **Low Priority:** Minor annoyance, future-proofing

**Debt Backlog Health:**
- Target: <20 open tech-debt issues
- Maximum: 50 open tech-debt issues (triggers mandatory debt sprint)

---

## Commit Message Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Example:**
```
feat(tickets): add semantic search to ticket list

Implements semantic search using pgvector embeddings to find similar
tickets based on content similarity. Replaces simple keyword search.

Closes #234
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Formatting, missing semicolons, etc.
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding/updating tests
- `chore` - Maintenance, dependency updates

### Scope

Optional, indicates area of change:
- `tickets`, `auth`, `kb`, `ai`, `analytics`, `settings`, `ui`, `db`, etc.

### Subject

- Use imperative mood: "add" not "added" or "adds"
- Don't capitalize first letter
- No period at the end
- Max 50 characters

### Body

- Explain the "why", not the "what"
- Wrap at 72 characters
- Include motivation and contrast with previous behavior

### Footer

- Reference issues: `Closes #123`, `Fixes #456`
- Note breaking changes: `BREAKING CHANGE: Auth API now requires email verification`

### Examples

**Simple commit:**
```
fix(auth): resolve session expiration bug
```

**With body:**
```
feat(kb): add automatic article generation from resolved tickets

When a ticket is marked as Resolved, AI analyzes the conversation
and generates a draft KB article with title, content, and category.
Agents can review and publish via KB editor.

Closes #345
```

**Breaking change:**
```
refactor(api)!: change ticket creation endpoint to accept structured data

BREAKING CHANGE: POST /api/tickets now requires JSON body with
{ title, content, category_id } instead of single message string.

Migration guide: https://docs.easyping.me/migration/v2

Closes #567
```

---

## Definition of Done

A story/task is considered "Done" when all criteria are met:

**Code:**
- [ ] Code follows coding standards
- [ ] Code reviewed and approved
- [ ] No linter warnings or errors
- [ ] TypeScript type checking passes

**Testing:**
- [ ] Unit tests written and passing (70%+ coverage)
- [ ] E2E tests written for user-facing features
- [ ] Manual testing completed for UI changes
- [ ] Accessibility tested (keyboard navigation, screen reader)

**Documentation:**
- [ ] API endpoints documented with inline JSDoc
- [ ] Complex logic explained in code comments
- [ ] README updated if user-facing changes
- [ ] Architecture doc updated if significant changes

**Performance:**
- [ ] Bundle size within budget (<500KB gzipped)
- [ ] No performance regressions (Lighthouse CI passing)
- [ ] Database queries optimized (indexes added if needed)

**Deployment:**
- [ ] Migrations tested (up and down)
- [ ] Environment variables documented in .env.example
- [ ] Docker build succeeds
- [ ] Deployment documentation updated if needed

**Quality:**
- [ ] No console errors or warnings
- [ ] Error handling implemented
- [ ] Loading states added for async operations
- [ ] Edge cases handled

**Review:**
- [ ] PR approved by required reviewers
- [ ] All review comments addressed
- [ ] CI/CD pipeline passing (tests, lint, build)

---

## Communication Channels

**GitHub:**
- **Issues:** Bug reports, feature requests
- **Discussions:** General questions, ideas, community help
- **Pull Requests:** Code contributions

**Discord:** [Join Server](https://discord.gg/easyping)
- `#general` - General discussion
- `#contributors` - Contributor coordination
- `#support` - Technical support

**Email:**
- General inquiries: hello@easyping.me
- Security issues: security@easyping.me
- Code of Conduct: conduct@easyping.me

**Office Hours:**
- Weekly community call: Wednesdays 5pm UTC
- Zoom link posted in Discord `#announcements`

---

## License

By contributing to EasyPing, you agree that your contributions will be licensed under the AGPLv3 license. See [LICENSE](LICENSE) file for details.

---

## Questions?

If you have questions about contributing, feel free to:
- Ask in GitHub Discussions
- Join Discord and ask in `#contributors`
- Reach out to maintainers directly

We appreciate your contributions! 🎉

---

**Last Updated:** 2025-01-22
