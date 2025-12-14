'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Team {
  id: string;
  name: string;
}

interface TeamDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team;
  memberCount: number;
  pingCount: number;
  onSuccess?: () => void;
}

export function TeamDeleteDialog({
  open,
  onOpenChange,
  team,
  memberCount,
  pingCount,
  onSuccess,
}: TeamDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (confirmText !== team.name) {
      toast.error('Please type the team name to confirm deletion');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete team');
      }

      toast.success(`Team "${team.name}" has been deleted`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete team'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isDeleting) {
      setConfirmText('');
      onOpenChange(isOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Delete Team
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the team
            and have the following effects:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning list */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-red-500 font-bold">1.</span>
              <span className="text-sm text-red-700">
                <strong>{memberCount}</strong> team member
                {memberCount !== 1 ? 's' : ''} will be removed from this team
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-500 font-bold">2.</span>
              <span className="text-sm text-red-700">
                <strong>{pingCount}</strong> ping
                {pingCount !== 1 ? 's' : ''} will be unassigned from this team
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-500 font-bold">3.</span>
              <span className="text-sm text-red-700">
                All routing rules for this team will be deleted
              </span>
            </div>
          </div>

          {/* Confirmation input */}
          <div>
            <label
              htmlFor="confirm-delete"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Type <strong className="text-red-600">{team.name}</strong> to
              confirm:
            </label>
            <input
              id="confirm-delete"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Team name"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={isDeleting}
            />
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || confirmText !== team.name}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Team
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
