/**
 * CategoryDropdown Component
 * Story 3.3: Auto-Categorization of Pings with Conversational Clarification
 *
 * Allows agents to manually override AI category selection.
 */

'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  icon?: string | null;
}

interface CategoryDropdownProps {
  pingNumber: string;
  currentCategory: Category | null;
  disabled?: boolean;
  onCategoryChange?: (category: Category) => void;
}

export function CategoryDropdown({
  pingNumber,
  currentCategory,
  disabled = false,
  onCategoryChange,
}: CategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    currentCategory
  );
  const { toast } = useToast();

  // Fetch active categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    }
    fetchCategories();
  }, []);

  const handleSelectCategory = async (category: Category) => {
    if (category.id === selectedCategory?.id) {
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/pings/${pingNumber}/category`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: category.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to update category');
      }

      setSelectedCategory(category);
      setOpen(false);

      toast({
        title: 'Category updated',
        description: `Changed to: ${category.name}`,
      });

      if (onCategoryChange) {
        onCategoryChange(category);
      }
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: 'Error',
        description: 'Failed to update category',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            'w-[200px] justify-between',
            !selectedCategory && 'text-muted-foreground'
          )}
        >
          {selectedCategory ? (
            <div className="flex items-center gap-2">
              {selectedCategory.icon &&
                (() => {
                  const IconComponent = (LucideIcons as any)[
                    selectedCategory.icon
                  ];
                  return IconComponent ? (
                    <IconComponent
                      className="h-4 w-4"
                      style={{ color: selectedCategory.color }}
                    />
                  ) : null;
                })()}
              <span>{selectedCategory.name}</span>
            </div>
          ) : (
            'Select category...'
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandEmpty>No category found.</CommandEmpty>
          <CommandGroup>
            {categories.map((category) => {
              const IconComponent = category.icon
                ? (LucideIcons as any)[category.icon]
                : null;

              return (
                <CommandItem
                  key={category.id}
                  value={category.name}
                  onSelect={() => handleSelectCategory(category)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedCategory?.id === category.id
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  <div className="flex items-center gap-2">
                    {IconComponent && (
                      <IconComponent
                        className="h-4 w-4"
                        style={{ color: category.color }}
                      />
                    )}
                    <span>{category.name}</span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
