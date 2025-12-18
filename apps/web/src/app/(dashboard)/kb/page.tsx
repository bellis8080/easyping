'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, BookOpen, Filter, X, Settings } from 'lucide-react';
import { UserRole, canViewPrivateMessages } from '@easyping/types';

// Mock KB article type
interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  views: number;
  helpful: number;
  notHelpful: number;
  lastUpdated: string;
}

// Mock KB articles
const mockArticles: KBArticle[] = [
  {
    id: '1',
    title: 'How to reset your password',
    content:
      'If you forgot your password, click "Forgot Password" on the login page. Enter your email address and we\'ll send you a password reset link. The link expires in 24 hours for security...',
    category: 'Account',
    views: 1234,
    helpful: 98,
    notHelpful: 5,
    lastUpdated: '2024-01-15',
  },
  {
    id: '2',
    title: 'Troubleshooting login issues',
    content:
      'Common login problems and their solutions: 1. Clear browser cookies and cache. 2. Check your email for verification. 3. Ensure Caps Lock is off. 4. Try resetting your password...',
    category: 'Account',
    views: 856,
    helpful: 72,
    notHelpful: 8,
    lastUpdated: '2024-01-14',
  },
  {
    id: '3',
    title: 'Dashboard access permissions explained',
    content:
      'Learn about different user roles and what dashboards they can access. Admin users have full access, while regular users can only view their own pings. Managers can view team analytics...',
    category: 'Access',
    views: 542,
    helpful: 45,
    notHelpful: 3,
    lastUpdated: '2024-01-13',
  },
  {
    id: '4',
    title: 'How to attach files to a ping',
    content:
      'You can attach files when creating a new ping by clicking the paperclip icon. Supported formats include PDF, images (PNG, JPG), and documents (DOC, DOCX). Maximum file size is 10MB...',
    category: 'Pings',
    views: 423,
    helpful: 38,
    notHelpful: 2,
    lastUpdated: '2024-01-12',
  },
  {
    id: '5',
    title: 'Understanding SLA timers',
    content:
      'SLA (Service Level Agreement) timers show how much time is remaining before a response is due. Green means on track, orange means at risk, and red means the SLA has been breached...',
    category: 'Support',
    views: 678,
    helpful: 56,
    notHelpful: 4,
    lastUpdated: '2024-01-11',
  },
  {
    id: '6',
    title: 'Setting up two-factor authentication',
    content:
      'Enable 2FA for enhanced security. Go to Settings > Security, click "Enable 2FA", and scan the QR code with your authenticator app. You\'ll need to enter a verification code each time you log in...',
    category: 'Security',
    views: 912,
    helpful: 84,
    notHelpful: 6,
    lastUpdated: '2024-01-10',
  },
];

// Categories for filtering
const categories = [
  'All',
  'Account',
  'Access',
  'Pings',
  'Support',
  'Security',
  'Billing',
  'Technical',
];

