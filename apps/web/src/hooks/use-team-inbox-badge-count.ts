'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook to get real-time team inbox badge count (total unread pings for a team)
 * Returns a map of teamId -> unread count
 */
export function useTeamInboxBadgeCounts(
  teamIds: string[],
  userId: string | null
): Map<string, number> {
  const [badgeCounts, setBadgeCounts] = useState<Map<string, number>>(
    new Map()
  );
  const teamIdsRef = useRef<string[]>(teamIds);

  // Update ref when teamIds change
  useEffect(() => {
    teamIdsRef.current = teamIds;
  }, [teamIds]);

  useEffect(() => {
    if (!userId || teamIds.length === 0) {
      setBadgeCounts(new Map());
      return;
    }

    const supabase = createClient();
    let debounceTimer: NodeJS.Timeout | null = null;
    let isCalculating = false;

    // Calculate badge counts for all teams
    async function calculateBadgeCounts() {
      if (isCalculating) return;
      isCalculating = true;

      const currentTeamIds = teamIdsRef.current;
      const countsMap = new Map<string, number>();

      // Initialize all teams with 0
      for (const teamId of currentTeamIds) {
        countsMap.set(teamId, 0);
      }

      // Get all pings assigned to these teams (excluding resolved/closed/draft)
      const { data: pings } = await supabase
        .from('pings')
        .select('id, team_id')
        .in('team_id', currentTeamIds)
        .not('status', 'in', '(resolved,closed,draft)');

      if (!pings || pings.length === 0) {
        setBadgeCounts(countsMap);
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

      // Calculate unread count for each ping and aggregate by team
      for (const ping of pings) {
        if (!ping.team_id) continue;

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

        // Add to team's total
        const currentTeamCount = countsMap.get(ping.team_id) || 0;
        countsMap.set(ping.team_id, currentTeamCount + unreadCount);
      }

      setBadgeCounts(countsMap);
      isCalculating = false;
    }

    // Debounced version
    function debouncedCalculateBadgeCounts(delay: number = 0) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        calculateBadgeCounts();
      }, delay);
    }

    // Initial calculation
    calculateBadgeCounts();

    // Subscribe to changes
    const channel = supabase
      .channel('team-inbox-badge-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ping_reads',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          debouncedCalculateBadgeCounts(600);
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
          // Recalculate when pings change (assigned to team, status changes, etc)
          debouncedCalculateBadgeCounts(100);
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
          // Recalculate when new messages arrive
          debouncedCalculateBadgeCounts(100);
        }
      )
      .subscribe();

    // Polling fallback every 5 seconds
    const pollingInterval = setInterval(() => {
      debouncedCalculateBadgeCounts(0);
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollingInterval);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [userId, teamIds.join(',')]); // Join teamIds to create a stable dependency

  return badgeCounts;
}
