'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useTeamsList } from '@/hooks/use-teams-list';

interface Team {
  id: string;
  name: string;
  description: string | null;
}

interface TeamsContextValue {
  teams: Team[];
  removeTeam: (teamId: string) => void;
  addTeam: (team: Team) => void;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
  refetchTeams: () => Promise<void>;
}

const TeamsContext = createContext<TeamsContextValue | null>(null);

interface TeamsProviderProps {
  children: ReactNode;
  initialTeams: Team[];
  userId: string | null;
}

export function TeamsProvider({
  children,
  initialTeams,
  userId,
}: TeamsProviderProps) {
  const teamsState = useTeamsList(initialTeams, userId);

  return (
    <TeamsContext.Provider value={teamsState}>{children}</TeamsContext.Provider>
  );
}

export function useTeams() {
  const context = useContext(TeamsContext);
  if (!context) {
    throw new Error('useTeams must be used within a TeamsProvider');
  }
  return context;
}

/**
 * Safe version that returns null if not in provider (for optional usage)
 */
export function useTeamsSafe() {
  return useContext(TeamsContext);
}
