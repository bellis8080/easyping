'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, Send } from 'lucide-react';
import { toast } from 'sonner';
import { PingMessage } from './ping-message';
import { ReplyingIndicator } from './replying-indicator';
import { createClient } from '@/lib/supabase/client';
import type {
  Ping,
  PingMessage as PingMessageType,
  User,
} from '@easyping/types';

/**
 * Extended Ping type with nested relations for detailed view
 * Omits the string-based foreign keys and replaces them with full objects
 */
interface PingWithRelations
  extends Omit<Ping, 'created_by' | 'assigned_to' | 'category_id'> {
  messages: Array<
    Omit<PingMessageType, 'sender_id'> & {
      sender: Pick<User, 'id' | 'full_name' | 'avatar_url' | 'role'>;
    }
  >;
  created_by?: Pick<User, 'id' | 'full_name' | 'avatar_url' | 'role'>;
  assigned_to?: Pick<User, 'id' | 'full_name' | 'avatar_url' | 'role'>;
  category?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
}

interface PingDetailProps {
  ping: PingWithRelations;
  currentUser: Pick<User, 'id' | 'email' | 'full_name'>;
}

export function PingDetail({ ping, currentUser }: PingDetailProps) {
  const [messages, setMessages] = useState(ping.messages);
  const [replyMessage, setReplyMessage] = useState('');
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

  const formatTimestamp = (timestamp: string): string => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      new: 'bg-blue-500',
      in_progress: 'bg-yellow-500',
      waiting_on_user: 'bg-purple-500',
      resolved: 'bg-green-500',
      closed: 'bg-slate-500',
    };
    return colors[status] || 'bg-slate-500';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      new: 'New',
      in_progress: 'In Progress',
      waiting_on_user: 'Waiting on User',
      resolved: 'Resolved',
      closed: 'Closed',
    };
    return labels[status] || status;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll when replying indicator appears/disappears
  useEffect(() => {
    if (isReplying) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isReplying]);

  // Subscribe to realtime message updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`ping-messages:${ping.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ping_messages',
          filter: `ping_id=eq.${ping.id}`,
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
              ping_id: newMessage.ping_id,
              content: newMessage.content,
              message_type: newMessage.message_type,
              created_at: newMessage.created_at,
              edited_at: newMessage.edited_at,
              sender: sender as Pick<
                User,
                'id' | 'full_name' | 'avatar_url' | 'role'
              >,
            };

            // Only add if not already in state (avoid duplicate from optimistic update)
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === transformedMessage.id);
              if (exists) return prev;
              return [...prev, transformedMessage as any];
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ping.id, currentUser.id]);

  // Subscribe to presence for replying indicators
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`ping-replying:${ping.id}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
        broadcast: { self: true },
      },
    });

    presenceChannelRef.current = channel;

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
  }, [ping.id, currentUser.id, currentUser.full_name]);

  const handleSendReply = async () => {
    if (!replyMessage.trim()) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/pings/${ping.ping_number}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyMessage }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to send message');
        return;
      }

      const { message } = await response.json();

      // Optimistic UI update
      setMessages((prev) => [...prev, message]);
      setReplyMessage('');
      toast.success('Message sent!');
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

    if (!presenceChannelRef.current) {
      console.log('Cannot track presence - missing channel');
      return;
    }

    // Broadcast replying status (debounced)
    if (replyingTimeoutRef.current) {
      clearTimeout(replyingTimeoutRef.current);
    }

    const channel = presenceChannelRef.current;

    console.log('Tracking replying status: true');
    channel.track({
      id: currentUser.id,
      userName: currentUser.full_name,
      isReplying: true,
    });

    replyingTimeoutRef.current = setTimeout(() => {
      console.log('Tracking replying status: false');
      channel.track({
        id: currentUser.id,
        userName: currentUser.full_name,
        isReplying: false,
      });
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-blue-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 border-b border-slate-700 shadow-xl">
        {/* Breadcrumb */}
        <div className="px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Link href="/pings" className="hover:text-white transition-colors">
              My Pings
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white font-medium">
              #PING-{ping.ping_number}
            </span>
          </div>
        </div>

        {/* Ping Header Info */}
        <div className="px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white">
                  #PING-{ping.ping_number}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(ping.status)}`}
                >
                  {getStatusLabel(ping.status)}
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Created {formatTimestamp(ping.created_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages && messages.length > 0 ? (
            messages
              .filter((message: any) => message.sender) // Filter out messages with null sender
              .map((message: any) => (
                <PingMessage
                  key={message.id}
                  message={message}
                  isCurrentUser={message.sender.id === currentUser.id}
                />
              ))
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500">No messages yet</p>
            </div>
          )}

          {/* Replying indicator */}
          {isReplying && (
            <div className="max-w-4xl mx-auto">
              <ReplyingIndicator userName={isReplying.userName} />
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Reply Box */}
      <div className="flex-shrink-0 border-t border-slate-200 p-6 bg-white shadow-xl">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <textarea
              value={replyMessage}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your reply..."
              className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-slate-50"
              rows={3}
              disabled={isSending}
            />
            <button
              onClick={handleSendReply}
              disabled={!replyMessage.trim() || isSending}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 disabled:shadow-none transform hover:scale-105 disabled:transform-none"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
