'use client';

import { useEffect, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface KBCategory {
  id: string;
  name: string;
  articleCount: number;
}

const NO_CATEGORY_VALUE = '__none__';

interface KBMetadataFormProps {
  title: string;
  slug: string;
  categoryId: string;
  onTitleChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  slugManuallyEdited: boolean;
  onSlugManuallyEdited: (value: boolean) => void;
}

export function KBMetadataForm({
  title,
  slug,
  categoryId,
  onTitleChange,
  onSlugChange,
  onCategoryChange,
  slugManuallyEdited,
  onSlugManuallyEdited,
}: KBMetadataFormProps) {
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/kb/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    }

    fetchCategories();
  }, []);

  // Handle title change - parent handles auto-slug generation
  const handleTitleChange = useCallback(
    (value: string) => {
      onTitleChange(value);
      // Note: Parent's handleTitleChange handles auto-slug generation
      // We don't call onSlugChange here to avoid triggering "manually edited" flag
    },
    [onTitleChange]
  );

  // Handle manual slug change
  const handleSlugChange = useCallback(
    (value: string) => {
      onSlugManuallyEdited(true);
      // Sanitize slug input
      const sanitizedSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      onSlugChange(sanitizedSlug);
    },
    [onSlugChange, onSlugManuallyEdited]
  );

  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title field */}
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Enter article title..."
            aria-required="true"
          />
        </div>

        {/* Slug field */}
        <div className="space-y-2">
          <Label htmlFor="slug">
            URL Slug
            {!slugManuallyEdited && title && (
              <span className="text-xs text-slate-400 ml-2">
                (auto-generated)
              </span>
            )}
          </Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="article-slug"
          />
          {slug && (
            <p className="text-xs text-slate-500">
              Available at:{' '}
              <code className="bg-slate-100 px-1 rounded">/kb/{slug}</code>
            </p>
          )}
        </div>
      </div>

      {/* Category field */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        {loadingCategories ? (
          <Skeleton className="h-10 w-full" />
        ) : categories.length === 0 ? (
          <div className="text-sm text-slate-500 py-2">
            No categories available. Create categories in Settings.
          </div>
        ) : (
          <Select
            value={categoryId || NO_CATEGORY_VALUE}
            onValueChange={(value) =>
              onCategoryChange(value === NO_CATEGORY_VALUE ? '' : value)
            }
          >
            <SelectTrigger id="category" className="w-full md:w-80">
              <SelectValue placeholder="Select a category (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CATEGORY_VALUE}>No category</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                  {category.articleCount > 0 && (
                    <span className="text-slate-400 ml-2">
                      ({category.articleCount} article
                      {category.articleCount !== 1 ? 's' : ''})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

export default KBMetadataForm;
