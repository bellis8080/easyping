-- Create application tables for EasyPing
-- This script runs after 00-init-schemas.sql

-- Create tenant context function
CREATE OR REPLACE FUNCTION public.set_tenant_context(tenant_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  PERFORM set_config('app.tenant_id', tenant_uuid::TEXT, false);
END;
$function$;

-- Grant execute permission to roles
GRANT EXECUTE ON FUNCTION public.set_tenant_context(uuid) TO anon, authenticated, service_role;

-- Create organizations table
CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    domain text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT organizations_name_not_empty CHECK ((length(TRIM(BOTH FROM name)) > 0))
);

ALTER TABLE public.organizations OWNER TO postgres;

-- Create users table
CREATE TABLE public.users (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    avatar_url text,
    role text DEFAULT 'end_user'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone,
    CONSTRAINT users_email_valid CHECK ((email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT users_role_valid CHECK ((role = ANY (ARRAY['end_user'::text, 'agent'::text, 'manager'::text, 'owner'::text])))
);

ALTER TABLE public.users OWNER TO postgres;

-- Add primary keys
ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- Add foreign key constraints
-- Note: auth.users table doesn't exist yet during init (created by GoTrue at runtime)
-- We can't enforce FK to auth.users during initialization, app logic will maintain this relationship
-- ALTER TABLE ONLY public.users
--     ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX idx_organizations_domain ON public.organizations USING btree (domain) WHERE (domain IS NOT NULL);
CREATE INDEX idx_users_email ON public.users USING btree (tenant_id, email);
CREATE INDEX idx_users_role ON public.users USING btree (tenant_id, role) WHERE (role = ANY (ARRAY['agent'::text, 'manager'::text, 'owner'::text]));
CREATE INDEX idx_users_tenant_id ON public.users USING btree (tenant_id);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organizations
CREATE POLICY organizations_select_policy ON public.organizations FOR SELECT TO authenticated USING (true);

-- Create RLS policies for users
CREATE POLICY users_delete_own_org ON public.users FOR DELETE TO authenticated USING ((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid));
CREATE POLICY users_insert_own_org ON public.users FOR INSERT TO authenticated WITH CHECK ((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid));
CREATE POLICY users_select_own_org ON public.users FOR SELECT TO authenticated USING ((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid));
CREATE POLICY users_update_own_org ON public.users FOR UPDATE TO authenticated USING ((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)) WITH CHECK ((tenant_id = (current_setting('app.tenant_id'::text, true))::uuid));

-- Grant permissions
GRANT ALL ON TABLE public.organizations TO anon;
GRANT ALL ON TABLE public.organizations TO authenticated;
GRANT ALL ON TABLE public.organizations TO service_role;

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;

-- Insert default organization (from Story 1.2)
INSERT INTO public.organizations (id, name, domain, settings)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Default Organization', NULL, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
