'use client';

/**
 * KB Article Detail Page
 * Story 4.5: KB Article Detail Page
 *
 * Displays full KB article content with:
 * - Breadcrumb navigation
 * - Markdown rendering
 * - Agent-only content section (for agents/managers/owners)
 * - Feedback widget
 * - Related articles
 * - "Still need help?" CTA
 */

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ChevronRight,
  Lock,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Calendar,
  User,
  Loader2,
  MessageSquarePlus,
  ArrowLeft,
} from 'lucide-react';
import { marked } from 'marked';

// Types for article data
interface ArticleData {
  id: string;
  title: string;
  slug: string;
  content: string;
  agentContent?: string;
  categoryId: string | null;
  categoryName: string | null;
  authorName: string | null;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  publishedAt: string;
  updatedAt: string;
}

interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  categoryName: string | null;
  viewCount: number;
}

interface FeedbackState {
  hasFeedback: boolean;
  isHelpful: boolean | null;
}

// Loading skeleton for article
function ArticleSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-64 bg-slate-200 rounded mb-8" />

      {/* Title skeleton */}
      <div className="h-10 w-3/4 bg-slate-200 rounded mb-4" />

      {/* Meta skeleton */}
      <div className="flex gap-4 mb-8">
        <div className="h-6 w-20 bg-slate-200 rounded" />
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="h-6 w-24 bg-slate-200 rounded" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="h-4 w-full bg-slate-200 rounded" />
        <div className="h-4 w-full bg-slate-200 rounded" />
        <div className="h-4 w-3/4 bg-slate-200 rounded" />
        <div className="h-4 w-full bg-slate-200 rounded" />
        <div className="h-4 w-2/3 bg-slate-200 rounded" />
      </div>
    </div>
  );
}

