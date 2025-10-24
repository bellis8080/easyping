# Row Level Security (RLS) Patterns

This document describes the RLS patterns used in the EasyPing database schema for multi-tenant isolation.

## Overview

Row Level Security (RLS) ensures that users can only access data belonging to their organization (tenant). All data tables with tenant-specific data MUST have RLS policies enabled.

## Tenant Context

The application sets the current tenant using the `set_tenant_context()` helper function:

```sql
SELECT set_tenant_context('tenant-uuid-here'::UUID);
```

This sets the PostgreSQL session variable `app.tenant_id` which is used by all RLS policies.

## Standard RLS Policy Pattern

For any table with a `tenant_id` column, apply these policies:

```sql
-- Enable RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only see records from their organization
CREATE POLICY your_table_select_own_org ON your_table
  FOR SELECT
  TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- INSERT: Users can only insert records for their organization
CREATE POLICY your_table_insert_own_org ON your_table
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- UPDATE: Users can only update records in their organization
CREATE POLICY your_table_update_own_org ON your_table
  FOR UPDATE
  TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- DELETE: Users can only delete records in their organization
CREATE POLICY your_table_delete_own_org ON your_table
  FOR DELETE
  TO authenticated
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
```

## Application Integration

The Next.js middleware MUST set the tenant context for every authenticated request:

```typescript
// In middleware or server-side code
const { data: { user } } = await supabase.auth.getUser();

if (user) {
  // Fetch user's tenant_id from users table
  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single();
  
  // Set tenant context for all subsequent queries in this request
  await supabase.rpc('set_tenant_context', { tenant_uuid: userData.tenant_id });
}
```

## Testing RLS Policies

To test RLS policies manually:

```sql
-- 1. Create test organizations
INSERT INTO organizations (id, name) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Org A'),
  ('22222222-2222-2222-2222-222222222222', 'Org B');

-- 2. Set context to Org A
SELECT set_tenant_context('11111111-1111-1111-1111-111111111111'::UUID);

-- 3. Query should only return Org A data
SELECT * FROM users;

-- 4. Switch to Org B
SELECT set_tenant_context('22222222-2222-2222-2222-222222222222'::UUID);

-- 5. Query should only return Org B data
SELECT * FROM users;
```

## Important Notes

1. **Always set tenant context**: Forgetting to set tenant context will result in NO DATA being returned (RLS will block all queries)
2. **Service role bypasses RLS**: Use the service_role key carefully as it bypasses all RLS policies
3. **Migrations don't need RLS**: Migration scripts run with elevated privileges and don't require tenant context
4. **Test thoroughly**: Always test RLS policies with multiple tenants to ensure proper isolation

## Future Tables

When creating new tables that store tenant-specific data:

1. Add `tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` column
2. Enable RLS on the table
3. Apply the standard policy pattern above
4. Test with multiple tenants
5. Document any custom policies in this file
