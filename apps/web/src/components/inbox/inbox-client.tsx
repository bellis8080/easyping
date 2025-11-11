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
} from 'lucide-react';
import { Ping, PingMessage, User } from '@easyping/types';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ReplyingIndicator } from '@/components/pings/replying-indicator';

// Extended Ping type with related data
interface PingWithRelations {
  id: string;
  ping_number: number;
  title: string;
  status: Ping['status'];
  priority: Ping['priority'];
  created_at: string;
  updated_at: string;
  sla_due_at: string | null;
  created_by: Pick<User, 'id' | 'full_name' | 'email' | 'avatar_url'>;
  assigned_to: Pick<User, 'id' | 'full_name' | 'avatar_url'> | null;
  category: { name: string; color: string } | null;
  messages: Array<{
    id: string;
    content: string;
    message_type: PingMessage['message_type'];
    created_at: string;
    sender: Pick<User, 'id' | 'full_name' | 'avatar_url'>;
  }>;
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
    urgent: { color: 'bg-red-500 text-white', label: 'Urgent' },
    high: { color: 'bg-orange-500 text-white', label: 'High' },
    normal: { color: 'bg-blue-500 text-white', label: 'Normal' },
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

export function InboxClient({ pings, currentUser }: InboxClientProps) {
  const [selectedPing, setSelectedPing] = useState<PingWithRelations | null>(
    pings[0] || null
  );
  const [replyMessage, setReplyMessage] = useState('');
  const [showEcho, setShowEcho] = useState(true);
  const [filter, setFilter] = useState<
    'all' | 'assigned' | 'unassigned' | 'urgent'
  >('all');
  const [suggestedResponse, setSuggestedResponse] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isReplying, setIsReplying] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<ReturnType<
    ReturnType<typeof createClient>['channel']
  > | null>(null);

