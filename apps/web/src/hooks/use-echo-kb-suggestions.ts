/**
 * Echo KB Suggestions Hook
 * Story 4.8: KB Article Suggestions During Resolution
 *
 * Custom hook to fetch KB article suggestions for the Echo panel.
 * Uses ping's AI summary for semantic search.
 */

import { useState, useCallback, useEffect } from 'react';

export interface EchoKBSuggestion {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  categoryName: string | null;
}

interface UseEchoKBSuggestionsReturn {
  suggestions: EchoKBSuggestion[];
  isLoading: boolean;
  message: string | null;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch KB article suggestions for Echo panel
 * @param pingNumber - The ping number to get suggestions for
 * @param aiSummary - The ping's AI summary (triggers refetch when changed)
 * @returns KB suggestions, loading state, message, and refetch function
 */
export function useEchoKBSuggestions(
  pingNumber: string | null,
  aiSummary: string | null | undefined
): UseEchoKBSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<EchoKBSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!pingNumber) {
      setSuggestions([]);
      setMessage(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pings/${pingNumber}/kb-suggestions`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated - don't show error
          setSuggestions([]);
          setMessage(null);
          return;
        }
        if (response.status === 403) {
          // Not authorized - don't show error to non-agents
          setSuggestions([]);
          setMessage(null);
          return;
        }
        throw new Error('Failed to fetch KB suggestions');
      }

      const data = await response.json();

      if (data.success) {
        setSuggestions(data.suggestions || []);
        setMessage(data.message || null);
      } else {
        setSuggestions([]);
        setMessage(data.message || null);
      }
    } catch (err) {
      console.error('[useEchoKBSuggestions] Error:', err);
      setError('Failed to load KB suggestions');
      setSuggestions([]);
      setMessage(null);
    } finally {
      setIsLoading(false);
    }
  }, [pingNumber]);

  // Fetch suggestions when pingNumber or aiSummary changes
  useEffect(() => {
    if (pingNumber && aiSummary) {
      fetchSuggestions();
    } else if (pingNumber && !aiSummary) {
      // No AI summary yet - show waiting message
      setSuggestions([]);
      setMessage('Waiting for AI summary...');
      setIsLoading(false);
    }
  }, [pingNumber, aiSummary, fetchSuggestions]);

  return {
    suggestions,
    isLoading,
    message,
    error,
    refetch: fetchSuggestions,
  };
}
