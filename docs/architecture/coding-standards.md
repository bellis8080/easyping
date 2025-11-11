# Coding Standards

This document outlines the coding standards and best practices for the EasyPing project.

## TypeScript Standards

### Strict Mode
- TypeScript strict mode is **required** across the entire codebase
- All tsconfig.json files must include `"strict": true`
- Additional strict flags enforced:
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `noImplicitReturns: true`
  - `noFallthroughCasesInSwitch: true`

### Type Safety
- **No `any` types** without explicit justification via `// @ts-expect-error` or `// @ts-ignore`
- When `any` is unavoidable, document why with a comment
- Prefer `unknown` over `any` when the type is truly unknown
- Use explicit return types for all exported functions

```typescript
// ❌ Bad
export function processPing(ping: any) {
  return ping.id;
}

// ✅ Good
export function processPing(ping: Ping): string {
  return ping.id;
}
```

### Interfaces vs Types
- **Prefer interfaces** for object shapes that may be extended
- Use **type aliases** for unions, intersections, and mapped types
- Use **type predicates** for type guards

```typescript
// ✅ Good - Interface for extensible objects
interface Ping {
  id: string;
  title: string;
  status: PingStatus;
}

// ✅ Good - Type for unions and complex types
type PingStatus = 'new' | 'in_progress' | 'resolved' | 'closed';
type Result<T> = Success<T> | Error;
```

## Naming Conventions

### Components
- **PascalCase** for React components
- File names match component names
- One component per file

```
PingCard.tsx
UserProfile.tsx
DashboardLayout.tsx
```

### Utilities and Functions
- **camelCase** for utility functions
- Use descriptive, verb-based names

```
formatDate.ts
parsePingId.ts
validateUserInput.ts
```

### Constants
- **UPPER_SNAKE_CASE** for true constants
- Group related constants in dedicated files

```typescript
// constants/api.ts
export const MAX_FILE_SIZE = 10_485_760; // 10MB
export const API_TIMEOUT = 30_000; // 30s
export const DEFAULT_PAGE_SIZE = 20;
```

### Types and Interfaces
- **PascalCase** for types and interfaces
- Avoid prefixing with `I` or `T`

```typescript
type UserRole = 'admin' | 'agent' | 'user';
interface Ping { /* ... */ }
interface PingCreateInput { /* ... */ }
```

### Boolean Variables
- Prefix with `is`, `has`, `should`, or `can`

```typescript
const isLoading = true;
const hasPermission = checkPermission();
const shouldRedirect = user.isNewUser;
const canEdit = user.role === 'admin';
```

## File Structure

### Co-location
- Place test files next to implementation files
- Place component-specific styles next to components

```
components/
  PingCard/
    PingCard.tsx
    PingCard.test.tsx
    PingCard.module.css (if needed)
  UserProfile/
    UserProfile.tsx
    UserProfile.test.tsx
```

### One Component Per File
- Each file should export one primary component
- Helper components used only by the primary component can be in the same file
- Shared helper components should be extracted to separate files

### Index Files
- Use `index.ts` for barrel exports only
- Don't add logic to index files

```typescript
// components/index.ts
export { PingCard } from './PingCard';
export { UserProfile } from './UserProfile';
export { DashboardLayout } from './DashboardLayout';
```

## Import Organization

Organize imports in the following order, with blank lines between groups:

```typescript
// 1. External libraries (React, Next.js, third-party)
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { z } from 'zod';

// 2. Internal packages (@easyping/*)
import { Ping, UserRole } from '@easyping/types';
import { createSupabaseClient } from '@easyping/database';

// 3. Relative imports (components, utils, etc.)
import { PingCard } from '@/components/PingCard';
import { formatDate } from '@/lib/utils';
import { usePings } from '@/hooks/usePings';

// 4. Styles
import styles from './PingList.module.css';
```

## Code Style

### Function Declaration
- Prefer `function` declarations for top-level functions
- Use arrow functions for callbacks and inline functions
- Always use explicit return types for exported functions

