'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Eye,
  ThumbsUp,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

// Types for KB Analytics response
interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  categoryId: string | null;
  categoryName: string;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  helpfulPercentage: number | null;
  deflectionCount: number;
  publishedAt: string | null;
}

interface TimelineEntry {
  period: string;
  count: number;
}

interface CategoryBreakdown {
  categoryId: string | null;
  categoryName: string;
  count: number;
  percentage: number;
}

interface Totals {
  totalArticles: number;
  totalViews: number;
  totalDeflections: number;
  avgHelpfulness: number | null;
  previousPeriod: {
    totalArticles: number;
    totalViews: number;
    totalDeflections: number;
    avgHelpfulness: number | null;
  };
}

interface KBAnalyticsResponse {
  popularArticles: ArticleSummary[];
  mostHelpful: ArticleSummary[];
  leastHelpful: ArticleSummary[];
  timeline: TimelineEntry[];
  categoryBreakdown: CategoryBreakdown[];
  totals: Totals;
  success: boolean;
  error?: string;
}

// Color classes for metric cards
const colorClasses = {
  blue: 'from-blue-500 to-blue-600',
  orange: 'from-orange-500 to-orange-600',
  emerald: 'from-emerald-500 to-emerald-600',
  purple: 'from-purple-500 to-purple-600',
};

interface MetricCardProps {
  label: string;
  value: string;
  trend: number | null;
  trendLabel: string;
  icon: React.ElementType;
  color: keyof typeof colorClasses;
  isLoading?: boolean;
}

