'use client';

import { useState } from 'react';
import {
  Send,
  Sparkles,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Pause,
} from 'lucide-react';

// Mock ping type
interface Ping {
  id: string;
  ping_number: string;
  user: {
    name: string;
    email: string;
  };
  subject: string;
  status: 'new' | 'in_progress' | 'waiting_on_user' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  messages: Array<{
    id: string;
    content: string;
    sender_type: 'user' | 'agent';
    sender_name: string;
    created_at: string;
  }>;
  sla: {
    first_response_met: boolean;
    first_response_time?: string;
    resolution_due: string;
    resolution_status: 'on_track' | 'at_risk' | 'breached';
    time_remaining: string;
  };
  created_at: string;
}

// Mock pings data
const mockPings: Ping[] = [
  {
    id: '1',
    ping_number: 'PING-045',
    user: { name: 'Emily Chen', email: 'emily@company.com' },
    subject: 'Cannot access dashboard after password reset',
    status: 'new',
    priority: 'urgent',
    category: 'Access',
    messages: [
      {
        id: '1',
        content:
          'I reset my password but now I cannot log into the dashboard. I keep getting an "Invalid credentials" error.',
        sender_type: 'user',
        sender_name: 'Emily Chen',
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
    ],
    sla: {
      first_response_met: false,
      resolution_due: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
      resolution_status: 'at_risk',
      time_remaining: '25m',
    },
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    ping_number: 'PING-044',
    user: { name: 'James Wilson', email: 'james@company.com' },
    subject: 'Slow loading times on reports page',
    status: 'in_progress',
    priority: 'high',
    category: 'Performance',
    messages: [
      {
        id: '1',
        content:
          'The reports page is taking forever to load. Is there an issue?',
        sender_type: 'user',
        sender_name: 'James Wilson',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        content:
          'I am looking into this. Can you tell me which specific report you are trying to access?',
        sender_type: 'agent',
        sender_name: 'You',
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
    ],
    sla: {
      first_response_met: true,
      first_response_time: '45m',
      resolution_due: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      resolution_status: 'on_track',
      time_remaining: '5h 12m',
    },
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    ping_number: 'PING-043',
    user: { name: 'Sarah Martinez', email: 'sarah@company.com' },
    subject: 'How do I export data to CSV?',
    status: 'waiting_on_user',
    priority: 'low',
    category: 'How-To',
    messages: [
      {
        id: '1',
        content: 'I need to export our customer data to CSV. How do I do this?',
        sender_type: 'user',
        sender_name: 'Sarah Martinez',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        content:
          'You can export by going to Reports > Customer Data > Export. Does this help?',
        sender_type: 'agent',
        sender_name: 'You',
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
    ],
    sla: {
      first_response_met: true,
      first_response_time: '12m',
      resolution_due: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
      resolution_status: 'on_track',
      time_remaining: 'paused',
    },
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
];

// SLA Timer Component
function SLATimer({ ping }: { ping: Ping }) {
  const { sla } = ping;

  if (sla.time_remaining === 'paused') {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <Pause className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-500 font-medium">Paused</span>
      </div>
    );
  }

  const getStatusConfig = () => {
    if (sla.resolution_status === 'breached') {
      return {
        icon: AlertCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        label: 'BREACHED',
      };
    }
    if (sla.resolution_status === 'at_risk') {
      return {
        icon: Clock,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        label: sla.time_remaining,
      };
    }
    return {
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      label: sla.time_remaining,
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bgColor}`}
    >
      <Icon className={`w-3.5 h-3.5 ${config.color}`} />
      <span className={`text-xs font-bold ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
}

// Priority Badge
function PriorityBadge({ priority }: { priority: Ping['priority'] }) {
  const config = {
    urgent: { color: 'bg-red-500 text-white', label: 'Urgent' },
    high: { color: 'bg-orange-500 text-white', label: 'High' },
    medium: { color: 'bg-blue-500 text-white', label: 'Medium' },
    low: { color: 'bg-slate-400 text-white', label: 'Low' },
  }[priority];

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-semibold ${config.color}`}
    >
      {config.label}
    </span>
  );
}

export default function AgentInboxPage() {
  const [selectedPing, setSelectedPing] = useState<Ping>(mockPings[0]);
  const [replyMessage, setReplyMessage] = useState('');
  const [showEcho, setShowEcho] = useState(true);
  const [suggestedResponse, setSuggestedResponse] = useState(
    `Hi ${mockPings[0].user.name.split(' ')[0]}, I understand you're having trouble logging in after your password reset. Let me help you resolve this right away. Can you try clearing your browser cache and cookies, then attempting to log in again?`
  );

  const handleSendReply = () => {
    if (!replyMessage.trim()) return;
    // Handle sending reply
    setReplyMessage('');
  };

  const handleUseSuggestedResponse = () => {
    setReplyMessage(suggestedResponse);
  };

  return (
    <div className="flex h-screen bg-gradient-to-b from-slate-50 to-blue-50">
      {/* Ping List - Left Panel */}
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col shadow-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 border-b border-slate-700 p-4 min-h-[121px]">
          <h2 className="text-xl font-bold text-white mb-2">Agent Inbox</h2>
          <div className="flex items-center gap-2">
            <select className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>All Pings</option>
              <option>Assigned to Me</option>
              <option>Unassigned</option>
              <option>Urgent</option>
            </select>
          </div>
        </div>

        {/* Ping List */}
        <div className="flex-1 overflow-y-auto">
          {mockPings.map((ping) => (
            <button
              key={ping.id}
              onClick={() => setSelectedPing(ping)}
              className={`w-full p-4 border-b border-slate-200 text-left transition-all hover:bg-blue-50 ${
                selectedPing.id === ping.id
                  ? 'bg-gradient-to-r from-orange-50 to-transparent border-l-4 border-l-orange-500'
                  : 'border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-bold text-slate-900">
                    {ping.ping_number}
                  </span>
                  <PriorityBadge priority={ping.priority} />
                </div>
                <SLATimer ping={ping} />
              </div>
              <p className="text-sm font-medium text-slate-900 mb-1 line-clamp-1">
                {ping.subject}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{ping.user.name}</span>
                <span className="px-2 py-0.5 bg-slate-100 rounded">
                  {ping.category}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Ping Detail - Center Panel */}
      <div className="flex-1 flex flex-col">
        {/* Ping Header */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 border-b border-slate-700 p-4 shadow-xl min-h-[121px]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                {selectedPing.ping_number}
              </h3>
              <p className="text-sm text-slate-400">
                {selectedPing.user.name} • {selectedPing.user.email}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option>New</option>
                <option>In Progress</option>
                <option>Waiting on User</option>
                <option>Resolved</option>
              </select>
            </div>
          </div>

          {/* SLA Info */}
          <div className="flex items-center gap-4 text-sm">
            {selectedPing.sla.first_response_met ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-emerald-400 leading-none">
                  First response: {selectedPing.sla.first_response_time}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span className="text-orange-400 leading-none">
                  First response due in {selectedPing.sla.time_remaining}
                </span>
              </div>
            )}
            {selectedPing.sla.time_remaining !== 'paused' && (
              <>
                <span className="text-slate-600">•</span>
                <div className="flex items-center gap-2">
                  <SLATimer ping={selectedPing} />
                  <span className="text-slate-400 leading-none">
                    resolution due
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-white to-slate-50">
          <div className="space-y-4 px-6">
            <div className="text-center mb-6">
              <h4 className="text-lg font-bold text-slate-900 mb-1">
                {selectedPing.subject}
              </h4>
              <p className="text-sm text-slate-500">{selectedPing.category}</p>
            </div>

            {selectedPing.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl px-5 py-3 rounded-lg shadow-md ${
                    message.sender_type === 'agent'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-900'
                  }`}
                >
                  <p className="text-sm font-medium mb-1 opacity-75">
                    {message.sender_name}
                  </p>
                  <p className="text-base leading-relaxed">{message.content}</p>
                  <p
                    className={`text-xs mt-2 ${message.sender_type === 'agent' ? 'text-blue-100' : 'text-slate-500'}`}
                    suppressHydrationWarning
                  >
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reply Box */}
        <div className="border-t border-slate-200 p-6 bg-white shadow-xl">
          <div className="px-6">
            <div className="flex gap-3">
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your reply..."
                className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none bg-slate-50"
                rows={3}
              />
              <button
                onClick={handleSendReply}
                disabled={!replyMessage.trim()}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 disabled:shadow-none transform hover:scale-105 disabled:transform-none"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Echo - Right Panel */}
      {showEcho && (
        <div className="w-80 bg-gradient-to-b from-slate-800 to-slate-900 border-l border-slate-700 flex flex-col shadow-2xl">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-bold text-white">Echo</h3>
              </div>
              <button
                onClick={() => setShowEcho(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">Your AI assistant</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Suggested Response */}
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                Suggested Response
              </h4>
              <textarea
                value={suggestedResponse}
                onChange={(e) => setSuggestedResponse(e.target.value)}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-sm text-slate-100 mb-3 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={6}
              />
              <button
                onClick={handleUseSuggestedResponse}
                className="w-full px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Use This Response
              </button>
            </div>

            {/* Suggested Articles */}
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <h4 className="text-sm font-semibold text-white mb-3">
                Related KB Articles
              </h4>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded text-sm text-slate-200 transition-colors">
                  Password Reset Troubleshooting
                </button>
                <button className="w-full text-left px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded text-sm text-slate-200 transition-colors">
                  Clear Browser Cache and Cookies
                </button>
              </div>
            </div>

            {/* Suggested Actions */}
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <h4 className="text-sm font-semibold text-white mb-3">
                Suggested Actions
              </h4>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white transition-colors">
                  Change Priority to High
                </button>
                <button className="w-full text-left px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm text-white transition-colors">
                  Assign to Security Team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show Echo button when hidden */}
      {!showEcho && (
        <button
          onClick={() => setShowEcho(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3 rounded-l-lg shadow-xl hover:shadow-2xl transition-all"
        >
          <Sparkles className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
