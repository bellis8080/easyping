# API Specification

EasyPing uses a hybrid API approach:
- **Supabase PostgREST** for standard CRUD operations (auto-generated from database schema)
- **Next.js API Routes** for custom logic (AI, webhooks, complex queries)

## Supabase PostgREST Endpoints

Automatically generated REST API for all database tables. Accessed via Supabase JavaScript client.

**Base URL:** `https://<project-ref>.supabase.co/rest/v1`

**Authentication:** JWT tokens in `Authorization: Bearer <token>` header

**Example Requests:**

```typescript
// Get all pings for current user
const { data: pings } = await supabase
  .from('pings')
  .select('*, created_by(*), assigned_to(*)')
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false });

// Create new ping
const { data: ping } = await supabase
  .from('pings')
  .insert({
    tenant_id: tenantId,
    created_by: userId,
    title: 'Issue with login',
    status: 'new',
    priority: 'normal',
  })
  .select()
  .single();

// Update ping status
const { data: updated } = await supabase
  .from('pings')
  .update({ status: 'resolved', resolved_at: new Date().toISOString() })
  .eq('id', pingId)
  .select()
  .single();
```

## Next.js API Routes

Custom endpoints for AI operations, webhooks, and complex business logic.

**Base URL:** `https://<domain>/api`

### POST /api/pings

Create a new ping with AI categorization.

**Request:**
```json
{
  "message": "My laptop won't connect to WiFi",
  "attachments": ["file1.png"]
}
```

**Response:**
```json
{
  "ping": {
    "id": "uuid",
    "ping_number": 123,
    "title": "WiFi connection issue",
    "status": "new",
    "category_id": "uuid",
    "created_at": "2025-01-21T10:00:00Z"
  }
}
```

### POST /api/ai/categorize

Categorize a message using AI.

**Request:**
```json
{
  "message": "My laptop won't connect to WiFi"
}
```

**Response:**
```json
{
  "category_id": "uuid",
  "confidence": 0.92,
  "reasoning": "Message mentions network connectivity issue"
}
```

### POST /api/ai/summarize

Generate ping summary.

**Request:**
```json
{
  "ping_id": "uuid"
}
```

**Response:**
```json
{
  "summary": "User reports WiFi connection issues on laptop. Agent diagnosed as driver problem and provided solution. Issue resolved."
}
```

### POST /api/ai/suggest

Get AI response suggestion for agent.

**Request:**
```json
{
  "ping_id": "uuid"
}
```

**Response:**
```json
{
  "suggestion": "Have you tried updating your WiFi drivers? Here's a KB article that might help: [link]"
}
```

### POST /api/kb/search

Semantic search knowledge base.

**Request:**
```json
{
  "query": "WiFi connection problem",
  "limit": 5
}
```

**Response:**
```json
{
  "articles": [
    {
      "id": "uuid",
      "title": "How to Fix WiFi Connection Issues",
      "slug": "fix-wifi-issues",
      "similarity": 0.89,
      "excerpt": "If you're having trouble connecting to WiFi..."
    }
  ]
}
```

### POST /api/webhooks/plugin/:pluginId

Plugin webhook handler for event notifications.

**Request:**
```json
{
  "event": "ping.created",
  "data": {
    "ping_id": "uuid",
    "tenant_id": "uuid"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Plugin notified"
}
```

### GET /api/health

Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-21T10:00:00Z",
  "services": {
    "database": "connected",
    "auth": "operational",
    "storage": "operational"
  }
}
```

## Rate Limiting

All API routes protected with rate limiting middleware:

```typescript
// apps/web/src/middleware.ts

import { rateLimit } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  // Rate limit: 100 requests per minute per IP
  const identifier = request.ip || 'anonymous';
  const result = await rateLimit.check(identifier, 100, '1m');

  if (!result.success) {
    return new NextResponse('Too many requests', { status: 429 });
  }

  return NextResponse.next();
}
```

## Error Response Format

Consistent error format across all endpoints:

```typescript
interface APIError {
  error: {
    code: string; // e.g., "UNAUTHORIZED", "VALIDATION_ERROR"
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    request_id: string;
  };
}
```

**Example Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Ping message cannot be empty",
    "details": {
      "field": "message",
      "constraint": "minLength"
    },
    "timestamp": "2025-01-21T10:00:00Z",
    "request_id": "req_abc123"
  }
}
```

---
