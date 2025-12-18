/**
 * KB Similarity Search Service
 * Story 4.2.3: KB Article Comparison & Enhancement
 *
 * Finds similar KB articles using PostgreSQL full-text search.
 * This is a pre-pgvector implementation using ts_rank for similarity scoring.
 * Will be enhanced with vector similarity in Story 4.4.
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Configuration for similarity search
 */
export interface KBSimilarityConfig {
  /** Minimum similarity score (0-100) to consider a match */
  minSimilarity?: number;
  /** Maximum number of results to return */
  limit?: number;
}

/**
 * A similar article found during search
 */
export interface SimilarArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  categoryId: string | null;
  categoryName: string | null;
  /** Similarity score from 0-100 */
  similarity: number;
  viewCount: number;
  helpfulCount: number;
}

/**
 * Result of similarity search
 */
export interface SimilarityResult {
  /** Whether any similar articles were found */
  hasSimilar: boolean;
  /** The most similar article (if any) */
  bestMatch: SimilarArticle | null;
  /** All similar articles above threshold */
  matches: SimilarArticle[];
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<KBSimilarityConfig> = {
  minSimilarity: 70, // 70% match threshold per AC
  limit: 5,
};

/**
 * Finds KB articles similar to the given content.
 * Uses PostgreSQL full-text search with ts_rank for scoring.
 *
 * Strategy:
 * 1. First search within the same category (if provided)
 * 2. If no matches, search across all categories
 * 3. Return articles above the similarity threshold
 *
 * @param supabase - Supabase client (admin client for service role access)
 * @param content - Content to search for (typically from ping messages)
 * @param tenantId - Tenant ID for isolation
 * @param categoryId - Optional category ID to filter by first
 * @param config - Optional configuration for search parameters
 * @returns Similarity search results
 */
export async function findSimilarArticles(
  supabase: SupabaseClient,
  content: string,
  tenantId: string,
  categoryId?: string | null,
  config?: KBSimilarityConfig
): Promise<SimilarityResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Clean and prepare the search content
  const searchTerms = prepareSearchTerms(content);

  if (!searchTerms) {
    return {
      hasSimilar: false,
      bestMatch: null,
      matches: [],
    };
  }

  // First try to find matches within the same category
  if (categoryId) {
    const categoryMatches = await searchArticles(
      supabase,
      searchTerms,
      tenantId,
      mergedConfig,
      categoryId
    );

    if (categoryMatches.length > 0) {
      return {
        hasSimilar: true,
        bestMatch: categoryMatches[0],
        matches: categoryMatches,
      };
    }
  }

  // No category matches or no category specified - search all categories
  const allMatches = await searchArticles(
    supabase,
    searchTerms,
    tenantId,
    mergedConfig,
    null
  );

  return {
    hasSimilar: allMatches.length > 0,
    bestMatch: allMatches[0] || null,
    matches: allMatches,
  };
}

/**
 * Prepares search terms from raw content.
 * Extracts significant words and phrases for full-text search.
 */
