'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { KBArticleList } from '@/components/kb/kb-article-list';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { canViewPrivateMessages } from '@easyping/types';

export default function KBManagePage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { role } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<
    'draft' | 'published' | 'archived'
  >('draft');
  const [counts, setCounts] = useState({ draft: 0, published: 0, archived: 0 });

  const hasAccess = role ? canViewPrivateMessages(role) : false;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Redirect end users to KB browse page
  useEffect(() => {
    if (
      !authLoading &&
      isAuthenticated &&
      role &&
      !canViewPrivateMessages(role)
    ) {
      router.replace('/kb');
    }
  }, [role, authLoading, isAuthenticated, router]);

  // Fetch article counts
  useEffect(() => {
    async function fetchCounts() {
      try {
        const [draftRes, publishedRes, archivedRes] = await Promise.all([
          fetch('/api/kb/articles?status=draft&limit=1'),
          fetch('/api/kb/articles?status=published&limit=1'),
          fetch('/api/kb/articles?status=archived&limit=1'),
        ]);

        const [draftData, publishedData, archivedData] = await Promise.all([
          draftRes.json(),
          publishedRes.json(),
          archivedRes.json(),
        ]);

        setCounts({
          draft: draftData.pagination?.total || 0,
          published: publishedData.pagination?.total || 0,
          archived: archivedData.pagination?.total || 0,
        });
      } catch {
        // Silently fail - counts will show as 0
      }
    }

    if (hasAccess) {
      fetchCounts();
    }
  }, [hasAccess]);

  // Memoized callbacks to prevent infinite loops in KBArticleList
  const handleDraftCountChange = useCallback((count: number) => {
    setCounts((prev) => ({ ...prev, draft: count }));
  }, []);

  const handlePublishedCountChange = useCallback((count: number) => {
    setCounts((prev) => ({ ...prev, published: count }));
  }, []);

  const handleArchivedCountChange = useCallback((count: number) => {
    setCounts((prev) => ({ ...prev, archived: count }));
  }, []);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-blue-50">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  // Don't render if user doesn't have access (will redirect)
  if (!hasAccess) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-slate-50 to-blue-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 border-b border-slate-700 shadow-xl px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-orange-500" />
              <h1 className="text-2xl font-bold text-white">KB Management</h1>
            </div>
            <Link href="/kb/manage/new">
              <Button className="bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/30">
                <Plus className="w-4 h-4 mr-2" />
                New Article
              </Button>
            </Link>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles by title..."
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Content with Tabs */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-4xl mx-auto px-6 py-6">
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as 'draft' | 'published' | 'archived')
            }
            className="h-full flex flex-col"
          >
            <TabsList className="w-fit bg-slate-200">
              <TabsTrigger value="draft" className="gap-2">
                Drafts
                {counts.draft > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 bg-orange-500 text-white"
                  >
                    {counts.draft}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="published" className="gap-2">
                Published
                {counts.published > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 bg-green-500 text-white"
                  >
                    {counts.published}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="archived" className="gap-2">
                Archived
                {counts.archived > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 bg-slate-500 text-white"
                  >
                    {counts.archived}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="draft" className="flex-1 overflow-auto mt-4">
              <KBArticleList
                status="draft"
                searchQuery={debouncedSearch}
                onCountChange={handleDraftCountChange}
              />
            </TabsContent>

            <TabsContent
              value="published"
              className="flex-1 overflow-auto mt-4"
            >
              <KBArticleList
                status="published"
                searchQuery={debouncedSearch}
                onCountChange={handlePublishedCountChange}
              />
            </TabsContent>

            <TabsContent value="archived" className="flex-1 overflow-auto mt-4">
              <KBArticleList
                status="archived"
                searchQuery={debouncedSearch}
                onCountChange={handleArchivedCountChange}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
