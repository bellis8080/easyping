'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { PingMessage } from './ping-message';
import { ReplyingIndicator } from './replying-indicator';
import { FileAttachmentInput } from './file-attachment-input';
import { FilePreviewList } from './file-preview-list';
import { createClient } from '@/lib/supabase/client';
import { getStatusColor, getStatusLabel } from '@/lib/ping-status-utils';
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

export function PingDetail({
  ping: initialPing,
  currentUser,
}: PingDetailProps) {
  const [ping, setPing] = useState(initialPing);
  const [messages, setMessages] = useState(initialPing.messages);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isReplying, setIsReplying] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [isEchoReplying, setIsEchoReplying] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const replyingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<ReturnType<
    ReturnType<typeof createClient>['channel']
  > | null>(null);
  const echoStartedRef = useRef(false);

  const formatTimestamp = (timestamp: string): string => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Upload files to Supabase Storage
  const uploadFiles = async (files: File[], userId: string) => {
    const supabase = createClient();
    const uploadedFiles = [];

    for (const file of files) {
      const filePath = `${userId}/${Date.now()}-${file.name}`;

      setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

      try {
        // Use FileReader API instead of file.arrayBuffer()
        // (arrayBuffer() hangs on PDFs for unknown reason)
        const arrayBuffer = await new Promise<ArrayBuffer>(
          (resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
              resolve(reader.result as ArrayBuffer);
            };

            reader.onerror = () => {
              reject(reader.error);
            };

            reader.onabort = () => {
              reject(new Error('File read aborted'));
            };

            reader.readAsArrayBuffer(file);
          }
        );

        const fileBlob = new Blob([arrayBuffer], { type: file.type });

        // Add timeout to prevent hanging
        const uploadPromise = supabase.storage
          .from('ping-attachments')
          .upload(filePath, fileBlob, {
            cacheControl: '3600',
            upsert: false,
          });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Upload timeout after 30 seconds')),
            30000
          )
        );

        const { data, error } = await Promise.race([
          uploadPromise,
          timeoutPromise,
        ]);

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
      } catch (uploadError) {
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
        throw uploadError;
      }
    }

    return uploadedFiles;
  };

  // Scroll to bottom when component first loads or messages change
  useEffect(() => {
    // Use longer timeout to ensure images and attachments are rendered
    setTimeout(scrollToBottom, 300);
  }, [messages]);

  // Auto-focus the reply textarea when the page loads
  useEffect(() => {
    // Small delay to ensure DOM is fully rendered
    setTimeout(() => replyTextareaRef.current?.focus(), 100);
  }, []);

  // Auto-scroll when replying indicator appears/disappears
  useEffect(() => {
    if (isReplying) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isReplying]);

  // Mark ping as read when component mounts
  useEffect(() => {
    const markAsRead = async () => {
      if (!messages || messages.length === 0) return;

      try {
        const lastMessage = messages[messages.length - 1];
        await fetch(`/api/pings/${ping.ping_number}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lastReadMessageId: lastMessage.id,
          }),
        });
      } catch (_error) {
        // Silently fail - mark as read is non-critical
      }
    };

    markAsRead();
  }, [ping.ping_number, messages.length]);

  // Trigger Echo conversation for draft pings
  useEffect(() => {
    const startEchoConversation = async () => {
      // Only trigger for draft pings, and only once
      if (ping.status !== 'draft') return;
      if (echoStartedRef.current) return; // Already started

      echoStartedRef.current = true; // Mark as started

      try {
        const response = await fetch(
          `/api/pings/${ping.ping_number}/echo/start`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!response.ok) {
          console.error(
            'Failed to start Echo conversation:',
            await response.text()
          );
          echoStartedRef.current = false; // Reset on error so it can retry
        }
      } catch (error) {
        console.error('Error starting Echo conversation:', error);
        echoStartedRef.current = false; // Reset on error so it can retry
      }
    };

    startEchoConversation();
  }, [ping.ping_number, ping.status]);

  // Subscribe to realtime message updates
  useEffect(() => {
    const supabase = createClient();
    const pingId = initialPing.id; // Use stable initialPing.id to avoid re-subscription
    const channel = supabase
      .channel(`ping-messages:${pingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ping_messages',
          filter: `ping_id=eq.${pingId}`,
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

          // Fetch attachments separately
          const { data: attachments } = await supabase
            .from('ping_attachments')
            .select('*')
            .eq('ping_message_id', newMessage.id);

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
            attachments: attachments || [],
          };

          // Only add if not already in state (avoid duplicate from optimistic update)
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === transformedMessage.id);
            if (exists) {
              return prev;
            }
            return [...prev, transformedMessage as any];
          });

          // If Echo sent this message, hide the replying indicator
          if (
            transformedMessage.message_type === 'agent' &&
            sender.full_name?.includes('Echo')
          ) {
            setIsEchoReplying(false);
          }

          // Auto-mark as read if message is from another user (user is viewing the ping)
          if (newMessage.sender_id !== currentUser.id) {
            await fetch(`/api/pings/${ping.ping_number}/read`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lastReadMessageId: newMessage.id,
              }),
            });
          }

          // Scroll to bottom
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialPing.id, currentUser.id]);

  // Subscribe to realtime ping updates (status, assigned_to, etc.)
  useEffect(() => {
    const supabase = createClient();
    const pingId = initialPing.id; // Use stable initialPing.id to avoid re-subscription
    const channel = supabase
      .channel(`ping-updates:${pingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pings',
          filter: `id=eq.${pingId}`,
        },
        async () => {
          // Fetch full ping data with relations
          const { data: updatedPing } = await supabase
            .from('pings')
            .select(
              '*, assigned_to:users!pings_assigned_to_fkey(id, full_name, avatar_url, role), category:categories(id, name, color, icon)'
            )
            .eq('id', pingId)
            .single();

          if (updatedPing) {
            setPing((prev) => ({
              ...prev,
              status: updatedPing.status,
              priority: updatedPing.priority,
              title: updatedPing.title,
              ai_summary: updatedPing.ai_summary,
              category: Array.isArray(updatedPing.category)
                ? updatedPing.category[0]
                : updatedPing.category,
              category_confidence: updatedPing.category_confidence,
              assigned_to: Array.isArray(updatedPing.assigned_to)
                ? updatedPing.assigned_to[0]
                : updatedPing.assigned_to,
              updated_at: updatedPing.updated_at,
              first_response_at: updatedPing.first_response_at,
              last_user_reply_at: updatedPing.last_user_reply_at,
              last_agent_reply_at: updatedPing.last_agent_reply_at,
              status_changed_at: updatedPing.status_changed_at,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialPing.id]);

  // Subscribe to presence for replying indicators
  useEffect(() => {
    const supabase = createClient();
    const pingId = initialPing.id; // Use stable initialPing.id to avoid re-subscription
    const channel = supabase.channel(`ping-replying:${pingId}`, {
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
  }, [initialPing.id, currentUser.id, currentUser.full_name]);

  const handleSendReply = async () => {
    if (!replyMessage.trim() && selectedFiles.length === 0) return;

    setIsSending(true);
    try {
      let attachments: Array<{
        file_name: string;
        file_path: string;
        file_size: number;
        mime_type: string;
      }> = [];

      // Upload files if any are selected
      if (selectedFiles.length > 0) {
        setIsUploadingFiles(true);
        try {
          const uploadedFiles = await uploadFiles(
            selectedFiles,
            currentUser.id
          );
          attachments = uploadedFiles.map((file) => ({
            file_name: file.name,
            file_path: file.path,
            file_size: file.size,
            mime_type: file.type,
          }));
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(
            uploadError instanceof Error
              ? uploadError.message
              : 'Failed to upload files'
          );
          return;
        } finally {
          setIsUploadingFiles(false);
        }
      }

      const response = await fetch(`/api/pings/${ping.ping_number}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyMessage,
          attachments,
        }),
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
      setSelectedFiles([]);
      setUploadProgress({});
      setTimeout(scrollToBottom, 100);

      // Re-focus the reply textarea so user can continue typing
      setTimeout(() => replyTextareaRef.current?.focus(), 150);

      // If this is a draft ping, show "Echo is replying..." indicator
      if (ping.status === 'draft') {
        setIsEchoReplying(true);
      }
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
      return;
    }

    // Broadcast replying status (debounced)
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
              #PING-{String(ping.ping_number).padStart(3, '0')}
            </span>
          </div>
        </div>

        {/* Ping Header Info */}
        <div className="px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">
                  #PING-{String(ping.ping_number).padStart(3, '0')}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(ping.status)}`}
                >
                  {getStatusLabel(ping.status)}
                </span>
                {/* Category pill */}
                {ping.category && (
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: ping.category.color }}
                  >
                    {ping.category.name}
                  </span>
                )}
                {/* Priority pill */}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    ping.priority === 'urgent'
                      ? 'bg-red-500 text-white'
                      : ping.priority === 'high'
                        ? 'bg-orange-500 text-white'
                        : ping.priority === 'normal'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-500 text-white'
                  }`}
                >
                  {ping.priority === 'urgent'
                    ? 'Urgent'
                    : ping.priority === 'high'
                      ? 'High'
                      : ping.priority === 'normal'
                        ? 'Normal'
                        : 'Low'}
                </span>
                {/* Assigned agent pill */}
                {ping.assigned_to && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500 text-white">
                    {ping.assigned_to.full_name}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400">
                Created {formatTimestamp(ping.created_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary - Sticky Collapsible */}
      {ping.ai_summary && (
        <div className="flex-shrink-0 bg-blue-500/10 backdrop-blur-sm border-b border-blue-200 shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <button
              onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
              className="w-full flex items-start justify-between gap-4 text-left group"
            >
              <div className="flex-1">
                {!isSummaryCollapsed && (
                  <p className="text-slate-900 leading-relaxed">
                    {ping.ai_summary}
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
          </div>
        </div>
      )}

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
                  attachments={message.attachments}
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

          {/* Echo replying indicator */}
          {isEchoReplying && (
            <div className="max-w-4xl mx-auto">
              <ReplyingIndicator userName="Echo" />
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Reply Box */}
      <div className="flex-shrink-0 border-t border-slate-200 p-6 bg-white shadow-xl">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* File Preview */}
          {selectedFiles.length > 0 && (
            <FilePreviewList
              files={selectedFiles}
              onRemove={(index) => {
                setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
                setUploadProgress({});
              }}
              uploadProgress={uploadProgress}
            />
          )}

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
              className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-slate-50"
              rows={3}
              disabled={isSending || isUploadingFiles}
            />
            <button
              onClick={handleSendReply}
              disabled={
                (!replyMessage.trim() && selectedFiles.length === 0) ||
                isSending ||
                isUploadingFiles
              }
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
