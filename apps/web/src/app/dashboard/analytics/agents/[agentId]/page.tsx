'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Radio,
  Clock,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

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
  icon: React.ElementType;
  color: keyof typeof colorClasses;
  isLoading?: boolean;
  trend?: number | null;
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  isLoading,
  trend,
}: MetricCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border-2 border-slate-200 bg-white p-6 shadow-lg">
        <div className="animate-pulse">
          <div className="mb-4 flex items-start justify-between">
            <div className="h-12 w-12 rounded-lg bg-slate-200" />
          </div>
          <div className="mb-2 h-4 w-24 rounded bg-slate-200" />
          <div className="h-8 w-20 rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  const isPositive = trend !== null && trend !== undefined && trend > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-lg border-2 border-slate-200 bg-white p-6 shadow-lg transition-shadow hover:shadow-xl">
      <div className="mb-4 flex items-start justify-between">
        <div
          className={`rounded-lg bg-gradient-to-br p-3 ${colorClasses[color]}`}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
        {trend !== null && trend !== undefined && (
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
      <p className="text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;

  const [dateRange, setDateRange] = useState('7d');
  const [agent, setAgent] = useState<AgentMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch agent data
  useEffect(() => {
    const fetchAgentData = async () => {
      setIsLoading(true);
      setError(null);

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
          if (response.status === 403) {
            setError('You do not have permission to view this agent\'s metrics');
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch agent data');
          }
          return;
        }

        const result: AgentAnalyticsResponse = await response.json();

        // Find the specific agent in the response
        const agentData = result.agents.find((a) => a.agentId === agentId);

        if (!agentData) {
          setError('Agent not found');
          return;
        }

        setAgent(agentData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgentData();
  }, [agentId, getDateParams]);

  const periodLabel =
    dateRange === '7d'
      ? 'Last 7 days'
      : dateRange === '30d'
        ? 'Last 30 days'
        : 'Last 90 days';

  // Error state
  if (error) {
    return (
      <div className="flex h-screen overflow-hidden bg-gradient-to-b from-slate-50 to-blue-50">
        <div className="flex flex-1 flex-col">
          <div className="flex-shrink-0 border-b border-slate-700 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 px-6 py-5 shadow-xl">
            <Link
              href="/dashboard/analytics"
              className="inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Analytics
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                {error}
              </h3>
              <button
                onClick={() => router.push('/dashboard/analytics')}
                className="mt-4 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700"
              >
                Go to Analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-b from-slate-50 to-blue-50">
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-700 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 px-6 py-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/analytics"
                className="inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 animate-pulse rounded-full bg-slate-700" />
                  <div className="space-y-2">
                    <div className="h-6 w-32 animate-pulse rounded bg-slate-700" />
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-700" />
                  </div>
                </div>
              ) : agent ? (
                <div className="flex items-center gap-3">
                  {agent.avatarUrl ? (
                    <img
                      src={agent.avatarUrl}
                      alt={agent.agentName}
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-orange-500"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 ring-2 ring-orange-500">
                      <User className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-bold text-white">
                      {agent.agentName}
                    </h1>
                    <p className="text-sm text-slate-400">Agent Performance</p>
                  </div>
                </div>
              ) : null}
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="rounded-lg border-2 border-slate-700 bg-slate-800 px-4 py-2 text-white transition-all focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-5xl">
            {/* Period Label */}
            <p className="mb-6 text-sm text-slate-600">
              Performance metrics for {periodLabel.toLowerCase()}
            </p>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Pings Resolved"
                value={isLoading ? '-' : String(agent?.pingsResolved || 0)}
                icon={CheckCircle2}
                color="emerald"
                isLoading={isLoading}
              />
              <MetricCard
                label="Avg Resolution Time"
                value={
                  isLoading
                    ? '-'
                    : formatResolutionTime(agent?.avgResolutionTimeMinutes ?? null)
                }
                icon={Clock}
                color="orange"
                isLoading={isLoading}
              />
              <MetricCard
                label="Avg First Response"
                value={
                  isLoading
                    ? '-'
                    : formatResolutionTime(agent?.avgFirstResponseMinutes ?? null)
                }
                icon={MessageSquare}
                color="blue"
                isLoading={isLoading}
              />
              <MetricCard
                label="SLA Compliance"
                value={
                  isLoading
                    ? '-'
                    : agent?.slaComplianceRate !== null && agent?.slaComplianceRate !== undefined
                      ? `${agent.slaComplianceRate}%`
                      : 'N/A'
                }
                icon={Radio}
                color="slate"
                isLoading={isLoading}
              />
            </div>

            {/* Summary Card */}
            <div className="mt-8 rounded-lg border-2 border-slate-200 bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-lg font-bold text-slate-900">Summary</h3>
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-3/4 rounded bg-slate-200" />
                  <div className="h-4 w-1/2 rounded bg-slate-200" />
                </div>
              ) : agent ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-slate-600">Total Pings Assigned</span>
                    <span className="font-semibold text-slate-900">
                      {agent.pingsAssigned}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-slate-600">Pings Resolved</span>
                    <span className="font-semibold text-slate-900">
                      {agent.pingsResolved}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-slate-600">Resolution Rate</span>
                    <span className="font-semibold text-slate-900">
                      {agent.pingsAssigned > 0
                        ? `${Math.round((agent.pingsResolved / agent.pingsAssigned) * 100)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">SLA Compliance</span>
                    <span
                      className={`font-semibold ${
                        agent.slaComplianceRate !== null
                          ? agent.slaComplianceRate >= 90
                            ? 'text-emerald-600'
                            : agent.slaComplianceRate >= 70
                              ? 'text-amber-600'
                              : 'text-red-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {agent.slaComplianceRate !== null
                        ? `${agent.slaComplianceRate}%`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
