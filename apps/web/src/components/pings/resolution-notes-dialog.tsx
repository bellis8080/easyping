'use client';

/**
 * Resolution Notes Dialog
 * Story 4.2.1: Agent Private Notes
 * Story 4.2.2: Auto-Generate KB Articles from Resolved Pings
 * Story 4.2.3: KB Article Comparison & Enhancement
 *
 * Prompts agents to add optional resolution notes as a private note
 * when resolving a ping. Also offers option to generate or enhance KB article.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  Check,
  X,
  BookOpen,
  Loader2,
  RefreshCw,
  Plus,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * Similar article from compare-kb API
 */
interface SimilarArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  categoryId: string | null;
  categoryName: string | null;
  viewCount: number;
  helpfulCount: number;
}

/**
 * KB action type for resolution
 */
export type KBAction = 'none' | 'generate' | 'enhance';

interface ResolutionNotesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    notes: string | null,
    generateKB: boolean,
    kbAction?: { action: KBAction; articleId?: string }
  ) => void;
  pingTitle: string;
  pingNumber: number; // Story 4.2.3: Need ping number for comparison API
  isLoading?: boolean;
  hasExistingKBArticle?: boolean; // Story 4.2.2: Hide checkbox if article already exists
  existingArticleSlug?: string | null; // Story 4.2.2: Link to existing article
}

