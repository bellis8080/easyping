/**
 * POST /api/setup/categories/suggest
 * Story 3.4: Organization Profile & Category Management
 *
 * Generates category suggestions based on the organization's support profile.
 * Uses AI when configured, falls back to preset categories.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  suggestCategories,
  getPresetCategories,
} from '@/lib/services/category-suggestion-service';
import type { SupportType } from '@easyping/types';

const requestSchema = z.object({
  supportProfile: z.object({
    support_type: z.string().min(1),
    description: z.string().optional(),
    typical_users: z.string().optional(),
    systems_supported: z.array(z.string()).optional(),
    common_issues: z.array(z.string()).optional(),
  }),
  aiConfig: z.object({
    provider: z.enum(['openai', 'anthropic', 'azure', 'skip']),
    apiKey: z.string().optional(),
    model: z.string().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { supportProfile, aiConfig } = parsed.data;

    // If AI is configured, try to get AI-generated suggestions
    if (aiConfig.provider !== 'skip' && aiConfig.apiKey) {
      try {
        const categories = await suggestCategories(
          {
            support_type: supportProfile.support_type as SupportType,
            description: supportProfile.description || '',
            typical_users: supportProfile.typical_users || '',
            systems_supported: supportProfile.systems_supported,
            common_issues: supportProfile.common_issues,
            ai_generated: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            provider: aiConfig.provider,
            model: aiConfig.model || getDefaultModel(aiConfig.provider),
            apiKey: aiConfig.apiKey,
          }
        );

        return NextResponse.json({ categories, source: 'ai' });
      } catch (error) {
        console.error(
          'AI category suggestion failed, falling back to presets:',
          error
        );
        // Fall through to preset categories
      }
    }

    // Return preset categories based on support type
    const categories = getPresetCategories(
      supportProfile.support_type as SupportType
    );
    return NextResponse.json({ categories, source: 'preset' });
  } catch (error) {
    console.error('Error suggesting categories:', error);
    return NextResponse.json(
      { error: 'Failed to suggest categories' },
      { status: 500 }
    );
  }
}

function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'openai':
      return 'gpt-4o-mini';
    case 'anthropic':
      return 'claude-3-haiku-20240307';
    case 'azure':
      return 'gpt-4o-mini';
    default:
      return 'gpt-4o-mini';
  }
}
