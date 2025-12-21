/**
 * API Route: KB Article Feedback
 * Story 4.5: KB Article Detail Page
 *
 * POST /api/kb/public/articles/[slug]/feedback
 * Accepts { helpful: boolean } and records user feedback.
 * Prevents duplicate feedback from same user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

interface FeedbackBody {
  helpful: boolean;
}

export async function POST(
  request: NextRequest,
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

    // Parse request body
    let body: FeedbackBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate helpful field
    if (typeof body.helpful !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Field "helpful" (boolean) is required' },
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
      .select('id')
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

    // Check for existing feedback from this user
    const { data: existingFeedback } = await adminClient
      .from('kb_article_feedback')
      .select('id, is_helpful')
      .eq('article_id', article.id)
      .eq('user_id', userProfile.id)
      .single();

    if (existingFeedback) {
      // User already submitted feedback
      if (existingFeedback.is_helpful === body.helpful) {
        // Same feedback, no change needed
        return NextResponse.json({
          success: true,
          message: 'Feedback already recorded',
          updated: false,
        });
      }

      // Update existing feedback (user changed their mind)
      const { error: updateError } = await adminClient
        .from('kb_article_feedback')
        .update({ is_helpful: body.helpful })
        .eq('id', existingFeedback.id);

      if (updateError) {
        console.error('Error updating feedback:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update feedback' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Feedback updated',
        updated: true,
      });
    }

    // Insert new feedback
    const { error: insertError } = await adminClient
      .from('kb_article_feedback')
      .insert({
        article_id: article.id,
        user_id: userProfile.id,
        is_helpful: body.helpful,
      });

    if (insertError) {
      console.error('Error inserting feedback:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded',
      updated: false,
    });
  } catch (error) {
    console.error('Error processing feedback:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if user has already submitted feedback
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { slug } = await context.params;

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
      .select('id')
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

    // Check for existing feedback
    const { data: existingFeedback } = await adminClient
      .from('kb_article_feedback')
      .select('is_helpful')
      .eq('article_id', article.id)
      .eq('user_id', userProfile.id)
      .single();

    return NextResponse.json({
      success: true,
      hasFeedback: !!existingFeedback,
      isHelpful: existingFeedback?.is_helpful ?? null,
    });
  } catch (error) {
    console.error('Error checking feedback:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
