'use client';

import { formatDistanceToNow } from 'date-fns';
import { User, Lock } from 'lucide-react';
import { PingAttachment, MessageVisibility } from '@easyping/types';
import { AttachmentDisplay } from './attachment-display';

/**
 * Renders text with basic markdown support (bold **text** and links [text](url))
 * Preserves newlines with whitespace-pre-wrap
 * @param content - The text content to render
 * @param isOutgoing - Whether this is an outgoing message (affects link styling)
 */
function renderMarkdown(
  content: string,
  isOutgoing: boolean = false
): React.ReactNode {
  // Combined regex for both bold **text** and links [text](url)
  const parts = content.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);

  return parts.map((part, index) => {
    // Bold text
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    // Markdown link [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, text, url] = linkMatch;
      // Use white/light color for links in outgoing (blue) messages, blue for incoming
      const linkClass = isOutgoing
        ? 'text-white hover:text-blue-100 underline font-medium'
        : 'text-blue-600 hover:text-blue-800 underline';
      // KB article links and external links open in new tab
      const isExternal = !url.startsWith('/') || url.startsWith('/kb/');
      return (
        <a
          key={index}
          href={url}
          target={isExternal ? '_blank' : '_self'}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className={linkClass}
        >
          {text}
        </a>
      );
    }
    return part;
  });
}

interface PingMessageProps {
  message: any;
  isCurrentUser: boolean;
  attachments?: PingAttachment[];
  // Story 4.2.1: Whether current viewer can see private notes (agents only)
  showPrivateBadge?: boolean;
}

export function PingMessage({
  message,
  isCurrentUser,
  attachments = [],
  showPrivateBadge = false,
}: PingMessageProps) {
  const formatTimestamp = (timestamp: string): string => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const isAgentMessage = message.message_type === 'agent';
  const isSystemMessage = message.message_type === 'system';
  // Story 4.2.1: Check if message is a private note
  const isPrivateNote =
    message.visibility === 'private' ||
    message.visibility === MessageVisibility.PRIVATE;

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
        <div
          className={`max-w-2xl px-5 py-3 rounded-lg shadow-md ${
            isPrivateNote
              ? 'bg-slate-200 text-slate-700 border-2 border-slate-400 border-dashed'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
          }`}
        >
          {/* Story 4.2.1: Private note badge */}
          {isPrivateNote && showPrivateBadge && (
            <div className="flex items-center gap-1 mb-2 text-xs font-semibold text-slate-600">
              <Lock className="w-3 h-3" />
              <span>Private Note</span>
            </div>
          )}
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {renderMarkdown(message.content, !isPrivateNote)}
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
          <p
            className={`text-xs mt-2 ${isPrivateNote ? 'text-slate-500' : 'text-blue-100'}`}
            suppressHydrationWarning
          >
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
            className={`w-10 h-10 rounded-full ${isPrivateNote ? 'ring-2 ring-slate-400' : ''}`}
          />
        ) : (
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isPrivateNote
                ? 'bg-slate-400'
                : isAgentMessage
                  ? 'bg-orange-500'
                  : 'bg-blue-500'
            }`}
          >
            {isPrivateNote ? (
              <Lock className="w-5 h-5 text-white" />
            ) : (
              <User className="w-5 h-5 text-white" />
            )}
          </div>
        )}
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-slate-900">
            {message.sender.full_name}
          </span>
          {/* Story 4.2.1: Private note badge */}
          {isPrivateNote && showPrivateBadge && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-semibold rounded-full border border-slate-300">
              <Lock className="w-3 h-3" />
              Private
            </span>
          )}
          <span className="text-xs text-slate-500" suppressHydrationWarning>
            {formatTimestamp(message.created_at)}
          </span>
        </div>
        <div
          className={`px-4 py-3 rounded-lg ${
            isPrivateNote
              ? 'bg-slate-100 border-2 border-slate-300 border-dashed'
              : isAgentMessage
                ? 'bg-orange-50 border border-orange-200'
                : 'bg-blue-50 border border-blue-200'
          }`}
        >
          <p className="text-sm text-slate-900 whitespace-pre-wrap">
            {renderMarkdown(message.content)}
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
