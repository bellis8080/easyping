'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Send,
  BookOpen,
  X,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { marked } from 'marked';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useKBSuggestions, KBSuggestion } from '@/hooks/use-kb-suggestions';
import { getExpectedResponseTime } from '@/lib/sla/expectations';

// KB Article Card component
function KBArticleCard({
  article,
  onClick,
}: {
  article: KBSuggestion;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-4 border border-slate-600 rounded-lg hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 transition-all cursor-pointer bg-slate-800"
    >
      <div className="flex items-start gap-2 mb-2">
        <BookOpen className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
        <h4 className="text-sm font-medium text-white line-clamp-2">
          {article.title}
        </h4>
      </div>
      <p className="text-xs text-slate-400 line-clamp-2 mb-2">
        {article.excerpt}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-orange-500 font-medium">Read more →</span>
        {article.categoryName && (
          <span className="text-xs text-slate-500">{article.categoryName}</span>
        )}
      </div>
    </button>
  );
}

// Loading skeleton for suggestions
function SuggestionsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-4 border border-slate-600 rounded-lg bg-slate-800 animate-pulse"
        >
          <div className="flex items-start gap-2 mb-2">
            <div className="w-4 h-4 bg-slate-700 rounded" />
            <div className="flex-1 h-4 bg-slate-700 rounded" />
          </div>
          <div className="h-3 bg-slate-700 rounded w-3/4 mb-2" />
          <div className="h-3 bg-slate-700 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

// Article modal component
interface ArticleModalProps {
  articleSlug: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSolved: () => void;
  query: string;
}

