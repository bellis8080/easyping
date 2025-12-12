'use client';

import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, X } from 'lucide-react';
import { CategoriesData, AIConfigData } from '@/lib/schemas/setup';
import type { SupportProfile } from '@easyping/types';
import {
  getPresetCategories,
  type CategorySuggestion,
} from '@/lib/services/category-suggestion-service';

interface CategoriesStepProps {
  form: UseFormReturn<CategoriesData>;
  supportProfile: SupportProfile;
  aiConfig: AIConfigData;
}

interface CategoryItem {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  selected: boolean;
  isDefault: boolean;
}

export function CategoriesStep({
  form,
  supportProfile,
  aiConfig,
}: CategoriesStepProps) {
  const { setValue } = form;

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');

  const isAIConfigured = aiConfig.provider && aiConfig.provider !== 'skip';

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, [supportProfile]);

  const loadCategories = async () => {
    setIsLoading(true);

    try {
      let suggestions: CategorySuggestion[];

      if (isAIConfigured) {
        // Try to get AI-generated suggestions
        try {
          const response = await fetch('/api/setup/categories/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              supportProfile,
              aiConfig,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            suggestions = data.categories || [];
          } else {
            // Fall back to presets
            suggestions = getPresetCategories(supportProfile.support_type);
          }
        } catch {
          // Fall back to presets on error
          suggestions = getPresetCategories(supportProfile.support_type);
        }
      } else {
        // Use preset categories
        suggestions = getPresetCategories(supportProfile.support_type);
      }

      // Convert to CategoryItem format
      const items: CategoryItem[] = suggestions.map((s, index) => ({
        id: `cat-${index}`,
        name: s.name,
        description: s.description || '',
        color: s.color,
        icon: s.icon || 'Circle',
        selected: true,
        isDefault: s.isDefault || false,
      }));

      setCategories(items);
      updateFormValue(items);
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Use general presets as fallback
      const fallback = getPresetCategories('general');
      const items: CategoryItem[] = fallback.map((s, index) => ({
        id: `cat-${index}`,
        name: s.name,
        description: s.description || '',
        color: s.color,
        icon: s.icon || 'Circle',
        selected: true,
        isDefault: s.isDefault || false,
      }));
      setCategories(items);
      updateFormValue(items);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormValue = (cats: CategoryItem[]) => {
    setValue(
      'categories',
      cats.map((c) => ({
        name: c.name,
        description: c.description,
        color: c.color,
        icon: c.icon,
        is_default: c.isDefault,
      }))
    );
  };

  const removeCategory = (id: string) => {
    const category = categories.find((c) => c.id === id);
    // Don't allow removing default categories (like "Other")
    if (category?.isDefault) return;

    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    updateFormValue(updated);
  };

  const updateCategory = (
    id: string,
    field: 'name' | 'description',
    value: string
  ) => {
    const updated = categories.map((c) =>
      c.id === id ? { ...c, [field]: value } : c
    );
    setCategories(updated);
    updateFormValue(updated);
  };

  const addCustomCategory = () => {
    if (!newCategoryName.trim()) return;

    const newCategory: CategoryItem = {
      id: `custom-${Date.now()}`,
      name: newCategoryName.trim(),
      description: newCategoryDescription.trim(),
      color: '#6b7280', // Default gray
      icon: 'Tag',
      selected: true,
      isDefault: false,
    };

    const updated = [...categories, newCategory];
    setCategories(updated);
    updateFormValue(updated);
    setNewCategoryName('');
    setNewCategoryDescription('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomCategory();
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-gray-400">
          {isAIConfigured
            ? 'Echo is suggesting categories based on your support profile...'
            : 'Loading category suggestions...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white">Select Categories</h3>
        <p className="text-sm text-gray-400 mt-1">
          Choose the categories you want to use for organizing pings. You can
          customize these later in Settings.
        </p>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex flex-col gap-1 p-3 rounded-lg border transition-colors bg-slate-700/50 border-slate-600 hover:border-blue-500/50"
          >
            <div className="flex items-center gap-2">
              {/* Color indicator */}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: category.color }}
              />

              {/* Name (editable) */}
              <input
                type="text"
                value={category.name}
                onChange={(e) =>
                  updateCategory(category.id, 'name', e.target.value)
                }
                className="flex-1 min-w-0 bg-transparent border-none text-white text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
                placeholder="Category name"
              />

              {/* Remove button (hidden for default categories) */}
              {!category.isDefault ? (
                <button
                  type="button"
                  onClick={() => removeCategory(category.id)}
                  className="text-gray-500 hover:text-red-400 p-0.5 flex-shrink-0"
                  title="Remove category"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <span
                  className="text-xs text-gray-500 flex-shrink-0"
                  title="Required category"
                >
                  Required
                </span>
              )}
            </div>

            {/* Description (editable) */}
            <input
              type="text"
              value={category.description}
              onChange={(e) =>
                updateCategory(category.id, 'description', e.target.value)
              }
              className="text-xs text-gray-400 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 pl-5"
              placeholder="Brief description..."
            />
          </div>
        ))}
      </div>

      {/* Add custom category */}
      <div className="pt-4 border-t border-slate-600 space-y-2">
        <div className="flex gap-3">
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Category name..."
            className="flex-1"
          />
          <Button
            type="button"
            onClick={addCustomCategory}
            disabled={!newCategoryName.trim()}
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        {newCategoryName.trim() && (
          <Input
            value={newCategoryDescription}
            onChange={(e) => setNewCategoryDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Description (optional)..."
            className="text-sm"
          />
        )}
      </div>

      <p className="text-xs text-gray-500 text-center">
        {categories.length}{' '}
        {categories.length === 1 ? 'category' : 'categories'}
      </p>
    </div>
  );
}
