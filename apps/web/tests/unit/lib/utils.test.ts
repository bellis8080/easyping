import { describe, it, expect } from 'vitest';
import { generatePingTitle } from '@/lib/utils';

describe('generatePingTitle', () => {
  it('should return the full message if within maxLength', () => {
    const message = 'Short message';
    const result = generatePingTitle(message, 50);
    expect(result).toBe('Short message');
  });

  it('should truncate long messages and add ellipsis', () => {
    const message =
      'This is a very long message that exceeds the maximum length';
    const result = generatePingTitle(message, 20);
    expect(result).toBe('This is a very long...');
    expect(result.length).toBe(22); // trim() removes trailing space, then + '...'
  });

  it('should trim whitespace from the message', () => {
    const message = '  Message with spaces  ';
    const result = generatePingTitle(message, 50);
    expect(result).toBe('Message with spaces');
  });

  it('should handle empty strings', () => {
    const message = '';
    const result = generatePingTitle(message, 50);
    expect(result).toBe('');
  });

  it('should use default maxLength of 50', () => {
    const message = 'a'.repeat(100);
    const result = generatePingTitle(message);
    expect(result).toBe('a'.repeat(50) + '...');
    expect(result.length).toBe(53); // 50 + '...'
  });

  it('should handle message exactly at maxLength', () => {
    const message = 'a'.repeat(50);
    const result = generatePingTitle(message, 50);
    expect(result).toBe(message);
    expect(result.length).toBe(50);
  });
});