```typescript
// ✅ Good - Top-level function
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Good - Arrow function for callbacks
const doubledPrices = items.map((item) => item.price * 2);
```

### Async/Await
- Prefer `async/await` over `.then()` chains
- Always handle errors with try/catch

```typescript
// ✅ Good
export async function fetchPing(id: string): Promise<Ping> {
  try {
    const response = await fetch(`/api/pings/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ping: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching ping:', error);
    throw error;
  }
}
```

### Error Handling
- Use typed errors when possible
- Always log errors with context
- Provide user-friendly error messages

```typescript
class PingNotFoundError extends Error {
  constructor(pingId: string) {
    super(`Ping not found: ${pingId}`);
    this.name = 'PingNotFoundError';
  }
}
```

### Comments
- Write self-documenting code first
- Add comments for complex logic or business rules
- Use JSDoc for public APIs and exported functions
- Avoid obvious comments

```typescript
/**
 * Calculates the SLA deadline for a ping based on priority and creation time.
 *
 * @param ping - The ping to calculate the deadline for
 * @returns ISO 8601 timestamp of the SLA deadline
 */
export function calculateSLADeadline(ping: Ping): string {
  // High priority pings have 4-hour SLA, normal have 24-hour
  const hoursToAdd = ping.priority === 'high' ? 4 : 24;
  return addHours(ping.createdAt, hoursToAdd).toISOString();
}
```

## React Best Practices

### Component Structure
```typescript
// 1. Imports
import { useState } from 'react';

// 2. Types
interface PingCardProps {
  ping: Ping;
  onUpdate: (ping: Ping) => void;
}

// 3. Component
export function PingCard({ ping, onUpdate }: PingCardProps) {
  // 3a. Hooks
  const [isEditing, setIsEditing] = useState(false);

  // 3b. Event handlers
  const handleEdit = () => {
    setIsEditing(true);
  };

  // 3c. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### Hooks
- Always use hooks at the top level
- Name custom hooks with `use` prefix
- Extract complex logic into custom hooks

```typescript
// ✅ Good - Custom hook
export function usePings(filters: PingFilters) {
  const [pings, setPings] = useState<Ping[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch logic
  }, [filters]);

  return { pings, isLoading };
}
```

### Props
- Use destructuring in function parameters
- Provide explicit types for props
- Avoid prop drilling - use context or state management

## Anti-Patterns to Avoid

### ❌ Don't
- Use `any` type without justification
- Mutate props or state directly
- Use `var` (use `const` or `let`)
- Mix default and named exports in the same file
- Use `==` instead of `===`
- Commit commented-out code
- Ignore TypeScript errors
- Use `// @ts-ignore` without a comment explaining why

### ✅ Do
- Use type-safe code everywhere
- Immutable data patterns
- Use `const` by default, `let` when reassignment needed
- Consistent export style (prefer named exports)
- Use strict equality (`===`)
- Delete unused code
- Fix TypeScript errors properly
- Document any necessary type assertions

## ESLint Rules

The following ESLint rules are enforced across the codebase:

```javascript
{
  "no-unused-vars": "off", // Using TypeScript version
  "@typescript-eslint/no-unused-vars": "error",
  "prefer-const": "error",
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/explicit-function-return-type": "off",
  "@typescript-eslint/no-non-null-assertion": "warn"
}
```

## Performance Guidelines

### Bundle Size
- Keep bundle size under 500KB gzipped
- Use dynamic imports for large dependencies
- Tree-shake unused code

```typescript
// ✅ Good - Dynamic import
const HeavyComponent = dynamic(() => import('./HeavyComponent'));
```

### Optimization
- Use React.memo() for expensive components
- Avoid inline object/array creation in render
- Use useMemo() and useCallback() appropriately (but don't over-optimize)

## Related Documentation

- [Contributing Guidelines](../../CONTRIBUTING.md)
- [Architecture Overview](../../CLAUDE.md)
- [API Documentation](./api-standards.md) (TBD)
