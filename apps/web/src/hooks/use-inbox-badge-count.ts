'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook to get real-time inbox badge count (total unread messages for assigned pings)
 * Calculates count from ping_reads table, subscribes to ping_reads changes only
 */
export function useInboxBadgeCount(userId: string | null): number {
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setBadgeCount(0);
      return;
    }

    const supabase = createClient();
    let debounceTimer: NodeJS.Timeout | null = null;
    let isCalculating = false;
    let criticalWindowUntil = 0; // Timestamp until which we're in a critical window

    // Calculate badge count from ping_reads and ping_messages
    async function calculateBadgeCount() {
      if (isCalculating) return; // Prevent concurrent calculations
      isCalculating = true;
      // Get all pings assigned to this user (excluding resolved/closed)
      const { data: pings } = await supabase
        .from('pings')
        .select('id')
        .eq('assigned_to', userId)
        .not('status', 'in', '(resolved,closed)');

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
          // Use > instead of >= so messages with created_at == last_read_at are considered read
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
      isCalculating = false;
    }

    // Debounced version of calculateBadgeCount
    function debouncedCalculateBadgeCount(
      delay: number = 0,
      isCritical: boolean = false
    ) {
      const now = Date.now();

      // If we're in a critical window and this is not a critical call, skip it
      if (criticalWindowUntil > now && !isCritical) {
        return;
      }

      // If this is a critical call, set the critical window
      if (isCritical) {
        criticalWindowUntil = now + delay;
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        calculateBadgeCount();
      }, delay);
    }

    // Initial calculation
    calculateBadgeCount();

    // Subscribe to ping_reads changes and pings table
    // Note: We rely on polling for ping_messages since realtime subscriptions can be unreliable
    const channel = supabase
      .channel('inbox-badge-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ping_reads',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Mark-as-read is a critical operation - we need to ensure badge recalculates AFTER the transaction completes
          // Use longer delay and mark as critical to prevent polling from interfering
          debouncedCalculateBadgeCount(600, true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pings',
          filter: `assigned_to=eq.${userId}`,
        },
        () => {
          // Recalculate when pings update (status changes, etc)
          debouncedCalculateBadgeCount(100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pings',
          filter: `assigned_to=eq.${userId}`,
        },
        () => {
          // Recalculate when new pings are assigned to user
          debouncedCalculateBadgeCount(100);
        }
      )
      .subscribe();

    // Polling fallback: recalculate every 5 seconds
    // This ensures badge count stays accurate even if realtime subscriptions have issues
    const pollingInterval = setInterval(() => {
      debouncedCalculateBadgeCount(0);
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollingInterval);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [userId]);

  return badgeCount;
}
