#!/bin/bash
# Migration runner script for EasyPing Docker deployment
# Runs all SQL files from supabase/migrations/ in filename order
# Tracks applied migrations in a _migrations table to be idempotent

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"
CONTAINER="easyping-postgres"
DB_USER="postgres"

# ---------------------------------------------------------------------------
# Wait for Postgres to be ready
# ---------------------------------------------------------------------------
echo "Migration runner: waiting for PostgreSQL to be ready..."
until docker exec "$CONTAINER" pg_isready -U "$DB_USER" > /dev/null 2>&1; do
  sleep 1
done
echo "Migration runner: PostgreSQL is ready."

# ---------------------------------------------------------------------------
# Ensure the migration tracking table exists
# ---------------------------------------------------------------------------
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres <<'EOF'
CREATE TABLE IF NOT EXISTS public._migrations (
  id          SERIAL PRIMARY KEY,
  filename    TEXT NOT NULL UNIQUE,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
EOF

# ---------------------------------------------------------------------------
# Run each migration file in sorted (filename) order
# ---------------------------------------------------------------------------
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Migration runner: migrations directory not found at $MIGRATIONS_DIR — skipping."
  exit 0
fi

MIGRATIONS=$(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort)

if [ -z "$MIGRATIONS" ]; then
  echo "Migration runner: no .sql files found in $MIGRATIONS_DIR — skipping."
  exit 0
fi

APPLIED=0
SKIPPED=0
FAILED=0

for MIGRATION_PATH in $MIGRATIONS; do
  FILENAME=$(basename "$MIGRATION_PATH")

  # Check if this migration has already been applied
  ALREADY_APPLIED=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -tAc \
    "SELECT 1 FROM public._migrations WHERE filename = '$FILENAME' LIMIT 1;" 2>/dev/null || true)

  if [ "$ALREADY_APPLIED" = "1" ]; then
    echo "  [skip] $FILENAME"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo "  [run]  $FILENAME"

  # Run the migration inside a transaction so a failure is cleanly rolled back
  if docker exec -i "$CONTAINER" psql -U "$DB_USER" -d postgres \
      -v ON_ERROR_STOP=1 \
      --single-transaction \
      < "$MIGRATION_PATH"; then

    # Record success
    docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c \
      "INSERT INTO public._migrations (filename) VALUES ('$FILENAME');" > /dev/null

    APPLIED=$((APPLIED + 1))
  else
    echo ""
    echo "ERROR: Migration failed: $FILENAME"
    echo "       Fix the issue and re-run start.sh (already-applied migrations will be skipped)."
    FAILED=$((FAILED + 1))
    exit 1
  fi
done

echo ""
echo "Migration runner complete: $APPLIED applied, $SKIPPED skipped, $FAILED failed."
