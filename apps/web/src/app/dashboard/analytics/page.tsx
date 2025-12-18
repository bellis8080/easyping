'use client';

import { useState } from 'react';
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
  icon: any;
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

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  const isPositive = metric.trend > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    orange: 'from-orange-500 to-orange-600',
    emerald: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <div className="bg-white rounded-lg border-2 border-slate-200 p-6 shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[metric.color as keyof typeof colorClasses]}`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div
          className={`flex items-center gap-1 text-sm font-semibold ${
            isPositive ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          <TrendIcon className="w-4 h-4" />
          {Math.abs(metric.trend)}%
        </div>
      </div>
      <p className="text-sm text-slate-600 mb-1">{metric.label}</p>
      <p className="text-3xl font-bold text-slate-900 mb-1">{metric.value}</p>
      <p className="text-xs text-slate-500">{metric.trendLabel}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('7d');
  const maxVolume = Math.max(...mockVolumeData.map((d) => d.pings));

  return (
    <div className="flex h-screen bg-gradient-to-b from-slate-50 to-blue-50 overflow-hidden">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 border-b border-slate-700 shadow-xl px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-orange-500" />
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  Analytics
                </h1>
                <p className="text-sm text-slate-400">
                  Performance insights and metrics
                </p>
              </div>
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 bg-slate-800 border-2 border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {mockMetrics.map((metric) => (
                <MetricCard key={metric.label} metric={metric} />
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Volume Chart */}
              <div className="bg-white rounded-lg border-2 border-slate-200 p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">
                    Ping Volume
                  </h3>
                  <span className="text-sm text-slate-500">Last 7 days</span>
                </div>
                <div className="h-64 flex items-end justify-between gap-3">
                  {mockVolumeData.map((day) => {
                    const height = (day.pings / maxVolume) * 100;
                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col items-center gap-2"
                      >
                        <div className="w-full flex flex-col items-center">
                          <span className="text-xs font-semibold text-slate-700 mb-1">
                            {day.pings}
                          </span>
                          <div
                            className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all hover:from-orange-500 hover:to-orange-400 cursor-pointer"
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
              <div className="bg-white rounded-lg border-2 border-slate-200 p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">
                    Pings by Category
                  </h3>
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                </div>
                <div className="space-y-4">
                  {mockCategories.map((category) => (
                    <div key={category.name}>
                      <div className="flex items-center justify-between mb-2">
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
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
                          style={{ width: `${category.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Agent Performance Table */}
            <div className="bg-white rounded-lg border-2 border-slate-200 shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900">
                  Agent Performance
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Agent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Resolved
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Avg Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        SLA Compliance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {mockAgents.map((agent, index) => (
                      <tr
                        key={agent.name}
                        className="hover:bg-blue-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                              {agent.avatar}
                            </div>
                            <span className="font-medium text-slate-900">
                              {agent.name}
                            </span>
                            {index === 0 && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
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
                            <div className="flex-1 max-w-xs">
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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
                            <span className="text-sm font-semibold text-slate-900 w-12">
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
              <button className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transform hover:scale-105">
                Export as CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
