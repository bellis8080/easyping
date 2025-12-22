'use client';

import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Users,
  Radio,
  BarChart3,
} from 'lucide-react';

// Mock metrics data
interface Metric {
  label: string;
  value: string;
  trend: number;
  trendLabel: string;
  icon: React.ElementType;
  color: string;
}

const mockMetrics: Metric[] = [
  {
    label: 'Total Pings',
    value: '1,248',
    trend: 12,
    trendLabel: 'vs last period',
    icon: Radio,
    color: 'blue',
  },
  {
    label: 'Avg Resolution Time',
    value: '4.2h',
    trend: -8,
    trendLabel: 'vs last period',
    icon: Clock,
    color: 'orange',
  },
  {
    label: 'SLA Compliance',
    value: '94.5%',
    trend: 3,
    trendLabel: 'vs last period',
    icon: CheckCircle2,
    color: 'emerald',
  },
  {
    label: 'Agent Utilization',
    value: '78%',
    trend: -2,
    trendLabel: 'vs last period',
    icon: Users,
    color: 'purple',
  },
];

// Mock category data
const mockCategories = [
  { name: 'Hardware', count: 342, percentage: 27 },
  { name: 'Software', count: 286, percentage: 23 },
  { name: 'Network', count: 224, percentage: 18 },
  { name: 'Access', count: 187, percentage: 15 },
  { name: 'Password Reset', count: 125, percentage: 10 },
  { name: 'Other', count: 84, percentage: 7 },
];

// Mock agent performance data
const mockAgents = [
  {
    name: 'Sarah Johnson',
    resolved: 156,
    avgTime: '3.2h',
    slaCompliance: 97,
    avatar: 'SJ',
  },
  {
    name: 'Mike Chen',
    resolved: 142,
    avgTime: '3.8h',
    slaCompliance: 95,
    avatar: 'MC',
  },
  {
    name: 'Emily Rodriguez',
    resolved: 138,
    avgTime: '4.1h',
    slaCompliance: 93,
    avatar: 'ER',
  },
  {
    name: 'David Kim',
    resolved: 124,
    avgTime: '4.5h',
    slaCompliance: 91,
    avatar: 'DK',
  },
  {
    name: 'Lisa Patel',
    resolved: 118,
    avgTime: '4.9h',
    slaCompliance: 89,
    avatar: 'LP',
  },
];

// Mock volume data (last 7 days)
const mockVolumeData = [
  { date: 'Mon', pings: 145 },
  { date: 'Tue', pings: 168 },
  { date: 'Wed', pings: 192 },
  { date: 'Thu', pings: 178 },
  { date: 'Fri', pings: 201 },
  { date: 'Sat', pings: 89 },
  { date: 'Sun', pings: 67 },
];

const colorClasses = {
  blue: 'from-blue-500 to-blue-600',
  orange: 'from-orange-500 to-orange-600',
  emerald: 'from-emerald-500 to-emerald-600',
  purple: 'from-purple-500 to-purple-600',
};

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  const isPositive = metric.trend > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-lg border-2 border-slate-200 bg-white p-6 shadow-lg transition-shadow hover:shadow-xl">
      <div className="mb-4 flex items-start justify-between">
        <div
          className={`rounded-lg bg-gradient-to-br p-3 ${colorClasses[metric.color as keyof typeof colorClasses]}`}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div
          className={`flex items-center gap-1 text-sm font-semibold ${
            isPositive ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          <TrendIcon className="h-4 w-4" />
          {Math.abs(metric.trend)}%
        </div>
      </div>
      <p className="mb-1 text-sm text-slate-600">{metric.label}</p>
      <p className="mb-1 text-3xl font-bold text-slate-900">{metric.value}</p>
      <p className="text-xs text-slate-500">{metric.trendLabel}</p>
    </div>
  );
}

interface PingAnalyticsTabProps {
  dateRange: string;
}

export function PingAnalyticsTab({ dateRange }: PingAnalyticsTabProps) {
  const maxVolume = Math.max(...mockVolumeData.map((d) => d.pings));

  // dateRange will be used when we integrate with real API
  void dateRange;

  return (
    <div className="space-y-8">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {mockMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Volume Chart */}
        <div className="rounded-lg border-2 border-slate-200 bg-white p-6 shadow-lg">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Ping Volume</h3>
            <span className="text-sm text-slate-500">Last 7 days</span>
          </div>
          <div className="flex h-64 items-end justify-between gap-3">
            {mockVolumeData.map((day) => {
              const height = (day.pings / maxVolume) * 100;
              return (
                <div
                  key={day.date}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div className="flex w-full flex-col items-center">
                    <span className="mb-1 text-xs font-semibold text-slate-700">
                      {day.pings}
                    </span>
                    <div
                      className="w-full cursor-pointer rounded-t-lg bg-gradient-to-t from-blue-500 to-blue-400 transition-all hover:from-orange-500 hover:to-orange-400"
                      style={{ height: `${height}%`, minHeight: '20px' }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    {day.date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="rounded-lg border-2 border-slate-200 bg-white p-6 shadow-lg">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              Pings by Category
            </h3>
            <BarChart3 className="h-5 w-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            {mockCategories.map((category) => (
              <div key={category.name}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    {category.name}
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
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="overflow-hidden rounded-lg border-2 border-slate-200 bg-white shadow-lg">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">
            Agent Performance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Resolved
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Avg Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                  SLA Compliance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {mockAgents.map((agent, index) => (
                <tr
                  key={agent.name}
                  className="transition-colors hover:bg-blue-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-bold text-white">
                        {agent.avatar}
                      </div>
                      <span className="font-medium text-slate-900">
                        {agent.name}
                      </span>
                      {index === 0 && (
                        <span className="rounded bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                          Top Performer
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-slate-900">
                      {agent.resolved}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-700">
                      {agent.avgTime}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="max-w-xs flex-1">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all ${
                              agent.slaCompliance >= 95
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                : agent.slaCompliance >= 90
                                  ? 'bg-gradient-to-r from-orange-500 to-orange-400'
                                  : 'bg-gradient-to-r from-red-500 to-red-400'
                            }`}
                            style={{ width: `${agent.slaCompliance}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-12 text-sm font-semibold text-slate-900">
                        {agent.slaCompliance}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button className="transform rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-orange-500/30 transition-all hover:scale-105 hover:from-orange-600 hover:to-orange-700 hover:shadow-xl hover:shadow-orange-500/40">
          Export as CSV
        </button>
      </div>
    </div>
  );
}
