import { useEffect } from 'react';

/**
 * Updates the browser tab title based on unread count
 * @param unreadCount - Number of unread items to display in title
 */
export function useTabTitle(unreadCount: number): void {
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) EasyPing`;
    } else {
      document.title = 'EasyPing';
    }
  }, [unreadCount]);
}
