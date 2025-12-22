'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  RefreshCw,
  Loader2,
  Lock,
  Inbox,
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
import { playNotificationSound } from '@/lib/notification-sound';
import { ConnectionStatusIndicator } from '@/components/inbox/connection-status-indicator';
import { PingDetailHeader } from '@/components/pings/ping-detail-header';
import {
  ResolutionNotesDialog,
  KBAction,
} from '@/components/pings/resolution-notes-dialog';
import { useEchoKBSuggestions } from '@/hooks/use-echo-kb-suggestions';
import { KBArticleModal } from '@/components/kb/kb-article-modal';
import { BookOpen, ExternalLink } from 'lucide-react';

// Filter configuration for dynamic titles
const FILTER_CONFIG = {
  all: { title: 'All Pings', description: 'View all pings in the inbox' },
  assigned: { title: 'Assigned to Me', description: 'Pings assigned to you' },
  unassigned: { title: 'Unassigned', description: 'Pings awaiting assignment' },
  urgent: { title: 'Urgent Pings', description: 'High priority pings' },
  closed: { title: 'Closed', description: 'Your resolved and closed pings' },
} as const;

type FilterType = keyof typeof FILTER_CONFIG;

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
  team_id?: string | null;
  created_by: Pick<User, 'id' | 'full_name' | 'email' | 'avatar_url'>;
  assigned_to: Pick<User, 'id' | 'full_name' | 'avatar_url'> | null;
  category: { id: string; name: string; color: string } | null;
  messages: Array<{
    id: string;
    content: string;
    message_type: PingMessage['message_type'];
    visibility?: 'public' | 'private'; // Story 4.2.1: Message visibility for private notes
    created_at: string;
    sender: Pick<User, 'id' | 'full_name' | 'avatar_url'>;
    attachments?: PingAttachment[];
  }>;
  unread_count?: number;
}

interface InboxClientProps {
  pings: PingWithRelations[];
  currentUser: Pick<
    User,
    'id' | 'full_name' | 'avatar_url' | 'role' | 'tenant_id'
  >;
}

// SLA Timer Component
function SLATimer({ ping }: { ping: PingWithRelations }) {
  // TODO: Calculate SLA from ping.sla_due_at
  // For now, show simplified status
  if (ping.status === 'waiting_on_user') {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <Pause className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-500 font-medium">Paused</span>
      </div>
    );
  }

  // Calculate time remaining from sla_due_at
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

