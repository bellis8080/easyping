/**
 * GET /api/kb/articles/slug/[slug]
 * Story 4.8: KB Article Suggestions During Resolution
 *
 * Fetches a KB article by its slug for the article preview modal.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface ArticleResponse {
  article: {
    id: string;
    title: string;
    slug: string;
    content: string;
    category: {
      name: string;
      color: string;
    } | null;
    updated_at: string;
  } | null;
  error?: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ArticleResponse>> {
  try {
    const { slug } = await params;

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { article: null, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // Get user profile
    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { article: null, error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch article by slug
    const { data: article, error: articleError } = await adminClient
      .from('kb_articles')
      .select(
        `
        id,
        title,
        slug,
        content,
        updated_at,
        category:categories(name, color)
      `
      )
      .eq('slug', slug)
      .eq('tenant_id', profile.tenant_id)
      .eq('status', 'published')
      .single();

    if (articleError || !article) {
      return NextResponse.json(
        { article: null, error: 'Article not found' },
        { status: 404 }
      );
    }

    // Transform response
    const transformedArticle = {
      id: article.id,
      title: article.title,
      slug: article.slug,
      content: article.content,
      category: Array.isArray(article.category)
        ? article.category[0]
        : article.category,
      updated_at: article.updated_at,
    };

    return NextResponse.json({ article: transformedArticle });
  } catch (error) {
    console.error('[kb-article-slug] Error:', error);
    return NextResponse.json(
      { article: null, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
