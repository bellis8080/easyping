'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  FileText,
  Archive,
  Eye,
  Calendar,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

export interface KBArticleSummary {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  categoryId: string | null;
  categoryName: string | null;
  sourcePingId: string | null;
  sourcePingNumber: number | null;
  enhancesArticleId: string | null;
  createdAt: string;
  publishedAt: string | null;
  publishedBy: string | null;
  publishedByName: string | null;
  viewCount: number;
}

interface KBArticleListProps {
  status: 'draft' | 'published' | 'archived';
  searchQuery?: string;
  onCountChange?: (count: number) => void;
}

export function KBArticleList({
  status,
  searchQuery = '',
  onCountChange,
}: KBArticleListProps) {
  const [articles, setArticles] = useState<KBArticleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchArticles = useCallback(
    async (pageNum: number, append = false) => {
      try {
        if (!append) {
          setIsLoading(true);
        }
        setError(null);

        const params = new URLSearchParams({
          status,
          page: pageNum.toString(),
          limit: limit.toString(),
        });
        if (searchQuery) {
          params.set('search', searchQuery);
        }

        const response = await fetch(`/api/kb/articles?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch articles');
        }

        const data = await response.json();
        const fetchedArticles: KBArticleSummary[] = data.articles || [];
        const pagination = data.pagination || { total: 0, hasMore: false };

        if (append) {
          setArticles((prev) => [...prev, ...fetchedArticles]);
        } else {
          setArticles(fetchedArticles);
        }

        setHasMore(pagination.hasMore);
        setTotal(pagination.total);
        onCountChange?.(pagination.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    },
    [status, searchQuery, onCountChange]
  );

  // Reset and fetch when status or search changes
  useEffect(() => {
    setPage(1);
    fetchArticles(1);
  }, [status, searchQuery, fetchArticles]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArticles(nextPage, true);
  };

  // Loading skeleton
  if (isLoading && articles.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <ArticleCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-2">Error loading articles</div>
        <p className="text-slate-500 text-sm">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => fetchArticles(1)}
        >
          Try again
        </Button>
      </div>
    );
  }

  // Empty state
  if (articles.length === 0) {
    return <EmptyState status={status} />;
  }

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}

      {hasMore && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            {isLoading
              ? 'Loading...'
              : `Load more (${articles.length} of ${total})`}
          </Button>
        </div>
      )}
    </div>
  );
}

function ArticleCard({ article }: { article: KBArticleSummary }) {
  const isEnhancementDraft = article.enhancesArticleId !== null;

  return (
    <Link href={`/kb/manage/${article.id}`}>
      <div className="p-5 border-2 border-slate-200 rounded-lg hover:border-orange-400 hover:shadow-md transition-all bg-white group">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-orange-600 transition-colors truncate">
                {article.title}
              </h3>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 flex-shrink-0" />
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              {article.categoryName && (
                <Badge variant="secondary" className="text-xs">
                  {article.categoryName}
                </Badge>
              )}
              {isEnhancementDraft && (
                <Badge variant="warning" className="text-xs gap-1">
                  <Sparkles className="w-3 h-3" />
                  Enhancement draft
                </Badge>
              )}
              {article.sourcePingId && article.sourcePingNumber && (
                <span className="text-xs text-slate-500">
                  from Ping #{article.sourcePingNumber}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDistanceToNow(new Date(article.createdAt), {
                  addSuffix: true,
                })}
              </span>

              {article.status === 'published' && (
                <>
                  {article.publishedByName && (
                    <span>by {article.publishedByName}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {article.viewCount} views
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ArticleCardSkeleton() {
  return (
    <div className="p-5 border-2 border-slate-200 rounded-lg bg-white">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <Skeleton className="h-6 w-3/4 mb-3" />
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  status,
}: {
  status: 'draft' | 'published' | 'archived';
}) {
  const config = {
    draft: {
      icon: FileText,
      title: 'No draft articles yet',
      description: 'Create a new article or resolve a ping to generate drafts',
      action: (
        <Link href="/kb/manage/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            Create New Article
          </Button>
        </Link>
      ),
    },
    published: {
      icon: BookOpen,
      title: 'No published articles yet',
      description:
        'Review and publish draft articles to make them visible to users',
      action: null,
    },
    archived: {
      icon: Archive,
      title: 'No archived articles',
      description: 'Deleted articles will appear here',
      action: null,
    },
  };

  const { icon: Icon, title, description, action } = config[status];

  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 mb-6 max-w-md mx-auto">{description}</p>
      {action}
    </div>
  );
}