function MetricCard({
  label,
  value,
  trend,
  trendLabel,
  icon: Icon,
  color,
  isLoading,
}: MetricCardProps) {
  const isPositive = trend !== null && trend > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  if (isLoading) {
    return (
      <div className="rounded-lg border-2 border-slate-200 bg-white p-6 shadow-lg">
        <div className="animate-pulse">
          <div className="mb-4 flex items-start justify-between">
            <div className="h-12 w-12 rounded-lg bg-slate-200" />
            <div className="h-5 w-16 rounded bg-slate-200" />
          </div>
          <div className="mb-2 h-4 w-24 rounded bg-slate-200" />
          <div className="mb-2 h-8 w-20 rounded bg-slate-200" />
          <div className="h-3 w-20 rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-slate-200 bg-white p-6 shadow-lg transition-shadow hover:shadow-xl">
      <div className="mb-4 flex items-start justify-between">
        <div
          className={`rounded-lg bg-gradient-to-br p-3 ${colorClasses[color]}`}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
        {trend !== null && (
          <div
            className={`flex items-center gap-1 text-sm font-semibold ${
              isPositive ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            <TrendIcon className="h-4 w-4" />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="mb-1 text-sm text-slate-600">{label}</p>
      <p className="mb-1 text-3xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{trendLabel}</p>
    </div>
  );
}

interface KBAnalyticsTabProps {
  dateRange: string;
}

export function KBAnalyticsTab({ dateRange }: KBAnalyticsTabProps) {
  const [data, setData] = useState<KBAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Calculate date range based on selection
  const getDateParams = useCallback(() => {
    const end = new Date();
    const start = new Date();

    switch (dateRange) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      default:
        start.setDate(end.getDate() - 7);
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      period: dateRange,
    };
  }, [dateRange]);

  // Fetch KB analytics data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = getDateParams();
        const searchParams = new URLSearchParams({
          startDate: params.startDate,
          endDate: params.endDate,
          period: params.period,
        });

        const response = await fetch(`/api/kb/analytics?${searchParams}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch analytics');
        }

        const result: KBAnalyticsResponse = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [getDateParams]);

  // Handle CSV export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = getDateParams();
      const searchParams = new URLSearchParams({
        startDate: params.startDate,
        endDate: params.endDate,
      });

      const response = await fetch(`/api/kb/analytics/export?${searchParams}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kb-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate trends
  const calculateTrend = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? 100 : null;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
        <h3 className="mb-2 text-lg font-semibold text-slate-900">
          Failed to load analytics
        </h3>
        <p className="text-sm text-slate-600">{error}</p>
      </div>
    );
  }

  // Empty state
  const isEmpty = !isLoading && data && data.totals.totalArticles === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="mb-4 h-12 w-12 text-slate-300" />
        <h3 className="mb-2 text-lg font-semibold text-slate-900">
          No KB articles yet
        </h3>
        <p className="mb-4 text-sm text-slate-600">
          Publish some knowledge base articles to see analytics here.
        </p>
        <Link
          href="/dashboard/kb/manage"
          className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700"
        >
          Create Article
        </Link>
      </div>
    );
  }

  const maxVolume =
    data && data.timeline.length > 0
      ? Math.max(...data.timeline.map((t) => t.count), 1)
      : 1;

  return (
    <div className="space-y-8">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Published Articles"
          value={
            isLoading ? '-' : data?.totals.totalArticles.toLocaleString() || '0'
          }
          trend={
            data
              ? calculateTrend(
                  data.totals.totalArticles,
                  data.totals.previousPeriod.totalArticles
                )
              : null
          }
          trendLabel="vs last period"
          icon={FileText}
          color="blue"
          isLoading={isLoading}
        />
        <MetricCard
          label="Total Views"
          value={
            isLoading ? '-' : data?.totals.totalViews.toLocaleString() || '0'
          }
          trend={null}
          trendLabel="all time"
          icon={Eye}
          color="orange"
          isLoading={isLoading}
        />
        <MetricCard
          label="Avg Helpfulness"
          value={
            isLoading
              ? '-'
              : data?.totals.avgHelpfulness !== null
                ? `${data?.totals.avgHelpfulness}%`
                : 'N/A'
          }
          trend={null}
          trendLabel="based on feedback"
          icon={ThumbsUp}
          color="emerald"
          isLoading={isLoading}
        />
        <MetricCard
          label="Deflections"
          value={
            isLoading
              ? '-'
              : data?.totals.totalDeflections.toLocaleString() || '0'
          }
          trend={
            data
              ? calculateTrend(
                  data.totals.totalDeflections,
                  data.totals.previousPeriod.totalDeflections
                )
              : null
          }
          trendLabel="issues resolved via KB"
          icon={Sparkles}
          color="purple"
          isLoading={isLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Timeline Chart */}
        <div className="rounded-lg border-2 border-slate-200 bg-white p-6 shadow-lg">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              Articles Published
            </h3>
            <span className="text-sm text-slate-500">
              {dateRange === '7d'
                ? 'Last 7 days'
                : dateRange === '30d'
                  ? 'Last 30 days'
                  : 'Last 90 days'}
            </span>
          </div>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : data && data.timeline.length > 0 ? (
            <div className="flex h-64 items-end justify-between gap-1">
              {data.timeline.slice(0, 14).map((entry) => {
                const height = (entry.count / maxVolume) * 100;
                const dateLabel = new Date(entry.period).toLocaleDateString(
                  'en-US',
                  { month: 'short', day: 'numeric' }
                );
                return (
                  <div
                    key={entry.period}
                    className="flex flex-1 flex-col items-center gap-2"
                    title={`${dateLabel}: ${entry.count} articles`}
                  >
                    <div className="flex w-full flex-col items-center">
                      {entry.count > 0 && (
                        <span className="mb-1 text-xs font-semibold text-slate-700">
                          {entry.count}
                        </span>
                      )}
                      <div
                        className="w-full cursor-pointer rounded-t-lg bg-gradient-to-t from-orange-500 to-orange-400 transition-all hover:from-orange-600 hover:to-orange-500"
                        style={{
                          height:
                            entry.count > 0 ? `${Math.max(height, 5)}%` : '4px',
                          minHeight: entry.count > 0 ? '20px' : '4px',
                          opacity: entry.count > 0 ? 1 : 0.3,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-600 [writing-mode:vertical-lr] rotate-180">
                      {dateLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-slate-500">
              No articles published in this period
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="rounded-lg border-2 border-slate-200 bg-white p-6 shadow-lg">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              Articles by Category
            </h3>
          </div>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="h-4 w-24 rounded bg-slate-200" />
                    <div className="h-4 w-12 rounded bg-slate-200" />
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          ) : data && data.categoryBreakdown.length > 0 ? (
            <div className="space-y-4">
              {data.categoryBreakdown.map((category) => (
                <div key={category.categoryId || 'uncategorized'}>
                  <div className="mb-2 flex items-center justify-between">
                    <Link
                      href={`/kb?category=${category.categoryId || ''}`}
                      className="text-sm font-medium text-slate-700 hover:text-orange-600"
                    >
                      {category.categoryName}
                    </Link>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-900">
                        {category.count}
                      </span>
                      <span className="text-xs text-slate-500">
                        {category.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all"
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-slate-500">
              No category data available
            </div>
          )}
        </div>
      </div>

      {/* Popular Articles Table */}
      {!isLoading && data && data.popularArticles.length > 0 && (
        <div className="overflow-hidden rounded-lg border-2 border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <h3 className="text-lg font-bold text-slate-900">
              Popular Articles
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Article
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Helpful
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.popularArticles.map((article, index) => (
                  <tr
                    key={article.id}
                    className="transition-colors hover:bg-orange-50"
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                          index < 3
                            ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/kb/article/${article.slug}`}
                        className="font-medium text-slate-900 hover:text-orange-600"
                      >
                        {article.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {article.categoryName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-900">
                        {article.viewCount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {article.helpfulPercentage !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all ${
                                article.helpfulPercentage >= 70
                                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                  : article.helpfulPercentage >= 50
                                    ? 'bg-gradient-to-r from-orange-500 to-orange-400'
                                    : 'bg-gradient-to-r from-red-500 to-red-400'
                              }`}
                              style={{ width: `${article.helpfulPercentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-900">
                            {article.helpfulPercentage}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Helpfulness Sections */}
      {!isLoading &&
        data &&
        (data.mostHelpful.length > 0 || data.leastHelpful.length > 0) && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Most Helpful */}
            {data.mostHelpful.length > 0 && (
              <div className="overflow-hidden rounded-lg border-2 border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-200 bg-emerald-50 px-6 py-4">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-emerald-800">
                    <ThumbsUp className="h-5 w-5" />
                    Most Helpful Articles
                  </h3>
                </div>
                <div className="divide-y divide-slate-200">
                  {data.mostHelpful.slice(0, 5).map((article) => (
                    <div
                      key={article.id}
                      className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-emerald-50"
                    >
                      <div>
                        <Link
                          href={`/kb/article/${article.slug}`}
                          className="font-medium text-slate-900 hover:text-emerald-600"
                        >
                          {article.title}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {article.categoryName}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-emerald-600">
                          {article.helpfulPercentage}%
                        </span>
                        <p className="text-xs text-slate-500">
                          {article.helpfulCount + article.notHelpfulCount} votes
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Least Helpful */}
            {data.leastHelpful.length > 0 && (
              <div className="overflow-hidden rounded-lg border-2 border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-200 bg-amber-50 px-6 py-4">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-amber-800">
                    <AlertCircle className="h-5 w-5" />
                    Needs Improvement
                  </h3>
                </div>
                <div className="divide-y divide-slate-200">
                  {data.leastHelpful.slice(0, 5).map((article) => (
                    <div
                      key={article.id}
                      className={`flex items-center justify-between px-6 py-4 transition-colors hover:bg-amber-50 ${
                        article.helpfulPercentage !== null &&
                        article.helpfulPercentage < 50
                          ? 'bg-amber-25'
                          : ''
                      }`}
                    >
                      <div>
                        <Link
                          href={`/kb/article/${article.slug}`}
                          className="font-medium text-slate-900 hover:text-amber-600"
                        >
                          {article.title}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {article.categoryName}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-lg font-bold ${
                            article.helpfulPercentage !== null &&
                            article.helpfulPercentage < 50
                              ? 'text-red-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {article.helpfulPercentage}%
                        </span>
                        <p className="text-xs text-slate-500">
                          {article.helpfulCount + article.notHelpfulCount} votes
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          disabled={isExporting || isLoading}
          className="transform rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-orange-500/30 transition-all hover:scale-105 hover:from-orange-600 hover:to-orange-700 hover:shadow-xl hover:shadow-orange-500/40 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExporting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting...
            </span>
          ) : (
            'Export KB Data as CSV'
          )}
        </button>
      </div>
    </div>
  );
}