export function ResolutionNotesDialog({
  isOpen,
  onClose,
  onConfirm,
  pingTitle,
  pingNumber,
  isLoading = false,
  hasExistingKBArticle = false,
  existingArticleSlug = null,
}: ResolutionNotesDialogProps) {
  const [notes, setNotes] = useState('');
  const [generateKB, setGenerateKB] = useState(false);

  // Story 4.2.3: Comparison state
  const [isComparing, setIsComparing] = useState(false);
  const [similarArticle, setSimilarArticle] = useState<SimilarArticle | null>(
    null
  );
  const [similarity, setSimilarity] = useState(0);
  const [comparisonChecked, setComparisonChecked] = useState(false);
  const [selectedKBAction, setSelectedKBAction] = useState<KBAction>('none');

  // Story 4.2.3: Check for similar KB articles when dialog opens
  const checkForSimilarArticles = useCallback(async () => {
    if (hasExistingKBArticle || !pingNumber) {
      setComparisonChecked(true);
      return;
    }

    setIsComparing(true);
    try {
      const response = await fetch(`/api/pings/${pingNumber}/compare-kb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.hasSimilar && data.similarArticle) {
          setSimilarArticle(data.similarArticle);
          setSimilarity(data.similarity);
        }
      }
    } catch (error) {
      console.error('Error checking for similar KB articles:', error);
    } finally {
      setIsComparing(false);
      setComparisonChecked(true);
    }
  }, [hasExistingKBArticle, pingNumber]);

  // Run comparison when dialog opens
  useEffect(() => {
    if (isOpen && !comparisonChecked) {
      checkForSimilarArticles();
    }
  }, [isOpen, comparisonChecked, checkForSimilarArticles]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setNotes('');
      setGenerateKB(false);
      setSimilarArticle(null);
      setSimilarity(0);
      setComparisonChecked(false);
      setSelectedKBAction('none');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    // Pass notes if provided, otherwise null
    // Story 4.2.3: Include KB action with article ID for enhancement
    const kbAction =
      selectedKBAction !== 'none'
        ? { action: selectedKBAction, articleId: similarArticle?.id }
        : { action: 'none' as KBAction };

    onConfirm(
      notes.trim() || null,
      !hasExistingKBArticle && (generateKB || selectedKBAction === 'generate'),
      kbAction
    );
  };

  const handleSkip = () => {
    const kbAction =
      selectedKBAction !== 'none'
        ? { action: selectedKBAction, articleId: similarArticle?.id }
        : { action: 'none' as KBAction };

    onConfirm(
      null,
      !hasExistingKBArticle && (generateKB || selectedKBAction === 'generate'),
      kbAction
    );
  };

  const handleClose = () => {
    onClose();
  };

  // Story 4.2.3: Handle KB action selection
  const handleEnhance = () => {
    setSelectedKBAction('enhance');
    setGenerateKB(false);
  };

  const handleCreateNew = () => {
    setSelectedKBAction('generate');
    setGenerateKB(true);
  };

  const handleSkipKB = () => {
    setSelectedKBAction('none');
    setGenerateKB(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            Resolve Ping
          </DialogTitle>
          <DialogDescription>
            Would you like to add resolution notes before marking this ping as
            resolved?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-slate-600">
            <span className="font-medium">Ping:</span> {pingTitle}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="resolution-notes"
              className="flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              <Lock className="w-4 h-4 text-amber-600" />
              Resolution Notes (Private)
            </label>
            <textarea
              id="resolution-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Document how this issue was resolved, steps taken, root cause, etc. These notes are only visible to agents."
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              rows={6}
              disabled={isLoading}
            />
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Only visible to agents, not to end users
            </p>
          </div>

          {/* Story 4.2.2 & 4.2.3: KB Article Generation/Enhancement Option */}
          <div className="border-t border-slate-200 pt-4 mt-4">
            {hasExistingKBArticle ? (
              // Already has KB article from this ping
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>
                  KB article already generated from this ping.{' '}
                  {existingArticleSlug && (
                    <a
                      href={`/kb/${existingArticleSlug}`}
                      className="text-blue-600 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View article →
                    </a>
                  )}
                </span>
              </div>
            ) : isComparing ? (
              // Loading state while checking for similar articles
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking for similar KB articles...</span>
              </div>
            ) : similarArticle ? (
              // Story 4.2.3: Similar article found - show comparison UI
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-slate-700">
                    Similar KB Article Found
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    {similarity}% match
                  </span>
                </div>

                <div className="bg-slate-50 rounded-md p-3 border border-slate-200">
                  <h4 className="font-medium text-sm text-slate-800 mb-1">
                    {similarArticle.title}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {similarArticle.excerpt}
                  </p>
                  {similarArticle.categoryName && (
                    <span className="inline-flex items-center px-2 py-0.5 mt-2 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {similarArticle.categoryName}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={
                      selectedKBAction === 'enhance' ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={handleEnhance}
                    disabled={isLoading}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Enhance Existing
                  </Button>
                  <Button
                    variant={
                      selectedKBAction === 'generate' ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={handleCreateNew}
                    disabled={isLoading}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Create New
                  </Button>
                  <Button
                    variant={selectedKBAction === 'none' ? 'outline' : 'ghost'}
                    size="sm"
                    onClick={handleSkipKB}
                    disabled={isLoading}
                    className="flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Skip KB
                  </Button>
                </div>

                {selectedKBAction === 'enhance' && (
                  <p className="text-xs text-slate-500">
                    AI will merge new information from this ping into the
                    existing article, creating an enhanced draft for your
                    review.
                  </p>
                )}
                {selectedKBAction === 'generate' && (
                  <p className="text-xs text-slate-500">
                    A new KB article will be created, even though a similar one
                    exists.
                  </p>
                )}
              </div>
            ) : (
              // No similar article - show original checkbox
              <div className="flex items-start gap-3">
                <Checkbox
                  id="generate-kb"
                  checked={generateKB}
                  onCheckedChange={(checked) => setGenerateKB(checked === true)}
                  disabled={isLoading}
                  className="mt-1"
                />
                <div>
                  <label
                    htmlFor="generate-kb"
                    className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    Generate KB article from this ping
                  </label>
                  <p className="text-xs text-slate-500 mt-1">
                    AI will create a draft article with both user-facing and
                    internal resolution steps. You can review and edit before
                    publishing.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
            className="flex items-center gap-1 whitespace-nowrap"
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isLoading}
            className="flex items-center gap-1 whitespace-nowrap"
          >
            Skip Notes
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 whitespace-nowrap"
          >
            {isLoading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <Check className="w-4 h-4" />
            )}
            {notes.trim() ? 'Add Notes & Resolve' : 'Resolve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
