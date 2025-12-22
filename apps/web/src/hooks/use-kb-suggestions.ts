/**
 * KB Suggestions Hook
 * Story 4.6: KB Suggestions During Ping Creation
 *
 * Custom hook to fetch KB article suggestions based on user's query.
 * Uses debouncing to avoid excessive API calls as user types.
 */

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from './use-debounce';

export interface KBSuggestion {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  categoryName: string | null;
}

interface UseKBSuggestionsOptions {
  /** Minimum query length before searching (default: 10) */
  minQueryLength?: number;
  /** Debounce delay in ms (default: 500) */
  debounceDelay?: number;
}

interface UseKBSuggestionsReturn {
  suggestions: KBSuggestion[];
  isLoading: boolean;
  totalCount: number;
  error: string | null;
}

const DEFAULT_MIN_QUERY_LENGTH = 10;
const DEFAULT_DEBOUNCE_DELAY = 500;

/**
 * Hook to fetch KB article suggestions based on user's message
 * @param query - The user's message/query text
 * @param options - Configuration options
 * @returns KB suggestions, loading state, and total count
 */
export function useKBSuggestions(
  query: string,
  options: UseKBSuggestionsOptions = {}
): UseKBSuggestionsReturn {
  const {
    minQueryLength = DEFAULT_MIN_QUERY_LENGTH,
    debounceDelay = DEFAULT_DEBOUNCE_DELAY,
  } = options;

  const [suggestions, setSuggestions] = useState<KBSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Debounce the query to avoid excessive API calls
  const debouncedQuery = useDebounce(query.trim(), debounceDelay);

  const fetchSuggestions = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < minQueryLength) {
        setSuggestions([]);
        setTotalCount(0);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/kb/suggestions?query=${encodeURIComponent(searchQuery)}`,
          {
            credentials: 'include',
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            // User not authenticated - don't show error, just no suggestions
            setSuggestions([]);
            setTotalCount(0);
            return;
          }
          throw new Error('Failed to fetch suggestions');
        }

        const data = await response.json();

        if (data.success) {
          setSuggestions(data.suggestions || []);
          setTotalCount(data.totalCount || 0);
        } else {
          setSuggestions([]);
          setTotalCount(0);
        }
      } catch (err) {
        console.error('[useKBSuggestions] Error fetching suggestions:', err);
        setError('Failed to load suggestions');
        setSuggestions([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    },
    [minQueryLength]
  );

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    fetchSuggestions(debouncedQuery);
  }, [debouncedQuery, fetchSuggestions]);

  return {
    suggestions,
    isLoading,
    totalCount,
    error,
  };
}
