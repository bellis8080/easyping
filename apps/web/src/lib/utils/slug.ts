/**
 * Slug Generation Utility
 * Story 4.2.2: Auto-Generate KB Articles from Resolved Pings
 *
 * Generates URL-safe slugs from article titles.
 */

/**
 * Generates a URL-safe slug from a title string.
 *
 * @param title - The title to convert to a slug
 * @returns A lowercase, hyphenated slug suitable for URLs
 *
 * @example
 * generateSlug('How to Reset Your Password') // 'how-to-reset-your-password'
 * generateSlug('VPN Setup (2024)') // 'vpn-setup-2024'
 */
export function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      // Replace special characters with nothing
      .replace(/[^a-z0-9\s-]/g, '')
      // Replace whitespace with hyphens
      .replace(/\s+/g, '-')
      // Remove consecutive hyphens
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
      // Limit length to 100 chars
      .substring(0, 100)
  );
}

/**
 * Generates a unique slug by appending a suffix if needed.
 * Used when a slug already exists in the database.
 *
 * @param baseSlug - The original slug
 * @param suffix - A suffix to append (e.g., timestamp or random string)
 * @returns A modified slug with the suffix
 */
export function generateUniqueSlug(baseSlug: string, suffix: string): string {
  const suffixedSlug = `${baseSlug}-${suffix}`;
  return suffixedSlug.substring(0, 100);
}
