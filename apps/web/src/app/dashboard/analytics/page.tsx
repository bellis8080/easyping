'use client';

import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { PingAnalyticsTab } from '@/components/analytics/PingAnalyticsTab';
import { KBAnalyticsTab } from '@/components/analytics/KBAnalyticsTab';

type TabType = 'pings' | 'kb';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('7d');
  const [activeTab, setActiveTab] = useState<TabType>('pings');

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-b from-slate-50 to-blue-50">
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-700 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 px-6 py-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-orange-500" />
              <div>
                <h1 className="mb-1 text-2xl font-bold text-white">
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
              className="rounded-lg border-2 border-slate-700 bg-slate-800 px-4 py-2 text-white transition-all focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('pings')}
              className={`border-b-2 px-4 py-3 font-medium transition-colors ${
                activeTab === 'pings'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              Pings
            </button>
            <button
              onClick={() => setActiveTab('kb')}
              className={`border-b-2 px-4 py-3 font-medium transition-colors ${
                activeTab === 'kb'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              Knowledge Base
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-7xl">
            {activeTab === 'pings' ? (
              <PingAnalyticsTab dateRange={dateRange} />
            ) : (
              <KBAnalyticsTab dateRange={dateRange} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
