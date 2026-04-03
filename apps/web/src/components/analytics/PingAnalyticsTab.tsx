'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Inbox,
  Radio,
  BarChart3,
  AlertCircle,
  Loader2,
  Users,
  ChevronRight,
  User,
} from 'lucide-react';

// Types for Ping Analytics response
interface VolumeEntry {
  date: string;
  count: number;
}

interface CategoryBreakdown {
  categoryId: string | null;
  categoryName: string;
  count: number;
  percentage: number;
}

interface PeriodTotals {
  totalPings: number;
  avgResolutionTimeMinutes: number | null;
  slaComplianceRate: number | null;
}

interface Totals extends PeriodTotals {
  openPings: number;
  previousPeriod: PeriodTotals;
}

interface PingAnalyticsResponse {
  totals: Totals;
  volume: VolumeEntry[];
  categoryBreakdown: CategoryBreakdown[];
  success: boolean;
  error?: string;
}

// Types for Agent Analytics response
interface AgentMetrics {
  agentId: string;
  agentName: string;
  avatarUrl: string | null;
  pingsResolved: number;
  avgResolutionTimeMinutes: number | null;
  slaComplianceRate: number | null;
  avgFirstResponseMinutes: number | null;
  pingsAssigned: number;
}

interface AgentAnalyticsResponse {
  agents: AgentMetrics[];
  period: {
    startDate: string;
    endDate: string;
  };
  success: boolean;
  error?: string;
}

// Color classes for metric cards
const colorClasses = {
  blue: 'from-blue-500 to-blue-600',
  orange: 'from-orange-500 to-orange-600',
  emerald: 'from-emerald-500 to-emerald-600',
  slate: 'from-slate-500 to-slate-600',
};

interface MetricCardProps {
  label: string;
  value: string;
  trend: number | null;
  trendLabel: string;
  icon: React.ElementType;
  color: keyof typeof colorClasses;
  isLoading?: boolean;
  showTrend?: boolean;
}

