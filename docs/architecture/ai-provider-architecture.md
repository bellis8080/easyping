# AI Provider Architecture

The AI provider abstraction layer (`packages/ai`) enables swappable AI providers with graceful degradation and error handling.

## Provider Interface

```typescript
// packages/ai/src/providers/base.ts

export interface AIProvider {
  /**
   * Categorize a ping message into predefined categories
   */
  categorize(
    message: string,
    categories: Category[]
  ): Promise<CategoryResult>;

  /**
   * Generate a summary of ping conversation
   */
  summarize(messages: PingMessage[]): Promise<string>;

  /**
   * Suggest a response for an agent
   */
  suggestResponse(context: PingContext): Promise<string>;

  /**
   * Generate vector embedding for semantic search
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Find duplicate pings using embedding similarity
   */
  detectDuplicates(
    embedding: number[],
    threshold: number
  ): Promise<Ping[]>;
}

export interface CategoryResult {
  category_id: string;
  confidence: number; // 0-1 score
  reasoning?: string;
}

export interface PingContext {
  ping: Ping;
  messages: PingMessage[];
  kb_articles?: KnowledgeBaseArticle[];
}
```

## Provider Implementations

### OpenAI Provider

```typescript
// packages/ai/src/providers/openai.ts

import OpenAI from 'openai';
import type { AIProvider, CategoryResult, PingContext } from './base';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;
  private embeddingModel: string;

  constructor(config: {
    apiKey: string;
    model?: string;
    embeddingModel?: string;
  }) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model || 'gpt-3.5-turbo';
    this.embeddingModel = config.embeddingModel || 'text-embedding-3-small';
  }

  async categorize(
    message: string,
    categories: Category[]
  ): Promise<CategoryResult> {
    const categoryList = categories
      .map((c) => `- ${c.name}: ${c.description}`)
      .join('\n');

    const prompt = `Categorize the following support ping message into one of these categories:

${categoryList}

Ping message: "${message}"

Respond with JSON: { "category_id": "<id>", "confidence": <0-1>, "reasoning": "<why>" }`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(
        response.choices[0].message.content || '{}'
      );
      return {
        category_id: result.category_id,
        confidence: result.confidence,
        reasoning: result.reasoning,
      };
    } catch (error) {
      console.error('OpenAI categorization error:', error);
      throw new Error('AI categorization failed');
    }
  }

  async summarize(messages: PingMessage[]): Promise<string> {
    const conversation = messages
      .map((m) => `${m.message_type}: ${m.content}`)
      .join('\n');

    const prompt = `Summarize this support ping conversation in 2-3 sentences:

${conversation}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.5,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('OpenAI summarization error:', error);
      return 'Summary unavailable';
    }
  }

  async suggestResponse(context: PingContext): Promise<string> {
    const conversation = context.messages
      .map((m) => `${m.message_type}: ${m.content}`)
      .join('\n');

    const kbContext = context.kb_articles
      ? `\n\nRelevant KB articles:\n${context.kb_articles
          .map((a) => `- ${a.title}`)
          .join('\n')}`
      : '';

    const prompt = `You are a support agent. Suggest a helpful response to the user's latest message.

Conversation:
${conversation}${kbContext}

Suggested response:`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('OpenAI suggestion error:', error);
      return '';
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw new Error('Embedding generation failed');
    }
  }

  async detectDuplicates(
    embedding: number[],
    threshold: number
  ): Promise<Ping[]> {
    // This is handled by database query using pgvector
    // Provider just generates embeddings
    throw new Error('Use database query for duplicate detection');
  }
}
```

### Anthropic Provider

```typescript
// packages/ai/src/providers/anthropic.ts

import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, CategoryResult, PingContext } from './base';

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(config: { apiKey: string; model?: string }) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-3-haiku-20240307';
  }

  async categorize(
    message: string,
    categories: Category[]
  ): Promise<CategoryResult> {
    const categoryList = categories
      .map((c) => `- ${c.name}: ${c.description}`)
      .join('\n');

    const prompt = `Categorize this support ping into one of these categories:

${categoryList}

Ping: "${message}"

Respond with JSON: { "category_id": "<id>", "confidence": <0-1>, "reasoning": "<why>" }`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const result = JSON.parse(content.text);
      return {
        category_id: result.category_id,
        confidence: result.confidence,
        reasoning: result.reasoning,
      };
    } catch (error) {
      console.error('Anthropic categorization error:', error);
      throw new Error('AI categorization failed');
    }
  }

  // Similar implementations for summarize, suggestResponse, etc.
  // Note: Anthropic doesn't provide embeddings directly, use OpenAI for embeddings
}
```

## Provider Factory

```typescript
// packages/ai/src/factory.ts

import type { AIProvider } from './providers/base';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { AzureOpenAIProvider } from './providers/azure';

export type AIProviderType = 'openai' | 'anthropic' | 'azure';

export interface AIConfig {
  provider: AIProviderType;
  apiKey: string;
  model?: string;
  embeddingModel?: string;
  azureEndpoint?: string; // For Azure only
}

export function createAIProvider(config: AIConfig): AIProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider({
        apiKey: config.apiKey,
        model: config.model,
        embeddingModel: config.embeddingModel,
      });

    case 'anthropic':
      return new AnthropicProvider({
        apiKey: config.apiKey,
        model: config.model,
      });

    case 'azure':
      if (!config.azureEndpoint) {
        throw new Error('Azure endpoint required for Azure provider');
      }
      return new AzureOpenAIProvider({
        apiKey: config.apiKey,
        endpoint: config.azureEndpoint,
        model: config.model,
      });

    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}
```

## Usage in Next.js API Routes

```typescript
// apps/web/src/app/api/ai/categorize/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createAIProvider } from '@easyping/ai';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    // Get AI config from organization settings
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization and AI config
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', userData.tenant_id)
      .single();

    const aiConfig = org.settings.ai_provider;

    if (!aiConfig) {
      return NextResponse.json(
        { error: 'AI provider not configured' },
        { status: 400 }
      );
    }

    // Get categories
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('tenant_id', userData.tenant_id)
      .eq('is_active', true);

    // Create AI provider and categorize
    const aiProvider = createAIProvider({
      provider: aiConfig.provider,
      apiKey: aiConfig.api_key_encrypted, // Decrypt in production
      model: aiConfig.model,
    });

    const result = await aiProvider.categorize(message, categories);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Categorization error:', error);
    return NextResponse.json(
      { error: 'Categorization failed' },
      { status: 500 }
    );
  }
}
```

## Graceful Degradation

When AI provider fails or is unavailable:

```typescript
// packages/ai/src/fallback.ts

export function getFallbackCategory(categories: Category[]): CategoryResult {
  // Return "Other" category or first category as fallback
  const otherCategory = categories.find((c) => c.name === 'Other');

  return {
    category_id: otherCategory?.id || categories[0].id,
    confidence: 0.0,
    reasoning: 'AI categorization unavailable, manual review needed',
  };
}

export function getFallbackSummary(messages: PingMessage[]): string {
  // Return first message as fallback summary
  const firstMessage = messages[0];
  return firstMessage
    ? firstMessage.content.substring(0, 200) + '...'
    : 'No summary available';
}
```

---
