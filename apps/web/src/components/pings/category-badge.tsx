/**
 * CategoryBadge Component
 * Story 3.3: Auto-Categorization of Pings with Conversational Clarification
 *
 * Displays a category badge with icon, color, and optional confidence percentage.
 */

import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Category {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  icon?: string | null;
}

interface CategoryBadgeProps {
  category: Category | null;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  showConfidence?: boolean;
  confidence?: number;
  className?: string;
}

export function CategoryBadge({
  category,
  size = 'sm',
  showIcon = true,
  showConfidence = false,
  confidence,
  className,
}: CategoryBadgeProps) {
  if (!category) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600',
          size === 'md' && 'px-3 py-1.5 text-sm',
          className
        )}
      >
        Uncategorized
      </span>
    );
  }

  // Get the Lucide icon component dynamically
  const IconComponent = category.icon
    ? (LucideIcons as any)[category.icon]
    : null;

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium',
        size === 'md' && 'px-3 py-1.5 text-sm',
        className
      )}
      style={{
        backgroundColor: `${category.color}15`,
        borderColor: `${category.color}40`,
        color: category.color,
      }}
    >
      {showIcon && IconComponent && (
        <IconComponent
          className={cn('h-3 w-3', size === 'md' && 'h-4 w-4')}
          style={{ color: category.color }}
        />
      )}
      <span>{category.name}</span>
      {showConfidence && confidence !== undefined && (
        <span className="ml-1 opacity-70">
          ({Math.round(confidence * 100)}%)
        </span>
      )}
    </span>
  );

  if (category.description) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-sm">{category.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
