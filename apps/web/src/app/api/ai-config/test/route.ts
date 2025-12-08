import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAIProvider } from '@easyping/ai';

// Validation schema for test connection request
const testConnectionSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'azure']),
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().optional(),
  // Azure-specific fields
  endpoint: z.string().optional(),
  deployment: z.string().optional(),
  api_version: z.string().optional(),
});

/**
 * POST /api/ai-config/test
 * Test AI provider connection with provided credentials
 * Returns success/failure without storing the credentials
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = testConnectionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Build provider config
    const config: Record<string, unknown> = {
      apiKey: data.apiKey,
      ...(data.model && { model: data.model }),
    };

    // Add Azure-specific fields
    if (data.provider === 'azure') {
      if (data.endpoint) config.endpoint = data.endpoint;
      if (data.deployment) config.deployment = data.deployment;
      if (data.api_version) config.apiVersion = data.api_version;
    }

    try {
      // Create AI provider instance
      // Cast to unknown first for dynamic config construction
      const provider = createAIProvider(
        data.provider,
        config as unknown as Parameters<typeof createAIProvider>[1]
      );

      // Test the connection with a simple categorization request
      // Use a timeout to prevent long-hanging requests
      const testPromise = provider.categorize(['General inquiry']);

      // Timeout after 10 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection test timed out')), 10000);
      });

      await Promise.race([testPromise, timeoutPromise]);

      // If we got here, the test was successful
      return NextResponse.json({
        success: true,
        message: 'Connection successful! Ready to use AI features.',
      });
    } catch (providerError) {
      console.error('AI provider test failed:', providerError);

      // Extract meaningful error message
      let errorMessage = 'Connection test failed';

      if (providerError instanceof Error) {
        // Check for common error patterns
        const errorMsg = providerError.message.toLowerCase();

        if (
          errorMsg.includes('invalid') ||
          errorMsg.includes('authentication')
        ) {
          errorMessage = 'Invalid API key. Please check your credentials.';
        } else if (
          errorMsg.includes('rate limit') ||
          errorMsg.includes('quota')
        ) {
          errorMessage =
            'Rate limit exceeded. Please try again later or check your API quota.';
        } else if (
          errorMsg.includes('timeout') ||
          errorMsg.includes('timed out')
        ) {
          errorMessage =
            'Connection timed out. Please check your network and try again.';
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          errorMessage =
            'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = providerError.message;
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('POST /api/ai-config/test error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred during connection test',
      },
      { status: 500 }
    );
  }
}
