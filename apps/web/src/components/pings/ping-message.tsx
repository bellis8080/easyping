'use client';

import { formatDistanceToNow } from 'date-fns';
import { User } from 'lucide-react';
import { PingAttachment } from '@easyping/types';
import { AttachmentDisplay } from './attachment-display';

interface PingMessageProps {
  message: any;
  isCurrentUser: boolean;
  attachments?: PingAttachment[];
}

export function PingMessage({
  message,
  isCurrentUser,
  attachments = [],
}: PingMessageProps) {
  const formatTimestamp = (timestamp: string): string => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const isAgentMessage = message.message_type === 'agent';
  const isSystemMessage = message.message_type === 'system';

  // System messages are centered
  if (isSystemMessage) {
    return (
      <div className="flex justify-center py-2">
        <div className="px-4 py-2 bg-slate-200 rounded-full text-xs text-slate-600">
          {message.content}
        </div>
      </div>
    );
  }

  // Current user's messages: right-aligned, no avatar
  if (isCurrentUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-2xl px-5 py-3 rounded-lg shadow-md bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
          {attachments && attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {attachments.map((attachment) => (
                <AttachmentDisplay
                  key={attachment.id}
                  attachment={attachment}
                  variant="inline"
                />
              ))}
            </div>
          )}
          <p className="text-xs mt-2 text-blue-100" suppressHydrationWarning>
            {new Date(message.created_at).toLocaleTimeString()}
          </p>
        </div>
      </div>
    );
  }

  // Other person's messages: left-aligned with avatar, name, timestamp
  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {message.sender.avatar_url ? (
          <img
            src={message.sender.avatar_url}
            alt={message.sender.full_name}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isAgentMessage ? 'bg-orange-500' : 'bg-blue-500'
            }`}
          >
            <User className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-slate-900">
            {message.sender.full_name}
          </span>
          <span className="text-xs text-slate-500">
            {formatTimestamp(message.created_at)}
          </span>
        </div>
        <div
          className={`px-4 py-3 rounded-lg ${
            isAgentMessage
              ? 'bg-orange-50 border border-orange-200'
              : 'bg-blue-50 border border-blue-200'
          }`}
        >
          <p className="text-sm text-slate-900 whitespace-pre-wrap">
            {message.content}
          </p>
          {attachments && attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {attachments.map((attachment) => (
                <AttachmentDisplay
                  key={attachment.id}
                  attachment={attachment}
                  variant="inline"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
