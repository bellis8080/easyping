-- Initialize Supabase schemas and roles for Docker deployment
-- This script runs once when the database is first created

-- Create required schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS _realtime;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS extensions;

-- Create roles if they don't exist
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

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin NOLOGIN NOINHERIT CREATEROLE CREATEDB;
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
GRANT supabase_admin TO postgres;

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

-- Grant usage on public schema to all roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Set default privileges for public schema tables
-- When postgres creates tables in public schema, grant permissions automatically
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

-- Set default privileges for sequences
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO service_role, authenticated;

-- Grant execute on functions to appropriate roles
-- (Note: set_tenant_context is created in a separate migration)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

-- Enable pgcrypto extension for encryption (Story 1.6)
-- NOTE: Skipping pgcrypto here due to Supabase image restrictions
-- Will be created in 01-create-tables.sql after roles are fully configured
