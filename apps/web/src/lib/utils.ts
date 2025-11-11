import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Generate ping title from message content
 * @param message The ping message content
 * @param maxLength Maximum length of title (default: 50)
 * @returns Truncated title with ellipsis if needed
 */
export function generatePingTitle(
  message: string,
  maxLength: number = 50
): string {
  const trimmed = message.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.substring(0, maxLength).trim() + '...';
}
