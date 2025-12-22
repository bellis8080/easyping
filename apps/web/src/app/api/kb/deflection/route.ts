/**
 * KB Deflection Tracking API Endpoint
 * Story 4.6: KB Suggestions During Ping Creation
 *
 * POST /api/kb/deflection
 * Records when a user's issue is solved by a KB article (deflection).
 * This data is used for analytics and to track self-service effectiveness.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const deflectionSchema = z.object({
  articleId: z.string().uuid('Invalid article ID'),
  query: z.string().min(1, 'Query is required'),
});

interface DeflectionResponse {
  success: boolean;
  error?: string;
}

/**
 * POST /api/kb/deflection
 * Record a deflection event when an article solves a user's issue
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<DeflectionResponse>> {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
        },
        { status: 400 }
      );
    }
    const parseResult = deflectionSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage =
        parseResult.error?.issues?.[0]?.message || 'Invalid request body';
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 400 }
      );
    }

    const { articleId, query } = parseResult.data;

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // Get user profile to get tenant_id
    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Verify article exists and belongs to same tenant
    const { data: article, error: articleError } = await adminClient
      .from('kb_articles')
      .select('id, tenant_id')
      .eq('id', articleId)
      .eq('tenant_id', profile.tenant_id)
      .eq('status', 'published')
      .is('deleted_at', null)
      .single();

    if (articleError || !article) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article not found',
        },
        { status: 404 }
      );
    }

    // Record the deflection event
    // Note: The trigger will auto-increment deflection_count on kb_articles
    const { error: insertError } = await adminClient
      .from('kb_deflections')
      .insert({
        tenant_id: profile.tenant_id,
        article_id: articleId,
        user_id: user.id,
        query_text: query,
      });

    if (insertError) {
      console.error('[kb-deflection] Insert error:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to record deflection',
        },
        { status: 500 }
      );
    }

    console.log(
      `[kb-deflection] Recorded deflection for article ${articleId} by user ${user.id}`
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('[kb-deflection] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
