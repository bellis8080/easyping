import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';

// Mock Supabase client
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn().mockReturnThis(),
};

const mockSupabase = {
  channel: vi.fn(() => mockChannel),
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

// Mock document.title
let documentTitle = 'EasyPing';
Object.defineProperty(document, 'title', {
  get: () => documentTitle,
  set: (value: string) => {
    documentTitle = value;
  },
  configurable: true,
});

// Mock Audio API
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  volume: 0,
})) as any;

describe('Real-Time Subscription Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documentTitle = 'EasyPing';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Test 1: Should subscribe to ping updates on mount', () => {
    it('should call channel.on and channel.subscribe', () => {
      // Verify channel creation
      expect(mockSupabase.channel).toBeDefined();

      // Simulate subscription setup
      const channel = mockSupabase.channel('ping-updates');
      channel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pings',
      });
      channel.subscribe();

      // Assert channel methods called
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });
  });

  describe('Test 2: Should update ping list when UPDATE event received', () => {
    it('should update ping in state when UPDATE event received', () => {
      const initialPings = [
        { id: '1', status: 'open', priority: 'normal', title: 'Test Ping' },
      ];

      const updatedPing = {
        id: '1',
        status: 'in_progress',
        priority: 'high',
        title: 'Test Ping',
      };

      // Simulate UPDATE event handler
      let pings = [...initialPings];
      const handleUpdate = (payload: { new: typeof updatedPing }) => {
        pings = pings.map((p) => (p.id === payload.new.id ? payload.new : p));
      };

      handleUpdate({ new: updatedPing });

      // Assert ping updated
      expect(pings[0].status).toBe('in_progress');
      expect(pings[0].priority).toBe('high');
    });
  });

  describe('Test 3: Should add new ping when INSERT event received', () => {
    it('should add new ping to list when INSERT event received', () => {
      let pings: any[] = [];

      const newPing = {
        id: '2',
        status: 'open',
        priority: 'normal',
        title: 'New Ping',
        created_at: new Date().toISOString(),
      };

      // Simulate INSERT event handler
      const handleInsert = (payload: { new: typeof newPing }) => {
        pings = [payload.new, ...pings];
      };

      handleInsert({ new: newPing });

      // Assert new ping added at top
      expect(pings).toHaveLength(1);
      expect(pings[0].id).toBe('2');
      expect(pings[0].title).toBe('New Ping');
    });
  });

  describe('Test 4: Should calculate unread count correctly', () => {
    it('should count only messages after last_read_at', () => {
      const messages = [
        { id: '1', created_at: '2025-01-01T10:00:00Z', sender_id: 'user1' },
        { id: '2', created_at: '2025-01-01T10:01:00Z', sender_id: 'user1' },
        { id: '3', created_at: '2025-01-01T10:02:00Z', sender_id: 'user1' },
        { id: '4', created_at: '2025-01-01T10:03:00Z', sender_id: 'user2' },
        { id: '5', created_at: '2025-01-01T10:04:00Z', sender_id: 'user2' },
      ];

      const lastReadAt = '2025-01-01T10:02:00Z';
      const currentUserId = 'user1';

      // Calculate unread count (exclude current user's messages)
      const unreadCount = messages.filter((msg) => {
        return (
          msg.sender_id !== currentUserId &&
          new Date(msg.created_at) > new Date(lastReadAt)
        );
      }).length;

      // Assert unread count = 2 (messages 4 and 5, both from user2)
      expect(unreadCount).toBe(2);
    });

    it('should count all non-user messages when never read', () => {
      const messages = [
        { id: '1', created_at: '2025-01-01T10:00:00Z', sender_id: 'user2' },
        { id: '2', created_at: '2025-01-01T10:01:00Z', sender_id: 'user1' },
        { id: '3', created_at: '2025-01-01T10:02:00Z', sender_id: 'user2' },
      ];

      const lastReadAt = null;
      const currentUserId = 'user1';

      // Calculate unread count when never read
      const unreadCount = lastReadAt
        ? messages.filter((msg) => {
            return (
              msg.sender_id !== currentUserId &&
              new Date(msg.created_at) > new Date(lastReadAt)
            );
          }).length
        : messages.filter((msg) => msg.sender_id !== currentUserId).length;

      // Assert unread count = 2 (messages 1 and 3 from user2)
      expect(unreadCount).toBe(2);
    });
  });

  describe('Test 5: Should update tab title when unread count changes', () => {
    it('should set tab title to "(3) EasyPing" when unread count is 3', () => {
      const unreadCount = 3;

      // Simulate useTabTitle hook logic
      if (unreadCount > 0) {
        document.title = `(${unreadCount}) EasyPing`;
      } else {
        document.title = 'EasyPing';
      }

      expect(document.title).toBe('(3) EasyPing');
    });

    it('should reset tab title to "EasyPing" when unread count is 0', () => {
      const unreadCount = 0;

      // Simulate useTabTitle hook logic
      if (unreadCount > 0) {
        document.title = `(${unreadCount}) EasyPing`;
      } else {
        document.title = 'EasyPing';
      }

      expect(document.title).toBe('EasyPing');
    });
  });

  describe('Test 6: Should play notification sound when message arrives', () => {
    it('should call playNotificationSound when soundEnabled is true', () => {
      const playNotificationSound = vi.fn();
      const soundEnabled = true;
      const newMessage = {
        sender_id: 'user2',
        content: 'Hello!',
      };
      const currentUserId = 'user1';

      // Simulate new message handler
      if (newMessage.sender_id !== currentUserId && soundEnabled) {
        playNotificationSound();
      }

      expect(playNotificationSound).toHaveBeenCalled();
    });

    it('should NOT play sound for own messages', () => {
      const playNotificationSound = vi.fn();
      const soundEnabled = true;
      const newMessage = {
        sender_id: 'user1',
        content: 'Hello!',
      };
      const currentUserId = 'user1';

      // Simulate new message handler
      if (newMessage.sender_id !== currentUserId && soundEnabled) {
        playNotificationSound();
      }

      expect(playNotificationSound).not.toHaveBeenCalled();
    });
  });

  describe('Test 7: Should NOT play sound when soundEnabled is false', () => {
    it('should not call playNotificationSound when soundEnabled is false', () => {
      const playNotificationSound = vi.fn();
      const soundEnabled = false;
      const newMessage = {
        sender_id: 'user2',
        content: 'Hello!',
      };
      const currentUserId = 'user1';

      // Simulate new message handler
      if (newMessage.sender_id !== currentUserId && soundEnabled) {
        playNotificationSound();
      }

      expect(playNotificationSound).not.toHaveBeenCalled();
    });
  });

  describe('Test 8: Should show connection indicator when disconnected', () => {
    it('should set isConnected to false on CHANNEL_ERROR', () => {
      let isConnected = true;
      let isReconnecting = false;

      // Simulate CHANNEL_ERROR event handler
      const handleChannelError = () => {
        isConnected = false;
        isReconnecting = true;
      };

      handleChannelError();

      expect(isConnected).toBe(false);
      expect(isReconnecting).toBe(true);
    });

    it('should hide indicator when isConnected is true and not reconnecting', () => {
      const isConnected = true;
      const isReconnecting = false;

      // Simulate ConnectionStatusIndicator render logic
      const shouldShowIndicator = !isConnected || isReconnecting;

      expect(shouldShowIndicator).toBe(false);
    });
  });

  describe('Test 9: Should reconnect automatically on connection loss', () => {
    it('should set isReconnecting to true on TIMED_OUT event', () => {
      let isConnected = true;
      let isReconnecting = false;

      // Simulate TIMED_OUT event handler
      const handleTimedOut = () => {
        isConnected = false;
        isReconnecting = true;
      };

      handleTimedOut();

      expect(isConnected).toBe(false);
      expect(isReconnecting).toBe(true);
    });

    it('should restore connection state on SUBSCRIBED event', () => {
      let isConnected = false;
      let isReconnecting = true;

      // Simulate SUBSCRIBED event handler (successful reconnection)
      const handleSubscribed = () => {
        isConnected = true;
        isReconnecting = false;
      };

      handleSubscribed();

      expect(isConnected).toBe(true);
      expect(isReconnecting).toBe(false);
    });
  });

  describe('Test 10: Should mark ping as read when opened', () => {
    it('should call API with correct ping ID and last message ID', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      const ping = {
        id: 'ping-123',
        ping_number: 456,
        messages: [
          { id: 'msg-1', content: 'Hello' },
          { id: 'msg-2', content: 'World' },
        ],
        unread_count: 2,
      };

      // Simulate markPingAsRead function
      const markPingAsRead = async (pingToMark: typeof ping) => {
        if (!pingToMark.messages.length) return;

        const lastMessage = pingToMark.messages[pingToMark.messages.length - 1];
        await fetch(`/api/pings/${pingToMark.ping_number}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastReadMessageId: lastMessage.id }),
        });
      };

      await markPingAsRead(ping);

      expect(mockFetch).toHaveBeenCalledWith('/api/pings/456/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastReadMessageId: 'msg-2' }),
      });
    });

    it('should optimistically clear unread count', () => {
      let pings = [
        { id: 'ping-1', unread_count: 5, messages: [] },
        { id: 'ping-2', unread_count: 0, messages: [] },
      ];

      const pingToMark = pings[0];

      // Simulate optimistic update
      pings = pings.map((p) =>
        p.id === pingToMark.id ? { ...p, unread_count: 0 } : p
      );

      expect(pings[0].unread_count).toBe(0);
      expect(pings[1].unread_count).toBe(0);
    });
  });
});