function MetricCard({
  label,
  value,
  trend,
  trendLabel,
  icon: Icon,
  color,
  isLoading,
  showTrend = true,
}: MetricCardProps) {
  const isPositive = trend !== null && trend > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  if (isLoading) {
    return (
      <div
        className="rounded-lg border-2 border-slate-200 bg-white p-6 shadow-lg"
        aria-label={`Loading ${label}`}
      >
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
    <div
      className="rounded-lg border-2 border-slate-200 bg-white p-6 shadow-lg transition-shadow hover:shadow-xl"
      aria-label={`${label}: ${value}${trend !== null && showTrend ? `, ${trend > 0 ? 'up' : 'down'} ${Math.abs(trend)}%` : ''}`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div
          className={`rounded-lg bg-gradient-to-br p-3 ${colorClasses[color]}`}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
        {showTrend && trend !== null && (
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

/**
 * Format resolution time in minutes to human-readable string
 */
function formatResolutionTime(minutes: number | null): string {
  if (minutes === null) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Calculate trend percentage between current and previous period
 */
function calculateTrend(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Format date label based on date range period
 */
function formatDateLabel(dateStr: string, period: string): string {
  const date = new Date(dateStr);
  if (period === '7d') {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else if (period === '30d') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    return `Wk ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
}

/**
 * Aggregate volume data by week for 90-day view
 */
function aggregateVolumeByWeek(data: VolumeEntry[]): VolumeEntry[] {
  const weekMap = new Map<string, number>();

  data.forEach((entry) => {
    const date = new Date(entry.date);
    // Get start of week (Sunday)
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toISOString().split('T')[0];

    weekMap.set(key, (weekMap.get(key) || 0) + entry.count);
  });

  return Array.from(weekMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

interface PingAnalyticsTabProps {
  dateRange: string;
}

export function PingAnalyticsTab({ dateRange }: PingAnalyticsTabProps) {
  const router = useRouter();
  const [data, setData] = useState<PingAnalyticsResponse | null>(null);
  const [agentData, setAgentData] = useState<AgentAnalyticsResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isAgentLoading, setIsAgentLoading] = useState(true);
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

  // Fetch ping analytics data
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

        const response = await fetch(`/api/analytics/pings?${searchParams}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          // 403 is expected for agents - they don't have access to ping analytics
          // Just silently set data to null and don't show error
          if (response.status === 403) {
            setData(null);
            return;
          }
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch analytics');
        }

        const result: PingAnalyticsResponse = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [getDateParams]);

  // Fetch agent analytics data
  useEffect(() => {
    const fetchAgentData = async () => {
      setIsAgentLoading(true);

      try {
        const params = getDateParams();
        const searchParams = new URLSearchParams({
          startDate: params.startDate,
          endDate: params.endDate,
          period: params.period,
        });

        const response = await fetch(`/api/analytics/agents?${searchParams}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          // Don't set error state - just silently fail for agent data
          // (e.g., if user doesn't have permission)
          setAgentData(null);
          return;
        }

        const result: AgentAnalyticsResponse = await response.json();
        setAgentData(result);
      } catch {
        // Silently fail - agent data is optional
        setAgentData(null);
      } finally {
        setIsAgentLoading(false);
      }
    };

    fetchAgentData();
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

      const response = await fetch(
        `/api/analytics/pings/export?${searchParams}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ping-analytics-${new Date().toISOString().split('T')[0]}.csv`;
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

  // Loading state - wait for both pings and agent data to load
  if (isLoading || isAgentLoading) {
    return (
      <div className="space-y-8">
        {/* Metrics Cards skeleton */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-lg border-2 border-slate-200 bg-white p-6 shadow-lg"
            >
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-8 w-16 rounded bg-slate-200" />
                <div className="h-3 w-20 rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
        {/* Volume chart skeleton */}
        <div className="rounded-lg border-2 border-slate-200 bg-white p-6 shadow-lg">
          <div className="mb-6 flex items-center justify-between">
            <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      </div>
    );
  }

  // Agent-only view - no ping data access (403)
  // Show only their personal performance metrics
  const isAgentView = !isLoading && !data;

  // Empty state
  const isEmpty =
    !isLoading &&
    data?.totals?.totalPings === 0 &&
    data?.totals?.openPings === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Radio className="mb-4 h-12 w-12 text-slate-300" />
        <h3 className="mb-2 text-lg font-semibold text-slate-900">
          No pings in this period
        </h3>
        <p className="mb-4 text-sm text-slate-600">
          Try selecting a longer date range
        </p>
        <Link
          href="/dashboard/inbox"
          className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700"
        >
          View Inbox
        </Link>
      </div>
    );
  }

  // Agent-only view - show just their performance metrics
  if (isAgentView) {
    const agentPeriodLabel =
      dateRange === '7d'
        ? 'Last 7 days'
        : dateRange === '30d'
          ? 'Last 30 days'
          : 'Last 90 days';

    return (
      <div className="space-y-8">
        {/* Header for agent view */}
        <div className="rounded-lg border-2 border-blue-100 bg-blue-50 p-4">
          <p className="text-sm text-blue-700">
            Viewing your personal performance metrics for{' '}
            {agentPeriodLabel.toLowerCase()}
          </p>
        </div>

        {/* Agent Performance Table */}
        <div className="rounded-lg border-2 border-slate-200 bg-white p-6 shadow-lg">
          <div className="mb-6 flex items-center gap-3">
            <Users className="h-5 w-5 text-slate-400" />
            <h3 className="text-lg font-bold text-slate-900">
              Your Performance
            </h3>
          </div>

          {isAgentLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <div className="h-10 w-10 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded bg-slate-200" />
                      <div className="h-3 w-48 rounded bg-slate-200" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : agentData && agentData.agents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm font-semibold text-slate-600">
                    <th className="pb-3 pl-4">Agent</th>
                    <th className="pb-3 text-center">Pings Resolved</th>
                    <th className="pb-3 text-center">Avg Resolution</th>
                    <th className="pb-3 text-center">Avg First Response</th>
                    <th className="pb-3 text-center">SLA Compliance</th>
                    <th className="pb-3 pr-4 text-right">Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {agentData.agents.map((agent) => (
                    <tr
                      key={agent.agentId}
                      onClick={() =>
                        router.push(
                          `/dashboard/analytics/agents/${agent.agentId}`
                        )
                      }
                      className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50"
                    >
                      <td className="py-4 pl-4">
                        <div className="flex items-center gap-3">
                          {agent.avatarUrl ? (
                            <img
                              src={agent.avatarUrl}
                              alt={agent.agentName}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
                              <User className="h-5 w-5 text-white" />
                            </div>
                          )}
                          <span className="font-medium text-slate-900">
                            {agent.agentName}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <span className="font-semibold text-slate-900">
                          {agent.pingsResolved}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <span className="text-slate-700">
                          {formatResolutionTime(agent.avgResolutionTimeMinutes)}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <span className="text-slate-700">
                          {formatResolutionTime(agent.avgFirstResponseMinutes)}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        {agent.slaComplianceRate !== null ? (
                          <span
                            className={`font-semibold ${
                              agent.slaComplianceRate >= 90
                                ? 'text-emerald-600'
                                : agent.slaComplianceRate >= 70
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {agent.slaComplianceRate}%
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-4 pr-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-slate-600">
                            {agent.pingsAssigned}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-slate-300" />
              <p className="text-sm text-slate-500">
                No performance data available for this period
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Process volume data for display
  const volumeData =
    dateRange === '90d' && data?.volume
      ? aggregateVolumeByWeek(data.volume)
      : data?.volume || [];

  const maxVolume =
    volumeData.length > 0 ? Math.max(...volumeData.map((d) => d.count), 1) : 1;

  const periodLabel =
    dateRange === '7d'
      ? 'Last 7 days'
      : dateRange === '30d'
        ? 'Last 30 days'
        : 'Last 90 days';

  return (
    <div className="space-y-8">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Pings"
          value={
            isLoading ? '-' : data?.totals?.totalPings?.toLocaleString() || '0'
          }
          trend={
            data
              ? calculateTrend(
                  data.totals.totalPings,
                  data.totals.previousPeriod.totalPings
                )
              : null
          }
          trendLabel="vs last period"
          icon={Radio}
          color="blue"
          isLoading={isLoading}
        />
        <MetricCard
          label="Avg Resolution Time"
          value={
            isLoading
              ? '-'
              : formatResolutionTime(
                  data?.totals?.avgResolutionTimeMinutes ?? null
                )
          }
          trend={
            data?.totals?.avgResolutionTimeMinutes != null &&
            data?.totals?.previousPeriod?.avgResolutionTimeMinutes != null
              ? calculateTrend(
                  data!.totals.avgResolutionTimeMinutes!,
                  data!.totals.previousPeriod.avgResolutionTimeMinutes!
                )
              : null
          }
          trendLabel="vs last period"
          icon={Clock}
          color="orange"
          isLoading={isLoading}
        />
        <MetricCard
          label="SLA Compliance"
          value={
            isLoading
              ? '-'
              : data?.totals?.slaComplianceRate !== null
                ? `${data!.totals.slaComplianceRate}%`
                : 'N/A'
          }
          trend={
            data?.totals?.slaComplianceRate != null &&
            data?.totals?.previousPeriod?.slaComplianceRate != null
              ? calculateTrend(
                  data!.totals.slaComplianceRate!,
                  data!.totals.previousPeriod.slaComplianceRate!
                )
              : null
          }
          trendLabel="vs last period"
          icon={CheckCircle2}
          color="emerald"
          isLoading={isLoading}
        />
        <MetricCard
          label="Open Pings"
          value={
            isLoading ? '-' : data?.totals?.openPings?.toLocaleString() || '0'
          }
          trend={null}
          trendLabel="currently open"
          icon={Inbox}
          color="slate"
          isLoading={isLoading}
          showTrend={false}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Volume Chart */}
        <div
          className="rounded-lg border-2 border-slate-200 bg-white p-6 shadow-lg"
          role="img"
          aria-label={`Ping volume chart for ${periodLabel}`}
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Ping Volume</h3>
            <span className="text-sm text-slate-500">{periodLabel}</span>
          </div>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : volumeData.length > 0 ? (
            <div
              className={`flex h-64 items-end justify-between ${
                dateRange === '30d' ? 'gap-1' : 'gap-2'
              }`}
            >
              {volumeData.map((entry) => {
                const height =
                  entry.count > 0 ? (entry.count / maxVolume) * 100 : 0;
                return (
                  <div
                    key={entry.date}
                    className="flex flex-1 flex-col items-center gap-2"
                    title={`${formatDateLabel(entry.date, dateRange)}: ${entry.count} pings`}
                  >
                    <div className="flex w-full flex-col items-center">
                      {entry.count > 0 && dateRange !== '30d' && (
                        <span className="mb-1 text-xs font-semibold text-slate-700">
                          {entry.count}
                        </span>
                      )}
                      <div
                        className="w-full cursor-pointer rounded-t-lg bg-gradient-to-t from-blue-500 to-blue-400 transition-all hover:from-orange-500 hover:to-orange-400"
                        style={{
                          height:
                            entry.count > 0 ? `${Math.max(height, 5)}%` : '4px',
                          minHeight: entry.count > 0 ? '20px' : '4px',
                          opacity: entry.count > 0 ? 1 : 0.3,
                        }}
                      />
                    </div>
                    {dateRange !== '30d' && (
                      <span className="text-xs font-medium text-slate-600">
                        {formatDateLabel(entry.date, dateRange)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-slate-500">
              No ping data for this period
            </div>
          )}
        </div>

        {/* Category Distribution */}
        <div className="rounded-lg border-2 border-slate-200 bg-white p-6 shadow-lg">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              Pings by Category
            </h3>
            <BarChart3 className="h-5 w-5 text-slate-400" />
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
                    <span className="text-sm font-medium text-slate-700">
                      {category.categoryName}
                    </span>
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
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
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

      {/* Agent Performance Table */}
      <div className="rounded-lg border-2 border-slate-200 bg-white p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-slate-400" />
            <h3 className="text-lg font-bold text-slate-900">
              Agent Performance
            </h3>
          </div>
          {agentData && agentData.agents.length > 1 && (
            <span className="text-sm text-slate-500">
              {agentData.agents.length} agents
            </span>
          )}
        </div>

        {isAgentLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <div className="h-10 w-10 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-slate-200" />
                    <div className="h-3 w-48 rounded bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : agentData && agentData.agents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-sm font-semibold text-slate-600">
                  <th className="pb-3 pl-4">Agent</th>
                  <th className="pb-3 text-center">Pings Resolved</th>
                  <th className="pb-3 text-center">Avg Resolution</th>
                  <th className="pb-3 text-center">Avg First Response</th>
                  <th className="pb-3 text-center">SLA Compliance</th>
                  <th className="pb-3 pr-4 text-right">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {agentData.agents.map((agent, index) => (
                  <tr
                    key={agent.agentId}
                    onClick={() =>
                      router.push(
                        `/dashboard/analytics/agents/${agent.agentId}`
                      )
                    }
                    className={`cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                      index === 0 && agentData.agents.length > 1
                        ? 'bg-amber-50/50'
                        : ''
                    }`}
                  >
                    <td className="py-4 pl-4">
                      <div className="flex items-center gap-3">
                        {agent.avatarUrl ? (
                          <img
                            src={agent.avatarUrl}
                            alt={agent.agentName}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
                            <User className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">
                              {agent.agentName}
                            </span>
                            {index === 0 && agentData.agents.length > 1 && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                Top Performer
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-center">
                      <span className="font-semibold text-slate-900">
                        {agent.pingsResolved}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-slate-700">
                        {formatResolutionTime(agent.avgResolutionTimeMinutes)}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-slate-700">
                        {formatResolutionTime(agent.avgFirstResponseMinutes)}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      {agent.slaComplianceRate !== null ? (
                        <span
                          className={`font-semibold ${
                            agent.slaComplianceRate >= 90
                              ? 'text-emerald-600'
                              : agent.slaComplianceRate >= 70
                                ? 'text-amber-600'
                                : 'text-red-600'
                          }`}
                        >
                          {agent.slaComplianceRate}%
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-slate-600">
                          {agent.pingsAssigned}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-4 h-12 w-12 text-slate-300" />
            <p className="text-sm text-slate-500">
              No agent performance data available for this period
            </p>
          </div>
        )}
      </div>

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
            'Export as CSV'
          )}
        </button>
      </div>
    </div>
  );
}