  // Scroll to bottom of message thread
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when selectedPing changes
  useEffect(() => {
    scrollToBottom();
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
      .channel(`ping-messages:${selectedPing.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ping_messages',
          filter: `ping_id=eq.${selectedPing.id}`,
        },
        async (payload) => {
          console.log('New message received:', payload);

          // Fetch message without join to avoid RLS issues
          const { data: newMessage, error: messageError } = await supabase
            .from('ping_messages')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (messageError) {
            console.error('Error fetching new message:', messageError);
            return;
          }

          if (newMessage) {
            // Fetch sender separately using their ID
            const { data: sender, error: senderError } = await supabase
              .from('users')
              .select('id, full_name, avatar_url, role')
              .eq('id', newMessage.sender_id)
              .single();

            if (senderError) {
              console.error('Error fetching sender:', senderError);
              return;
            }

            const transformedMessage = {
              id: newMessage.id,
              content: newMessage.content,
              message_type: newMessage.message_type,
              created_at: newMessage.created_at,
              sender: sender as Pick<User, 'id' | 'full_name' | 'avatar_url'>,
            };

            // Only add if not already in state (avoid duplicate from optimistic update)
            setSelectedPing((prev) => {
              if (!prev) return prev;
              const exists = prev.messages.some(
                (m) => m.id === transformedMessage.id
              );
              if (exists) return prev;

              return {
                ...prev,
                messages: [...prev.messages, transformedMessage],
              };
            });

            // Scroll to bottom
            setTimeout(scrollToBottom, 100);

            // Show notification if message is from other user
            if (transformedMessage.sender.id !== currentUser.id) {
              toast.info(
                `New message from ${transformedMessage.sender.full_name}`
              );
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPing?.id, currentUser.id]);

  // Subscribe to new pings appearing in the inbox
  useEffect(() => {
    console.log(
      'Setting up inbox pings subscription for tenant:',
      currentUser.tenant_id
    );
    const supabase = createClient();
    const channel = supabase
      .channel('inbox-pings')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pings',
          filter: `tenant_id=eq.${currentUser.tenant_id}`,
        },
        async (payload) => {
          console.log('🔔 New ping received:', payload);

          // Fetch the full ping with all relations using split-query pattern
          const { data: newPing, error: pingError } = await supabase
            .from('pings')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (pingError || !newPing) {
            console.error('Error fetching new ping:', pingError);
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

          // Only add if agent is unassigned or assigned to this agent
          if (
            !transformedPing.assigned_to ||
            transformedPing.assigned_to.id === currentUser.id
          ) {
            setPings((prev) => {
              // Check if already exists
              const exists = prev.some((p) => p.id === transformedPing.id);
              if (exists) return prev;
              // Add to top of list
              return [transformedPing as any, ...prev];
            });

            // Show toast notification
            toast.info(
              `New ping #PING-${String(newPing.ping_number).padStart(3, '0')} from ${creator?.full_name || 'Unknown'}`
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Inbox pings channel status:', status);
      });

    return () => {
      console.log('Cleaning up inbox pings subscription');
      supabase.removeChannel(channel);
    };
  }, [currentUser.id, currentUser.tenant_id]);

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
        console.log('Presence state updated:', state);
        const replyingUsers = Object.values(state)
          .flat()
          .filter((user: any) => user.id !== currentUser.id && user.isReplying)
          .map((user: any) => ({
            userId: user.id,
            userName: user.userName,
          }));

        console.log('Replying users:', replyingUsers);
        setIsReplying(replyingUsers[0] || null);
      })
      .subscribe(async (status) => {
        console.log('Presence channel status:', status);
        if (status === 'SUBSCRIBED') {
          // Initialize presence as not replying
          const trackResult = await channel.track({
            id: currentUser.id,
            userName: currentUser.full_name,
            isReplying: false,
          });
          console.log('Initial presence track result:', trackResult);
        }
      });

    return () => {
      console.log('Cleaning up presence channel');
      presenceChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [selectedPing?.id, currentUser.id, currentUser.full_name]);

  // Filter pings based on selected filter
  const filteredPings = pings.filter((ping) => {
    if (filter === 'assigned') {
      return ping.assigned_to?.id === currentUser.id;
    }
    if (filter === 'unassigned') {
      return ping.assigned_to === null;
    }
    if (filter === 'urgent') {
      return ping.priority === 'urgent';
    }
    return true; // 'all'
  });

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedPing) return;

    setIsSending(true);
    try {
      const response = await fetch(
        `/api/pings/${selectedPing.ping_number}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: replyMessage }),
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

      // Clear input
      setReplyMessage('');
      toast.success('Message sent!');

      // Scroll to bottom of thread
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
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

    if (!selectedPing || !presenceChannelRef.current) {
      console.log('Cannot track presence - missing ping or channel');
      return;
    }

    // Broadcast replying status (debounced)
    if (replyingTimeoutRef.current) {
      clearTimeout(replyingTimeoutRef.current);
    }

    const channel = presenceChannelRef.current;

    // Track that user is replying
    console.log('Tracking replying status: true');
    channel.track({
      id: currentUser.id,
      userName: currentUser.full_name,
      isReplying: true,
    });

    // Set timeout to clear replying status after 2 seconds of inactivity
    replyingTimeoutRef.current = setTimeout(() => {
      console.log('Tracking replying status: false');
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

  return (
    <div className="flex h-screen bg-gradient-to-b from-slate-50 to-blue-50">
      {/* Ping List - Left Panel */}
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col shadow-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 border-b border-slate-700 p-4 min-h-[121px]">
          <h2 className="text-xl font-bold text-white mb-2">Agent Inbox</h2>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) =>
                setFilter(
                  e.target.value as 'all' | 'assigned' | 'unassigned' | 'urgent'
                )
              }
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Pings</option>
              <option value="assigned">Assigned to Me</option>
              <option value="unassigned">Unassigned</option>
              <option value="urgent">Urgent</option>
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
                onClick={() => setSelectedPing(ping)}
                className={`w-full p-4 border-b border-slate-200 text-left transition-all hover:bg-blue-50 ${
                  selectedPing?.id === ping.id
                    ? 'bg-gradient-to-r from-orange-50 to-transparent border-l-4 border-l-orange-500'
                    : 'border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-slate-900">
                      PING-{String(ping.ping_number).padStart(3, '0')}
                    </span>
                    <PriorityBadge priority={ping.priority} />
                  </div>
                  <SLATimer ping={ping} />
                </div>
                <p className="text-sm font-medium text-slate-900 mb-1 line-clamp-1">
                  {ping.title}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{ping.created_by.full_name}</span>
                  {ping.category && (
                    <span className="px-2 py-0.5 bg-slate-100 rounded">
                      {ping.category.name}
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
            <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 border-b border-slate-700 p-4 shadow-xl min-h-[121px]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    PING-{String(selectedPing.ping_number).padStart(3, '0')}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {selectedPing.created_by.full_name} •{' '}
                    {selectedPing.created_by.email}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="new">New</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_on_user">Waiting on User</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* SLA Info */}
              <div className="flex items-center gap-4 text-sm">
                {selectedPing.sla_due_at ? (
                  <>
                    <div className="flex items-center gap-2">
                      <SLATimer ping={selectedPing} />
                      <span className="text-slate-400 leading-none">
                        resolution due
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-slate-400">No SLA configured</span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-white to-slate-50">
              <div className="space-y-4 px-6">
                <div className="text-center mb-6">
                  <h4 className="text-lg font-bold text-slate-900 mb-1">
                    {selectedPing.title}
                  </h4>
                  {selectedPing.category && (
                    <p className="text-sm text-slate-500">
                      {selectedPing.category.name}
                    </p>
                  )}
                </div>

                {selectedPing.messages
                  .filter((message) => message.sender) // Filter out messages with null sender
                  .map((message) => {
                    const isCurrentUser = message.sender.id === currentUser.id;

                    // Current user (agent) messages: right-aligned, no avatar
                    if (isCurrentUser) {
                      return (
                        <div key={message.id} className="flex justify-end">
                          <div className="max-w-2xl px-5 py-3 rounded-lg shadow-md bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                            <p className="text-base leading-relaxed whitespace-pre-wrap">
                              {message.content}
                            </p>
                            <p
                              className="text-xs mt-2 text-blue-100"
                              suppressHydrationWarning
                            >
                              {new Date(
                                message.created_at
                              ).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    // Other user's messages: left-aligned with avatar, name, timestamp
                    return (
                      <div key={message.id} className="flex gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {message.sender.avatar_url ? (
                            <img
                              src={message.sender.avatar_url}
                              alt={message.sender.full_name}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-500">
                              <span className="text-white text-sm font-semibold">
                                {message.sender.full_name
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Message content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-900">
                              {message.sender.full_name}
                            </span>
                            <span
                              className="text-xs text-slate-500"
                              suppressHydrationWarning
                            >
                              {new Date(
                                message.created_at
                              ).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
                            <p className="text-sm text-slate-900 whitespace-pre-wrap">
                              {message.content}
                            </p>
                          </div>
                        </div>
                      </div>
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
                  <textarea
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
                    disabled={!replyMessage.trim() || isSending}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 disabled:shadow-none transform hover:scale-105 disabled:transform-none"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
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
              </h4>
              <textarea
                value={suggestedResponse}
                onChange={(e) => setSuggestedResponse(e.target.value)}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-sm text-slate-100 mb-3 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={6}
                placeholder="AI suggestions will appear here in Epic 3..."
              />
              <button
                onClick={handleUseSuggestedResponse}
                disabled={!suggestedResponse.trim()}
                className="w-full px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
              >
                Use This Response
              </button>
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
  );
}