function ArticleModal({
  articleSlug,
  isOpen,
  onClose,
  onSolved,
  query,
}: ArticleModalProps) {
  const [article, setArticle] = useState<{
    id: string;
    title: string;
    content: string;
    categoryName: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecordingDeflection, setIsRecordingDeflection] = useState(false);

  useEffect(() => {
    if (!isOpen || !articleSlug) {
      setArticle(null);
      return;
    }

    async function fetchArticle() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/kb/public/articles/${articleSlug}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setArticle(data.article);
        }
      } catch (error) {
        console.error('Failed to fetch article:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchArticle();
  }, [isOpen, articleSlug]);

  const handleSolvedClick = async () => {
    if (!article) return;

    setIsRecordingDeflection(true);
    try {
      await fetch('/api/kb/deflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          articleId: article.id,
          query: query,
        }),
      });
    } catch (error) {
      console.error('Failed to record deflection:', error);
    } finally {
      setIsRecordingDeflection(false);
      onSolved();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold pr-8">
            {isLoading
              ? 'Loading article...'
              : article?.title || 'Article not found'}
          </DialogTitle>
          {article?.categoryName && (
            <span className="text-sm text-orange-500 font-medium">
              {article.categoryName}
            </span>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : article ? (
          <>
            <div
              className="prose prose-slate max-w-none mt-4"
              dangerouslySetInnerHTML={{
                __html: marked(article.content),
              }}
            />

            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={handleSolvedClick}
                disabled={isRecordingDeflection}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition-all shadow-lg"
              >
                {isRecordingDeflection ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                This solved my issue
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Back to ping
              </button>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-slate-500">
            The article could not be loaded. Please try again.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function CreatePingPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showKBSuggestions, setShowKBSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedArticleSlug, setSelectedArticleSlug] = useState<string | null>(
    null
  );
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);

  // Fetch KB suggestions with debouncing
  const {
    suggestions,
    isLoading: isSuggestionsLoading,
    totalCount,
  } = useKBSuggestions(message);

  // Auto-show sidebar when suggestions are available
  useEffect(() => {
    if (suggestions.length > 0 && message.trim().length >= 10) {
      setShowKBSuggestions(true);
    }
  }, [suggestions, message]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Show KB suggestions when user types more than 10 characters
    if (value.trim().length >= 10) {
      setShowKBSuggestions(true);
    } else {
      setShowKBSuggestions(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      toast.error('Please describe your issue');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/pings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || 'Failed to create ping');
        return;
      }

      const data = await response.json();
      const { ping, echoAvailable } = data;

      // Show different toast based on whether Echo AI is handling the ping
      if (echoAvailable) {
        // Echo flow: ping is draft, SLA not yet applied
        toast.success(`Ping #${ping.ping_number} created!`, {
          description: 'Echo is analyzing your issue...',
        });
      } else {
        // Direct creation: SLA is applied, show expected response time
        const expectedTime = getExpectedResponseTime(ping);
        toast.success(`Ping #${ping.ping_number} created!`, {
          description: expectedTime
            ? `We typically respond within ${expectedTime}.`
            : "We'll get back to you as soon as possible.",
        });
      }

      // Clear form and any saved draft
      setMessage('');
      setAttachments([]);
      localStorage.removeItem('ping_draft');

      // Redirect to ping detail page
      router.push(`/pings/${ping.ping_number}`);
    } catch (err) {
      console.error('Error creating ping:', err);
      toast.error('Failed to send ping. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArticleClick = (article: KBSuggestion) => {
    setSelectedArticleSlug(article.slug);
    setIsArticleModalOpen(true);
  };

  const handleArticleSolved = () => {
    setIsArticleModalOpen(false);
    setSelectedArticleSlug(null);
    // Clear draft
    localStorage.removeItem('ping_draft');
    // Show success toast
    toast.success("Great! We're glad the article helped.");
    // Redirect to KB
    router.push('/kb');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex h-screen bg-gradient-to-b from-slate-50 to-blue-50">
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 border-b border-slate-700 shadow-xl px-6 py-5">
          <div className="flex items-center gap-4">
            <Link
              href="/pings"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300 hover:text-white" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Send a Ping</h1>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-8">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg border-2 border-slate-200 shadow-xl overflow-hidden">
              {/* Message input */}
              <div className="p-6 border-b border-slate-200">
                <label
                  htmlFor="message"
                  className="block text-sm font-semibold text-slate-900 mb-3"
                >
                  Describe your issue
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={handleMessageChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e as unknown as React.FormEvent);
                    }
                  }}
                  placeholder="Send a ping... describe your issue"
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-base bg-slate-50"
                  rows={10}
                  autoFocus
                />
                {message.length > 0 && (
                  <p className="text-xs text-slate-500 mt-2">
                    {message.length} characters
                  </p>
                )}
              </div>

              {/* Attachments preview */}
              {attachments.length > 0 && (
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                  <p className="text-sm font-semibold text-slate-900 mb-3">
                    Attachments
                  </p>
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-900 truncate font-medium">
                            {file.name}
                          </span>
                          <span className="text-xs text-slate-500 flex-shrink-0">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="p-1.5 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50">
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors border border-slate-300"
                  >
                    <Paperclip className="w-4 h-4" />
                    Attach files
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href="/pings"
                    className="px-5 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={!message.trim() || isSubmitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 disabled:shadow-none transform hover:scale-105 disabled:transform-none"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Ping
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Helper text */}
            <p className="text-sm text-slate-600 text-center mt-6">
              We typically respond within a few hours during business hours
            </p>
          </form>
        </div>
      </div>

      {/* KB Suggestions Sidebar (Desktop only) */}
      {showKBSuggestions && (
        <div className="hidden lg:block w-96 bg-gradient-to-b from-slate-800 to-slate-900 border-l border-slate-700 flex-shrink-0 overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-5 z-10">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white">Related Articles</h3>
              <button
                type="button"
                onClick={() => setShowKBSuggestions(false)}
                className="p-1.5 hover:bg-slate-700 rounded transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-slate-400">
              These articles might help solve your issue
            </p>
          </div>

          <div className="p-6 space-y-4">
            {isSuggestionsLoading ? (
              <SuggestionsSkeleton />
            ) : suggestions.length > 0 ? (
              <>
                {suggestions.map((article) => (
                  <KBArticleCard
                    key={article.id}
                    article={article}
                    onClick={() => handleArticleClick(article)}
                  />
                ))}

                {totalCount > 3 && (
                  <div className="pt-4">
                    <Link
                      href={`/kb?q=${encodeURIComponent(message.trim())}`}
                      className="text-sm text-orange-500 hover:text-orange-400 font-medium inline-flex items-center gap-2 transition-colors"
                    >
                      View all {totalCount} results →
                    </Link>
                  </div>
                )}
              </>
            ) : message.trim().length >= 10 ? (
              <div className="text-center py-8">
                <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">
                  No related articles found
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">
                  Keep typing to see suggestions...
                </p>
              </div>
            )}

            <div className="pt-6 border-t border-slate-700">
              <Link
                href="/kb"
                className="text-sm text-orange-500 hover:text-orange-400 font-medium inline-flex items-center gap-2 transition-colors"
              >
                Browse all articles →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Article Modal */}
      <ArticleModal
        articleSlug={selectedArticleSlug}
        isOpen={isArticleModalOpen}
        onClose={() => {
          setIsArticleModalOpen(false);
          setSelectedArticleSlug(null);
        }}
        onSolved={handleArticleSolved}
        query={message}
      />
    </div>
  );
}
