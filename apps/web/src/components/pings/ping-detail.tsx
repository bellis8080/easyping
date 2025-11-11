'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import { PingMessage } from './ping-message';
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
          {ping.messages && ping.messages.length > 0 ? (
            ping.messages.map((message: any) => (
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
        </div>
      </div>
    </div>
  );
}