// KB Article Card component
function ArticleCard({ article }: { article: KBArticle }) {
  const helpfulPercentage = Math.round(
    (article.helpful / (article.helpful + article.notHelpful)) * 100
  );

  return (
    <div className="p-6 border-2 border-slate-600 rounded-lg hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 transition-all cursor-pointer bg-slate-800 group">
      <div className="flex items-start gap-3 mb-3">
        <BookOpen className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
            {article.title}
          </h3>
          <p className="text-sm text-slate-300 line-clamp-3 mb-3">
            {article.content}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-slate-400">
          <span className="px-2 py-1 bg-slate-700 rounded text-slate-300 font-medium">
            {article.category}
          </span>
          <span>{article.views} views</span>
          <span className="text-emerald-400 font-medium">
            {helpfulPercentage}% helpful
          </span>
        </div>
        <span className="text-slate-500">
          Updated {new Date(article.lastUpdated).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [canManageKB, setCanManageKB] = useState(false);

  // Fetch user profile to check role
  useEffect(() => {
    async function checkPermissions() {
      try {
        const res = await fetch('/api/user');
        if (res.ok) {
          const data = await res.json();
          if (data.role) {
            setCanManageKB(canViewPrivateMessages(data.role as UserRole));
          }
        }
      } catch {
        // Silently fail - button won't show
      }
    }
    checkPermissions();
  }, []);

  // Filter articles based on search and category
  const filteredArticles = mockArticles.filter((article) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || article.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex h-screen bg-gradient-to-b from-slate-50 to-blue-50">
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 border-b border-slate-700 shadow-xl px-6 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-orange-500" />
                <h1 className="text-2xl font-bold text-white">
                  Knowledge Base
                </h1>
              </div>
              {canManageKB && (
                <Link
                  href="/kb/manage"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-orange-500/30"
                >
                  <Settings className="w-4 h-4" />
                  Manage
                </Link>
              )}
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles, guides, and FAQs..."
                className="w-full pl-12 pr-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                autoFocus
              />
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filter by category
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {/* Active filters */}
            {selectedCategory !== 'All' && (
              <div className="mb-6 flex items-center gap-2">
                <span className="text-sm text-slate-600">Filtered by:</span>
                <button
                  onClick={() => setSelectedCategory('All')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 border border-orange-300 rounded-lg text-orange-700 text-sm font-medium hover:bg-orange-200 transition-colors"
                >
                  {selectedCategory}
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Results count */}
            <div className="mb-4">
              <p className="text-sm text-slate-600">
                {filteredArticles.length === 0
                  ? 'No articles found'
                  : filteredArticles.length === 1
                    ? '1 article found'
                    : `${filteredArticles.length} articles found`}
              </p>
            </div>

            {/* Articles */}
            {filteredArticles.length > 0 ? (
              <div className="space-y-4">
                {filteredArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              // Empty state
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-700 mb-2">
                  No articles found
                </h3>
                <p className="text-slate-500 mb-6">
                  Try adjusting your search or browse all articles
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transform hover:scale-105"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Sidebar (Desktop) */}
      <aside
        className={`
          ${showFilters ? 'block' : 'hidden lg:block'}
          w-full lg:w-80 bg-gradient-to-b from-slate-800 to-slate-900 border-l border-slate-700 flex-shrink-0 shadow-2xl
          fixed lg:relative inset-0 z-50 lg:z-auto
        `}
      >
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Categories</h3>
          <button
            onClick={() => setShowFilters(false)}
            className="lg:hidden p-1.5 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {categories.map((category) => {
            const isActive = selectedCategory === category;
            const count =
              category === 'All'
                ? mockArticles.length
                : mockArticles.filter((a) => a.category === category).length;

            return (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  setShowFilters(false);
                }}
                className={`
                  w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all text-left
                  ${
                    isActive
                      ? 'bg-orange-500/10 text-orange-500 border-2 border-orange-500 shadow-lg shadow-orange-500/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white border-2 border-transparent'
                  }
                `}
              >
                <span className="font-medium">{category}</span>
                <span
                  className={`
                    text-xs px-2 py-0.5 rounded-full
                    ${
                      isActive
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-700 text-slate-400'
                    }
                  `}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Popular articles */}
        <div className="px-6 py-5 border-t border-slate-700">
          <h4 className="text-sm font-bold text-white mb-3">
            Popular Articles
          </h4>
          <div className="space-y-3">
            {mockArticles
              .sort((a, b) => b.views - a.views)
              .slice(0, 3)
              .map((article) => (
                <div
                  key={article.id}
                  className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <BookOpen className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                    <h5 className="text-xs font-medium text-white line-clamp-2 group-hover:text-orange-400 transition-colors">
                      {article.title}
                    </h5>
                  </div>
                  <p className="text-xs text-slate-400">
                    {article.views} views
                  </p>
                </div>
              ))}
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {showFilters && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}
