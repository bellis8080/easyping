'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronRight,
  Save,
  Trash2,
  Send,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Eye,
  Lock,
  RotateCcw,
  Radio,
} from 'lucide-react';
import { marked } from 'marked';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KBEditor } from '@/components/kb/kb-editor';
import { KBMetadataForm } from '@/components/kb/kb-metadata-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from '@/hooks/use-toast';
import { canViewPrivateMessages } from '@easyping/types';

interface KBArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  agentContent: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  status: string;
  sourcePingId: string | null;
  sourcePingNumber: number | null;
  enhancesArticleId: string | null;
  createdBy: string;
  createdByName: string | null;
  publishedBy: string | null;
  publishedByName: string | null;
  publishedAt: string | null;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface FormState {
  title: string;
  slug: string;
  content: string;
  agentContent: string;
  categoryId: string;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function KBArticleEditorPage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params.articleId as string;
  const isNewArticle = articleId === 'new';

  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { role } = usePermissions();
  const hasAccess = role ? canViewPrivateMessages(role) : false;

  // Article state
  const [article, setArticle] = useState<KBArticle | null>(null);
  const [loading, setLoading] = useState(!isNewArticle);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formState, setFormState] = useState<FormState>({
    title: '',
    slug: '',
    content: '',
    agentContent: '',
    categoryId: '',
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Dirty state tracking
  const savedStateRef = useRef<FormState | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] =
    useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] =
    useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null
  );

  // Redirect end users
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

  // Fetch article data
  useEffect(() => {
    if (isNewArticle || !hasAccess) {
      setLoading(false);
      return;
    }

    async function fetchArticle() {
      try {
        const response = await fetch(`/api/kb/articles/${articleId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Article not found');
          } else {
            setError('Failed to load article');
          }
          return;
        }

        const data = await response.json();
        setArticle(data.article);

        // Initialize form state
        const initialState: FormState = {
          title: data.article.title,
          slug: data.article.slug,
          content: data.article.content || '',
          agentContent: data.article.agentContent || '',
          categoryId: data.article.categoryId || '',
        };
        setFormState(initialState);
        savedStateRef.current = initialState;
      } catch (err) {
        console.error('Error fetching article:', err);
        setError('Failed to load article');
      } finally {
        setLoading(false);
      }
    }

    fetchArticle();
  }, [articleId, isNewArticle, hasAccess]);

  // Check dirty state
  useEffect(() => {
    if (isNewArticle) {
      // For new articles, dirty if any content
      setIsDirty(
        formState.title.trim() !== '' ||
          formState.content.trim() !== '' ||
          formState.agentContent.trim() !== ''
      );
    } else if (savedStateRef.current) {
      // For existing articles, compare with saved state
      setIsDirty(
        formState.title !== savedStateRef.current.title ||
          formState.slug !== savedStateRef.current.slug ||
          formState.content !== savedStateRef.current.content ||
          formState.agentContent !== savedStateRef.current.agentContent ||
          formState.categoryId !== savedStateRef.current.categoryId
      );
    }
  }, [formState, isNewArticle]);

  // Browser beforeunload warning
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Form handlers
  const handleTitleChange = useCallback(
    (value: string) => {
      setFormState((prev) => ({
        ...prev,
        title: value,
        slug: slugManuallyEdited ? prev.slug : generateSlug(value),
      }));
    },
    [slugManuallyEdited]
  );

  const handleSlugChange = useCallback((value: string) => {
    setSlugManuallyEdited(true);
    setFormState((prev) => ({
      ...prev,
      slug: value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
    }));
  }, []);

  const handleContentChange = useCallback((value: string) => {
    setFormState((prev) => ({ ...prev, content: value }));
  }, []);

  const handleAgentContentChange = useCallback((value: string) => {
    setFormState((prev) => ({ ...prev, agentContent: value }));
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    setFormState((prev) => ({ ...prev, categoryId: value }));
  }, []);

  // Navigation with unsaved changes check
  const handleNavigation = useCallback(
    (href: string) => {
      if (isDirty) {
        setPendingNavigation(href);
        setShowUnsavedChangesDialog(true);
      } else {
        router.push(href);
      }
    },
    [isDirty, router]
  );

  const confirmNavigation = useCallback(() => {
    if (pendingNavigation) {
      router.push(pendingNavigation);
    }
    setShowUnsavedChangesDialog(false);
    setPendingNavigation(null);
  }, [pendingNavigation, router]);

  // Save draft
  const handleSaveDraft = useCallback(async () => {
    if (!formState.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      if (isNewArticle) {
        // Create new article
        const response = await fetch('/api/kb/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formState.title,
            slug: formState.slug || generateSlug(formState.title),
            content: formState.content,
            agentContent: formState.agentContent || null,
            categoryId: formState.categoryId || null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create article');
        }

        const data = await response.json();
        toast({ title: 'Article created' });
        // Redirect to edit page for the new article
        router.replace(`/kb/manage/${data.article.id}`);
      } else {
        // Update existing article
        const response = await fetch(`/api/kb/articles/${articleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formState.title,
            slug: formState.slug,
            content: formState.content,
            agentContent: formState.agentContent || null,
            categoryId: formState.categoryId || null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          if (data.code === 'SLUG_EXISTS') {
            throw new Error('This slug is already in use');
          }
          throw new Error(data.error || 'Failed to save');
        }

        toast({ title: 'Changes saved' });
        savedStateRef.current = { ...formState };
        setIsDirty(false);
      }
    } catch (err) {
      console.error('Save error:', err);
      toast({
        title: err instanceof Error ? err.message : 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [formState, isNewArticle, articleId, router]);

  // Publish
  const handlePublish = useCallback(async () => {
    if (!formState.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    if (!formState.content.trim()) {
      toast({ title: 'Content is required', variant: 'destructive' });
      return;
    }

    setIsPublishing(true);
    try {
      if (isNewArticle) {
        // Create and publish in one step
        const response = await fetch('/api/kb/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formState.title,
            slug: formState.slug || generateSlug(formState.title),
            content: formState.content,
            agentContent: formState.agentContent || null,
            categoryId: formState.categoryId || null,
            status: 'published',
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to publish');
        }

        toast({ title: 'Article published successfully' });
        router.push('/kb/manage');
      } else {
        // Update with published status
        const response = await fetch(`/api/kb/articles/${articleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formState.title,
            slug: formState.slug,
            content: formState.content,
            agentContent: formState.agentContent || null,
            categoryId: formState.categoryId || null,
            status: 'published',
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to publish');
        }

        toast({ title: 'Article published successfully' });
        router.push('/kb/manage?tab=published');
      }
    } catch (err) {
      console.error('Publish error:', err);
      toast({
        title: err instanceof Error ? err.message : 'Failed to publish',
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
    }
  }, [formState, isNewArticle, articleId, router]);

  // Publish & Replace (for enhancement drafts)
  const handleApproveEnhancement = useCallback(async () => {
    if (!formState.title.trim() || !formState.content.trim()) {
      toast({
        title: 'Title and content are required',
        variant: 'destructive',
      });
      return;
    }

    setIsPublishing(true);
    try {
      // First save any changes
      await fetch(`/api/kb/articles/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formState.title,
          slug: formState.slug,
          content: formState.content,
          agentContent: formState.agentContent || null,
          categoryId: formState.categoryId || null,
        }),
      });

      // Then approve the enhancement
      const response = await fetch(
        `/api/kb/articles/${articleId}/approve-enhancement`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve enhancement');
      }

      toast({ title: 'Article published and original replaced' });
      router.push('/kb/manage?tab=published');
    } catch (err) {
      console.error('Approve enhancement error:', err);
      toast({
        title:
          err instanceof Error ? err.message : 'Failed to approve enhancement',
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
    }
  }, [formState, articleId, router]);

  // Delete (soft delete - move to archived)
  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/kb/articles/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deletedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      toast({ title: 'Article deleted' });
      router.push('/kb/manage');
    } catch (err) {
      console.error('Delete error:', err);
      toast({ title: 'Failed to delete article', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [articleId, router]);

  // Restore archived article as draft
  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    try {
      const response = await fetch(`/api/kb/articles/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'draft',
          deletedAt: null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to restore');
      }

      toast({ title: 'Article restored as draft' });
      router.push('/kb/manage?tab=draft');
    } catch (err) {
      console.error('Restore error:', err);
      toast({ title: 'Failed to restore article', variant: 'destructive' });
    } finally {
      setIsRestoring(false);
    }
  }, [articleId, router]);

  // Permanent delete
  const handlePermanentDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/kb/articles/${articleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to permanently delete');
      }

      toast({ title: 'Article permanently deleted' });
      router.push('/kb/manage?tab=archived');
    } catch (err) {
      console.error('Permanent delete error:', err);
      toast({ title: 'Failed to delete article', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setShowPermanentDeleteDialog(false);
    }
  }, [articleId, router]);

  // Loading state - show until we have article data for existing articles
  const isLoadingArticle =
    authLoading || loading || (!isNewArticle && !article);

  if (isLoadingArticle) {
    return (
      <div className="h-full overflow-auto bg-slate-50">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          {/* Animated ping loading indicator */}
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg ring-2 ring-orange-500/50">
              <Radio className="w-8 h-8 text-white" />
            </div>
            {/* Ping animation rings */}
            <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
          </div>
          <p className="text-slate-600 font-medium">Loading article...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!hasAccess) {
    return null;
  }

  // Error state
  if (error) {
    return (
      <div className="h-full overflow-auto bg-slate-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg border p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {error}
            </h2>
            <p className="text-slate-600 mb-6">
              The article you&apos;re looking for could not be found.
            </p>
            <Button onClick={() => router.push('/kb/manage')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to KB Management
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isEnhancementDraft =
    article?.enhancesArticleId !== null &&
    article?.enhancesArticleId !== undefined;
  const isArchived =
    article?.deletedAt !== null && article?.deletedAt !== undefined;

  return (
    <div className="h-full overflow-auto bg-slate-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-600">
          <button
            onClick={() => handleNavigation('/kb/manage')}
            className="hover:text-blue-600 transition-colors"
          >
            KB Management
          </button>
          <ChevronRight className="w-4 h-4" />
          {article?.categoryName ? (
            <>
              <span>{article.categoryName}</span>
              <ChevronRight className="w-4 h-4" />
            </>
          ) : null}
          <span className="text-slate-900 font-medium">
            {isNewArticle ? 'New Article' : formState.title || 'Untitled'}
          </span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigation('/kb/manage')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {!isNewArticle && article && (
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    article.status === 'published' ? 'success' : 'secondary'
                  }
                >
                  {article.status}
                </Badge>
                {isEnhancementDraft && (
                  <Badge variant="warning">Enhancement Draft</Badge>
                )}
                {article.sourcePingNumber && (
                  <Link
                    href={`/pings/${article.sourcePingNumber}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    from Ping #{article.sourcePingNumber}
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isArchived ? (
              <>
                {/* Archived article actions */}
                <Button
                  variant="outline"
                  onClick={() => setShowPermanentDeleteDialog(true)}
                  disabled={isDeleting}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete Permanently
                </Button>
                <Button
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isRestoring ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  )}
                  Restore as Draft
                </Button>
              </>
            ) : (
              <>
                {/* Non-archived article actions */}
                {!isNewArticle && (
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isDeleting}
                    className="text-slate-600 border-slate-300 hover:bg-slate-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Archive
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isSaving || isPublishing}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save
                </Button>

                {isEnhancementDraft ? (
                  <Button
                    onClick={handleApproveEnhancement}
                    disabled={isPublishing || isSaving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isPublishing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Publish & Replace Original
                  </Button>
                ) : (
                  <Button
                    onClick={handlePublish}
                    disabled={isPublishing || isSaving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isPublishing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Publish
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Dirty indicator */}
        {isDirty && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            Unsaved changes
          </div>
        )}

        {/* Metadata form */}
        <KBMetadataForm
          title={formState.title}
          slug={formState.slug}
          categoryId={formState.categoryId}
          onTitleChange={handleTitleChange}
          onSlugChange={handleSlugChange}
          onCategoryChange={handleCategoryChange}
          slugManuallyEdited={slugManuallyEdited}
          onSlugManuallyEdited={setSlugManuallyEdited}
        />

        {/* Content editor */}
        <div className="bg-white rounded-lg border">
          <Tabs defaultValue="public" className="w-full">
            <div className="border-b px-4">
              <TabsList className="bg-transparent">
                <TabsTrigger value="public">Public Content</TabsTrigger>
                <TabsTrigger value="agent">Agent Notes</TabsTrigger>
                <TabsTrigger value="preview" className="gap-1.5">
                  <Eye className="w-4 h-4" />
                  Preview
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="public" className="p-4">
              <div className="space-y-2">
                <Label>Public Content (visible to all users) *</Label>
                <KBEditor
                  content={formState.content}
                  onChange={handleContentChange}
                  placeholder="Write your article content here..."
                />
              </div>
            </TabsContent>

            <TabsContent value="agent" className="p-4">
              <div className="space-y-2">
                <Label>Agent Notes (internal only)</Label>
                <KBEditor
                  content={formState.agentContent}
                  onChange={handleAgentContentChange}
                  placeholder="Internal notes for agents only..."
                />
                <p className="text-xs text-slate-500">
                  These notes are only visible to agents, managers, and owners.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="p-6">
              <div className="space-y-6">
                {/* Public Content Preview */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">
                    {formState.title || 'Untitled Article'}
                  </h3>
                  {formState.content ? (
                    <div
                      className="prose prose-slate max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: marked.parse(formState.content, {
                          async: false,
                        }) as string,
                      }}
                    />
                  ) : (
                    <p className="text-slate-400 italic">
                      No public content yet.
                    </p>
                  )}
                </div>

                {/* Agent Notes Preview (if any) */}
                {formState.agentContent && (
                  <div className="border-t pt-6">
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
                          __html: marked.parse(formState.agentContent, {
                            async: false,
                          }) as string,
                        }}
                      />
                    </div>
                  </div>
                )}

                {!formState.content && !formState.agentContent && (
                  <div className="text-center py-8 text-slate-400">
                    <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Add content to see a preview</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Article stats (for existing articles) */}
        {!isNewArticle && article && (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-sm font-medium text-slate-900 mb-4">
              Article Statistics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Views:</span>{' '}
                <span className="font-medium">{article.viewCount}</span>
              </div>
              <div>
                <span className="text-slate-500">Helpful:</span>{' '}
                <span className="font-medium text-green-600">
                  {article.helpfulCount}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Not Helpful:</span>{' '}
                <span className="font-medium text-red-600">
                  {article.notHelpfulCount}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Created:</span>{' '}
                <span className="font-medium">
                  {new Date(article.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            {article.publishedAt && article.publishedByName && (
              <p className="text-sm text-slate-500 mt-2">
                Published on{' '}
                {new Date(article.publishedAt).toLocaleDateString()} by{' '}
                {article.publishedByName}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Archive confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Article</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive this article? It will be moved to
              the archived section and can be restored later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent delete confirmation dialog */}
      <Dialog
        open={showPermanentDeleteDialog}
        onOpenChange={setShowPermanentDeleteDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently Delete Article</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this article? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPermanentDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes dialog */}
      <Dialog
        open={showUnsavedChangesDialog}
        onOpenChange={setShowUnsavedChangesDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your
              changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUnsavedChangesDialog(false);
                setPendingNavigation(null);
              }}
            >
              Stay
            </Button>
            <Button variant="destructive" onClick={confirmNavigation}>
              Leave without saving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
