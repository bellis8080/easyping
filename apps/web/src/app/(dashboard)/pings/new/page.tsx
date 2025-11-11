'use client';

import { useState } from 'react';
import { ArrowLeft, Paperclip, Send, BookOpen, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Mock KB article type
interface KBArticle {
  id: string;
  title: string;
  snippet: string;
  category: string;
}

// Mock KB suggestions
const mockKBSuggestions: KBArticle[] = [
  {
    id: '1',
    title: 'How to reset your password',
    snippet:
      'If you forgot your password, click "Forgot Password" on the login page...',
    category: 'Account',
  },
  {
    id: '2',
    title: 'Troubleshooting login issues',
    snippet:
      'Common login problems and their solutions: clear cookies, check email...',
    category: 'Account',
  },
  {
    id: '3',
    title: 'Dashboard access permissions',
    snippet:
      'Learn about different user roles and what dashboards they can access...',
    category: 'Access',
  },
];

// KB Article Card component
function KBArticleCard({ article }: { article: KBArticle }) {
  return (
    <div className="p-4 border border-slate-600 rounded-lg hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 transition-all cursor-pointer bg-slate-800">
      <div className="flex items-start gap-2 mb-2">
        <BookOpen className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
        <h4 className="text-sm font-medium text-white line-clamp-2">
          {article.title}
        </h4>
      </div>
      <p className="text-xs text-slate-400 line-clamp-2 mb-2">
        {article.snippet}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-orange-500 font-medium">Read more →</span>
        <span className="text-xs text-slate-500">{article.category}</span>
      </div>
    </div>
  );
}

export default function CreatePingPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showKBSuggestions, setShowKBSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Show KB suggestions when user types more than 3 characters
    if (value.trim().length > 3) {
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

      const { ping } = await response.json();
      toast.success(`Ping #${ping.ping_number} created!`);

      // Clear form
      setMessage('');
      setAttachments([]);

      // Redirect to ping detail page
      router.push(`/pings/${ping.ping_number}`);
    } catch (err) {
      console.error('Error creating ping:', err);
      toast.error('Failed to send ping. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
            {mockKBSuggestions.map((article) => (
              <KBArticleCard key={article.id} article={article} />
            ))}

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
    </div>
  );
}
