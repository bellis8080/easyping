'use client';

import { Ping, PingStatus, User } from '@easyping/types';
import { SlaTimerDisplay } from '@/components/pings/sla-timer-display';

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
  created_by: Pick<User, 'id' | 'full_name' | 'email' | 'avatar_url'>;
  assigned_to: Pick<User, 'id' | 'full_name' | 'avatar_url'> | null;
  category: { id: string; name: string; color: string } | null;
  team_id?: string | null;
  // Story 5.2: SLA tracking fields
  sla_policy_id?: string | null;
  sla_first_response_due?: string | null;
  sla_resolution_due?: string | null;
  first_response_at?: string | null;
  resolved_at?: string | null;
  sla_paused_at?: string | null;
  sla_paused_duration_minutes?: number;
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
            {ping.sla_first_response_due || ping.sla_resolution_due ? (
              <SlaTimerDisplay ping={ping as unknown as Ping} />
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
