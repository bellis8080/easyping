'use client';

import { Clock, AlertCircle, CheckCircle2, Pause } from 'lucide-react';
import { Ping, PingStatus, User } from '@easyping/types';

// Extended Ping type with related data
export interface PingWithRelations {
  id: string;
  ping_number: number;
  title: string;
  ai_summary: string | null;
  status: Ping['status'];
  priority: Ping['priority'];
  created_at: string;
  updated_at: string;
  sla_due_at: string | null;
  created_by: Pick<User, 'id' | 'full_name' | 'email' | 'avatar_url'>;
  assigned_to: Pick<User, 'id' | 'full_name' | 'avatar_url'> | null;
  category: { id: string; name: string; color: string } | null;
  team_id?: string | null;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Agent {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

export interface Team {
  id: string;
  name: string;
}

interface PingDetailHeaderProps {
  ping: PingWithRelations;
  currentUser: Pick<User, 'id' | 'full_name' | 'avatar_url' | 'role'>;
  // Status
  onStatusChange: (status: PingStatus) => void;
  isUpdatingStatus: boolean;
  // Priority
  onPriorityChange: (priority: 'low' | 'normal' | 'high' | 'urgent') => void;
  isUpdatingPriority: boolean;
  // Claim (optional - for unassigned pings)
  onClaimPing?: () => void;
  isClaiming?: boolean;
}

// SLA Timer Component
function SLATimer({ ping }: { ping: PingWithRelations }) {
  if (ping.status === 'waiting_on_user') {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <Pause className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-500 font-medium">Paused</span>
      </div>
    );
  }

  const now = new Date();
  const dueAt = ping.sla_due_at ? new Date(ping.sla_due_at) : null;

  if (!dueAt) {
    return null;
  }

  const diffMs = dueAt.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  let timeRemaining = '';
  let status: 'on_track' | 'at_risk' | 'breached' = 'on_track';

  if (diffMs < 0) {
    status = 'breached';
    timeRemaining = 'BREACHED';
  } else if (diffHours < 1) {
    status = 'at_risk';
    timeRemaining = `${diffMins}m`;
  } else {
    status = 'on_track';
    timeRemaining = `${diffHours}h ${diffMins % 60}m`;
  }

  const getStatusConfig = () => {
    if (status === 'breached') {
      return {
        icon: AlertCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        label: 'BREACHED',
      };
    }
    if (status === 'at_risk') {
      return {
        icon: Clock,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        label: timeRemaining,
      };
    }
    return {
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      label: timeRemaining,
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

export function PingDetailHeader({
  ping,
  currentUser,
  onStatusChange,
  isUpdatingStatus,
  onPriorityChange,
  isUpdatingPriority,
  onClaimPing,
  isClaiming = false,
}: PingDetailHeaderProps) {
  const isEndUser = currentUser.role === 'end_user';
  const showClaimButton = !ping.assigned_to && onClaimPing && !isEndUser;

  return (
    <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 border-b border-slate-700 px-4 py-3 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Title, User Info, and SLA */}
        <div className="flex-1 space-y-2">
          <h3 className="text-xl font-bold text-white">
            #PING-{String(ping.ping_number).padStart(3, '0')}
          </h3>
          <p className="text-sm text-slate-400">
            {ping.created_by.full_name} • {ping.created_by.email}
          </p>
          <div className="flex items-center gap-4 text-sm">
            {ping.sla_due_at ? (
              <div className="flex items-center gap-2">
                <SLATimer ping={ping} />
                <span className="text-slate-400 leading-none">
                  resolution due
                </span>
              </div>
            ) : (
              <span className="text-slate-400">No SLA configured</span>
            )}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex flex-col items-end gap-2">
          {/* Status and Priority Row */}
          <div className="flex items-center gap-2">
            {/* Status */}
            <select
              value={ping.status}
              onChange={(e) => onStatusChange(e.target.value as PingStatus)}
              disabled={isUpdatingStatus}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_on_user">Waiting on User</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            {/* Priority */}
            <select
              value={ping.priority}
              onChange={(e) =>
                onPriorityChange(
                  e.target.value as 'low' | 'normal' | 'high' | 'urgent'
                )
              }
              disabled={isUpdatingPriority || isEndUser}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Select priority"
            >
              <option value="low">⬇️ Low</option>
              <option value="normal">➡️ Normal</option>
              <option value="high">⬆️ High</option>
              <option value="urgent">🔴 Urgent</option>
            </select>
          </div>

          {/* Claim Button */}
          {showClaimButton && (
            <button
              onClick={onClaimPing}
              disabled={isClaiming}
              className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClaiming ? 'Claiming...' : 'Claim This Ping'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