export function InboxClient({
  pings: initialPings,
  currentUser,
}: InboxClientProps) {
  const searchParams = useSearchParams();
  const [pings, setPings] = useState<PingWithRelations[]>(initialPings);
  const [selectedPing, setSelectedPing] = useState<PingWithRelations | null>(
    pings[0] || null
  );
  const [replyMessage, setReplyMessage] = useState('');
  const [showEcho, setShowEcho] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'priority'>('recent');

  // Read filter from URL params (default to 'all' when no filter specified)
  const urlFilter = searchParams.get('filter');
  const filter: FilterType =
    urlFilter === 'assigned' ||
    urlFilter === 'unassigned' ||
    urlFilter === 'urgent' ||
    urlFilter === 'closed'
      ? urlFilter
      : 'all';

  // Get dynamic title based on current filter
  const filterConfig = FILTER_CONFIG[filter];
  const [suggestedResponse, setSuggestedResponse] = useState('');
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  // Story 4.2.1: Split send button dropdown state
  const [isSendDropdownOpen, setIsSendDropdownOpen] = useState(false);
  const [isReplying, setIsReplying] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  // Story 4.2.1: Resolution notes dialog state
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const [agents, setAgents] = useState<
    Array<{
      id: string;
      full_name: string;
      avatar_url: string | null;
      role: string;
    }>
  >([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [soundEnabled, _setSoundEnabled] = useState(true);
  const [availableCategories, setAvailableCategories] = useState<
    Array<{ id: string; name: string; color: string }>
  >([]);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [isUpdatingTeam, setIsUpdatingTeam] = useState(false);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);
  // Story 4.8: KB article modal state
  const [selectedKBArticleSlug, setSelectedKBArticleSlug] = useState<
    string | null
  >(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  // Story 4.2.1: Ref for send dropdown click-outside detection
  const sendDropdownRef = useRef<HTMLDivElement>(null);
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

  // Story 4.8: KB suggestions for Echo panel
  const {
    suggestions: kbSuggestions,
    isLoading: isLoadingKBSuggestions,
    message: kbSuggestionsMessage,
  } = useEchoKBSuggestions(
    selectedPing?.ping_number?.toString() || null,
    selectedPing?.ai_summary
  );

  // Scroll to bottom of message thread
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle status change
  const handleStatusChange = async (newStatus: PingStatus) => {
    if (!selectedPing || newStatus === selectedPing.status) return;

    // Story 4.2.1: Show resolution notes dialog when resolving
    if (newStatus === 'resolved') {
      setShowResolutionDialog(true);
      return;
    }

    await performStatusChange(newStatus);
  };

  // Story 4.2.1: Perform the actual status change with optional resolution notes
  const performStatusChange = async (
    newStatus: PingStatus,
    resolutionNotes?: string | null
  ) => {
    if (!selectedPing) return;

    setIsUpdatingStatus(true);
    try {
      // If resolution notes provided, add as private note first
      if (resolutionNotes) {
        const noteResponse = await fetch(
          `/api/pings/${selectedPing.ping_number}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `**Resolution Notes:**\n${resolutionNotes}`,
              visibility: 'private',
            }),
          }
        );

        if (!noteResponse.ok) {
          console.error('Failed to add resolution notes');
          // Continue with status change even if notes fail
        }
      }

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

      // Update local ping state
      setSelectedPing((prev) =>
        prev ? { ...prev, status: ping.status } : null
      );

      // Update ping in the list
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

  // Story 4.2.1: Handle resolution dialog confirmation
  // Story 4.2.2: Added generateKB parameter for KB article generation
  // Story 4.2.3: Added kbAction parameter for KB enhancement
  const handleResolutionConfirm = async (
    notes: string | null,
    generateKB: boolean,
    kbAction?: { action: KBAction; articleId?: string }
  ) => {
    setShowResolutionDialog(false);
    await performStatusChange('resolved' as PingStatus, notes);

    // Story 4.2.3: Handle KB enhancement
    if (kbAction?.action === 'enhance' && kbAction.articleId && selectedPing) {
      fetch(`/api/kb/articles/${kbAction.articleId}/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pingId: selectedPing.id }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (res.ok && data.success) {
            toast.success(
              `KB article enhancement draft created! ${data.article.changesSummary}`
            );
            // Redirect to KB listing page
            setTimeout(() => {
              window.location.href = `/kb`;
            }, 1500);
          } else {
            toast.error(data.error || 'Failed to enhance KB article');
          }
        })
        .catch((err) => {
          console.error('Error enhancing KB article:', err);
          toast.error('Failed to enhance KB article');
        });
    }
    // Story 4.2.2: Generate new KB article if requested (fire and forget)
    else if ((generateKB || kbAction?.action === 'generate') && selectedPing) {
      fetch(`/api/pings/${selectedPing.ping_number}/generate-kb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateKB: true }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (res.ok && data.success) {
            toast.success(
              `KB article draft "${data.article.title}" created! View it in the Knowledge Base.`
            );
            // Redirect to KB listing page (edit page will be Story 4.3)
            setTimeout(() => {
              window.location.href = `/kb`;
            }, 1500);
          } else {
            toast.error(data.error || 'Failed to generate KB article');
          }
        })
        .catch((err) => {
          console.error('Error generating KB article:', err);
          toast.error('Failed to generate KB article');
        });
    }
  };

  // Handle assignment change
  const handleAssignmentChange = async (newAssignedTo: string | null) => {
    if (!selectedPing) return;

    // Check if already assigned to this agent
    if (newAssignedTo === selectedPing.assigned_to?.id) return;

    setIsUpdatingAssignment(true);
    try {
      const response = await fetch(
        `/api/pings/${selectedPing.ping_number}/assign`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignedTo: newAssignedTo === '' ? null : newAssignedTo,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update assignment');
      }

      const { ping } = await response.json();

      // Fetch assignee details for local state update
      let assignedToData = null;
      if (ping.assigned_to) {
        const agent = agents.find((a) => a.id === ping.assigned_to);
        if (agent) {
          assignedToData = {
            id: agent.id,
            full_name: agent.full_name,
            avatar_url: agent.avatar_url,
          };
        }
      }

      // Update local ping state
      setSelectedPing((prev) =>
        prev ? { ...prev, assigned_to: assignedToData } : null
      );

      // Update ping in the list
      setPings((prevPings) =>
        prevPings.map((p) =>
          p.id === selectedPing.id ? { ...p, assigned_to: assignedToData } : p
        )
      );

      const assigneeName = assignedToData
        ? assignedToData.full_name
        : 'Unassigned';
      toast.success(`Ping assigned to ${assigneeName}`);
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update assignment'
      );
    } finally {
      setIsUpdatingAssignment(false);
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

      // Update local ping state
      setSelectedPing((prev) =>
        prev ? { ...prev, priority: ping.priority } : null
      );

      // Update ping in the list
      setPings((prevPings) =>
        prevPings.map((p) =>
          p.id === selectedPing.id ? { ...p, priority: ping.priority } : p
        )
      );

      // Capitalize first letter for display
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

  // Handle claim ping (assign to current user)
  const handleClaimPing = async () => {
    if (!selectedPing) return;

    setIsUpdatingAssignment(true);
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

      // Update local ping state with current user
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
      setIsUpdatingAssignment(false);
    }
  };

  // Scroll to bottom when selectedPing changes
  useEffect(() => {
    // Use longer timeout to ensure images and attachments are rendered
    setTimeout(scrollToBottom, 300);
  }, [selectedPing]);

  // Auto-scroll when replying indicator appears/disappears
  useEffect(() => {
    if (isReplying) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isReplying]);

  // Fetch agents for assignment dropdown
  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoadingAgents(true);
      try {
        const response = await fetch('/api/agents');
        if (response.ok) {
          const { agents } = await response.json();
          setAgents(agents);
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
      } finally {
        setIsLoadingAgents(false);
      }
    };

    fetchAgents();
  }, []);

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

  // Subscribe to realtime message updates
  useEffect(() => {
    if (!selectedPing) {
      return;
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`inbox-ping-messages:${selectedPing.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ping_messages',
          filter: `ping_id=eq.${selectedPing.id}`,
        },
        async (payload) => {
          // Fetch message without join to avoid RLS issues
          const { data: newMessage, error: messageError } = await supabase
            .from('ping_messages')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (messageError || !newMessage) {
            return;
          }

          // Fetch sender separately using their ID
          const { data: sender, error: senderError } = await supabase
            .from('users')
            .select('id, full_name, avatar_url, role')
            .eq('id', newMessage.sender_id)
            .single();

          if (senderError || !sender) {
            return;
          }

          // Fetch attachments separately via API (to ensure proper tenant context)
          // Note: There's a race condition where the message is created before attachments
          // So we retry once after a short delay if no attachments are found
          let attachments: PingAttachment[] = [];
          try {
            const fetchAttachments = async () => {
              const attachmentsResponse = await fetch(
                `/api/pings/messages/${newMessage.id}/attachments`
              );
              if (attachmentsResponse.ok) {
                const { attachments: fetchedAttachments } =
                  await attachmentsResponse.json();
                return fetchedAttachments || [];
              }
              return [];
            };

            // First attempt
            attachments = await fetchAttachments();

            // If no attachments found, wait 500ms and retry once
            // (handles race condition where attachments are created after message)
            if (attachments.length === 0) {
              await new Promise((resolve) => setTimeout(resolve, 500));
              attachments = await fetchAttachments();
            }
          } catch (_attachmentsError) {
            // Silently handle attachment fetch errors
          }

          const transformedMessage = {
            id: newMessage.id,
            content: newMessage.content,
            message_type: newMessage.message_type,
            visibility: newMessage.visibility as 'public' | 'private', // Story 4.2.1: Include visibility for private note styling
            created_at: newMessage.created_at,
            sender: sender as Pick<User, 'id' | 'full_name' | 'avatar_url'>,
            attachments: (attachments || []) as PingAttachment[],
          };

          // Only add if not already in state (avoid duplicate from optimistic update)
          setSelectedPing((prev) => {
            if (!prev) {
              return prev;
            }
            const exists = prev.messages.some(
              (m) => m.id === transformedMessage.id
            );
            if (exists) {
              return prev;
            }
            return {
              ...prev,
              messages: [...prev.messages, transformedMessage],
              updated_at: new Date().toISOString(), // Update timestamp for sort order
            };
          });

          // Also update the message in the pings array so it persists when switching pings
          setPings((prevPings) =>
            prevPings.map((p) => {
              if (p.id === selectedPing.id) {
                // Check if message already exists in this ping
                const exists = p.messages.some(
                  (m) => m.id === transformedMessage.id
                );
                if (exists) {
                  return p;
                }
                // Add new message to this ping's messages and update timestamp
                return {
                  ...p,
                  messages: [...p.messages, transformedMessage],
                  updated_at: new Date().toISOString(), // Update timestamp for sort order
                };
              }
              return p;
            })
          );

          // Scroll to bottom
          setTimeout(scrollToBottom, 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pings',
          filter: `id=eq.${selectedPing.id}`,
        },
        async (payload) => {
          // Extract data from payload for scalar fields (source of truth)
          const updatedRecord = payload.new as Record<string, unknown>;

          // Fetch updated ping with assigned_to relation (only for relations)
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

          // Update selected ping using payload data for scalar fields
          setSelectedPing((prev) => {
            if (!prev) return null;

            // CRITICAL: For ai_summary, use summary_updated_at for comparison
            // This prevents stale updates from overwriting fresh summaries
            const payloadSummaryUpdatedAt = updatedRecord.summary_updated_at as
              | string
              | null;
            const prevSummaryUpdatedAt = (prev as any).summary_updated_at;

            let newAiSummary = prev.ai_summary;
            let newSummaryUpdatedAt = prevSummaryUpdatedAt;
            if (payloadSummaryUpdatedAt) {
              const payloadTime = new Date(payloadSummaryUpdatedAt).getTime();
              const prevTime = prevSummaryUpdatedAt
                ? new Date(prevSummaryUpdatedAt).getTime()
                : 0;

              if (payloadTime >= prevTime) {
                newAiSummary = updatedRecord.ai_summary as string | null;
                newSummaryUpdatedAt = payloadSummaryUpdatedAt;
              }
            }

            return {
              ...prev,
              status: updatedRecord.status as typeof prev.status,
              priority: updatedRecord.priority as typeof prev.priority,
              title: updatedRecord.title as string,
              ai_summary: newAiSummary,
              summary_updated_at: newSummaryUpdatedAt,
              updated_at: updatedRecord.updated_at as string,
              assigned_to: assignedTo,
            };
          });

          // Update ping in list
          setPings((prevPings) =>
            prevPings.map((p) => {
              if (p.id !== selectedPing.id) return p;

              const payloadSummaryUpdatedAt =
                updatedRecord.summary_updated_at as string | null;
              const prevSummaryUpdatedAt = (p as any).summary_updated_at;

              let newAiSummary = p.ai_summary;
              let newSummaryUpdatedAt = prevSummaryUpdatedAt;
              if (payloadSummaryUpdatedAt) {
                const payloadTime = new Date(payloadSummaryUpdatedAt).getTime();
                const prevTime = prevSummaryUpdatedAt
                  ? new Date(prevSummaryUpdatedAt).getTime()
                  : 0;

                if (payloadTime >= prevTime) {
                  newAiSummary = updatedRecord.ai_summary as string | null;
                  newSummaryUpdatedAt = payloadSummaryUpdatedAt;
                }
              }

              return {
                ...p,
                status: updatedRecord.status as typeof p.status,
                priority: updatedRecord.priority as typeof p.priority,
                title: updatedRecord.title as string,
                ai_summary: newAiSummary,
                summary_updated_at: newSummaryUpdatedAt,
                updated_at: updatedRecord.updated_at as string,
                assigned_to: assignedTo,
              };
            })
          );
        }
      )
      .subscribe((status) => {
        // Set connection state based on subscription status (authoritative source)
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setIsReconnecting(false);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setIsReconnecting(true);
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          setIsReconnecting(true);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
          setIsReconnecting(false);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPing?.id, currentUser.id, soundEnabled]);

  // Subscribe to new pings appearing in the inbox
  useEffect(() => {
    const supabase = createClient();

    const handleNewPing = async (payload: any) => {
      // Fetch the full ping with all relations using split-query pattern
      const { data: newPing, error: pingError } = await supabase
        .from('pings')
        .select('*')
        .eq('id', payload.new.id)
        .single();

      if (pingError || !newPing) {
        return;
      }

      // Skip draft pings (they're still in Echo conversation)
      if (newPing.status === 'draft') {
        return;
      }

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

      // Add new ping to the list (agents see all pings for their tenant)
      setPings((prev: PingWithRelations[]) => {
        // Check if already exists
        const exists = prev.some(
          (p: PingWithRelations) => p.id === transformedPing.id
        );
        if (exists) return prev;
        // Add to top of list
        return [transformedPing as PingWithRelations, ...prev];
      });

      // Show toast notification
      toast.info(
        `New ping #PING-${String(newPing.ping_number).padStart(3, '0')} from ${creator?.full_name || 'Unknown'}`
      );
    };

    const channel = supabase
      .channel('inbox-pings')
      // Listen for newly created pings
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pings',
          filter: `tenant_id=eq.${currentUser.tenant_id}`,
        },
        handleNewPing
      )
      // Listen for pings transitioning from draft to non-draft (Echo finalization)
      // Note: payload.old only contains primary key (replica identity default), not full row
      // So we check if the ping exists in our current list to determine if it's new
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pings',
          filter: `tenant_id=eq.${currentUser.tenant_id}`,
        },
        async (payload) => {
          const newStatus = (payload.new as any).status;
          const pingId = (payload.new as any).id;

          // Handle ping finalization (status changed to non-draft)
          // If status is not draft and we don't have this ping in our list, add it
          if (newStatus !== 'draft') {
            // Use a ref or callback to get current pings state to avoid stale closure
            setPings((currentPings) => {
              const existsInList = currentPings.some((p) => p.id === pingId);
              if (!existsInList) {
                // Trigger the async handler but return current state
                // The handleNewPing will update state separately
                handleNewPing(payload);
              }
              return currentPings;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.id, currentUser.tenant_id]);

  // Subscribe to ALL ping messages for pings in the inbox (to update unread counts and play sounds)
  useEffect(() => {
    const supabase = createClient();

    // Get all ping IDs that we're tracking
    const pingIds = pings.map((p) => p.id);

    if (pingIds.length === 0) {
      return;
    }

    const channel = supabase
      .channel('inbox-all-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ping_messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;

          // Only process if this message is for one of our tracked pings
          if (!pingIds.includes(newMessage.ping_id)) {
            return;
          }

          // Fetch sender info
          const { data: sender } = await supabase
            .from('users')
            .select('id, full_name, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();

          if (!sender) return;

          // Check if this message is for the currently selected ping
          const isCurrentlyViewingPing =
            selectedPing?.id === newMessage.ping_id;

          // If user is currently viewing this ping, mark it as read FIRST (before updating state)
          // This ensures the badge count hook doesn't see the new message as unread
          if (isCurrentlyViewingPing && sender.id !== currentUser.id) {
            await supabase.from('ping_reads').upsert({
              ping_id: newMessage.ping_id,
              user_id: currentUser.id,
              last_read_message_id: newMessage.id,
              last_read_at: newMessage.created_at, // Use message timestamp, not current time
            });
          }

          // Update the ping in the list
          setPings((prevPings) =>
            prevPings.map((p) => {
              if (p.id === newMessage.ping_id) {
                const updatedMessages = [
                  ...p.messages,
                  {
                    id: newMessage.id,
                    content: newMessage.content,
                    message_type: newMessage.message_type,
                    visibility: newMessage.visibility as 'public' | 'private', // Story 4.2.1: Include visibility for private note styling
                    created_at: newMessage.created_at,
                    sender,
                    attachments: [],
                  },
                ];

                // Don't increment unread count if:
                // 1. Message is from current user, OR
                // 2. User is currently viewing this ping
                const shouldIncrementUnread =
                  sender.id !== currentUser.id && !isCurrentlyViewingPing;

                const updatedUnreadCount = shouldIncrementUnread
                  ? (p.unread_count || 0) + 1
                  : p.unread_count || 0;

                return {
                  ...p,
                  messages: updatedMessages,
                  unread_count: updatedUnreadCount,
                  updated_at: newMessage.created_at,
                };
              }
              return p;
            })
          );

          // Play notification sound only if message is from another user AND not currently viewing this ping
          if (
            sender.id !== currentUser.id &&
            !isCurrentlyViewingPing &&
            soundEnabled
          ) {
            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pings.length, currentUser.id, soundEnabled, selectedPing]);

  // Subscribe to presence for replying indicators
  useEffect(() => {
    if (!selectedPing) return;

    const supabase = createClient();
    const channel = supabase.channel(`ping-replying:${selectedPing.id}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
        broadcast: { self: true },
      },
    });

    // Store channel ref for use in handleMessageChange
    presenceChannelRef.current = channel;

    // Track replying state
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
          // Initialize presence as not replying
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

  // Filter pings based on selected filter
  const filteredPings = pings
    .filter((ping) => {
      if (filter === 'assigned') {
        // Show only active pings assigned to me (exclude resolved/closed)
        return (
          ping.assigned_to?.id === currentUser.id &&
          ping.status !== 'resolved' &&
          ping.status !== 'closed'
        );
      }
      if (filter === 'unassigned') {
        return ping.assigned_to === null;
      }
      if (filter === 'urgent') {
        return ping.priority === 'urgent';
      }
      if (filter === 'closed') {
        // Show only resolved/closed pings assigned to me
        return (
          ping.assigned_to?.id === currentUser.id &&
          (ping.status === 'resolved' || ping.status === 'closed')
        );
      }
      return true; // 'all'
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        // Priority sorting: urgent > high > normal > low
        const priorityOrder = { urgent: 1, high: 2, normal: 3, low: 4 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      // Default: recent activity (sort by updated_at descending - most recent first)
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });

  // Auto-select first ping when filter or sort changes
  useEffect(() => {
    if (filteredPings.length > 0) {
      const firstPing = filteredPings[0];

      // Always select the first ping when filter/sort changes
      setSelectedPing(firstPing);
      markPingAsRead(firstPing);
    } else {
      // No pings in filtered list, clear selection
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

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('ping-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
      }

      // Track upload progress (simplified - mark as complete)
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

  // Mark ping as read when user opens it
  const markPingAsRead = async (ping: PingWithRelations) => {
    if (!ping.messages.length) return;

    try {
      const lastMessage = ping.messages[ping.messages.length - 1];
      await fetch(`/api/pings/${ping.ping_number}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastReadMessageId: lastMessage.id,
        }),
      });

      // Optimistically clear unread count
      setPings((prevPings) =>
        prevPings.map((p) => (p.id === ping.id ? { ...p, unread_count: 0 } : p))
      );
    } catch (_error) {
      // Silently handle mark as read errors
    }
  };

  // Story 4.2.1: Updated to accept visibility parameter for private notes
  const handleSendReply = async (
    visibility: 'public' | 'private' = 'public'
  ) => {
    if (!replyMessage.trim() && selectedFiles.length === 0) {
      toast.error('Message or attachments required');
      return;
    }

    if (!selectedPing) return;

    setIsSending(true);
    setIsUploadingFiles(true);
    setIsSendDropdownOpen(false); // Close dropdown when sending

    try {
      // 1. Upload files to Supabase Storage
      let uploadedFiles: Array<{
        name: string;
        path: string;
        size: number;
        type: string;
      }> = [];

      if (selectedFiles.length > 0) {
        uploadedFiles = await uploadFiles(selectedFiles, currentUser.id);
      }

      // 2. Create message with content and attachments
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
            visibility, // Story 4.2.1: Include visibility for private notes
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to send message');
        return;
      }

      const { message } = await response.json();

      // Optimistic UI update: Add message to selected ping
      setSelectedPing((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, message],
        };
      });

      // Clear inputs
      setReplyMessage('');
      setSelectedFiles([]);
      setUploadProgress({});

      // Scroll to bottom of thread
      setTimeout(scrollToBottom, 100);

      // Re-focus the reply textarea so agent can continue typing
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
      handleSendReply('public'); // Story 4.2.1: Default Enter to public message
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyMessage(e.target.value);

    if (!selectedPing || !presenceChannelRef.current) {
      return;
    }

    // Broadcast replying status (debounced)
    if (replyingTimeoutRef.current) {
      clearTimeout(replyingTimeoutRef.current);
    }

    const channel = presenceChannelRef.current;

    // Track that user is replying
    channel.track({
      id: currentUser.id,
      userName: currentUser.full_name,
      isReplying: true,
    });

    // Set timeout to clear replying status after 2 seconds of inactivity
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

  // Story 4.2.1: Close send dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sendDropdownRef.current &&
        !sendDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSendDropdownOpen(false);
      }
    };

    if (isSendDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSendDropdownOpen]);

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
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 border-b border-slate-700 p-4">
            <div className="flex items-center gap-3 mb-1">
              <Inbox className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-bold text-white">
                {filterConfig.title}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              {filterConfig.description}
            </p>
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
                    </div>{' '}
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
                      <span className="text-xs text-slate-500 italic">
                        Unassigned
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
                isClaiming={isUpdatingAssignment}
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
                          {agents.map((agent) => (
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
                            {availableTeams.map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
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
                    .filter((message) => message.sender) // Filter out messages with null sender
                    .map((message) => {
                      const isCurrentUser =
                        message.sender.id === currentUser.id;
                      return (
                        <PingMessageComponent
                          key={message.id}
                          message={message}
                          isCurrentUser={isCurrentUser}
                          attachments={message.attachments}
                          // Story 4.2.1: Inbox is agent-only, always show private badge
                          showPrivateBadge={true}
                        />
                      );
                    })}

                  {/* Replying indicator */}
                  {isReplying && (
                    <ReplyingIndicator userName={isReplying.userName} />
                  )}

                  {/* Scroll anchor */}
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
                    {/* Story 4.2.1: Split send button with private note option */}
                    <div
                      className="relative self-stretch"
                      ref={sendDropdownRef}
                    >
                      <div className="flex h-full">
                        {/* Main send button */}
                        <button
                          onClick={() => handleSendReply('public')}
                          disabled={
                            (!replyMessage.trim() &&
                              selectedFiles.length === 0) ||
                            isSending
                          }
                          className="px-5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-l-lg font-semibold hover:from-orange-600 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 disabled:shadow-none"
                          title="Send public reply"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                        {/* Dropdown toggle */}
                        <button
                          onClick={() =>
                            setIsSendDropdownOpen(!isSendDropdownOpen)
                          }
                          disabled={
                            (!replyMessage.trim() &&
                              selectedFiles.length === 0) ||
                            isSending
                          }
                          className="px-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-r-lg font-semibold hover:from-orange-700 hover:to-orange-800 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition-all border-l border-orange-400"
                          title="More options"
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${isSendDropdownOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>
                      {/* Dropdown menu */}
                      {isSendDropdownOpen && (
                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-50">
                          <button
                            onClick={() => handleSendReply('public')}
                            className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Send className="w-4 h-4" />
                            Send Reply
                          </button>
                          <button
                            onClick={() => handleSendReply('private')}
                            className="w-full px-4 py-3 text-left text-sm text-amber-700 hover:bg-amber-50 flex items-center gap-2 border-t border-slate-100"
                          >
                            <Lock className="w-4 h-4" />
                            Add Private Note
                          </button>
                        </div>
                      )}
                    </div>
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

              {/* Story 4.8: Related KB Articles */}
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-orange-500" />
                  Related KB Articles
                </h4>

                {/* Loading State */}
                {isLoadingKBSuggestions && (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="animate-pulse bg-slate-600 rounded h-12"
                      />
                    ))}
                  </div>
                )}

                {/* Empty State / Message */}
                {!isLoadingKBSuggestions &&
                  kbSuggestions.length === 0 &&
                  kbSuggestionsMessage && (
                    <p className="text-sm text-slate-400 italic">
                      {kbSuggestionsMessage}
                    </p>
                  )}

                {/* No AI Summary Yet */}
                {!isLoadingKBSuggestions &&
                  kbSuggestions.length === 0 &&
                  !kbSuggestionsMessage &&
                  !selectedPing?.ai_summary && (
                    <p className="text-sm text-slate-400 italic">
                      Waiting for AI summary...
                    </p>
                  )}

                {/* KB Suggestions List */}
                {!isLoadingKBSuggestions && kbSuggestions.length > 0 && (
                  <div className="space-y-2">
                    {kbSuggestions.map((article) => (
                      <button
                        key={article.id}
                        onClick={() => setSelectedKBArticleSlug(article.slug)}
                        className="w-full text-left p-2 rounded bg-slate-600/50 hover:bg-slate-600 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-orange-400 group-hover:text-orange-300 truncate">
                              {article.title}
                            </p>
                            <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                              {article.excerpt}
                            </p>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-400 flex-shrink-0 mt-0.5" />
                        </div>
                        {article.categoryName && (
                          <span className="inline-block mt-1.5 px-1.5 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
                            {article.categoryName}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggested Actions */}
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <h4 className="text-sm font-semibold text-white mb-3">
                  Suggested Actions
                </h4>
                <div className="text-sm text-slate-400 italic">
                  Will be populated in Epic 3
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

      {/* Story 4.2.1 & 4.2.3: Resolution Notes Dialog */}
      <ResolutionNotesDialog
        isOpen={showResolutionDialog}
        onClose={() => setShowResolutionDialog(false)}
        onConfirm={handleResolutionConfirm}
        pingTitle={selectedPing?.title || 'Untitled'}
        pingNumber={selectedPing?.ping_number || 0}
        isLoading={isUpdatingStatus}
      />

      {/* Story 4.8: KB Article Preview Modal */}
      <KBArticleModal
        slug={selectedKBArticleSlug}
        isOpen={!!selectedKBArticleSlug}
        onClose={() => setSelectedKBArticleSlug(null)}
        onInsertLink={(title, slug) => {
          // Insert KB link at cursor position or append to message
          const linkText = `[${title}](/kb/article/${slug})`;
          setReplyMessage((prev) => (prev ? `${prev}\n${linkText}` : linkText));
          setSelectedKBArticleSlug(null);
          toast.success('KB article link inserted');
        }}
      />
    </>
  );
}
