'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { User } from 'lucide-react';
import { getStatusColor, getStatusLabel } from '@/lib/ping-status-utils';

/**
 * Strips markdown formatting from text for plain text display
 * Converts **bold** to plain text
 */
function stripMarkdown(text: string): string {
  if (!text) return '';
  // Remove bold markers **text** → text
  return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}

interface PingListItemProps {
  ping: any;
}

export function PingListItem({ ping }: PingListItemProps) {
  const formatTimestamp = (timestamp: string): string => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  // Get last message preview (strip markdown for plain text display)
  const lastMessage = ping.messages?.[ping.messages.length - 1];
  const rawContent = lastMessage?.content || ping.title || '';
  const messagePreview = stripMarkdown(rawContent).substring(0, 100);

  return (
    <Link href={`/pings/${ping.ping_number}`}>
      <div className="p-5 border-b border-slate-200 hover:bg-gradient-to-r hover:from-orange-50 hover:to-transparent transition-all cursor-pointer group hover:border-l-4 hover:border-l-orange-500">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Ping Number and Status */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-mono font-bold text-slate-900">
                #PING-{String(ping.ping_number).padStart(3, '0')}
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(ping.status)}`}
              >
                {getStatusLabel(ping.status)}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold text-slate-900 mb-1 line-clamp-1">
              {ping.title}
            </h3>

            {/* Last message preview */}
            <p className="text-sm text-slate-600 line-clamp-2 mb-2">
              {messagePreview}
            </p>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>Updated {formatTimestamp(ping.updated_at)}</span>
              {ping.assigned_to && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{ping.assigned_to.full_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
