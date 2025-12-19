/**
 * Unit tests for useDebounce hook
 * Story 4.3.5: KB Browse Page & Category Filtering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './use-debounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    expect(result.current).toBe('initial');

    // Change the value
    rerender({ value: 'updated', delay: 300 });

    // Value should still be initial immediately
    expect(result.current).toBe('initial');

    // Advance time by 150ms (less than delay)
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe('initial');

    // Advance time by another 150ms (total 300ms)
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    );

    expect(result.current).toBe('a');

    // Rapid changes
    rerender({ value: 'ab', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'abc', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'abcd', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Still showing initial value because timer keeps resetting
    expect(result.current).toBe('a');

    // Now wait full delay after last change
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should now show final value
    expect(result.current).toBe('abcd');
  });

  it('should work with different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'test', delay: 500 } }
    );

    rerender({ value: 'updated', delay: 500 });

    // At 300ms, should still be old value
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('test');

    // At 500ms, should be new value
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('updated');
  });

  it('should use default delay of 300ms', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'initial' },
    });

    rerender({ value: 'updated' });

    // At 200ms, should still be old value
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('initial');

    // At 300ms, should be new value
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('updated');
  });

  it('should work with different types', () => {
    // Test with number
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 0 } }
    );

    numberRerender({ value: 42 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(numberResult.current).toBe(42);

    // Test with object
    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: { name: 'initial' } } }
    );

    objectRerender({ value: { name: 'updated' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(objectResult.current).toEqual({ name: 'updated' });
  });

  it('should handle null and undefined values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' as string | null | undefined } }
    );

    rerender({ value: null });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(null);

    rerender({ value: undefined });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(undefined);
  });
});
