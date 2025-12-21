import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canViewPrivateMessages } from '@easyping/types';
import { triggerEmbeddingGeneration } from '@/lib/services/embedding-service';

interface RouteParams {
  params: Promise<{ articleId: string }>;
}

/**
 * GET /api/kb/articles/[articleId]
 * Fetch a single KB article by ID
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { articleId } = await params;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with role and tenant
    const adminClient = createAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('id, tenant_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check authorization - only agents/managers/owners can view for editing
    if (!canViewPrivateMessages(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch the article with related data
    const { data: article, error: articleError } = await adminClient
      .from('kb_articles')
      .select(
        `
        id,
        title,
        slug,
        content,
        agent_content,
        category_id,
        status,
        source_ping_id,
        enhances_article_id,
        created_by,
        published_by,
        published_at,
        view_count,
        helpful_count,
        not_helpful_count,
        created_at,
        updated_at,
        deleted_at,
        categories (
          id,
          name
        ),
        pings:source_ping_id (
          id,
          ping_number
        )
      `
      )
      .eq('id', articleId)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (articleError) {
      if (articleError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Article not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching article:', articleError);
      return NextResponse.json(
        { error: 'Failed to fetch article' },
        { status: 500 }
      );
    }

    // Get created_by and published_by user names
    let createdByName = null;
    let publishedByName = null;

    if (article.created_by) {
      const { data: creator } = await adminClient
        .from('users')
        .select('full_name')
        .eq('id', article.created_by)
        .single();
      createdByName = creator?.full_name || null;
    }

    if (article.published_by) {
      const { data: publisher } = await adminClient
        .from('users')
        .select('full_name')
        .eq('id', article.published_by)
        .single();
      publishedByName = publisher?.full_name || null;
    }

    // Transform response - handle joined data
    // Supabase returns arrays for one-to-one relations via FK
    const categoryData = article.categories as
      | { id: string; name: string }
      | { id: string; name: string }[]
      | null;
    const category = Array.isArray(categoryData)
      ? categoryData[0]
      : categoryData;

    const pingData = article.pings as
      | { id: string; ping_number: number }
      | { id: string; ping_number: number }[]
      | null;
    const sourcePing = Array.isArray(pingData) ? pingData[0] : pingData;

    return NextResponse.json({
      success: true,
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        content: article.content,
        agentContent: article.agent_content,
        categoryId: article.category_id,
        categoryName: category?.name || null,
        status: article.status,
        sourcePingId: article.source_ping_id,
        sourcePingNumber: sourcePing?.ping_number || null,
        enhancesArticleId: article.enhances_article_id,
        createdBy: article.created_by,
        createdByName,
        publishedBy: article.published_by,
        publishedByName,
        publishedAt: article.published_at,
        viewCount: article.view_count,
        helpfulCount: article.helpful_count,
        notHelpfulCount: article.not_helpful_count,
        createdAt: article.created_at,
        updatedAt: article.updated_at,
        deletedAt: article.deleted_at,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/kb/articles/[articleId]
 * Update a KB article
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { articleId } = await params;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with role and tenant
    const adminClient = createAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('id, tenant_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check authorization - only agents/managers/owners can edit
    if (!canViewPrivateMessages(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const {
      title,
      slug,
      content,
      agentContent,
      categoryId,
      status,
      deletedAt,
    } = body;

    // Validate the article exists and belongs to tenant
    const { data: existingArticle, error: existingError } = await adminClient
      .from('kb_articles')
      .select('id, tenant_id, status')
      .eq('id', articleId)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (existingError || !existingArticle) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // If updating slug, check uniqueness
    if (slug !== undefined) {
      const { data: slugConflict } = await adminClient
        .from('kb_articles')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('slug', slug)
        .neq('id', articleId)
        .is('deleted_at', null)
        .single();

      if (slugConflict) {
        return NextResponse.json(
          { error: 'Slug already exists', code: 'SLUG_EXISTS' },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (content !== undefined) updateData.content = content;
    if (agentContent !== undefined) updateData.agent_content = agentContent;
    if (categoryId !== undefined) updateData.category_id = categoryId;
    if (deletedAt !== undefined) updateData.deleted_at = deletedAt;

    // Handle status change to published
    const isNewlyPublished =
      status === 'published' && existingArticle.status !== 'published';
    if (status !== undefined) {
      updateData.status = status;
      if (isNewlyPublished) {
        updateData.published_at = new Date().toISOString();
        updateData.published_by = profile.id;
      }
    }

    // Update the article
    const { data: updatedArticle, error: updateError } = await adminClient
      .from('kb_articles')
      .update(updateData)
      .eq('id', articleId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating article:', updateError);
      return NextResponse.json(
        { error: 'Failed to update article' },
        { status: 500 }
      );
    }

    // Trigger embedding generation async when article is newly published
    // This is fire-and-forget - publish succeeds even if embedding fails
    if (isNewlyPublished) {
      triggerEmbeddingGeneration(articleId, profile.tenant_id).catch((err) => {
        console.warn(
          `[kb-articles] Embedding generation failed for article ${articleId}:`,
          err
        );
      });
    }

    return NextResponse.json({
      success: true,
      article: {
        id: updatedArticle.id,
        title: updatedArticle.title,
        slug: updatedArticle.slug,
        status: updatedArticle.status,
        updatedAt: updatedArticle.updated_at,
        publishedAt: updatedArticle.published_at,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/kb/articles/[articleId]
 * Permanently delete a KB article
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { articleId } = await params;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with role and tenant
    const adminClient = createAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('id, tenant_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check authorization - only agents/managers/owners can delete
    if (!canViewPrivateMessages(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate the article exists and belongs to tenant
    const { data: existingArticle, error: existingError } = await adminClient
      .from('kb_articles')
      .select('id, tenant_id')
      .eq('id', articleId)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (existingError || !existingArticle) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Permanently delete the article
    const { error: deleteError } = await adminClient
      .from('kb_articles')
      .delete()
      .eq('id', articleId);

    if (deleteError) {
      console.error('Error deleting article:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete article' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
