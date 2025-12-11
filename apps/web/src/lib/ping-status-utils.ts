import { PingStatus } from '@easyping/types';
import {
  Radio,
  Activity,
  Pause,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';

export interface StatusConfig {
  icon: LucideIcon;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  pulse?: boolean;
  ripple?: boolean;
}

/**
 * Gets comprehensive status configuration for StatusIndicator component.
 * Used in my-pings-client.tsx for fancy status badges with icons and animations.
 */
export function getStatusConfig(status: PingStatus): StatusConfig {
  const configs: Record<PingStatus, StatusConfig> = {
    draft: {
      icon: Radio,
      label: 'Draft',
      color: 'text-slate-500',
      bgColor: 'bg-slate-500/10',
      borderColor: 'border-slate-500/30',
      pulse: true,
    },
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
    closed: {
      icon: CheckCircle2,
      label: 'Closed',
      color: 'text-slate-400',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-300',
    },
  };
  return configs[status];
}

/**
 * Gets simple background color for status pills.
 * Used in ping-detail.tsx for minimal colored badges.
 */
export function getStatusColor(status: PingStatus): string {
  const colors: Record<PingStatus, string> = {
    draft: 'bg-slate-500', // Gray for draft pings
    new: 'bg-purple-500', // Purple for new pings
    in_progress: 'bg-blue-500', // Blue for active/in-progress
    waiting_on_user: 'bg-orange-500', // Orange for waiting
    resolved: 'bg-emerald-500', // Green for resolved
    closed: 'bg-slate-400', // Gray for closed
  };
  return colors[status] || 'bg-slate-500';
}

/**
 * Gets human-readable status label for display.
 * Used across all components for consistent labeling.
 */
export function getStatusLabel(status: PingStatus): string {
  const labels: Record<PingStatus, string> = {
    draft: 'Draft',
    new: 'New',
    in_progress: 'In Progress',
    waiting_on_user: 'Waiting on User',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  return labels[status] || status;
}
