import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/auth/helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import type { AIConfig } from '@easyping/types';

// Validation schema for AI configuration
const aiConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'azure']),
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().min(1, 'Model is required'),
  enabled: z.boolean().default(true),
  // Azure-specific fields (optional)
  endpoint: z.string().optional(),
  deployment: z.string().optional(),
  api_version: z.string().optional(),
});

/**
 * GET /api/ai-config
 * Fetch current AI configuration for the organization
 * Returns decrypted API key (or masked preview)
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Get authenticated user
    const userProfile = await getUserProfile();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Check if user is owner
    if (userProfile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can view AI configuration' },
        { status: 403 }
      );
    }

    // Get organization's AI config
    const adminClient = createAdminClient();
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .select('id, ai_config')
      .eq('id', userProfile.tenant_id)
      .single();

    if (orgError) {
      console.error('Failed to fetch organization:', orgError);
      return NextResponse.json(
        { error: 'Failed to fetch AI configuration' },
        { status: 500 }
      );
    }

    // If no AI config exists, return empty config
    if (!org.ai_config || Object.keys(org.ai_config).length === 0) {
      return NextResponse.json({
        provider: null,
        apiKey: null,
        model: null,
        enabled: false,
      });
    }

    const aiConfig = org.ai_config as unknown as AIConfig;

    // Decrypt API key if it exists
    let decryptedKey: string | null = null;
    if (aiConfig.encrypted_api_key) {
      const { data: decryptResult, error: decryptError } =
        await adminClient.rpc('decrypt_api_key', {
          encrypted_key: aiConfig.encrypted_api_key,
          org_id: org.id,
        });

      if (decryptError) {
        console.error('Failed to decrypt API key:', decryptError);
        // Don't fail the request, just return masked key
        decryptedKey = null;
      } else {
        decryptedKey = decryptResult as string;
      }
    }

    // Return config with decrypted key (or masked if decryption failed)
    return NextResponse.json({
      provider: aiConfig.provider || null,
      apiKey: decryptedKey,
      model: aiConfig.model || null,
      enabled: aiConfig.enabled ?? false,
      endpoint: aiConfig.endpoint || null,
      deployment: aiConfig.deployment || null,
      api_version: aiConfig.api_version || null,
    });
  } catch (error) {
    console.error('GET /api/ai-config error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch AI configuration',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai-config
 * Update AI configuration for the organization
 * Encrypts API key before storage
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // Get authenticated user
    const userProfile = await getUserProfile();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Check if user is owner
    if (userProfile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can update AI configuration' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = aiConfigSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Encrypt API key
    const adminClient = createAdminClient();
    const { data: encryptedKey, error: encryptError } = await adminClient.rpc(
      'encrypt_api_key',
      {
        api_key: data.apiKey,
        org_id: userProfile.tenant_id,
      }
    );

    if (encryptError || !encryptedKey) {
      console.error('Failed to encrypt API key:', encryptError);
      return NextResponse.json(
        { error: 'Failed to encrypt API key' },
        { status: 500 }
      );
    }

    // Build AI config object
    const aiConfig: AIConfig = {
      provider: data.provider,
      encrypted_api_key: encryptedKey as string,
      model: data.model,
      enabled: data.enabled,
    };

    // Add Azure-specific fields if provider is Azure
    if (data.provider === 'azure') {
      if (data.endpoint) aiConfig.endpoint = data.endpoint;
      if (data.deployment) aiConfig.deployment = data.deployment;
      if (data.api_version) aiConfig.api_version = data.api_version;
    }

    // Update organization's AI config
    const { error: updateError } = await adminClient
      .from('organizations')
      .update({ ai_config: aiConfig })
      .eq('id', userProfile.tenant_id);

    if (updateError) {
      console.error('Failed to update AI configuration:', updateError);
      return NextResponse.json(
        { error: 'Failed to update AI configuration' },
        { status: 500 }
      );
    }

    // Log the configuration change
    console.log('AI configuration updated:', {
      userId: userProfile.id,
      organizationId: userProfile.tenant_id,
      provider: data.provider,
      model: data.model,
      enabled: data.enabled,
      timestamp: new Date().toISOString(),
    });

    // Return success with masked API key
    const maskedKey = `${data.apiKey.slice(0, 7)}...${data.apiKey.slice(-4)}`;

    return NextResponse.json({
      success: true,
      config: {
        provider: data.provider,
        apiKey: maskedKey,
        model: data.model,
        enabled: data.enabled,
      },
    });
  } catch (error) {
    console.error('PUT /api/ai-config error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update AI configuration',
      },
      { status: 500 }
    );
  }
}
