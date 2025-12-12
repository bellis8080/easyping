-- Migration: Add is_default column to categories table
-- Story 3.4: Organization Profile & Category Management
--
-- The is_default flag marks categories that cannot be deleted (e.g., "Other")

-- Add is_default column
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Create index for default categories lookup
CREATE INDEX IF NOT EXISTS idx_categories_is_default ON categories (tenant_id, is_default) WHERE is_default = true;

-- Add comment
COMMENT ON COLUMN categories.is_default IS 'If true, this category cannot be deleted (e.g., catch-all "Other" category)';
