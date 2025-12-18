/**
 * Generate KB Article API Endpoint
 * Story 4.2.2: Auto-Generate KB Articles from Resolved Pings
 *
 * POST /api/pings/[pingNumber]/generate-kb
 * Generates a KB article draft from a resolved ping.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { UserRole, canViewPrivateMessages } from '@easyping/types';
import {
  generateKBArticle,
  KBGenerationConfig,
  KBGenerationContext,
} from '@/lib/services/kb-article-generation-service';
import { SummaryMessage } from '@/lib/services/ping-summary-service';
import { generateSlug, generateUniqueSlug } from '@/lib/utils/slug';

const generateKBSchema = z.object({
  generateKB: z.boolean(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pingNumber: string }> }
) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, full_name, role, tenant_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only agents/managers/owners can generate KB articles
    if (!canViewPrivateMessages(userProfile.role as UserRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Only agents can generate KB articles' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await req.json();
    const validationResult = generateKBSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error },
        { status: 400 }
      );
    }

    if (!validationResult.data.generateKB) {
      return NextResponse.json(
        { error: 'generateKB must be true' },
        { status: 400 }
      );
    }

    // Fetch ping
    const { pingNumber } = await params;
    const supabaseAdmin = createAdminClient();

    const { data: ping, error: pingError } = await supabaseAdmin
      .from('pings')
      .select(
        `
        id,
        ping_number,
        tenant_id,
        status,
        priority,
        category_id,
        categories (
          id,
          name
        )
      `
      )
      .eq('ping_number', parseInt(pingNumber))
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (pingError || !ping) {
      return NextResponse.json({ error: 'Ping not found' }, { status: 404 });
    }

    // Check if KB article already exists for this ping
    const { data: existingArticle } = await supabaseAdmin
      .from('kb_articles')
      .select('id, title, slug')
      .eq('source_ping_id', ping.id)
      .eq('tenant_id', userProfile.tenant_id)
      .maybeSingle();

    if (existingArticle) {
      return NextResponse.json(
        {
          error: 'KB article already exists for this ping',
          existingArticle: {
            id: existingArticle.id,
            title: existingArticle.title,
            slug: existingArticle.slug,
          },
        },
        { status: 409 }
      );
    }

    // Fetch all messages (including private notes for agents)
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('ping_messages')
      .select('id, content, message_type, visibility, sender_id, created_at')
      .eq('ping_id', ping.id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch ping messages' },
        { status: 500 }
      );
    }

    // Separate public messages and private notes
    const publicMessages: SummaryMessage[] = (messages || [])
      .filter((m) => m.visibility === 'public' && m.message_type !== 'system')
      .map((m) => ({
        role: mapMessageType(m.message_type),
        content: m.content,
      }));

    const privateNotes: SummaryMessage[] = (messages || [])
      .filter((m) => m.visibility === 'private')
      .map((m) => ({
        role: 'agent' as const,
        content: m.content,
      }));

    // Get AI configuration from organization
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('ai_config')
      .eq('id', userProfile.tenant_id)
      .single();

    if (!org?.ai_config?.enabled || !org.ai_config.encrypted_api_key) {
      return NextResponse.json(
        {
          error: 'AI is not configured for this organization',
          success: false,
        },
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
      console.error('[generate-kb] Failed to decrypt API key:', decryptError);
      return NextResponse.json(
        { error: 'Failed to decrypt AI configuration', success: false },
        { status: 500 }
      );
    }

    // Fetch available categories for AI to choose from
    const { data: categories } = await supabaseAdmin
      .from('categories')
      .select('id, name')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true);

    const availableCategories = (categories || []).map((c) => c.name);

    // Build generation config and context
    const config: KBGenerationConfig = {
      provider: org.ai_config.provider || 'openai',
      model: org.ai_config.model || 'gpt-4o-mini',
      apiKey: decryptedKey,
      temperature: 0.7,
    };

    const categoryName =
      ping.categories && !Array.isArray(ping.categories)
        ? (ping.categories as { name: string }).name
        : null;

    const context: KBGenerationContext = {
      pingId: ping.id,
      pingNumber: ping.ping_number,
      category: categoryName,
      priority: ping.priority,
      availableCategories,
    };

    // Generate KB article
    const result = await generateKBArticle(
      publicMessages,
      privateNotes,
      context,
      config
    );

    if (!result.success || !result.title || !result.content) {
      console.error('KB generation failed:', result.error);
      return NextResponse.json(
        {
          error: result.error || 'Failed to generate KB article',
          success: false,
        },
        { status: 500 }
      );
    }

    // Generate slug from title
    let slug = generateSlug(result.title);

    // Check if slug already exists and make it unique if needed
    const { data: existingSlug } = await supabaseAdmin
      .from('kb_articles')
      .select('id')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('slug', slug)
      .maybeSingle();

    if (existingSlug) {
      // Append timestamp to make unique
      const timestamp = Date.now().toString(36);
      slug = generateUniqueSlug(slug, timestamp);
    }

    // Find category ID from suggested category name
    let categoryId: string | null = null;
    if (result.suggestedCategorySlug) {
      // The AI returns category name, match case-insensitively
      const matchedCategory = (categories || []).find(
        (c) =>
          c.name.toLowerCase() === result.suggestedCategorySlug?.toLowerCase()
      );
      categoryId = matchedCategory?.id || ping.category_id;
    } else {
      categoryId = ping.category_id;
    }

    // Save draft to database
    const { data: article, error: insertError } = await supabaseAdmin
      .from('kb_articles')
      .insert({
        tenant_id: userProfile.tenant_id,
        title: result.title,
        slug,
        content: result.content,
        agent_content: result.agentContent,
        category_id: categoryId,
        status: 'draft',
        source_ping_id: ping.id,
        created_by: user.id,
      })
      .select('id, title, slug, status')
      .single();

    if (insertError) {
      console.error('Error saving KB article:', insertError);
      return NextResponse.json(
        { error: 'Failed to save KB article', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        article: {
          id: article.id,
          title: article.title,
          slug: article.slug,
          status: article.status,
        },
        success: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in generate-kb endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

/**
 * Maps message_type to SummaryMessage role
 */
function mapMessageType(
  messageType: string
): 'user' | 'agent' | 'echo' | 'system' {
  switch (messageType) {
    case 'user':
      return 'user';
    case 'agent':
      return 'agent';
    case 'echo':
      return 'echo';
    case 'system':
      return 'system';
    default:
      return 'user';
  }
}
