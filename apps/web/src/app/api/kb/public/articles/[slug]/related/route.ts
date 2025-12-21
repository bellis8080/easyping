/**
 * API Route: Related KB Articles
 * Story 4.5: KB Article Detail Page
 *
 * GET /api/kb/public/articles/[slug]/related
 * Returns up to 3 related articles based on:
 * 1. Semantic similarity (if embeddings available)
 * 2. Same category (fallback)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  categoryName: string | null;
  viewCount: number;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { slug } = await context.params;

    // Validate slug
    if (!slug || slug.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
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

    // Get user's tenant_id
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('id', user.id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const adminClient = createAdminClient();

    // Find article by slug and tenant_id (including embedding for semantic search)
    const { data: article, error: articleError } = await adminClient
      .from('kb_articles')
      .select('id, category_id, embedding')
      .eq('slug', slug)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('status', 'published')
      .is('deleted_at', null)
      .single();

    if (articleError || !article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    let relatedArticles: RelatedArticle[] = [];

    // Strategy 1: Try semantic similarity if embedding exists
    if (article.embedding) {
      try {
        const { data: semanticResults } = await adminClient.rpc(
          'search_kb_semantic',
          {
            query_embedding: article.embedding,
            p_tenant_id: userProfile.tenant_id,
            p_limit: 4, // Get 4 to account for excluding current article
          }
        );

        if (semanticResults && semanticResults.length > 0) {
          // Filter out current article and limit to 3
          relatedArticles = semanticResults
            .filter((r: { id: string }) => r.id !== article.id)
            .slice(0, 3)
            .map(
              (r: {
                id: string;
                title: string;
                slug: string;
                category_name: string | null;
                view_count: number;
              }) => ({
                id: r.id,
                title: r.title,
                slug: r.slug,
                categoryName: r.category_name,
                viewCount: r.view_count,
              })
            );
        }
      } catch (semanticError) {
        console.error(
          'Semantic search failed, falling back to category:',
          semanticError
        );
      }
    }

    // Strategy 2: Fall back to same category if no semantic results
    if (relatedArticles.length === 0 && article.category_id) {
      const { data: categoryResults } = await adminClient
        .from('kb_articles')
        .select(
          `
          id,
          title,
          slug,
          view_count,
          categories (name)
        `
        )
        .eq('tenant_id', userProfile.tenant_id)
        .eq('category_id', article.category_id)
        .eq('status', 'published')
        .is('deleted_at', null)
        .neq('id', article.id)
        .order('view_count', { ascending: false })
        .limit(3);

      if (categoryResults && categoryResults.length > 0) {
        relatedArticles = categoryResults.map((r) => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          categoryName:
            (r.categories as unknown as { name: string } | null)?.name ?? null,
          viewCount: r.view_count,
        }));
      }
    }

    // Strategy 3: If still no results, get most popular articles
    if (relatedArticles.length === 0) {
      const { data: popularResults } = await adminClient
        .from('kb_articles')
        .select(
          `
          id,
          title,
          slug,
          view_count,
          categories (name)
        `
        )
        .eq('tenant_id', userProfile.tenant_id)
        .eq('status', 'published')
        .is('deleted_at', null)
        .neq('id', article.id)
        .order('view_count', { ascending: false })
        .limit(3);

      if (popularResults && popularResults.length > 0) {
        relatedArticles = popularResults.map((r) => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          categoryName:
            (r.categories as unknown as { name: string } | null)?.name ?? null,
          viewCount: r.view_count,
        }));
      }
    }

    return NextResponse.json({
      success: true,
      articles: relatedArticles,
    });
  } catch (error) {
    console.error('Error fetching related articles:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
