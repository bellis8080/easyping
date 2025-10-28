'use client';

import {
  MessageSquarePlus,
  Search,
  Radio,
  Activity,
  Pause,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

// Mock data types
interface Ping {
  id: string;
  ping_number: string;
  status: 'new' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'archived';
  last_message: {
    content: string;
    sender_type: 'user' | 'agent';
    created_at: string;
  };
  agent: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  unread_count: number;
  created_at: string;
  updated_at: string;
}

interface StatusConfig {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  pulse?: boolean;
  ripple?: boolean;
}

// Mock data
const mockPings: Ping[] = [
  {
    id: '1',
    ping_number: 'PING-042',
    status: 'in_progress',
    last_message: {
      content:
        "I've reset your password. Please check your email and try logging in again.",
      sender_type: 'agent',
      created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    },
    agent: {
      id: 'agent1',
      name: 'Sarah Johnson',
    },
    unread_count: 2,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    ping_number: 'PING-041',
    status: 'resolved',
    last_message: {
      content: 'Thanks for your help! That fixed it.',
      sender_type: 'user',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    agent: {
      id: 'agent2',
      name: 'Mike Chen',
    },
    unread_count: 0,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    ping_number: 'PING-040',
    status: 'waiting_on_user',
    last_message: {
      content:
        "Can you send me a screenshot of the error message you're seeing?",
      sender_type: 'agent',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    agent: {
      id: 'agent1',
      name: 'Sarah Johnson',
    },
    unread_count: 0,
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    ping_number: 'PING-039',
    status: 'in_progress',
    last_message: {
      content: 'Working on this now. Should have a solution shortly.',
      sender_type: 'agent',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    agent: {
      id: 'agent3',
      name: 'Alex Rivera',
    },
    unread_count: 1,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    ping_number: 'PING-038',
    status: 'new',
    last_message: {
      content:
        "My laptop won't connect to the office WiFi network. I've tried restarting but no luck.",
      sender_type: 'user',
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    agent: {
      id: 'agent2',
      name: 'Mike Chen',
    },
    unread_count: 0,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
];

// Status configuration with ping theme
const getStatusConfig = (status: Ping['status']): StatusConfig => {
  const configs: Record<Ping['status'], StatusConfig> = {
    resolved: {
      icon: CheckCircle2,
      label: 'Resolved',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
    },
    in_progress: {
      icon: Activity,
      label: 'Active',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      pulse: true,
    },
    waiting_on_user: {
      icon: Pause,
      label: 'Waiting',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
    },
    new: {
      icon: Radio,
      label: 'New',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      ripple: true,
    },
    archived: {
      icon: CheckCircle2,
      label: 'Archived',
      color: 'text-slate-400',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-300',
    },
  };
  return configs[status];
};

// Format relative time
const formatRelativeTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Avatar component
function Avatar({ name, imageUrl }: { name: string; imageUrl?: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    'bg-gradient-to-br from-blue-500 to-blue-600',
    'bg-gradient-to-br from-purple-500 to-purple-600',
    'bg-gradient-to-br from-orange-500 to-orange-600',
    'bg-gradient-to-br from-emerald-500 to-emerald-600',
  ];

  const colorIndex = name.length % colors.length;

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-md"
      />
    );
  }

  return (
    <div
      className={`w-11 h-11 rounded-full ${colors[colorIndex]} text-white flex items-center justify-center text-sm font-semibold flex-shrink-0 ring-2 ring-white shadow-md`}
    >
      {initials}
    </div>
  );
}

// Status indicator component with ping theme
function StatusIndicator({ status }: { status: Ping['status'] }) {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <div
      className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bgColor} ${config.borderColor}`}
    >
      <div className="relative">
        <Icon className={`w-4 h-4 ${config.color}`} strokeWidth={2.5} />
        {config.pulse && (
          <span className="absolute inset-0 flex">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.bgColor} opacity-75`}
            ></span>
          </span>
        )}
        {config.ripple && (
          <>
            <span
              className="absolute inset-0 animate-ping rounded-full bg-purple-400 opacity-30"
              style={{ animationDuration: '2s' }}
            ></span>
            <span
              className="absolute inset-0 animate-ping rounded-full bg-purple-400 opacity-20"
              style={{ animationDuration: '3s', animationDelay: '0.5s' }}
            ></span>
          </>
        )}
      </div>
      <span className={`text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
}

// Ping list item component
function PingListItem({ ping }: { ping: Ping }) {
  const isUnread = ping.unread_count > 0;

  return (
    <Link href={`/pings/${ping.id}`}>
      <div
        className={`
          relative flex items-start gap-4 p-5 border-b border-slate-200
          hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent transition-all cursor-pointer group
          ${isUnread ? 'bg-gradient-to-r from-blue-50/50 to-transparent border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}
        `}
      >
        <Avatar name={ping.agent.name} imageUrl={ping.agent.avatar_url} />

        <div className="flex-1 min-w-0">
          {/* Line 1: PING ID + Status */}
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`text-sm font-mono font-bold ${isUnread ? 'text-slate-900' : 'text-slate-600'}`}
            >
              {ping.ping_number}
            </span>
            <StatusIndicator status={ping.status} />
          </div>

          {/* Line 2: Message preview */}
          <p
            className={`text-base mb-2 line-clamp-2 ${isUnread ? 'font-medium text-slate-800' : 'text-slate-600'}`}
          >
            {ping.last_message.content}
          </p>

          {/* Line 3: Agent name + timestamp */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium">{ping.agent.name}</span>
            <span>•</span>
            <span>{formatRelativeTime(ping.last_message.created_at)}</span>
          </div>
        </div>

        {/* Unread badge */}
        {isUnread && (
          <div className="flex-shrink-0">
            <div className="relative">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs font-bold shadow-lg ring-2 ring-orange-500/30">
                {ping.unread_count}
              </span>
              <span className="absolute inset-0 animate-ping rounded-full bg-orange-400 opacity-40"></span>
            </div>
          </div>
        )}

        {/* Hover indicator */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
        </div>
      </div>
    </Link>
  );
}

// Empty state component
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-2xl">
          <Radio className="w-12 h-12 text-white" />
        </div>
        <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20"></div>
        <div
          className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-10"
          style={{ animationDuration: '2s', animationDelay: '0.5s' }}
        ></div>
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-2">No pings yet</h3>
      <p className="text-slate-600 mb-8 text-center max-w-sm">
        Need help? Send your first ping and get connected with our support team!
      </p>
      <Link
        href="/pings/new"
        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transform hover:scale-105"
      >
        <MessageSquarePlus className="w-5 h-5" />
        Send Your First Ping
      </Link>
    </div>
  );
}

export default function MyPingsPage() {
  const [activeTab, setActiveTab] = useState<
    'all' | 'active' | 'resolved' | 'archived'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter pings based on active tab
  const filteredPings = mockPings.filter((ping) => {
    if (activeTab === 'active') {
      return (
        ping.status === 'in_progress' ||
        ping.status === 'waiting_on_user' ||
        ping.status === 'new'
      );
    }
    if (activeTab === 'resolved') {
      return ping.status === 'resolved';
    }
    if (activeTab === 'archived') {
      return ping.status === 'archived';
    }
    return true; // 'all' tab
  });

  const showEmptyState =
    filteredPings.length === 0 && activeTab === 'all' && !searchQuery;

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header with gradient */}
      <div className="flex-shrink-0 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 border-b border-slate-700 shadow-xl">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">My Pings</h1>
            </div>
            <Link
              href="/pings/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transform hover:scale-105"
            >
              <MessageSquarePlus className="w-5 h-5" />
              <span>New Ping</span>
            </Link>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search your pings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-6 border-t border-slate-700/50">
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'resolved', label: 'Resolved' },
            { key: 'archived', label: 'Archived' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-5 py-3 text-sm font-medium transition-all relative ${
                activeTab === tab.key
                  ? 'text-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-400 shadow-lg shadow-blue-500/50"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50">
        {showEmptyState ? (
          <EmptyState />
        ) : filteredPings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <p className="text-slate-600 text-lg">
              No pings found in this filter
            </p>
            <button
              onClick={() => setActiveTab('all')}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              View all pings →
            </button>
          </div>
        ) : (
          <div>
            {filteredPings.map((ping) => (
              <PingListItem key={ping.id} ping={ping} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
