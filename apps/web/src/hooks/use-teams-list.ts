'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Team {
  id: string;
  name: string;
  description: string | null;
}

/**
 * Client-side hook to manage the teams list with real-time updates.
 * Starts with server-provided teams and subscribes to membership changes.
 */
export function useTeamsList(initialTeams: Team[], userId: string | null) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const supabaseRef = useRef(createClient());

  /**
   * Fetch teams from API (handles both manager and agent cases)
   */
  const refetchTeams = useCallback(async () => {
    try {
      const response = await fetch('/api/teams');
      if (response.ok) {
        const data = await response.json();
        // API returns array directly for managers/owners, not { teams: [...] }
        const teamsArray = Array.isArray(data) ? data : data.teams || [];
        setTeams(
          teamsArray.sort((a: Team, b: Team) => a.name.localeCompare(b.name))
        );
      }
    } catch (error) {
      console.error('Failed to refetch teams:', error);
    }
  }, []);

  /**
   * Subscribe to real-time changes in team membership for this user
   */
  useEffect(() => {
    if (!userId) return;

    const supabase = supabaseRef.current;

    // Subscribe to changes in agent_team_members for this user
    const channel = supabase
      .channel(`team-membership-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_team_members',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[useTeamsList] Team membership change:', payload);
          // Refetch teams when membership changes
          refetchTeams();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_teams',
        },
        (payload) => {
          console.log('[useTeamsList] Team change:', payload);
          // Handle team updates/deletes
          if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setTeams((prev) => prev.filter((t) => t.id !== deletedId));
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Team;
            if (updated?.id) {
              setTeams((prev) =>
                prev
                  .map((t) =>
                    t.id === updated.id
                      ? {
                          ...t,
                          name: updated.name,
                          description: updated.description,
                        }
                      : t
                  )
                  .sort((a, b) => a.name.localeCompare(b.name))
              );
            }
          } else if (payload.eventType === 'INSERT') {
            // New team created - refetch to see if we're a member
            refetchTeams();
          }
        }
      )
      .subscribe((status) => {
        console.log('[useTeamsList] Subscription status:', status);
      });

    return () => {
      console.log('[useTeamsList] Unsubscribing from team changes');
      supabase.removeChannel(channel);
    };
  }, [userId, refetchTeams]);

  /**
   * Remove a team from the list (called after successful deletion)
   */
  const removeTeam = useCallback((teamId: string) => {
    console.log('[useTeamsList] removeTeam called:', teamId);
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
  }, []);

  /**
   * Add a team to the list (called after successful creation)
   */
  const addTeam = useCallback((team: Team) => {
    console.log('[useTeamsList] addTeam called:', team);
    setTeams((prev) => {
      if (prev.find((t) => t.id === team.id)) {
        return prev;
      }
      return [...prev, team].sort((a, b) => a.name.localeCompare(b.name));
    });
  }, []);

  /**
   * Update a team in the list (called after successful edit)
   */
  const updateTeam = useCallback((teamId: string, updates: Partial<Team>) => {
    console.log('[useTeamsList] updateTeam called:', teamId, updates);
    setTeams((prev) =>
      prev
        .map((t) => (t.id === teamId ? { ...t, ...updates } : t))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  }, []);

  return {
    teams,
    removeTeam,
    addTeam,
    updateTeam,
    refetchTeams,
  };
}
