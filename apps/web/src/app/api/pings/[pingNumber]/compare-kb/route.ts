/**
 * Compare KB API Endpoint
 * Story 4.2.3: KB Article Comparison & Enhancement
 *
 * POST /api/pings/[pingNumber]/compare-kb
 * Compares a ping's content against existing KB articles to find similar matches.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserRole, canViewPrivateMessages } from '@easyping/types';
import {
  findSimilarArticles,
  getArticleExcerpt,
} from '@/lib/services/kb-similarity-service';

/**
 * Response type for compare-kb endpoint
 */
interface CompareKBResponse {
  /** Whether a similar article was found above threshold */
  hasSimilar: boolean;
  /** The most similar article if found */
  similarArticle?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    categoryId: string | null;
    categoryName: string | null;
    viewCount: number;
    helpfulCount: number;
  };
  /** Similarity score (0-100) */
  similarity: number;
  /** All matches above threshold (for UI to show alternatives) */
  allMatches?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    similarity: number;
  }[];
  success: boolean;
  error?: string;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ pingNumber: string }> }
): Promise<NextResponse<CompareKBResponse>> {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          hasSimilar: false,
          similarity: 0,
          success: false,
          error: 'Unauthorized',
        },
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
        {
          hasSimilar: false,
          similarity: 0,
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Only agents/managers/owners can compare KB articles
    if (!canViewPrivateMessages(userProfile.role as UserRole)) {
      return NextResponse.json(
        {
          hasSimilar: false,
          similarity: 0,
          success: false,
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }

    // Fetch ping
    const { pingNumber } = await params;
    const supabaseAdmin = createAdminClient();

    const { data: ping, error: pingError } = await supabaseAdmin
      .from('pings')
      .select('id, tenant_id, category_id')
      .eq('ping_number', parseInt(pingNumber))
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (pingError || !ping) {
      return NextResponse.json(
        {
          hasSimilar: false,
          similarity: 0,
          success: false,
          error: 'Ping not found',
        },
        { status: 404 }
      );
    }

    // Fetch all public messages from the ping for content analysis
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('ping_messages')
      .select('content, message_type')
      .eq('ping_id', ping.id)
      .eq('visibility', 'public')
      .neq('message_type', 'system')
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        {
          hasSimilar: false,
          similarity: 0,
          success: false,
          error: 'Failed to fetch messages',
        },
        { status: 500 }
      );
    }

    // Combine messages into searchable content
    // Weight user messages more heavily as they describe the problem
    const searchContent = (messages || [])
      .map((m) => {
        if (m.message_type === 'user') {
          // User messages are the problem description - include twice for emphasis
          return `${m.content} ${m.content}`;
        }
        return m.content;
      })
      .join(' ');

    if (!searchContent.trim()) {
      return NextResponse.json({
        hasSimilar: false,
        similarity: 0,
        success: true,
      });
    }

    // Find similar articles
    const result = await findSimilarArticles(
      supabaseAdmin,
      searchContent,
      userProfile.tenant_id,
      ping.category_id, // First search within same category
      { minSimilarity: 70, limit: 5 }
    );

    if (!result.hasSimilar || !result.bestMatch) {
      return NextResponse.json({
        hasSimilar: false,
        similarity: 0,
        success: true,
      });
    }

    // Format response with best match and all alternatives
    return NextResponse.json({
      hasSimilar: true,
      similarArticle: {
        id: result.bestMatch.id,
        title: result.bestMatch.title,
        slug: result.bestMatch.slug,
        excerpt: getArticleExcerpt(result.bestMatch.content, 200),
        categoryId: result.bestMatch.categoryId,
        categoryName: result.bestMatch.categoryName,
        viewCount: result.bestMatch.viewCount,
        helpfulCount: result.bestMatch.helpfulCount,
      },
      similarity: result.bestMatch.similarity,
      allMatches: result.matches.map((m) => ({
        id: m.id,
        title: m.title,
        slug: m.slug,
        excerpt: getArticleExcerpt(m.content, 150),
        similarity: m.similarity,
      })),
      success: true,
    });
  } catch (error) {
    console.error('Error in compare-kb endpoint:', error);
    return NextResponse.json(
      {
        hasSimilar: false,
        similarity: 0,
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
