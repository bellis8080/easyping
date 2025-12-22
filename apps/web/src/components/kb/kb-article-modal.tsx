'use client';

/**
 * KB Article Preview Modal
 * Story 4.8: KB Article Suggestions During Resolution
 *
 * Displays a KB article in a modal with Insert Link and View Full Article options.
 */

import { useState, useEffect } from 'react';
import { marked } from 'marked';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, Link2, BookOpen } from 'lucide-react';

interface KBArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: {
    name: string;
    color: string;
  } | null;
  updated_at: string;
}

interface KBArticleModalProps {
  slug: string | null;
  isOpen: boolean;
  onClose: () => void;
  onInsertLink: (title: string, slug: string) => void;
}

export function KBArticleModal({
  slug,
  isOpen,
  onClose,
  onInsertLink,
}: KBArticleModalProps) {
  const [article, setArticle] = useState<KBArticle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch article when slug changes
  useEffect(() => {
    if (!slug || !isOpen) {
      setArticle(null);
      setError(null);
      return;
    }

    const fetchArticle = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/kb/articles/slug/${slug}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Article not found');
        }

        const data = await response.json();
        setArticle(data.article);
      } catch (err) {
        console.error('[KBArticleModal] Error fetching article:', err);
        setError('Failed to load article');
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticle();
  }, [slug, isOpen]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Render markdown content
  const renderContent = (content: string) => {
    const html = marked(content, { breaks: true });
    return { __html: html };
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              <DialogTitle>Loading article...</DialogTitle>
            </div>
          ) : error ? (
            <DialogTitle className="text-red-500">Error</DialogTitle>
          ) : article ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-500" />
                <DialogTitle className="text-lg">{article.title}</DialogTitle>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                {article.category && (
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: article.category.color }}
                  >
                    {article.category.name}
                  </span>
                )}
                <span>Updated {formatDate(article.updated_at)}</span>
              </div>
            </div>
          ) : (
            <DialogTitle>KB Article</DialogTitle>
          )}
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
            </div>
          )}

          {article && !isLoading && (
            <div
              className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-a:text-orange-600 prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded"
              dangerouslySetInnerHTML={renderContent(article.content)}
            />
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="gap-2 sm:gap-0">
          {article && (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  window.open(
                    `/kb/article/${article.slug}`,
                    '_blank',
                    'noopener'
                  )
                }
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View Full Article
              </Button>
              <Button
                onClick={() => onInsertLink(article.title, article.slug)}
                className="gap-2 bg-orange-500 hover:bg-orange-600"
              >
                <Link2 className="w-4 h-4" />
                Insert Link
              </Button>
            </>
          )}
          {!article && !isLoading && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
