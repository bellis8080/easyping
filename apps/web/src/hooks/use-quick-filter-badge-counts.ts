'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface QuickFilterCounts {
  all: number;
  assigned: number;
  unassigned: number;
  urgent: number;
}

/**
 * Hook to get real-time badge counts for Quick Filters
 * Returns counts for: All Pings, Assigned to Me, Unassigned, Urgent
 */
export function useQuickFilterBadgeCounts(
  userId: string | null
): QuickFilterCounts {
  const [counts, setCounts] = useState<QuickFilterCounts>({
    all: 0,
    assigned: 0,
    unassigned: 0,
    urgent: 0,
  });

  useEffect(() => {
    if (!userId) {
      setCounts({ all: 0, assigned: 0, unassigned: 0, urgent: 0 });
      return;
    }

    const supabase = createClient();
    let debounceTimer: NodeJS.Timeout | null = null;
    let isCalculating = false;

    async function calculateCounts() {
      if (isCalculating) return;
      isCalculating = true;

      // Get all active pings (excluding resolved, closed, draft)
      const { data: pings } = await supabase
        .from('pings')
        .select('id, assigned_to, priority')
        .not('status', 'in', '(resolved,closed,draft)');

      if (!pings || pings.length === 0) {
        setCounts({ all: 0, assigned: 0, unassigned: 0, urgent: 0 });
        isCalculating = false;
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

      // Calculate unread counts for each ping
      const pingUnreadCounts = new Map<string, number>();

      for (const ping of pings) {
        const lastReadAt = pingReadsMap.get(ping.id);
        let unreadCount = 0;

        if (!lastReadAt) {
          // Never read - count all messages not from this user
          const { count } = await supabase
            .from('ping_messages')
            .select('*', { count: 'exact', head: true })
            .eq('ping_id', ping.id)
            .neq('sender_id', userId);

          unreadCount = count || 0;
        } else {
          // Count messages after last read that aren't from this user
          const { count } = await supabase
            .from('ping_messages')
            .select('*', { count: 'exact', head: true })
            .eq('ping_id', ping.id)
            .neq('sender_id', userId)
            .gt('created_at', lastReadAt);

          unreadCount = count || 0;
        }

        pingUnreadCounts.set(ping.id, unreadCount);
      }

      // Aggregate by filter
      let allCount = 0;
      let assignedCount = 0;
      let unassignedCount = 0;
      let urgentCount = 0;

      for (const ping of pings) {
        const unread = pingUnreadCounts.get(ping.id) || 0;

        // All Pings
        allCount += unread;

        // Assigned to Me
        if (ping.assigned_to === userId) {
          assignedCount += unread;
        }

        // Unassigned
        if (!ping.assigned_to) {
          unassignedCount += unread;
        }

        // Urgent
        if (ping.priority === 'urgent') {
          urgentCount += unread;
        }
      }

      setCounts({
        all: allCount,
        assigned: assignedCount,
        unassigned: unassignedCount,
        urgent: urgentCount,
      });

      isCalculating = false;
    }

    function debouncedCalculateCounts(delay: number = 0) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        calculateCounts();
      }, delay);
    }

    // Initial calculation
    calculateCounts();

    // Subscribe to changes
    const channel = supabase
      .channel('quick-filter-badge-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ping_reads',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          debouncedCalculateCounts(600);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pings',
        },
        () => {
          debouncedCalculateCounts(100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ping_messages',
        },
        () => {
          debouncedCalculateCounts(100);
        }
      )
      .subscribe();

    // Polling fallback every 5 seconds
    const pollingInterval = setInterval(() => {
      debouncedCalculateCounts(0);
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollingInterval);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [userId]);

  return counts;
}
