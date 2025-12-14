'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Users, Loader2, Plus, X, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface AvailableAgent {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
}

interface CreatedTeam {
  id: string;
  name: string;
  description: string | null;
}

interface TeamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: Team | null;
  existingMembers?: TeamMember[];
  onSuccess?: (createdTeam?: CreatedTeam) => void;
}

export function TeamFormDialog({
  open,
  onOpenChange,
  team,
  existingMembers,
  onSuccess,
}: TeamFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);

  const isEditing = !!team;

  // Memoize existingMembers to prevent infinite loop from new array references
  const existingMemberIds = existingMembers?.map((m) => m.id).join(',') ?? '';
  const stableExistingMembers = useMemo(
    () => existingMembers ?? [],
    [existingMemberIds, existingMembers]
  );

  // Reset form when dialog opens/closes or team changes
  useEffect(() => {
    if (open) {
      setName(team?.name || '');
      setDescription(team?.description || '');
      setMembers(stableExistingMembers);
      fetchAvailableAgents();
    } else {
      setName('');
      setDescription('');
      setMembers([]);
      setShowAgentSelector(false);
    }
  }, [open, team, stableExistingMembers]);

  const fetchAvailableAgents = async () => {
    setIsLoadingAgents(true);
    try {
      const response = await fetch('/api/agents');
      if (response.ok) {
        const data = await response.json();
        // API returns { agents: [...] }
        setAvailableAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Team name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && team) {
        // Update existing team
        const response = await fetch(`/api/teams/${team.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update team');
        }

        toast.success('Team updated successfully');
      } else {
        // Create new team
        const response = await fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            memberIds: members.map((m) => m.id),
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create team');
        }

        const createdTeam = await response.json();
        toast.success('Team created successfully');
        onOpenChange(false);
        onSuccess?.(createdTeam);
        return;
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMember = (agent: AvailableAgent) => {
    if (!members.find((m) => m.id === agent.id)) {
      setMembers([
        ...members,
        {
          id: agent.id,
          full_name: agent.full_name,
          email: agent.email,
          avatar_url: agent.avatar_url,
        },
      ]);
    }
    setShowAgentSelector(false);
  };

  const removeMember = (memberId: string) => {
    setMembers(members.filter((m) => m.id !== memberId));
  };

  // Filter out agents who are already members
  const filteredAgents = availableAgents.filter(
    (agent) =>
      !members.find((m) => m.id === agent.id) &&
      (agent.role === 'agent' ||
        agent.role === 'manager' ||
        agent.role === 'owner')
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            {isEditing ? 'Edit Team' : 'Create Team'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update team details and manage members.'
              : 'Create a new team to route pings and manage workload.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="team-name"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Team Name *
            </label>
            <input
              id="team-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Technical Support"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label
              htmlFor="team-description"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Description
            </label>
            <textarea
              id="team-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this team's responsibilities"
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Members Section - Only for new teams (editing members is done separately) */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Team Members
              </label>

              {/* Current Members */}
              {members.length > 0 && (
                <div className="mb-2 space-y-1">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.full_name}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-xs text-slate-600">
                            {member.full_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="text-sm text-slate-700">
                          {member.full_name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMember(member.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Member Button / Selector */}
              {showAgentSelector ? (
                <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                  {isLoadingAgents ? (
                    <div className="p-4 text-center text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    </div>
                  ) : filteredAgents.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">
                      No available agents
                    </div>
                  ) : (
                    filteredAgents.map((agent) => (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => addMember(agent)}
                        className="w-full flex items-center gap-2 p-2 hover:bg-slate-50 text-left transition-colors"
                      >
                        {agent.avatar_url ? (
                          <img
                            src={agent.avatar_url}
                            alt={agent.full_name}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-xs text-slate-600">
                            {agent.full_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-700 truncate">
                            {agent.full_name}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {agent.email}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAgentSelector(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Member
                </button>
              )}
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {isEditing ? (
                    'Update Team'
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Team
                    </>
                  )}
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
