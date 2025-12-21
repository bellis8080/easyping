/**
 * API Route: Track KB Article View
 * Story 4.5: KB Article Detail Page
 *
 * POST /api/kb/public/articles/[slug]/view
 * Creates a view record and increments article view count.
 * Deduplicates views: only counts once per user per 24-hour window.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function POST(
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

    // Find article by slug and tenant_id
    const { data: article, error: articleError } = await adminClient
      .from('kb_articles')
      .select('id, view_count')
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

    // Check for existing view in last 24 hours (deduplication)
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: existingView } = await adminClient
      .from('kb_article_views')
      .select('id')
      .eq('article_id', article.id)
      .eq('user_id', userProfile.id)
      .gte('viewed_at', twentyFourHoursAgo)
      .limit(1)
      .single();

    // If no recent view, create view record and increment count
    if (!existingView) {
      // Insert view record
      await adminClient.from('kb_article_views').insert({
        article_id: article.id,
        user_id: userProfile.id,
        viewed_at: new Date().toISOString(),
      });

      // Increment view_count on article
      await adminClient
        .from('kb_articles')
        .update({ view_count: (article.view_count || 0) + 1 })
        .eq('id', article.id);
    }

    return NextResponse.json({
      success: true,
      tracked: !existingView,
    });
  } catch (error) {
    console.error('Error tracking article view:', error);
    // Fire-and-forget: don't fail page load, just return success
    return NextResponse.json({
      success: true,
      tracked: false,
    });
  }
}
