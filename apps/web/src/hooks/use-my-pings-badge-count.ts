'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook to get real-time My Pings badge count (total unread messages for user's pings)
 * Calculates count from ping_reads table, subscribes to ping_reads changes only
 */
export function useMyPingsBadgeCount(userId: string | null): number {
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setBadgeCount(0);
      return;
    }

    const supabase = createClient();

    // Calculate badge count from ping_reads and ping_messages
    async function calculateBadgeCount() {
      // Get all pings created by this user (all statuses)
      const { data: pings } = await supabase
        .from('pings')
        .select('id')
        .eq('created_by', userId);

      if (!pings || pings.length === 0) {
        setBadgeCount(0);
        return;
      }

      const pingIds = pings.map((p) => p.id);

      // Get ping reads for this user
      const { data: pingReads } = await supabase
        .from('ping_reads')
        .select('ping_id, last_read_at')
        .eq('user_id', userId)
        .in('ping_id', pingIds);

      const pingReadsMap = new Map(
        pingReads?.map((pr) => [pr.ping_id, pr.last_read_at]) || []
      );

      // Calculate unread count for each ping
      let totalUnread = 0;
      for (const ping of pings) {
        const lastReadAt = pingReadsMap.get(ping.id);

        if (!lastReadAt) {
          // Never read - count all messages not from this user
          const { count } = await supabase
            .from('ping_messages')
            .select('*', { count: 'exact', head: true })
            .eq('ping_id', ping.id)
            .neq('sender_id', userId);

          totalUnread += count || 0;
        } else {
          // Count messages after last read that aren't from this user
          const { count } = await supabase
            .from('ping_messages')
            .select('*', { count: 'exact', head: true })
            .eq('ping_id', ping.id)
            .neq('sender_id', userId)
            .gt('created_at', lastReadAt);

          totalUnread += count || 0;
        }
      }

      setBadgeCount(totalUnread);
    }

    // Initial calculation
    calculateBadgeCount();

    // Subscribe to ping_reads changes and pings table
    const channel = supabase
      .channel('my-pings-badge-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ping_reads',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          // Recalculate count when ping_reads changes
          await calculateBadgeCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pings',
          filter: `created_by=eq.${userId}`,
        },
        async () => {
          // Recalculate when pings update (status changes, etc)
          await calculateBadgeCount();
        }
      )
      .subscribe();

    // Polling fallback: recalculate every 5 seconds to catch new messages
    // This ensures badge stays in sync even if realtime subscription has issues
    const pollingInterval = setInterval(() => {
      calculateBadgeCount();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollingInterval);
    };
  }, [userId]);

  return badgeCount;
}
