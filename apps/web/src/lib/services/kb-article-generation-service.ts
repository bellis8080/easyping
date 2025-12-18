/**
 * KB Article Generation Service
 * Story 4.2.2: Auto-Generate KB Articles from Resolved Pings
 *
 * Generates KB article drafts from resolved pings, including both
 * public user-facing content and internal agent-only resolution steps.
 */

import { SummaryMessage } from './ping-summary-service';

/**
 * Configuration for AI provider
 */
export interface KBGenerationConfig {
  provider: string;
  model: string;
  apiKey: string;
  temperature?: number;
}

/**
 * Context about the ping for KB generation
 */
export interface KBGenerationContext {
  pingId: string;
  pingNumber: number;
  category: string | null;
  priority: string;
  availableCategories: string[]; // List of category slugs for AI to choose from
}

/**
 * Result of KB article generation
 */
export interface KBGenerationResult {
  title: string | null;
  content: string | null; // Public user-facing content
  agentContent: string | null; // Internal agent-only content
  suggestedCategorySlug: string | null;
  success: boolean;
  error?: string;
}

/**
 * Parsed JSON response from AI
 */
interface AIKBResponse {
  title: string;
  content: string;
  agentContent: string;
  suggestedCategorySlug: string;
}

/**
 * Generates a KB article from a resolved ping's conversation and private notes.
 *
 * @param messages - Public conversation messages
 * @param privateNotes - Agent's private notes (internal documentation)
 * @param context - Ping context (ID, category, priority, etc.)
 * @param config - AI provider configuration
 * @returns KB generation result with title, content, agentContent, and category
 */
export async function generateKBArticle(
  messages: SummaryMessage[],
  privateNotes: SummaryMessage[],
  context: KBGenerationContext,
  config: KBGenerationConfig
): Promise<KBGenerationResult> {
  // Need some content to generate an article
  if (messages.length === 0) {
    return {
      title: null,
      content: null,
      agentContent: null,
      suggestedCategorySlug: null,
      success: false,
      error: 'No messages to generate article from',
    };
  }

  // Format conversation history
  const conversationText = messages
    .map((msg) => {
      const speaker = getSpeakerLabel(msg.role);
      return `${speaker}: ${msg.content}`;
    })
    .join('\n');

  // Format private notes
  const privateNotesText =
    privateNotes.length > 0
      ? privateNotes.map((note) => `Agent Note: ${note.content}`).join('\n')
      : 'No private notes available.';

  // Build the prompt
  const prompt = buildKBPrompt(conversationText, privateNotesText, context);

  const systemPrompt = `You are a technical writer creating knowledge base articles from resolved support conversations.
Your articles help both end users (self-service) and agents (internal reference).
Always respond with valid JSON matching the exact format requested.`;

  try {
    const response = await generateTextCompletion(prompt, config, systemPrompt);

    // Parse JSON response
    const parsed = parseAIResponse(response);

    if (!parsed) {
      return {
        title: null,
        content: null,
        agentContent: null,
        suggestedCategorySlug: null,
        success: false,
        error: 'Failed to parse AI response as JSON',
      };
    }

    return {
      title: parsed.title || null,
      content: parsed.content || null,
      agentContent: parsed.agentContent || null,
      suggestedCategorySlug: parsed.suggestedCategorySlug || null,
      success: true,
    };
  } catch (error) {
    console.error('Error generating KB article:', error);
    return {
      title: null,
      content: null,
      agentContent: null,
      suggestedCategorySlug: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Gets a human-readable label for the message role
 */
function getSpeakerLabel(role: SummaryMessage['role']): string {
  switch (role) {
    case 'user':
      return 'User';
    case 'agent':
      return 'Agent';
    case 'echo':
      return 'Echo (AI)';
    case 'system':
      return 'System';
    default:
      return 'Unknown';
  }
}

/**
 * Builds the KB article generation prompt
 */
function buildKBPrompt(
  conversationText: string,
  privateNotesText: string,
  context: KBGenerationContext
): string {
  const categoriesStr =
    context.availableCategories.length > 0
      ? context.availableCategories.join(', ')
      : 'general';

  return `You are a technical writer creating a knowledge base article from a resolved support conversation.

## Source Conversation (User's Issue):
${conversationText}

## Resolution Notes (Agent's Internal Notes):
${privateNotesText}

## Ping Context:
- Category: ${context.category || 'Uncategorized'}
- Priority: ${context.priority}

Generate a KB article with TWO resolution sections:

1. **Title**: A clear, searchable title describing the problem (max 100 characters). Should be a question or problem statement users might search for.

2. **User Resolution (content)**: Public-facing content for end users.
   - Start with a brief problem description (1-2 sentences from user's perspective)
   - If the user CAN resolve this themselves, provide clear step-by-step instructions
   - If agent intervention was REQUIRED (backend changes, admin access, etc.), write: "This issue requires support assistance. Please contact our support team and reference this article."
   - Use clear, non-technical language appropriate for end users
   - Use markdown formatting (headers, lists, bold for emphasis)

3. **Agent Resolution (agentContent)**: Internal content for support agents ONLY.
   - Technical steps taken to resolve the issue
   - Backend changes, configurations, or fixes applied
   - Any scripts, commands, or admin panel steps used
   - Tips for handling similar issues in the future
   - This content is NEVER shown to end users

4. **Category**: Suggest a category slug from: ${categoriesStr}

Respond ONLY with valid JSON in this exact format (no markdown code blocks, just raw JSON):
{
  "title": "How to [problem description]",
  "content": "## Overview\\n\\n[Problem description]\\n\\n## Solution\\n\\n[Steps or contact support message]",
  "agentContent": "## Technical Resolution\\n\\n[Technical steps]\\n\\n## Notes\\n\\n[Additional tips]",
  "suggestedCategorySlug": "category-slug"
}`;
}

/**
 * Parses the AI response as JSON
 */
function parseAIResponse(response: string): AIKBResponse | null {
  try {
    // Try to extract JSON if wrapped in markdown code blocks
    let jsonStr = response.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }

    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    // Validate required fields exist
    if (
      typeof parsed.title !== 'string' ||
      typeof parsed.content !== 'string' ||
      typeof parsed.agentContent !== 'string' ||
      typeof parsed.suggestedCategorySlug !== 'string'
    ) {
      console.error('AI response missing required fields:', parsed);
      return null;
    }

    return parsed as AIKBResponse;
  } catch (error) {
    console.error('Failed to parse AI response:', error, response);
    return null;
  }
}

/**
 * Generates a text completion using the configured AI provider
 * Follows the pattern from ping-summary-service.ts
 */
async function generateTextCompletion(
  prompt: string,
  config: KBGenerationConfig,
  systemPrompt: string
): Promise<string> {
  if (config.provider === 'openai' || config.provider === 'azure') {
    const OpenAI = (await import('openai')).default;

    const client = new OpenAI({
      apiKey: config.apiKey,
      timeout: 30000, // Longer timeout for article generation
    });

    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: config.temperature ?? 0.7,
      max_tokens: 2000, // Articles need more tokens than summaries
      response_format: { type: 'json_object' },
    });

    return response.choices[0]?.message?.content || '';
  } else if (config.provider === 'anthropic') {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;

    const client = new Anthropic({
      apiKey: config.apiKey,
    });

    const response = await client.messages.create({
      model: config.model,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
      system: systemPrompt,
    });

    const textBlock = response.content.find(
      (block: { type: string }) => block.type === 'text'
    );
    return textBlock && 'text' in textBlock
      ? (textBlock as { text: string }).text
      : '';
  }

  throw new Error(`Unsupported provider: ${config.provider}`);
}
