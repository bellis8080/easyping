/**
 * POST /api/setup/interview/continue
 * Story 3.4: Organization Profile & Category Management
 *
 * Continues the Echo profile interview with the user's response.
 * Returns either the next question or the generated profile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  continueInterview,
  type InterviewMessage,
} from '@/lib/services/profile-interview-service';

const requestSchema = z.object({
  conversation: z.array(
    z.object({
      role: z.enum(['user', 'echo']),
      content: z.string(),
    })
  ),
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

    const { conversation, aiConfig } = parsed.data;

    // If AI is not configured, return an error
    if (aiConfig.provider === 'skip' || !aiConfig.apiKey) {
      return NextResponse.json(
        { error: 'AI provider not configured' },
        { status: 400 }
      );
    }

    const result = await continueInterview(conversation as InterviewMessage[], {
      provider: aiConfig.provider,
      model: aiConfig.model || getDefaultModel(aiConfig.provider),
      apiKey: aiConfig.apiKey,
    });

    if (result.complete && result.profile) {
      return NextResponse.json({
        complete: true,
        profile: result.profile,
        confidence: result.confidence,
      });
    }

    return NextResponse.json({
      complete: false,
      nextQuestion: result.nextQuestion,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error('Error continuing interview:', error);
    return NextResponse.json(
      { error: 'Failed to continue interview' },
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
