-- Migration: Add is_active column to categories and seed default categories
-- Story 3.3: Auto-Categorization of Pings with Conversational Clarification
-- Purpose: Support category management and provide default categories for AI categorization

-- Step 1: Add is_active column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Step 2: Add index for active categories (used in category selection queries)
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(tenant_id, is_active) WHERE is_active = true;

-- Step 3: Add index for sort order
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(tenant_id, sort_order);

-- Step 4: Add check constraint for name not empty
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_not_empty;
ALTER TABLE categories ADD CONSTRAINT categories_name_not_empty CHECK (length(trim(name)) > 0);

-- Step 5: Add check constraint for color hex format
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_color_hex;
ALTER TABLE categories ADD CONSTRAINT categories_color_hex CHECK (color ~* '^#[0-9A-Fa-f]{6}$');

-- Step 6: Enable RLS on categories table (intentionally permissive for Realtime)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop existing policies and create new permissive policy for SELECT
DROP POLICY IF EXISTS "Users can view categories in their tenant" ON categories;
DROP POLICY IF EXISTS "Managers can manage categories in their tenant" ON categories;

CREATE POLICY categories_select_all ON categories FOR SELECT USING (true);

-- Step 8: Seed default categories for all existing organizations
INSERT INTO categories (tenant_id, name, description, color, icon, sort_order, is_active)
SELECT
  o.id,
  c.name,
  c.description,
  c.color,
  c.icon,
  c.sort_order,
  true
FROM organizations o
CROSS JOIN (
  VALUES
    ('Hardware', 'Computer hardware, peripherals, equipment issues', '#ef4444', 'HardDrive', 0),
    ('Software', 'Application errors, software bugs, feature requests', '#3b82f6', 'Code', 1),
    ('Network', 'Internet connectivity, VPN, network access issues', '#10b981', 'Network', 2),
    ('Access Request', 'Account access, permissions, role changes', '#f59e0b', 'Key', 3),
    ('Password Reset', 'Password recovery, account lockout', '#8b5cf6', 'LockKeyhole', 4),
    ('Needs Review', 'Requires manual review or categorization', '#f97316', 'AlertCircle', 5),
    ('Other', 'Uncategorized or general inquiries', '#6b7280', 'HelpCircle', 6)
) AS c(name, description, color, icon, sort_order)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Step 9: Add comments for documentation
COMMENT ON COLUMN categories.is_active IS 'Whether category is active (false = archived)';
