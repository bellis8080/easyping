/**
 * Enhance KB Article API Endpoint
 * Story 4.2.3: KB Article Comparison & Enhancement
 *
 * POST /api/kb/articles/[articleId]/enhance
 * Creates an enhancement draft that merges new ping information with an existing article.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { UserRole, canViewPrivateMessages } from '@easyping/types';
import {
  mergeArticles,
  MergeResult,
  OriginalArticle,
  NewContent,
} from '@/lib/services/kb-merge-service';
import { KBGenerationConfig } from '@/lib/services/kb-article-generation-service';
import { generateSlug, generateUniqueSlug } from '@/lib/utils/slug';

const enhanceSchema = z.object({
  pingId: z.string().uuid(),
});

/**
 * Response type for enhance endpoint
 */
interface EnhanceResponse {
  /** Created enhancement draft article */
  article?: {
    id: string;
    title: string;
    slug: string;
    status: string;
    changesSummary: string;
  };
  /** The original article being enhanced */
  originalArticle?: {
    id: string;
    title: string;
    slug: string;
  };
  success: boolean;
  error?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
): Promise<NextResponse<EnhanceResponse>> {
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

    // Only agents/managers/owners can enhance KB articles
    if (!canViewPrivateMessages(userProfile.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await req.json();
    const validationResult = enhanceSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      );
    }

    const { pingId } = validationResult.data;
    const { articleId } = await params;
    const supabaseAdmin = createAdminClient();

    // Fetch the original article
    const { data: originalArticle, error: articleError } = await supabaseAdmin
      .from('kb_articles')
      .select('id, title, slug, content, agent_content, category_id, status')
      .eq('id', articleId)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (articleError || !originalArticle) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    // Only enhance published articles
    if (originalArticle.status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'Can only enhance published articles' },
        { status: 400 }
      );
    }

    // Check if an enhancement draft already exists for this article
    const { data: existingDraft } = await supabaseAdmin
      .from('kb_articles')
      .select('id, title, slug')
      .eq('enhances_article_id', articleId)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('status', 'draft')
      .maybeSingle();

    if (existingDraft) {
      return NextResponse.json(
        {
          success: false,
          error: 'Enhancement draft already exists',
          article: {
            id: existingDraft.id,
            title: existingDraft.title,
            slug: existingDraft.slug,
            status: 'draft',
            changesSummary:
              'An enhancement draft already exists for this article',
          },
        },
        { status: 409 }
      );
    }

    // Fetch the ping and its messages
    const { data: ping, error: pingError } = await supabaseAdmin
      .from('pings')
      .select('id, tenant_id')
      .eq('id', pingId)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (pingError || !ping) {
      return NextResponse.json(
        { success: false, error: 'Ping not found' },
        { status: 404 }
      );
    }

    // Fetch messages from the ping
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('ping_messages')
      .select('content, message_type, visibility')
      .eq('ping_id', pingId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch ping messages' },
        { status: 500 }
      );
    }

    // Build conversation summary from public messages
    const publicMessages = (messages || []).filter(
      (m) => m.visibility === 'public' && m.message_type !== 'system'
    );
    const conversationSummary = publicMessages
      .map(
        (m) => `${m.message_type === 'user' ? 'User' : 'Agent'}: ${m.content}`
      )
      .join('\n\n');

    // Get private notes
    const privateNotes = (messages || [])
      .filter((m) => m.visibility === 'private')
      .map((m) => m.content)
      .join('\n\n');

    if (!conversationSummary) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ping has no messages to use for enhancement',
        },
        { status: 400 }
      );
    }

    // Get AI configuration from organization
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('ai_config')
      .eq('id', userProfile.tenant_id)
      .single();

    if (!org?.ai_config?.enabled || !org.ai_config.encrypted_api_key) {
      return NextResponse.json(
        { success: false, error: 'AI is not configured for this organization' },
        { status: 400 }
      );
    }

    // Decrypt API key
    const { data: decryptedKey, error: decryptError } = await supabaseAdmin.rpc(
      'decrypt_api_key',
      {
        encrypted_key: org.ai_config.encrypted_api_key,
        org_id: userProfile.tenant_id,
      }
    );

    if (decryptError || !decryptedKey) {
      console.error('[enhance-kb] Failed to decrypt API key:', decryptError);
      return NextResponse.json(
        { success: false, error: 'Failed to decrypt AI configuration' },
        { status: 500 }
      );
    }

    // Build merge inputs
    const original: OriginalArticle = {
      id: originalArticle.id,
      title: originalArticle.title,
      content: originalArticle.content,
      agentContent: originalArticle.agent_content,
    };

    const newContent: NewContent = {
      conversationSummary,
      privateNotes: privateNotes || null,
    };

    const config: KBGenerationConfig = {
      provider: org.ai_config.provider || 'openai',
      model: org.ai_config.model || 'gpt-4o-mini',
      apiKey: decryptedKey,
      temperature: 0.7,
    };

    // Merge the articles using AI
    const mergeResult: MergeResult = await mergeArticles(original, newContent, {
      ai: config,
      preserveOriginal: true,
    });

    if (!mergeResult.success) {
      console.error('Merge failed:', mergeResult.error);
      return NextResponse.json(
        {
          success: false,
          error: mergeResult.error || 'Failed to merge articles',
        },
        { status: 500 }
      );
    }

    // Generate unique slug for the enhancement draft
    let slug = generateSlug(mergeResult.title);

    // Check if slug exists and make unique
    const { data: existingSlug } = await supabaseAdmin
      .from('kb_articles')
      .select('id')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('slug', slug)
      .maybeSingle();

    if (existingSlug) {
      slug = generateUniqueSlug(slug, 'enhanced');
    }

    // Create enhancement draft
    const { data: draft, error: insertError } = await supabaseAdmin
      .from('kb_articles')
      .insert({
        tenant_id: userProfile.tenant_id,
        title: mergeResult.title,
        slug,
        content: mergeResult.content,
        agent_content: mergeResult.agentContent,
        category_id: originalArticle.category_id,
        status: 'draft',
        source_ping_id: pingId,
        enhances_article_id: articleId, // Link to original
        created_by: user.id,
      })
      .select('id, title, slug, status')
      .single();

    if (insertError) {
      console.error('Error creating enhancement draft:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create enhancement draft' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        article: {
          id: draft.id,
          title: draft.title,
          slug: draft.slug,
          status: draft.status,
          changesSummary: mergeResult.changesSummary,
        },
        originalArticle: {
          id: originalArticle.id,
          title: originalArticle.title,
          slug: originalArticle.slug,
        },
        success: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in enhance endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
