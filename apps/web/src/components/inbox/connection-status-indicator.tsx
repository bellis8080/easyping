'use client';

import { AlertCircle, Loader2 } from 'lucide-react';

interface ConnectionStatusIndicatorProps {
  isConnected: boolean;
  isReconnecting?: boolean;
  onRetry?: () => void;
}

export function ConnectionStatusIndicator({
  isConnected,
  isReconnecting = false,
  onRetry,
}: ConnectionStatusIndicatorProps) {
  // Hide indicator when connected
  if (isConnected && !isReconnecting) {
    return null;
  }

  const bgClass = isReconnecting
    ? 'bg-yellow-50 text-yellow-800 border-b border-yellow-200'
    : 'bg-red-50 text-red-800 border-b border-red-200';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-sm font-medium text-center ${bgClass}`}
    >
      <div className="flex items-center justify-center gap-2">
        {isReconnecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Connection lost. Reconnecting...</span>
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4" />
            <span>Connection failed.</span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="ml-2 h-6 px-2 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Retry
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
