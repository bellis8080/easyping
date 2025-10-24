# @easyping/database

Supabase database migrations, schemas, and RLS policies.

## Project Configuration

- **Project ID**: `pingdb` (configured in `supabase/config.toml`)
- **Docker Container**: `supabase_db_pingdb` (named "PingDB")
- **Local Ports**: Supabase services run on 54xxx series (54321-54324)
- **Web App Port**: Next.js dev server runs on port 4000

## Structure

- `migrations/` - SQL migration files
- `seed/` - Seed data for development
- `supabase/` - Supabase project configuration

## Usage

Migrations are managed via Supabase CLI.

## Connection Pooling Configuration

The Supabase database uses PgBouncer for connection pooling to optimize database performance.

**Current Settings** (configured in `supabase/config.toml`):
- **Pool Mode**: `transaction` - Connections are released back to the pool after each transaction
- **Default Pool Size**: `15` - Number of server connections per user/database pair
- **Max Client Connections**: `100` - Maximum concurrent client connections allowed

**For Production:**
When deploying to Supabase Cloud, connection pooling is handled automatically. The recommended settings are:
- Use **Transaction mode** for most web applications
- Use **Session mode** only if you need prepared statements or other session-level features
- Monitor your connection usage in Supabase Dashboard under Database → Connection Pooling

**Testing Connection Pooling:**
```bash
# Start Supabase with pooling enabled
pnpm supabase:start

# Monitor active connections
docker exec supabase_db_pingdb psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

## Migration Workflow

### Development Workflow

**From root directory:**

1. **Start Supabase** (starts all services including Postgres, Studio, etc.):
   ```bash
   pnpm supabase:start
   ```

2. **Create a new migration**:
   ```bash
   cd packages/database
   npx supabase migration new migration_name
   # Edit the generated file in supabase/migrations/
   ```

3. **Apply migrations** (reset database with migrations and seed data):
   ```bash
   pnpm db:reset
   ```

4. **Generate TypeScript types** (after schema changes):
   ```bash
   pnpm db:types
   ```

5. **Stop Supabase** (when done):
   ```bash
   pnpm supabase:stop
   ```

### Available Commands

| Command | Description |
|---------|-------------|
| `pnpm supabase:start` | Start local Supabase stack (PostgreSQL, Studio, Auth, Storage, etc.) |
| `pnpm supabase:stop` | Stop all Supabase services |
| `pnpm db:reset` | Reset database: drop all data, run migrations, run seed script |
| `pnpm db:migrate` | Push migrations to remote Supabase project (production) |
| `pnpm db:types` | Generate TypeScript types from database schema |
| `pnpm db:seed` | Alias for `db:reset` - resets database with seed data |

### Migration Best Practices

1. **Always create migrations for schema changes** - Never modify tables directly
2. **Test migrations locally first** - Use `pnpm db:reset` to test before pushing
3. **Keep migrations small and focused** - One logical change per migration
4. **Never edit existing migrations** - Create new migrations to fix issues
5. **Regenerate types after schema changes** - Run `pnpm db:types` after migrations
