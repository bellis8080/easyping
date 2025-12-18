/**
 * Slug Generation Utility Tests
 * Story 4.2.2: Auto-Generate KB Articles from Resolved Pings
 */

import { describe, it, expect } from 'vitest';
import { generateSlug, generateUniqueSlug } from '@/lib/utils/slug';

describe('generateSlug', () => {
  it('should convert title to lowercase', () => {
    expect(generateSlug('How To Reset Your Password')).toBe(
      'how-to-reset-your-password'
    );
  });

  it('should replace spaces with hyphens', () => {
    expect(generateSlug('password reset guide')).toBe('password-reset-guide');
  });

  it('should remove special characters', () => {
    expect(generateSlug('VPN Setup (2024)')).toBe('vpn-setup-2024');
    expect(generateSlug("What's new in v2.0?")).toBe('whats-new-in-v20');
  });

  it('should remove consecutive hyphens', () => {
    expect(generateSlug('hello   world')).toBe('hello-world');
    expect(generateSlug('hello---world')).toBe('hello-world');
  });

  it('should remove leading and trailing hyphens', () => {
    expect(generateSlug('-hello world-')).toBe('hello-world');
    expect(generateSlug('  hello world  ')).toBe('hello-world');
  });

  it('should limit slug length to 100 characters', () => {
    const longTitle =
      'This is a very long title that should be truncated because it exceeds the maximum allowed length for URL slugs in the knowledge base system';
    const slug = generateSlug(longTitle);
    expect(slug.length).toBeLessThanOrEqual(100);
  });

  it('should handle empty strings', () => {
    expect(generateSlug('')).toBe('');
    expect(generateSlug('   ')).toBe('');
  });

  it('should handle titles with only special characters', () => {
    expect(generateSlug('!@#$%^&*()')).toBe('');
  });

  it('should preserve numbers', () => {
    expect(generateSlug('Step 1: Getting Started')).toBe(
      'step-1-getting-started'
    );
    expect(generateSlug('2024 Guide')).toBe('2024-guide');
  });
});

describe('generateUniqueSlug', () => {
  it('should append suffix to base slug', () => {
    expect(generateUniqueSlug('my-article', 'abc123')).toBe(
      'my-article-abc123'
    );
  });

  it('should limit combined length to 100 characters', () => {
    const longSlug = 'a'.repeat(95);
    const suffix = 'xyz';
    const result = generateUniqueSlug(longSlug, suffix);
    expect(result.length).toBeLessThanOrEqual(100);
  });
});