// Related articles skeleton
function RelatedSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="p-4 border border-slate-200 rounded-lg animate-pulse"
        >
          <div className="h-5 w-3/4 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-1/2 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  // Article state
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Related articles state
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(true);

  // Feedback state
  const [feedback, setFeedback] = useState<FeedbackState>({
    hasFeedback: false,
    isHelpful: null,
  });
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Fetch article data
  useEffect(() => {
    async function fetchArticle() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/kb/public/articles/${slug}`, {
          credentials: 'include',
        });

        if (!res.ok) {
          if (res.status === 404) {
            setError('Article not found');
          } else {
            setError('Failed to load article');
          }
          return;
        }

        const data = await res.json();
        if (data.success) {
          setArticle(data.article);

          // Track view (fire-and-forget)
          fetch(`/api/kb/public/articles/${slug}/view`, {
            method: 'POST',
            credentials: 'include',
          }).catch(() => {
            // Ignore errors - fire and forget
          });
        } else {
          setError(data.error || 'Failed to load article');
        }
      } catch (err) {
        console.error('Error fetching article:', err);
        setError('Failed to load article');
      } finally {
        setIsLoading(false);
      }
    }

    fetchArticle();
  }, [slug]);

  // Fetch related articles
  useEffect(() => {
    async function fetchRelated() {
      setIsLoadingRelated(true);

      try {
        const res = await fetch(`/api/kb/public/articles/${slug}/related`, {
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setRelatedArticles(data.articles);
          }
        }
      } catch (err) {
        console.error('Error fetching related articles:', err);
      } finally {
        setIsLoadingRelated(false);
      }
    }

    fetchRelated();
  }, [slug]);

  // Fetch existing feedback
  useEffect(() => {
    async function fetchFeedback() {
      try {
        const res = await fetch(`/api/kb/public/articles/${slug}/feedback`, {
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setFeedback({
              hasFeedback: data.hasFeedback,
              isHelpful: data.isHelpful,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching feedback:', err);
      }
    }

    fetchFeedback();
  }, [slug]);

  // Submit feedback
  const handleFeedback = async (helpful: boolean) => {
    if (isSubmittingFeedback) return;

    setIsSubmittingFeedback(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch(`/api/kb/public/articles/${slug}/feedback`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFeedback({
            hasFeedback: true,
            isHelpful: helpful,
          });
          setFeedbackMessage('Thank you for your feedback!');
        }
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setFeedbackMessage('Failed to submit feedback');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto bg-gradient-to-b from-slate-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <ArticleSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !article) {
    return (
      <div className="h-full overflow-y-auto bg-gradient-to-b from-slate-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-700 mb-2">
              {error || 'Article not found'}
            </h1>
            <p className="text-slate-500 mb-6">
              The article you&apos;re looking for doesn&apos;t exist or has been
              removed.
            </p>
            <Link
              href="/kb"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Knowledge Base
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate helpful percentage
  const totalFeedbackCount = article.helpfulCount + article.notHelpfulCount;
  const helpfulPercentage =
    totalFeedbackCount > 0
      ? Math.round((article.helpfulCount / totalFeedbackCount) * 100)
      : null;

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-6 py-8 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link
            href="/kb"
            className="hover:text-orange-500 transition-colors flex items-center gap-1"
          >
            <BookOpen className="w-4 h-4" />
            Knowledge Base
          </Link>
          {article.categoryName && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span className="text-slate-400">{article.categoryName}</span>
            </>
          )}
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-700 font-medium truncate max-w-xs">
            {article.title}
          </span>
        </nav>

        {/* Article Header */}
        <article>
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              {article.title}
            </h1>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              {article.categoryName && (
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                  {article.categoryName}
                </span>
              )}

              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(article.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>

              {article.authorName && (
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {article.authorName}
                </span>
              )}

              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                Viewed {article.viewCount.toLocaleString()} times
              </span>

              {helpfulPercentage !== null && (
                <span className="text-emerald-600 font-medium">
                  {helpfulPercentage}% found this helpful
                </span>
              )}
            </div>
          </header>

          {/* Main content */}
          <div
            className="prose prose-slate prose-lg max-w-none mb-8"
            dangerouslySetInnerHTML={{
              __html: marked.parse(article.content, { async: false }) as string,
            }}
          />

          {/* Agent-only content section */}
          {article.agentContent && (
            <div className="border-t pt-6 mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-orange-500" />
                <h4 className="text-sm font-semibold text-slate-700">
                  Agent Notes (Internal Only)
                </h4>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div
                  className="prose prose-slate prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: marked.parse(article.agentContent, {
                      async: false,
                    }) as string,
                  }}
                />
              </div>
            </div>
          )}
        </article>

        {/* Feedback Widget */}
        <div className="border-t border-b py-8 mb-8">
          <div className="text-center">
            {feedbackMessage ? (
              <p className="text-emerald-600 font-medium">{feedbackMessage}</p>
            ) : (
              <>
                <p className="text-lg text-slate-700 mb-4">
                  Was this article helpful?
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => handleFeedback(true)}
                    disabled={isSubmittingFeedback}
                    className={`
                      flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                      ${
                        feedback.isHelpful === true
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                          : 'bg-slate-100 text-slate-700 hover:bg-emerald-100 hover:text-emerald-700'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    {isSubmittingFeedback ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ThumbsUp className="w-5 h-5" />
                    )}
                    Yes
                  </button>

                  <button
                    onClick={() => handleFeedback(false)}
                    disabled={isSubmittingFeedback}
                    className={`
                      flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                      ${
                        feedback.isHelpful === false
                          ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                          : 'bg-slate-100 text-slate-700 hover:bg-red-100 hover:text-red-700'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    {isSubmittingFeedback ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ThumbsDown className="w-5 h-5" />
                    )}
                    No
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Still need help? CTA */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-8 mb-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">
            Still need help?
          </h3>
          <p className="text-slate-300 mb-4">
            If this article didn&apos;t answer your question, our support team
            is here to help.
          </p>
          <Link
            href="/pings/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transform hover:scale-105"
          >
            <MessageSquarePlus className="w-5 h-5" />
            Create a Ping
          </Link>
        </div>

        {/* Related Articles */}
        <section>
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            Related Articles
          </h3>

          {isLoadingRelated ? (
            <RelatedSkeleton />
          ) : relatedArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/kb/article/${related.slug}`}
                  className="block p-4 border border-slate-200 rounded-lg hover:border-orange-300 hover:shadow-md transition-all group bg-white"
                >
                  <h4 className="font-medium text-slate-800 group-hover:text-orange-600 transition-colors line-clamp-2 mb-2">
                    {related.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {related.categoryName && (
                      <span className="px-2 py-0.5 bg-slate-100 rounded">
                        {related.categoryName}
                      </span>
                    )}
                    <span>{related.viewCount.toLocaleString()} views</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">
              No related articles found.
            </p>
          )}
        </section>

        {/* Back to KB link */}
        <div className="mt-12 text-center">
          <Link
            href="/kb"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Knowledge Base
          </Link>
        </div>
      </div>
    </div>
  );
}