function prepareSearchTerms(content: string): string {
  // Remove extra whitespace and normalize
  let terms = content
    .toLowerCase()
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove common words that don't help with matching
  // (PostgreSQL's to_tsvector handles stop words, but we do basic cleanup)
  terms = terms
    .replace(/[^\w\s'-]/g, ' ') // Keep letters, numbers, spaces, hyphens, apostrophes
    .replace(/\s+/g, ' ')
    .trim();

  // Limit to reasonable length for search
  if (terms.length > 1000) {
    terms = terms.substring(0, 1000);
  }

  return terms;
}

/**
 * Performs the actual full-text search using PostgreSQL.
 * Uses ts_rank to score results based on relevance.
 */
async function searchArticles(
  supabase: SupabaseClient,
  searchTerms: string,
  tenantId: string,
  config: Required<KBSimilarityConfig>,
  categoryId: string | null
): Promise<SimilarArticle[]> {
  // Use RPC function for full-text search with ts_rank
  // This provides better control over the search and scoring
  const { data, error } = await supabase.rpc('search_similar_kb_articles', {
    p_search_terms: searchTerms,
    p_tenant_id: tenantId,
    p_category_id: categoryId,
    p_limit: config.limit,
  });

  if (error) {
    console.error('Error searching similar KB articles:', error);
    // Fall back to basic search without scoring
    return basicFallbackSearch(
      supabase,
      searchTerms,
      tenantId,
      config,
      categoryId
    );
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  // Filter and transform results
  return data
    .map((row: SearchResultRow) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      content: row.content,
      categoryId: row.category_id,
      categoryName: row.category_name,
      similarity: normalizeSimilarityScore(row.similarity_score),
      viewCount: row.view_count,
      helpfulCount: row.helpful_count,
    }))
    .filter((article) => article.similarity >= config.minSimilarity);
}

/**
 * Row type returned from the search RPC
 */
interface SearchResultRow {
  id: string;
  title: string;
  slug: string;
  content: string;
  category_id: string | null;
  category_name: string | null;
  similarity_score: number;
  view_count: number;
  helpful_count: number;
}

/**
 * Normalizes the ts_rank similarity score to 0-100.
 * ts_rank returns values typically between 0 and 1, but can exceed 1 for highly relevant matches.
 * We normalize to a percentage scale.
 */
function normalizeSimilarityScore(tsRankScore: number): number {
  // ts_rank typically returns 0-1, but can be higher
  // We use a sigmoid-like scaling to cap at 100
  // A ts_rank of 0.1 is roughly 70% similarity
  // A ts_rank of 0.3+ is roughly 90%+ similarity
  const normalized = Math.min(100, Math.round(tsRankScore * 300));
  return Math.max(0, normalized);
}

/**
 * Fallback search using basic ILIKE when RPC is not available.
 * Less accurate but provides some functionality.
 */
async function basicFallbackSearch(
  supabase: SupabaseClient,
  searchTerms: string,
  tenantId: string,
  config: Required<KBSimilarityConfig>,
  categoryId: string | null
): Promise<SimilarArticle[]> {
  // Extract key words for ILIKE search
  const words = searchTerms.split(' ').filter((w) => w.length > 3);
  const topWords = words.slice(0, 5);

  if (topWords.length === 0) {
    return [];
  }

  // Build query - note: we don't join categories here for simplicity
  // The main RPC-based search handles category names
  let query = supabase
    .from('kb_articles')
    .select('id, title, slug, content, category_id, view_count, helpful_count')
    .eq('tenant_id', tenantId)
    .eq('status', 'published')
    .is('deleted_at', null);

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  // Search with OR conditions for each top word
  const orConditions = topWords
    .map((word) => `title.ilike.%${word}%,content.ilike.%${word}%`)
    .join(',');
  query = query.or(orConditions);

  query = query.limit(config.limit);

  const { data, error } = await query;

  if (error) {
    console.error('Fallback search error:', error);
    return [];
  }

  if (!data) {
    return [];
  }

  // Calculate basic similarity based on word matches
  return data.map((row) => {
    const matchedWords = topWords.filter(
      (word) =>
        row.title.toLowerCase().includes(word) ||
        row.content.toLowerCase().includes(word)
    );
    const similarity = Math.round(
      (matchedWords.length / topWords.length) * 100
    );

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      content: row.content,
      categoryId: row.category_id,
      categoryName: null, // Fallback doesn't include category name
      similarity,
      viewCount: row.view_count,
      helpfulCount: row.helpful_count,
    };
  });
}

/**
 * Extracts a brief excerpt from content for display.
 *
 * @param content - Full article content
 * @param maxLength - Maximum excerpt length (default 200)
 * @returns Truncated excerpt with ellipsis if needed
 */
export function getArticleExcerpt(content: string, maxLength = 200): string {
  // Remove markdown headers and formatting
  let excerpt = content
    .replace(/^#+\s+.+$/gm, '') // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italics
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/\n+/g, ' ')
    .trim();

  if (excerpt.length <= maxLength) {
    return excerpt;
  }

  // Cut at word boundary
  excerpt = excerpt.substring(0, maxLength);
  const lastSpace = excerpt.lastIndexOf(' ');
  if (lastSpace > maxLength / 2) {
    excerpt = excerpt.substring(0, lastSpace);
  }

  return excerpt + '...';
}
