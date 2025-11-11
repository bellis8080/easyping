-- Enable Row Level Security on tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create helper function to set tenant context
-- This will be called by the application middleware to set the current tenant
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.tenant_id', tenant_uuid::TEXT, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy for organizations table
-- Organizations are managed at the application layer, so we allow authenticated users to view all
CREATE POLICY organizations_select_policy ON organizations
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy for users table - SELECT operations
-- Users can only see other users in their organization (same tenant_id)
CREATE POLICY users_select_own_org ON users
  FOR SELECT
  TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- RLS Policy for users table - INSERT operations
-- Users can only be inserted with the current tenant context
CREATE POLICY users_insert_own_org ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- RLS Policy for users table - UPDATE operations
-- Users can only update records in their organization
CREATE POLICY users_update_own_org ON users
  FOR UPDATE
  TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- RLS Policy for users table - DELETE operations
-- Users can only delete records in their organization
CREATE POLICY users_delete_own_org ON users
  FOR DELETE
  TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
