'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Pause,
  ChevronDown,
  ChevronUp,
  Users,
  UserPlus,
  X,
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import {
  Ping,
  PingMessage,
  User,
  PingAttachment,
  PingStatus,
} from '@easyping/types';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getStatusLabel, getStatusColor } from '@/lib/ping-status-utils';
import { ReplyingIndicator } from '@/components/pings/replying-indicator';
import { FileAttachmentInput } from '@/components/pings/file-attachment-input';
import { FilePreviewList } from '@/components/pings/file-preview-list';
import { PingMessage as PingMessageComponent } from '@/components/pings/ping-message';
import { useTabTitle } from '@/hooks/use-tab-title';
import { ConnectionStatusIndicator } from '@/components/inbox/connection-status-indicator';
import { PingDetailHeader } from '@/components/pings/ping-detail-header';
import { TeamDeleteDialog } from '@/components/teams/team-delete-dialog';
import { useTeamsSafe } from '@/contexts/teams-context';
import { useRouter } from 'next/navigation';

// Extended Ping type with related data
interface PingWithRelations {
  id: string;
  ping_number: number;
  title: string;
  ai_summary: string | null;
  status: Ping['status'];
  priority: Ping['priority'];
  created_at: string;
  updated_at: string;
  sla_due_at: string | null;
  team_id: string | null;
  created_by: Pick<User, 'id' | 'full_name' | 'email' | 'avatar_url'>;
  assigned_to: Pick<User, 'id' | 'full_name' | 'avatar_url'> | null;
  category: { id: string; name: string; color: string } | null;
  messages: Array<{
    id: string;
    content: string;
    message_type: PingMessage['message_type'];
    created_at: string;
    sender: Pick<User, 'id' | 'full_name' | 'avatar_url'>;
    attachments?: PingAttachment[];
  }>;
  unread_count?: number;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  added_at: string;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface TeamInboxClientProps {
  team: Team;
  members: TeamMember[];
  pings: PingWithRelations[];
  currentUser: Pick<
    User,
    'id' | 'full_name' | 'avatar_url' | 'role' | 'tenant_id'
  >;
  isManagerOrOwner: boolean;
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

// Priority Badge
function PriorityBadge({ priority }: { priority: Ping['priority'] }) {
  const config = {
    urgent: {
      color: 'bg-red-100 text-red-800',
      icon: '🔴',
      label: 'Urgent',
    },
    high: {
      color: 'bg-orange-100 text-orange-800',
      icon: '⬆️',
      label: 'High',
    },
    normal: {
      color: 'bg-blue-100 text-blue-800',
      icon: '➡️',
      label: 'Normal',
    },
    low: {
      color: 'bg-gray-100 text-gray-800',
      icon: '⬇️',
      label: 'Low',
    },
  }[priority];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${config.color}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}

// Status Badge
function StatusBadge({ status }: { status: PingStatus }) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${getStatusColor(status)}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

// Ping Age Helper
function formatPingAge(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

export function TeamInboxClient({
  team,
  members,
  pings: initialPings,
  currentUser,
  isManagerOrOwner,
}: TeamInboxClientProps) {
  const [pings, setPings] = useState<PingWithRelations[]>(initialPings);
  const [selectedPing, setSelectedPing] = useState<PingWithRelations | null>(
    pings[0] || null
  );
  const [replyMessage, setReplyMessage] = useState('');
  const [showEcho, setShowEcho] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unclaimed' | 'mine'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'priority'>('recent');
  const [suggestedResponse, setSuggestedResponse] = useState('');
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [isReplying, setIsReplying] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<
    Array<{ id: string; name: string; color: string }>
  >([]);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [isUpdatingTeam, setIsUpdatingTeam] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);
  const [showMemberList, setShowMemberList] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(members);
  const [availableAgents, setAvailableAgents] = useState<
    Array<{
      id: string;
      full_name: string;
      email: string;
      avatar_url: string | null;
      role: string;
    }>
  >([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();
  const teamsContext = useTeamsSafe();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const replyingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<ReturnType<
    ReturnType<typeof createClient>['channel']
  > | null>(null);

  // Calculate total unread count
  const totalUnread = pings.reduce(
    (sum, ping) => sum + (ping.unread_count || 0),
    0
  );

  // Update tab title with unread count
  useTabTitle(totalUnread);

  // Scroll to bottom of message thread
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Claim ping (assign to current user)
  const handleClaimPing = async () => {
    if (!selectedPing) return;

    setIsClaiming(true);
    try {
      const response = await fetch(
        `/api/pings/${selectedPing.ping_number}/assign`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedTo: currentUser.id }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim ping');
      }

      // Update local ping state
      const assignedToData = {
        id: currentUser.id,
        full_name: currentUser.full_name,
        avatar_url: currentUser.avatar_url,
      };

      setSelectedPing((prev) =>
        prev ? { ...prev, assigned_to: assignedToData } : null
      );

      setPings((prevPings) =>
        prevPings.map((p) =>
          p.id === selectedPing.id ? { ...p, assigned_to: assignedToData } : p
        )
      );

      toast.success('Ping claimed successfully');
    } catch (error) {
      console.error('Error claiming ping:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to claim ping'
      );
    } finally {
      setIsClaiming(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus: PingStatus) => {
    if (!selectedPing || newStatus === selectedPing.status) return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(
        `/api/pings/${selectedPing.ping_number}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }

      const { ping } = await response.json();

      setSelectedPing((prev) =>
        prev ? { ...prev, status: ping.status } : null
      );

      setPings((prevPings) =>
        prevPings.map((p) =>
          p.id === selectedPing.id ? { ...p, status: ping.status } : p
        )
      );

      toast.success(`Status changed to ${getStatusLabel(newStatus)}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update status'
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle priority change
  const handlePriorityChange = async (
    newPriority: 'low' | 'normal' | 'high' | 'urgent'
  ) => {
    if (!selectedPing || newPriority === selectedPing.priority) return;

    setIsUpdatingPriority(true);
    try {
      const response = await fetch(
        `/api/pings/${selectedPing.ping_number}/priority`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: newPriority }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update priority');
      }

      const { ping } = await response.json();

      setSelectedPing((prev) =>
        prev ? { ...prev, priority: ping.priority } : null
      );

      setPings((prevPings) =>
        prevPings.map((p) =>
          p.id === selectedPing.id ? { ...p, priority: ping.priority } : p
        )
      );

      const priorityLabel =
        newPriority.charAt(0).toUpperCase() + newPriority.slice(1);
      toast.success(`Priority updated to ${priorityLabel}`);
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update priority'
      );
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  // Handle category change
  const handleCategoryChange = async (newCategoryId: string) => {
    if (!selectedPing) return;

    setIsUpdatingCategory(true);
    try {
      const response = await fetch(
        `/api/pings/${selectedPing.ping_number}/category`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryId: newCategoryId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update category');
      }

      const { category } = await response.json();

      // Update local ping state
      setSelectedPing((prev) => (prev ? { ...prev, category } : null));

      // Update ping in the list
      setPings((prevPings) =>
        prevPings.map((p) =>
          p.id === selectedPing.id ? { ...p, category } : p
        )
      );

      toast.success('Category updated successfully');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update category'
      );
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  // Handle assignment change
  const handleAssignmentChange = async (agentId: string | null) => {
    if (!selectedPing) return;

    setIsUpdatingAssignment(true);
    try {
      const response = await fetch(
        `/api/pings/${selectedPing.ping_number}/assign`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedTo: agentId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update assignment');
      }

      // Find the agent data if assigning, or set to null if unassigning
      const assignedToData = agentId
        ? availableAgents.find((a) => a.id === agentId)
          ? {
              id: agentId,
              full_name:
                availableAgents.find((a) => a.id === agentId)?.full_name || '',
              avatar_url:
                availableAgents.find((a) => a.id === agentId)?.avatar_url ||
                null,
            }
          : selectedPing.assigned_to
        : null;

      setSelectedPing((prev) =>
        prev ? { ...prev, assigned_to: assignedToData } : null
      );

      setPings((prevPings) =>
        prevPings.map((p) =>
          p.id === selectedPing.id ? { ...p, assigned_to: assignedToData } : p
        )
      );

      toast.success(
        agentId ? 'Ping assigned successfully' : 'Ping unassigned successfully'
      );
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update assignment'
      );
    } finally {
      setIsUpdatingAssignment(false);
    }
  };

  // Handle team change
  const handleTeamChange = async (newTeamId: string | null) => {
    if (!selectedPing) return;

    // Check if already assigned to this team
    if (newTeamId === selectedPing.team_id) return;

    setIsUpdatingTeam(true);
    try {
      const response = await fetch(
        `/api/pings/${selectedPing.ping_number}/team`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId: newTeamId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update team');
      }

      const { ping } = await response.json();

      // Update local ping state
      setSelectedPing((prev) =>
        prev ? { ...prev, team_id: ping.team_id } : null
      );

      // Update ping in the list
      setPings((prevPings) =>
        prevPings.map((p) =>
          p.id === selectedPing.id ? { ...p, team_id: ping.team_id } : p
        )
      );

      const teamName = newTeamId
        ? availableTeams.find((t) => t.id === newTeamId)?.name || 'team'
        : 'No Team';
      toast.success(`Ping moved to ${teamName}`);
    } catch (error) {
      console.error('Error updating team:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update team'
      );
    } finally {
      setIsUpdatingTeam(false);
    }
  };

  // Refresh AI summary
  const handleRefreshSummary = async () => {
    if (!selectedPing || isRefreshingSummary) return;

    setIsRefreshingSummary(true);
    try {
      const response = await fetch(
        `/api/pings/${selectedPing.ping_number}/summary`,
        {
          method: 'POST',
        }
      );

      const data = await response.json();

      if (response.ok && data.summary) {
        setSelectedPing((prev) =>
          prev ? { ...prev, ai_summary: data.summary } : null
        );
        setPings((prevPings) =>
          prevPings.map((p) =>
            p.id === selectedPing.id ? { ...p, ai_summary: data.summary } : p
          )
        );
        toast.success('Summary updated');
      } else if (data.notice) {
        toast.info(data.notice);
      } else {
        toast.error('Failed to refresh summary');
      }
    } catch (error) {
      console.error('Error refreshing summary:', error);
      toast.error('Failed to refresh summary');
    } finally {
      setIsRefreshingSummary(false);
    }
  };

  // Fetch available agents for adding to team
  const fetchAvailableAgents = async () => {
    setIsLoadingAgents(true);
    try {
      const response = await fetch('/api/agents');
      if (response.ok) {
        const data = await response.json();
        setAvailableAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  // Add member to team
  const handleAddMember = async (agentId: string) => {
    setIsAddingMember(true);
    try {
      const response = await fetch(`/api/teams/${team.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: agentId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add member');
      }

      const member = await response.json();
      setTeamMembers((prev) => [...prev, member]);
      setShowAgentSelector(false);
      toast.success('Member added successfully');
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to add member'
      );
    } finally {
      setIsAddingMember(false);
    }
  };

  // Remove member from team
  const handleRemoveMember = async (userId: string) => {
    setIsRemovingMember(userId);
    try {
      const response = await fetch(
        `/api/teams/${team.id}/members?user_id=${userId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove member');
      }

      setTeamMembers((prev) => prev.filter((m) => m.id !== userId));
      toast.success('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove member'
      );
    } finally {
      setIsRemovingMember(null);
    }
  };

  // Filter agents who aren't already team members
  const filteredAgents = availableAgents.filter(
    (agent) => !teamMembers.find((m) => m.id === agent.id)
  );

  // Fetch available categories for the category selector
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const supabase = createClient();
        const { data: categories } = await supabase
          .from('categories')
          .select('id, name, color')
          .eq('is_active', true)
          .order('sort_order');

        if (categories) {
          setAvailableCategories(categories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Fetch agents on mount for assignment dropdown
  useEffect(() => {
    fetchAvailableAgents();
  }, []);

  // Fetch available teams for the team selector
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const supabase = createClient();
        const { data: teams } = await supabase
          .from('agent_teams')
          .select('id, name')
          .order('name');

        if (teams) {
          setAvailableTeams(teams);
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
      }
    };

    fetchTeams();
  }, []);

  // Scroll to bottom when selectedPing changes
  useEffect(() => {
    setTimeout(scrollToBottom, 300);
  }, [selectedPing]);

  // Auto-scroll when replying indicator appears/disappears
  useEffect(() => {
    if (isReplying) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isReplying]);

  // Subscribe to realtime message updates
  useEffect(() => {
    if (!selectedPing) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`team-inbox-messages:${selectedPing.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ping_messages',
          filter: `ping_id=eq.${selectedPing.id}`,
        },
        async (payload) => {
          const { data: newMessage } = await supabase
            .from('ping_messages')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (!newMessage) return;

          const { data: sender } = await supabase
            .from('users')
            .select('id, full_name, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();

          if (!sender) return;

          const transformedMessage = {
            id: newMessage.id,
            content: newMessage.content,
            message_type: newMessage.message_type,
            created_at: newMessage.created_at,
            sender: sender as Pick<User, 'id' | 'full_name' | 'avatar_url'>,
            attachments: [],
          };

          setSelectedPing((prev) => {
            if (!prev) return prev;
            const exists = prev.messages.some(
              (m) => m.id === transformedMessage.id
            );
            if (exists) return prev;
            return {
              ...prev,
              messages: [...prev.messages, transformedMessage],
              updated_at: new Date().toISOString(),
            };
          });

          setPings((prevPings) =>
            prevPings.map((p) => {
              if (p.id === selectedPing.id) {
                const exists = p.messages.some(
                  (m) => m.id === transformedMessage.id
                );
                if (exists) return p;
                return {
                  ...p,
                  messages: [...p.messages, transformedMessage],
                  updated_at: new Date().toISOString(),
                };
              }
              return p;
            })
          );

          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setIsReconnecting(false);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          setIsReconnecting(true);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
          setIsReconnecting(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPing?.id]);

  // Subscribe to realtime ping updates (status, ai_summary, etc.)
  useEffect(() => {
    if (!selectedPing) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`team-inbox-ping-updates:${selectedPing.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pings',
          filter: `id=eq.${selectedPing.id}`,
        },
        async (payload) => {
          const updatedRecord = payload.new as Record<string, unknown>;

          // Fetch updated ping with assigned_to relation
          const { data: updatedPing } = await supabase
            .from('pings')
            .select(
              'assigned_to:users!pings_assigned_to_fkey(id, full_name, avatar_url)'
            )
            .eq('id', selectedPing.id)
            .single();

          const assignedTo = updatedPing?.assigned_to
            ? Array.isArray(updatedPing.assigned_to)
              ? updatedPing.assigned_to[0]
              : updatedPing.assigned_to
            : null;

          // Update selectedPing with new data from payload
          setSelectedPing((prev) => {
            if (!prev) return prev;

            // CRITICAL: For ai_summary, use summary_updated_at for comparison
            // This prevents stale updates from overwriting fresh summaries
            const payloadSummaryUpdatedAt = updatedRecord.summary_updated_at as
              | string
              | null;
            const prevSummaryUpdatedAt = (prev as any).summary_updated_at;

            let newAiSummary = prev.ai_summary;
            if (payloadSummaryUpdatedAt) {
              const payloadTime = new Date(payloadSummaryUpdatedAt).getTime();
              const prevTime = prevSummaryUpdatedAt
                ? new Date(prevSummaryUpdatedAt).getTime()
                : 0;

              if (payloadTime >= prevTime) {
                newAiSummary = updatedRecord.ai_summary as string | null;
              }
            }

            return {
              ...prev,
              status: updatedRecord.status as typeof prev.status,
              priority: updatedRecord.priority as typeof prev.priority,
              title: updatedRecord.title as string,
              ai_summary: newAiSummary,
              updated_at: updatedRecord.updated_at as string,
              assigned_to: assignedTo,
            };
          });

          // Also update the ping in the list
          setPings((prevPings) =>
            prevPings.map((p) => {
              if (p.id !== selectedPing.id) return p;

              const payloadSummaryUpdatedAt =
                updatedRecord.summary_updated_at as string | null;
              const prevSummaryUpdatedAt = (p as any).summary_updated_at;

              let newAiSummary = p.ai_summary;
              if (payloadSummaryUpdatedAt) {
                const payloadTime = new Date(payloadSummaryUpdatedAt).getTime();
                const prevTime = prevSummaryUpdatedAt
                  ? new Date(prevSummaryUpdatedAt).getTime()
                  : 0;

                if (payloadTime >= prevTime) {
                  newAiSummary = updatedRecord.ai_summary as string | null;
                }
              }

              return {
                ...p,
                status: updatedRecord.status as typeof p.status,
                priority: updatedRecord.priority as typeof p.priority,
                title: updatedRecord.title as string,
                ai_summary: newAiSummary,
                updated_at: updatedRecord.updated_at as string,
                assigned_to: assignedTo,
              };
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPing?.id]);

  // Subscribe to presence for replying indicators
  useEffect(() => {
    if (!selectedPing) return;

    const supabase = createClient();
    const channel = supabase.channel(`ping-replying:${selectedPing.id}`, {
      config: {
        presence: { key: currentUser.id },
        broadcast: { self: true },
      },
    });

    presenceChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const replyingUsers = Object.values(state)
          .flat()
          .filter((user: any) => user.id !== currentUser.id && user.isReplying)
          .map((user: any) => ({
            userId: user.id,
            userName: user.userName,
          }));

        setIsReplying(replyingUsers[0] || null);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: currentUser.id,
            userName: currentUser.full_name,
            isReplying: false,
          });
        }
      });

    return () => {
      presenceChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [selectedPing?.id, currentUser.id, currentUser.full_name]);

  // Subscribe to new pings being routed to this team
  useEffect(() => {
    const supabase = createClient();

    const handleNewTeamPing = async (payload: any) => {
      const pingData = payload.new as Record<string, unknown>;

      // Only process if this ping belongs to our team
      if (pingData.team_id !== team.id) return;

      // Skip draft pings
      if (pingData.status === 'draft') return;

      // Check if we already have this ping
      const existsInList = pings.some((p) => p.id === pingData.id);
      if (existsInList) return;

      // Fetch the full ping with all relations
      const { data: newPing, error: pingError } = await supabase
        .from('pings')
        .select('*')
        .eq('id', pingData.id)
        .single();

      if (pingError || !newPing) return;

      // Fetch creator
      const { data: creator } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url')
        .eq('id', newPing.created_by)
        .single();

      // Fetch category if exists
      let category = null;
      if (newPing.category_id) {
        const { data: cat } = await supabase
          .from('categories')
          .select('id, name, color, icon')
          .eq('id', newPing.category_id)
          .single();
        category = cat;
      }

      // Fetch assigned user if exists
      let assigned = null;
      if (newPing.assigned_to) {
        const { data: assignee } = await supabase
          .from('users')
          .select('id, full_name, avatar_url')
          .eq('id', newPing.assigned_to)
          .single();
        assigned = assignee;
      }

      // Fetch initial messages
      const { data: messages } = await supabase
        .from('ping_messages')
        .select('*')
        .eq('ping_id', newPing.id)
        .order('created_at', { ascending: true });

      // Fetch senders for messages
      const messagesWithSenders = await Promise.all(
        (messages || []).map(async (msg) => {
          const { data: sender } = await supabase
            .from('users')
            .select('id, full_name, avatar_url, role')
            .eq('id', msg.sender_id)
            .single();
          return { ...msg, sender };
        })
      );

      const transformedPing = {
        ...newPing,
        created_by: creator,
        assigned_to: assigned,
        category,
        messages: messagesWithSenders,
      };

      // Add new ping to the list
      setPings((prev: PingWithRelations[]) => {
        const exists = prev.some((p) => p.id === transformedPing.id);
        if (exists) return prev;
        return [transformedPing as PingWithRelations, ...prev];
      });

      // Show toast notification
      toast.info(
        `New ping #PING-${String(newPing.ping_number).padStart(3, '0')} routed to ${team.name}`
      );
    };

    const channel = supabase
      .channel(`team-inbox-new-pings:${team.id}`)
      // Listen for pings being routed to this team (UPDATE with team_id change)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pings',
          filter: `team_id=eq.${team.id}`,
        },
        handleNewTeamPing
      )
      // Also listen for new pings created directly with this team_id
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pings',
          filter: `team_id=eq.${team.id}`,
        },
        handleNewTeamPing
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [team.id, team.name, pings]);

  // Filter pings
  const filteredPings = pings
    .filter((ping) => {
      if (filter === 'unclaimed') {
        return ping.assigned_to === null;
      }
      if (filter === 'mine') {
        return ping.assigned_to?.id === currentUser.id;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { urgent: 1, high: 2, normal: 3, low: 4 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });

  // Auto-select first ping when filter/sort changes
  useEffect(() => {
    if (filteredPings.length > 0) {
      const firstPing = filteredPings[0];
      setSelectedPing(firstPing);
      markPingAsRead(firstPing);
    } else {
      setSelectedPing(null);
    }
  }, [filter, sortBy]);

  const uploadFiles = async (
    files: File[],
    userId: string
  ): Promise<
    Array<{ name: string; path: string; size: number; type: string }>
  > => {
    const uploadedFiles = [];
    const supabase = createClient();

    for (const file of files) {
      const filePath = `${userId}/${Date.now()}-${file.name}`;

      const { data, error } = await supabase.storage
        .from('ping-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
      }

      setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));

      uploadedFiles.push({
        name: file.name,
        path: data.path,
        size: file.size,
        type: file.type,
      });
    }

    return uploadedFiles;
  };

  const markPingAsRead = async (ping: PingWithRelations) => {
    if (!ping.messages.length) return;

    try {
      const lastMessage = ping.messages[ping.messages.length - 1];
      await fetch(`/api/pings/${ping.ping_number}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastReadMessageId: lastMessage.id }),
      });

      setPings((prevPings) =>
        prevPings.map((p) => (p.id === ping.id ? { ...p, unread_count: 0 } : p))
      );
    } catch (_error) {
      // Silently handle
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() && selectedFiles.length === 0) {
      toast.error('Message or attachments required');
      return;
    }

    if (!selectedPing) return;

    setIsSending(true);
    setIsUploadingFiles(true);

    try {
      let uploadedFiles: Array<{
        name: string;
        path: string;
        size: number;
        type: string;
      }> = [];

      if (selectedFiles.length > 0) {
        uploadedFiles = await uploadFiles(selectedFiles, currentUser.id);
      }

      const response = await fetch(
        `/api/pings/${selectedPing.ping_number}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: replyMessage.trim() || '(attachment)',
            attachments: uploadedFiles.map((f) => ({
              file_name: f.name,
              file_path: f.path,
              file_size: f.size,
              mime_type: f.type,
            })),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to send message');
        return;
      }

      const { message } = await response.json();

      setSelectedPing((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, message],
        };
      });

      setReplyMessage('');
      setSelectedFiles([]);
      setUploadProgress({});

      setTimeout(scrollToBottom, 100);
      setTimeout(() => replyTextareaRef.current?.focus(), 150);
    } catch (_error) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
      setIsUploadingFiles(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyMessage(e.target.value);

    if (!selectedPing || !presenceChannelRef.current) return;

    if (replyingTimeoutRef.current) {
      clearTimeout(replyingTimeoutRef.current);
    }

    const channel = presenceChannelRef.current;

    channel.track({
      id: currentUser.id,
      userName: currentUser.full_name,
      isReplying: true,
    });

    replyingTimeoutRef.current = setTimeout(() => {
      channel.track({
        id: currentUser.id,
        userName: currentUser.full_name,
        isReplying: false,
      });
    }, 2000);
  };

  const handleUseSuggestedResponse = () => {
    setReplyMessage(suggestedResponse);
  };

  // Fetch Echo response suggestion from API
  const fetchSuggestion = async (alternative = false) => {
    if (!selectedPing || selectedPing.status === 'draft') {
      return;
    }

    setIsLoadingSuggestion(true);
    setSuggestionError(null);

    try {
      const response = await fetch(
        `/api/pings/${selectedPing.ping_number}/echo/suggest`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alternative }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate suggestion');
      }

      const data = await response.json();
      setSuggestedResponse(data.suggestion);
    } catch (err) {
      console.error('[Echo] Failed to fetch suggestion:', err);
      setSuggestionError(
        err instanceof Error ? err.message : 'Failed to generate suggestion'
      );
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  // Clear suggestion when ping changes (agent must manually request new suggestions)
  useEffect(() => {
    setSuggestedResponse('');
    setSuggestionError(null);
  }, [selectedPing?.id]);

  // Keyboard shortcut: Cmd+Shift+E to toggle Echo panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'e') {
        e.preventDefault();
        setShowEcho((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {selectedPing && (
        <ConnectionStatusIndicator
          isConnected={isConnected}
          isReconnecting={isReconnecting}
        />
      )}
      <div className="flex h-screen bg-gradient-to-b from-slate-50 to-blue-50">
        {/* Ping List - Left Panel */}
        <div className="w-96 bg-white border-r border-slate-200 flex flex-col shadow-lg">
          {/* Team Header */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 border-b border-slate-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                <h2 className="text-xl font-bold text-white">{team.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMemberList(!showMemberList)}
                  className="text-slate-400 hover:text-white transition-colors"
                  title={
                    isManagerOrOwner
                      ? 'Manage team members'
                      : 'View team members'
                  }
                >
                  {isManagerOrOwner ? (
                    <UserPlus className="w-5 h-5" />
                  ) : (
                    <Users className="w-5 h-5" />
                  )}
                </button>
                {isManagerOrOwner && (
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-slate-400 hover:text-red-400 transition-colors"
                    title="Delete team"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            {team.description && (
              <p className="text-sm text-slate-400 mb-3">{team.description}</p>
            )}

            {/* Member List (collapsible) */}
            {showMemberList && (
              <div className="mb-3 p-2 bg-slate-800/50 rounded-lg">
                <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">
                  Team Members ({teamMembers.length})
                </h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between gap-2 text-sm group"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.full_name}
                            className="w-5 h-5 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-xs text-white flex-shrink-0">
                            {member.full_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="text-slate-300 truncate">
                          {member.full_name}
                        </span>
                      </div>
                      {isManagerOrOwner && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={isRemovingMember === member.id}
                          className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                          title="Remove from team"
                        >
                          {isRemovingMember === member.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Member Section - Only for managers/owners */}
                {isManagerOrOwner && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    {showAgentSelector ? (
                      <div className="space-y-2">
                        {isLoadingAgents ? (
                          <div className="flex items-center justify-center py-2">
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          </div>
                        ) : filteredAgents.length === 0 ? (
                          <p className="text-xs text-slate-500 text-center py-2">
                            No available agents to add
                          </p>
                        ) : (
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {filteredAgents.map((agent) => (
                              <button
                                key={agent.id}
                                onClick={() => handleAddMember(agent.id)}
                                disabled={isAddingMember}
                                className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-slate-700 text-left transition-colors disabled:opacity-50"
                              >
                                {agent.avatar_url ? (
                                  <img
                                    src={agent.avatar_url}
                                    alt={agent.full_name}
                                    className="w-5 h-5 rounded-full"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-xs text-white">
                                    {agent.full_name?.charAt(0).toUpperCase() ||
                                      '?'}
                                  </div>
                                )}
                                <span className="text-sm text-slate-300 truncate">
                                  {agent.full_name}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => setShowAgentSelector(false)}
                          className="w-full text-xs text-slate-500 hover:text-slate-300 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setShowAgentSelector(true);
                          fetchAvailableAgents();
                        }}
                        className="flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-400 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add Member
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <select
                value={filter}
                onChange={(e) =>
                  setFilter(e.target.value as 'all' | 'unclaimed' | 'mine')
                }
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Team Pings</option>
                <option value="unclaimed">Unclaimed</option>
                <option value="mine">Claimed by Me</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'recent' | 'priority')
                }
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="recent">Recent Activity</option>
                <option value="priority">Priority</option>
              </select>
            </div>
          </div>

          {/* Ping List */}
          <div className="flex-1 overflow-y-auto">
            {filteredPings.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p>No pings found</p>
              </div>
            ) : (
              filteredPings.map((ping) => (
                <button
                  key={ping.id}
                  onClick={() => {
                    setSelectedPing(ping);
                    markPingAsRead(ping);
                  }}
                  className={`w-full p-4 border-b border-slate-200 text-left transition-all hover:bg-blue-50 ${
                    selectedPing?.id === ping.id
                      ? 'bg-gradient-to-r from-orange-50 to-transparent border-l-4 border-l-orange-500'
                      : ping.priority === 'urgent'
                        ? 'border-l-4 border-l-red-500 bg-red-50'
                        : 'border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-slate-900">
                        #PING-{String(ping.ping_number).padStart(3, '0')}
                      </span>
                      {ping.unread_count !== undefined &&
                        ping.unread_count > 0 && (
                          <span className="bg-blue-500 text-white px-2 py-0.5 text-xs rounded-full font-medium">
                            {ping.unread_count}
                          </span>
                        )}
                    </div>
                    <SLATimer ping={ping} />
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-2 line-clamp-1">
                    {ping.title}
                  </p>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-slate-500">
                      {ping.created_by.full_name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatPingAge(ping.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={ping.status} />
                      <PriorityBadge priority={ping.priority} />
                    </div>
                    {ping.category && (
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                        {ping.category.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {ping.assigned_to ? (
                      <>
                        {ping.assigned_to.avatar_url ? (
                          <img
                            src={ping.assigned_to.avatar_url}
                            alt={ping.assigned_to.full_name}
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-xs text-white">
                            {ping.assigned_to.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs text-slate-400">
                          {ping.assigned_to.full_name}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-orange-500 font-medium">
                        Unclaimed
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Ping Detail - Center Panel */}
        <div className="flex-1 flex flex-col">
          {!selectedPing ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <p>Select a ping to view details</p>
            </div>
          ) : (
            <>
              {/* Ping Header */}
              <PingDetailHeader
                ping={selectedPing}
                currentUser={currentUser}
                onStatusChange={handleStatusChange}
                isUpdatingStatus={isUpdatingStatus}
                onPriorityChange={handlePriorityChange}
                isUpdatingPriority={isUpdatingPriority}
                onClaimPing={handleClaimPing}
                isClaiming={isClaiming}
              />

              {/* Sticky Summary & Actions Section */}
              <div className="flex-shrink-0 bg-blue-500/10 backdrop-blur-sm border-b border-blue-200 shadow-sm sticky top-0 z-10">
                <div className="px-6 py-4">
                  {/* Category, Assignment, Team Dropdowns - collapse with summary */}
                  {currentUser.role !== 'end_user' && !isSummaryCollapsed && (
                    <div className="flex items-center gap-6 mb-3">
                      {/* Category */}
                      {availableCategories.length > 0 &&
                        selectedPing.status !== 'draft' && (
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-slate-500 font-medium">
                              Category:
                            </label>
                            <select
                              value={selectedPing.category?.id || ''}
                              onChange={(e) =>
                                handleCategoryChange(e.target.value)
                              }
                              disabled={isUpdatingCategory}
                              className="px-2 py-1 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {!selectedPing.category && (
                                <option value="">Select...</option>
                              )}
                              {availableCategories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                      {/* Assignment */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 font-medium">
                          Assigned:
                        </label>
                        <select
                          value={selectedPing.assigned_to?.id || ''}
                          onChange={(e) =>
                            handleAssignmentChange(e.target.value || null)
                          }
                          disabled={isUpdatingAssignment || isLoadingAgents}
                          className="px-2 py-1 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Unassigned</option>
                          {availableAgents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.full_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Team */}
                      {availableTeams.length > 0 && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-500 font-medium">
                            Team:
                          </label>
                          <select
                            value={selectedPing.team_id || ''}
                            onChange={(e) =>
                              handleTeamChange(e.target.value || null)
                            }
                            disabled={isUpdatingTeam}
                            className="px-2 py-1 bg-white border border-slate-300 rounded text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">No Team</option>
                            {availableTeams.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Summary (collapsible) */}
                  {selectedPing.ai_summary && (
                    <div className="flex items-start justify-between gap-4">
                      <button
                        onClick={() =>
                          setIsSummaryCollapsed(!isSummaryCollapsed)
                        }
                        className="flex-1 flex items-start justify-between gap-4 text-left group"
                      >
                        <div className="flex-1">
                          {isSummaryCollapsed ? (
                            <span className="text-sm font-medium text-slate-600">
                              AI Summary
                            </span>
                          ) : (
                            <p className="text-slate-900 leading-relaxed">
                              {selectedPing.ai_summary}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors">
                          {isSummaryCollapsed ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronUp className="w-5 h-5" />
                          )}
                        </div>
                      </button>
                      <button
                        onClick={handleRefreshSummary}
                        disabled={isRefreshingSummary}
                        className="flex-shrink-0 p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors disabled:opacity-50"
                        title="Refresh summary"
                      >
                        {isRefreshingSummary ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-white to-slate-50">
                <div className="space-y-4 px-6">
                  {selectedPing.messages
                    .filter((message) => message.sender)
                    .map((message) => {
                      const isCurrentUser =
                        message.sender.id === currentUser.id;
                      return (
                        <PingMessageComponent
                          key={message.id}
                          message={message}
                          isCurrentUser={isCurrentUser}
                          attachments={message.attachments}
                        />
                      );
                    })}

                  {isReplying && (
                    <ReplyingIndicator userName={isReplying.userName} />
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Reply Box */}
              <div className="border-t border-slate-200 p-6 bg-white shadow-xl">
                <div className="px-6">
                  <div className="flex gap-3">
                    <FileAttachmentInput
                      onFilesSelected={setSelectedFiles}
                      isUploading={isUploadingFiles}
                      disabled={isSending}
                    />
                    <textarea
                      ref={replyTextareaRef}
                      value={replyMessage}
                      onChange={handleMessageChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your reply..."
                      className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none bg-slate-50"
                      rows={3}
                      disabled={isSending}
                    />
                    <button
                      onClick={handleSendReply}
                      disabled={
                        (!replyMessage.trim() && selectedFiles.length === 0) ||
                        isSending
                      }
                      className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 disabled:shadow-none transform hover:scale-105 disabled:transform-none"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  {selectedFiles.length > 0 && (
                    <FilePreviewList
                      files={selectedFiles}
                      onRemove={(index) =>
                        setSelectedFiles((prev) =>
                          prev.filter((_, i) => i !== index)
                        )
                      }
                      uploadProgress={uploadProgress}
                    />
                  )}
                </div>
              </div>
            </>
          )}
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
                  {isLoadingSuggestion && (
                    <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                  )}
                </h4>

                {/* Loading State */}
                {isLoadingSuggestion && !suggestedResponse && (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">
                        Generating suggestion...
                      </p>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {suggestionError && !isLoadingSuggestion && (
                  <div className="bg-red-900/30 border border-red-700 rounded p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-red-300">
                          {suggestionError}
                        </p>
                        <button
                          onClick={() => fetchSuggestion()}
                          className="text-xs text-orange-400 hover:text-orange-300 mt-1 underline"
                        >
                          Try again
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty State - Call to Action */}
                {!isLoadingSuggestion &&
                  !suggestionError &&
                  !suggestedResponse && (
                    <div className="text-center py-6">
                      <p className="text-sm text-slate-400 mb-4">
                        {selectedPing?.status === 'draft'
                          ? 'Suggestions available after ping is submitted'
                          : 'Let Echo help you craft a response'}
                      </p>
                      <button
                        onClick={() => fetchSuggestion()}
                        disabled={selectedPing?.status === 'draft'}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                      >
                        <Sparkles className="w-4 h-4" />
                        Generate Suggestion
                      </button>
                    </div>
                  )}

                {/* Textarea and Buttons - shown after suggestion generated */}
                {!isLoadingSuggestion && suggestedResponse && (
                  <>
                    <textarea
                      value={suggestedResponse}
                      onChange={(e) => setSuggestedResponse(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-sm text-slate-100 mb-3 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                      rows={6}
                      placeholder="Edit the suggestion as needed..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleUseSuggestedResponse}
                        disabled={!suggestedResponse.trim()}
                        className="flex-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                      >
                        Use This Response
                      </button>
                      <button
                        onClick={() => fetchSuggestion(true)}
                        disabled={
                          isLoadingSuggestion ||
                          selectedPing?.status === 'draft'
                        }
                        className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Generate another suggestion"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Suggested Articles */}
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <h4 className="text-sm font-semibold text-white mb-3">
                  Related KB Articles
                </h4>
                <div className="text-sm text-slate-400 italic">
                  Will be populated in Epic 3
                </div>
              </div>
            </div>
          </div>
        )}

        {!showEcho && (
          <button
            onClick={() => setShowEcho(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3 rounded-l-lg shadow-xl hover:shadow-2xl transition-all"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Delete Team Dialog */}
      {isManagerOrOwner && (
        <TeamDeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          team={team}
          memberCount={teamMembers.length}
          pingCount={pings.length}
          onSuccess={() => {
            // Remove team from sidebar immediately via context
            teamsContext?.removeTeam(team.id);
            router.push('/inbox');
          }}
        />
      )}
    </>
  );
}
