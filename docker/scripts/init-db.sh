#!/bin/bash
# Database initialization script
# Waits for PostgreSQL to be ready, then creates required roles and schemas

set -e

echo "Waiting for PostgreSQL to be ready..."
until docker exec easyping-postgres pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
done

echo "PostgreSQL is ready!"

# Check if roles already exist
if docker exec easyping-postgres psql -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='anon'" | grep -q 1; then
  echo "Database already initialized, skipping..."
  exit 0
fi

echo "Initializing database with Supabase roles and schemas..."

docker exec -i easyping-postgres psql -U postgres <<'EOF'
-- Create required schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS _realtime;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS extensions;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Create roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin NOLOGIN NOINHERIT CREATEROLE CREATEDB;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    CREATE ROLE supabase_storage_admin NOLOGIN NOINHERIT CREATEROLE;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_realtime_admin') THEN
    CREATE ROLE supabase_realtime_admin NOLOGIN NOINHERIT CREATEROLE;
  END IF;
END
$$;

-- Grant roles to postgres
GRANT anon TO postgres;
GRANT authenticated TO postgres;
GRANT service_role TO postgres;
GRANT supabase_auth_admin TO postgres;
GRANT supabase_storage_admin TO postgres;
GRANT supabase_realtime_admin TO postgres;

-- Grant usage and create on schemas
GRANT USAGE ON SCHEMA auth TO postgres, supabase_auth_admin;
GRANT CREATE ON SCHEMA auth TO postgres, supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO postgres, supabase_auth_admin;

GRANT USAGE ON SCHEMA storage TO postgres, supabase_storage_admin;
GRANT CREATE ON SCHEMA storage TO postgres, supabase_storage_admin;
GRANT ALL ON SCHEMA storage TO postgres, supabase_storage_admin;

GRANT USAGE ON SCHEMA _realtime TO postgres, supabase_realtime_admin;
GRANT CREATE ON SCHEMA _realtime TO postgres, supabase_realtime_admin;
GRANT ALL ON SCHEMA _realtime TO postgres, supabase_realtime_admin;

GRANT USAGE ON SCHEMA realtime TO postgres, supabase_realtime_admin;
GRANT CREATE ON SCHEMA realtime TO postgres, supabase_realtime_admin;
GRANT ALL ON SCHEMA realtime TO postgres, supabase_realtime_admin;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO postgres, supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO postgres, supabase_storage_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA _realtime GRANT ALL ON TABLES TO postgres, supabase_realtime_admin;
EOF

echo "Database initialization complete!"
