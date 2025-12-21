/**
 * Public KB Article Detail API Endpoint
 * Story 4.5: KB Article Detail Page
 *
 * GET /api/kb/public/articles/[slug] - Get single article by slug
 *
 * This is a PUBLIC endpoint (accessible to all authenticated users).
 * No role check required for basic article access.
 * Agent content is conditionally included based on user role.
 * Tenant isolation enforced at API layer (RLS disabled for Realtime compatibility).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canViewPrivateMessages, UserRole } from '@easyping/types';

interface ArticleDetailResponse {
  success: boolean;
  article?: {
    id: string;
    title: string;
    slug: string;
    content: string;
    agentContent?: string | null;
    categoryId: string | null;
    categoryName: string | null;
    authorId: string;
    authorName: string | null;
    viewCount: number;
    helpfulCount: number;
    notHelpfulCount: number;
    publishedAt: string | null;
    updatedAt: string;
  };
  error?: string;
}

/**
 * GET /api/kb/public/articles/[slug]
 * Get single KB article by slug
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ArticleDetailResponse>> {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Authenticate user (any role can access)
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

    // Get user profile to get tenant_id and role
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Fetch article by slug with author info
    const { data: article, error: articleError } = await supabaseAdmin
      .from('kb_articles')
      .select(
        `
        id,
        title,
        slug,
        content,
        agent_content,
        category_id,
        created_by,
        view_count,
        helpful_count,
        not_helpful_count,
        published_at,
        updated_at,
        status,
        deleted_at,
        categories(name),
        users!kb_articles_created_by_fkey(full_name)
      `
      )
      .eq('tenant_id', userProfile.tenant_id)
      .eq('slug', slug)
      .single();

    if (articleError || !article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    // Only return published articles (not deleted)
    if (article.status !== 'published' || article.deleted_at !== null) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    // Build response, conditionally including agent content
    const canViewAgentContent = canViewPrivateMessages(
      userProfile.role as UserRole
    );

    const response: ArticleDetailResponse = {
      success: true,
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        content: article.content,
        categoryId: article.category_id,
        categoryName:
          (article.categories as unknown as { name: string } | null)?.name ||
          null,
        authorId: article.created_by,
        authorName:
          (article.users as unknown as { full_name: string } | null)
            ?.full_name || null,
        viewCount: article.view_count || 0,
        helpfulCount: article.helpful_count || 0,
        notHelpfulCount: article.not_helpful_count || 0,
        publishedAt: article.published_at,
        updatedAt: article.updated_at,
      },
    };

    // Only include agent content for privileged users
    if (canViewAgentContent && article.agent_content) {
      response.article!.agentContent = article.agent_content;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
