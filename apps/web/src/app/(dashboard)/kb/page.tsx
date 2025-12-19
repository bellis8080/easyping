'use client';

/**
 * Knowledge Base Browse Page
 * Story 4.3.5: KB Browse Page & Category Filtering
 *
 * Public-facing KB browse page for all authenticated users.
 * Features: Search with debounce, category filtering, popular articles sidebar.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, BookOpen, Filter, X, Settings, Loader2 } from 'lucide-react';
import { UserRole, canViewPrivateMessages } from '@easyping/types';
import { useDebounce } from '@/hooks/use-debounce';

// Types matching API responses
interface KBArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  categoryId: string | null;
  categoryName: string | null;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  updatedAt: string;
}

interface KBCategory {
  id: string;
  name: string;
  articleCount: number;
}

interface PopularArticle {
  id: string;
  title: string;
  slug: string;
  viewCount: number;
}

// Loading Skeleton Components
function ArticleCardSkeleton() {
  return (
    <div className="p-6 border-2 border-slate-600 rounded-lg bg-slate-800 animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-5 h-5 bg-slate-700 rounded flex-shrink-0" />
        <div className="flex-1">
          <div className="h-5 bg-slate-700 rounded w-3/4 mb-3" />
          <div className="h-4 bg-slate-700 rounded w-full mb-2" />
          <div className="h-4 bg-slate-700 rounded w-2/3" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-6 w-16 bg-slate-700 rounded" />
          <div className="h-4 w-20 bg-slate-700 rounded" />
        </div>
        <div className="h-4 w-24 bg-slate-700 rounded" />
      </div>
    </div>
  );
}

function CategorySidebarSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-800 animate-pulse"
        >
          <div className="h-4 bg-slate-700 rounded w-20" />
          <div className="h-5 w-8 bg-slate-700 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function PopularArticlesSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-3 bg-slate-800 rounded-lg animate-pulse">
          <div className="flex items-start gap-2 mb-2">
            <div className="w-3 h-3 bg-slate-700 rounded flex-shrink-0" />
            <div className="h-4 bg-slate-700 rounded w-full" />
          </div>
          <div className="h-3 bg-slate-700 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

// KB Article Card component
function ArticleCard({ article }: { article: KBArticle }) {
  const totalFeedback = article.helpfulCount + article.notHelpfulCount;
  const helpfulPercentage =
    totalFeedback > 0
      ? Math.round((article.helpfulCount / totalFeedback) * 100)
      : null;

  return (
    <Link href={`/kb/article/${article.slug}`} className="block mb-6">
      <div className="p-6 border-2 border-slate-600 rounded-lg hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 transition-all cursor-pointer bg-slate-800 group">
        <div className="flex items-start gap-3 mb-3">
          <BookOpen className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
              {article.title}
            </h3>
            <p className="text-sm text-slate-300 line-clamp-3 mb-3">
              {article.excerpt}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4 text-slate-400">
            {article.categoryName && (
              <span className="px-2 py-1 bg-slate-700 rounded text-slate-300 font-medium">
                {article.categoryName}
              </span>
            )}
            <span>{article.viewCount.toLocaleString()} views</span>
            <span className="text-emerald-400 font-medium">
              {helpfulPercentage !== null
                ? `${helpfulPercentage}% helpful`
                : 'No ratings yet'}
            </span>
          </div>
          <span className="text-slate-500">
            Updated {new Date(article.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function KnowledgeBasePage() {
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Data state
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [totalArticles, setTotalArticles] = useState(0);
  const [popularArticles, setPopularArticles] = useState<PopularArticle[]>([]);

  // Loading states
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Permission state
  const [canManageKB, setCanManageKB] = useState(false);

  // Fetch user permissions
  useEffect(() => {
    async function checkPermissions() {
      try {
        const res = await fetch('/api/user', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.role) {
            setCanManageKB(canViewPrivateMessages(data.role as UserRole));
          }
        }
      } catch {
        // Silently fail - button won't show
      }
    }
    checkPermissions();
  }, []);

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      setIsLoadingCategories(true);
      try {
        const res = await fetch('/api/kb/public/categories', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setCategories(data.categories);
            setTotalArticles(data.totalArticles);
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    }
    fetchCategories();
  }, []);

  // Fetch popular articles
  useEffect(() => {
    async function fetchPopularArticles() {
      setIsLoadingPopular(true);
      try {
        const res = await fetch('/api/kb/public/popular?limit=5', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setPopularArticles(data.articles);
          }
        }
      } catch (error) {
        console.error('Error fetching popular articles:', error);
      } finally {
        setIsLoadingPopular(false);
      }
    }
    fetchPopularArticles();
  }, []);

  // Fetch articles with search and filter
  const fetchArticles = useCallback(async () => {
    setIsLoadingArticles(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedCategory) params.set('category', selectedCategory);
      params.set('page', page.toString());
      params.set('limit', '10');

      const res = await fetch(`/api/kb/public/articles?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setArticles(data.articles);
          setHasMore(data.pagination.hasMore);
          setTotal(data.pagination.total);
        }
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setIsLoadingArticles(false);
    }
  }, [debouncedSearch, selectedCategory, page]);

  // Fetch articles when search/filter/page changes
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Reset to page 1 when search or category changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategory]);

  // Get selected category name for display
  const selectedCategoryName = selectedCategory
    ? categories.find((c) => c.id === selectedCategory)?.name
    : null;

  // Handle category selection
  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setShowFilters(false);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
  };

  return (
    <div className="flex h-screen bg-gradient-to-b from-slate-50 to-blue-50">
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 border-b border-slate-700 shadow-xl px-6 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-orange-500" />
                <h1 className="text-2xl font-bold text-white">
                  Knowledge Base
                </h1>
              </div>
              {canManageKB && (
                <Link
                  href="/kb/manage"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-orange-500/30"
                >
                  <Settings className="w-4 h-4" />
                  Manage
                </Link>
              )}
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles, guides, and FAQs..."
                className="w-full pl-12 pr-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                autoFocus
              />
              {isLoadingArticles && debouncedSearch && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
              )}
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filter by category
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {/* Active filters */}
            {selectedCategoryName && (
              <div className="mb-6 flex items-center gap-2">
                <span className="text-sm text-slate-600">Filtered by:</span>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 border border-orange-300 rounded-lg text-orange-700 text-sm font-medium hover:bg-orange-200 transition-colors"
                >
                  {selectedCategoryName}
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Results count */}
            <div className="mb-4">
              <p className="text-sm text-slate-600">
                {isLoadingArticles
                  ? 'Loading articles...'
                  : total === 0
                    ? 'No articles found'
                    : total === 1
                      ? '1 article found'
                      : `${total} articles found`}
              </p>
            </div>

            {/* Loading state */}
            {isLoadingArticles ? (
              <div className="space-y-8">
                {[...Array(3)].map((_, i) => (
                  <ArticleCardSkeleton key={i} />
                ))}
              </div>
            ) : articles.length > 0 ? (
              <>
                {/* Articles */}
                <div>
                  {articles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>

                {/* Pagination */}
                {(hasMore || page > 1) && (
                  <div className="mt-8 flex justify-center gap-4">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-slate-600">
                      Page {page}
                    </span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasMore}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              // Empty state
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-700 mb-2">
                  {debouncedSearch || selectedCategory
                    ? 'No articles found'
                    : 'No articles yet'}
                </h3>
                <p className="text-slate-500 mb-6">
                  {debouncedSearch || selectedCategory
                    ? 'Try adjusting your search or browse all articles'
                    : 'Knowledge base articles will appear here once published'}
                </p>
                {(debouncedSearch || selectedCategory) && (
                  <button
                    onClick={clearFilters}
                    className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transform hover:scale-105"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Sidebar (Desktop) */}
      <aside
        className={`
          ${showFilters ? 'block' : 'hidden lg:block'}
          w-full lg:w-80 bg-gradient-to-b from-slate-800 to-slate-900 border-l border-slate-700 flex-shrink-0 shadow-2xl
          fixed lg:relative inset-0 z-50 lg:z-auto
        `}
      >
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Categories</h3>
          <button
            onClick={() => setShowFilters(false)}
            className="lg:hidden p-1.5 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {isLoadingCategories ? (
          <CategorySidebarSkeleton />
        ) : (
          <nav className="p-4 space-y-1">
            {/* All category */}
            <button
              onClick={() => handleCategorySelect(null)}
              className={`
                w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all text-left
                ${
                  selectedCategory === null
                    ? 'bg-orange-500/10 text-orange-500 border-2 border-orange-500 shadow-lg shadow-orange-500/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white border-2 border-transparent'
                }
              `}
            >
              <span className="font-medium">All</span>
              <span
                className={`
                  text-xs px-2 py-0.5 rounded-full
                  ${
                    selectedCategory === null
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }
                `}
              >
                {totalArticles}
              </span>
            </button>

            {/* Category list */}
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`
                  w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all text-left
                  ${
                    selectedCategory === category.id
                      ? 'bg-orange-500/10 text-orange-500 border-2 border-orange-500 shadow-lg shadow-orange-500/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white border-2 border-transparent'
                  }
                `}
              >
                <span className="font-medium">{category.name}</span>
                <span
                  className={`
                    text-xs px-2 py-0.5 rounded-full
                    ${
                      selectedCategory === category.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-700 text-slate-400'
                    }
                  `}
                >
                  {category.articleCount}
                </span>
              </button>
            ))}
          </nav>
        )}

        {/* Popular articles */}
        <div className="px-6 py-5 border-t border-slate-700">
          <h4 className="text-sm font-bold text-white mb-3">
            Popular Articles
          </h4>
          {isLoadingPopular ? (
            <PopularArticlesSkeleton />
          ) : popularArticles.length > 0 ? (
            <div className="space-y-3">
              {popularArticles.map((article) => (
                <Link key={article.id} href={`/kb/article/${article.slug}`}>
                  <div className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors group">
                    <div className="flex items-start gap-2 mb-2">
                      <BookOpen className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                      <h5 className="text-xs font-medium text-white line-clamp-2 group-hover:text-orange-400 transition-colors">
                        {article.title}
                      </h5>
                    </div>
                    <p className="text-xs text-slate-400">
                      {article.viewCount.toLocaleString()} views
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No popular articles yet</p>
          )}
        </div>
      </aside>

      {/* Mobile backdrop */}
      {showFilters && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}
