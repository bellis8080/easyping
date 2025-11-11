-- Create categories table (stub for ping categorization)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6B7280',
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT categories_unique_name_per_tenant UNIQUE (tenant_id, name)
);

-- Create index
CREATE INDEX idx_categories_tenant_id ON categories(tenant_id);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for categories table
CREATE POLICY "Users can view categories in their tenant"
  ON categories FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Managers can manage categories in their tenant"
  ON categories FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()) AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('manager', 'owner')
  );
