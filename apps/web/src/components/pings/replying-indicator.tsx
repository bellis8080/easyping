interface ReplyingIndicatorProps {
  userName: string;
}

export function ReplyingIndicator({ userName }: ReplyingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 p-2">
      <div className="flex gap-1">
        <span
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span>{userName} is replying...</span>
    </div>
  );
}
