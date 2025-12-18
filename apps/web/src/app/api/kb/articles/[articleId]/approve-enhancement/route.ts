/**
 * Approve KB Article Enhancement API Endpoint
 * Story 4.2.3: KB Article Comparison & Enhancement
 *
 * POST /api/kb/articles/[articleId]/approve-enhancement
 * Approves an enhancement draft, replacing the original article.
 *
 * This endpoint:
 * 1. Copies metrics (view_count, helpful_count) from original to draft
 * 2. Archives the original article
 * 3. Publishes the enhancement draft with the original's slug
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserRole, canViewPrivateMessages } from '@easyping/types';

/**
 * Response type for approve-enhancement endpoint
 */
interface ApproveEnhancementResponse {
  /** The published article (formerly the enhancement draft) */
  article?: {
    id: string;
    title: string;
    slug: string;
    status: string;
  };
  /** The archived original article */
  archivedArticle?: {
    id: string;
    title: string;
    slug: string;
  };
  success: boolean;
  error?: string;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
): Promise<NextResponse<ApproveEnhancementResponse>> {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only agents/managers/owners can approve KB enhancements
    if (!canViewPrivateMessages(userProfile.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { articleId } = await params;
    const supabaseAdmin = createAdminClient();

    // Fetch the enhancement draft
    const { data: draft, error: draftError } = await supabaseAdmin
      .from('kb_articles')
      .select(
        'id, title, slug, content, agent_content, category_id, status, enhances_article_id'
      )
      .eq('id', articleId)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    // Verify this is an enhancement draft
    if (!draft.enhances_article_id) {
      return NextResponse.json(
        { success: false, error: 'This is not an enhancement draft' },
        { status: 400 }
      );
    }

    // Verify it's still a draft
    if (draft.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: 'Only draft articles can be approved' },
        { status: 400 }
      );
    }

    // Fetch the original article to get metrics and slug
    const { data: original, error: originalError } = await supabaseAdmin
      .from('kb_articles')
      .select(
        'id, title, slug, view_count, helpful_count, not_helpful_count, status'
      )
      .eq('id', draft.enhances_article_id)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (originalError || !original) {
      return NextResponse.json(
        { success: false, error: 'Original article not found' },
        { status: 404 }
      );
    }

    // Verify original is published
    if (original.status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'Original article is not published' },
        { status: 400 }
      );
    }

    // Generate archived slug (avoid conflict with new article taking original slug)
    const archivedSlug = `${original.slug}-archived-${Date.now()}`;

    // Step 1: Archive the original article (change slug first to free it up)
    const { error: archiveError } = await supabaseAdmin
      .from('kb_articles')
      .update({
        status: 'archived',
        slug: archivedSlug,
      })
      .eq('id', original.id);

    if (archiveError) {
      console.error('Error archiving original article:', archiveError);
      return NextResponse.json(
        { success: false, error: 'Failed to archive original article' },
        { status: 500 }
      );
    }

    // Step 2: Publish the enhancement draft with original's metrics and slug
    const { data: publishedArticle, error: publishError } = await supabaseAdmin
      .from('kb_articles')
      .update({
        status: 'published',
        slug: original.slug, // Take over the original slug
        view_count: original.view_count,
        helpful_count: original.helpful_count,
        not_helpful_count: original.not_helpful_count,
        enhances_article_id: null, // Clear the link - this is now the canonical article
        published_at: new Date().toISOString(),
        published_by: user.id,
      })
      .eq('id', draft.id)
      .select('id, title, slug, status')
      .single();

    if (publishError || !publishedArticle) {
      console.error('Error publishing enhancement:', publishError);
      // Attempt to rollback the archive
      await supabaseAdmin
        .from('kb_articles')
        .update({ status: 'published', slug: original.slug })
        .eq('id', original.id);
      return NextResponse.json(
        { success: false, error: 'Failed to publish enhancement' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      article: {
        id: publishedArticle.id,
        title: publishedArticle.title,
        slug: publishedArticle.slug,
        status: publishedArticle.status,
      },
      archivedArticle: {
        id: original.id,
        title: original.title,
        slug: archivedSlug,
      },
      success: true,
    });
  } catch (error) {
    console.error('Error in approve-enhancement endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
