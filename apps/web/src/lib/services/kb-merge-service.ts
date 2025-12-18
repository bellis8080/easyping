/**
 * KB Merge Service
 * Story 4.2.3: KB Article Comparison & Enhancement
 *
 * Merges new information from resolved pings into existing KB articles.
 * Uses AI to intelligently combine content while preserving the original structure.
 */

import { KBGenerationConfig } from './kb-article-generation-service';

/**
 * Configuration for merge operation
 */
export interface KBMergeConfig {
  /** AI provider configuration */
  ai: KBGenerationConfig;
  /** Whether to preserve all original content (default: true) */
  preserveOriginal?: boolean;
}

/**
 * Original article to be enhanced
 */
export interface OriginalArticle {
  id: string;
  title: string;
  content: string;
  agentContent: string | null;
}

/**
 * New content from resolved ping
 */
export interface NewContent {
  /** Combined ping messages */
  conversationSummary: string;
  /** Agent private notes */
  privateNotes: string | null;
  /** Resolution context */
  context?: string;
}

/**
 * Result of the merge operation
 */
export interface MergeResult {
  /** Merged title (usually kept from original) */
  title: string;
  /** Merged public content */
  content: string;
  /** Merged agent-only content */
  agentContent: string;
  /** Human-readable summary of what changed */
  changesSummary: string;
  /** Whether merge was successful */
  success: boolean;
  /** Error message if merge failed */
  error?: string;
}

/**
 * Parsed AI response for merge
 */
interface AIMergeResponse {
  title: string;
  content: string;
  agentContent: string;
  changesSummary: string;
}

/**
 * Merges new information from a resolved ping into an existing KB article.
 * Uses AI to intelligently combine the content while maintaining structure.
 *
 * @param original - The existing KB article to enhance
 * @param newContent - New content from the resolved ping
 * @param config - Merge configuration including AI settings
 * @returns Merge result with enhanced content and change summary
 */
export async function mergeArticles(
  original: OriginalArticle,
  newContent: NewContent,
  config: KBMergeConfig
): Promise<MergeResult> {
  // Validate inputs
  if (!original.title || !original.content) {
    return {
      title: original.title || '',
      content: original.content || '',
      agentContent: original.agentContent || '',
      changesSummary: '',
      success: false,
      error: 'Original article must have title and content',
    };
  }

  if (!newContent.conversationSummary) {
    return {
      title: original.title,
      content: original.content,
      agentContent: original.agentContent || '',
      changesSummary: '',
      success: false,
      error: 'New content must include conversation summary',
    };
  }

  // Build the merge prompt
  const prompt = buildMergePrompt(original, newContent, config);
  const systemPrompt = `You are a technical writer enhancing existing knowledge base articles with new information from resolved support tickets.
Your goal is to ADD to and IMPROVE articles, not replace them.
Always respond with valid JSON matching the exact format requested.`;

  try {
    const response = await generateTextCompletion(
      prompt,
      config.ai,
      systemPrompt
    );

    // Parse and validate response
    const parsed = parseMergeResponse(response);

    if (!parsed) {
      return {
        title: original.title,
        content: original.content,
        agentContent: original.agentContent || '',
        changesSummary: '',
        success: false,
        error: 'Failed to parse AI merge response',
      };
    }

    return {
      title: parsed.title,
      content: parsed.content,
      agentContent: parsed.agentContent,
      changesSummary: parsed.changesSummary,
      success: true,
    };
  } catch (error) {
    console.error('Error merging KB articles:', error);
    return {
      title: original.title,
      content: original.content,
      agentContent: original.agentContent || '',
      changesSummary: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Builds the AI prompt for merging articles
 */
function buildMergePrompt(
  original: OriginalArticle,
  newContent: NewContent,
  config: KBMergeConfig
): string {
  const preserveNote =
    config.preserveOriginal !== false
      ? 'DO NOT remove existing content unless it is factually incorrect.'
      : 'You may restructure or remove redundant content if needed.';

  return `You are a technical writer enhancing an existing knowledge base article with new information from a recently resolved support ticket.

## Original KB Article:
Title: ${original.title}

Content (user-facing):
${original.content}

Agent Content (internal resolution steps):
${original.agentContent || 'No existing agent content.'}

## New Information from Resolved Ping:

Conversation Summary:
${newContent.conversationSummary}

${newContent.privateNotes ? `Agent's Private Notes:\n${newContent.privateNotes}` : ''}

${newContent.context ? `Additional Context:\n${newContent.context}` : ''}

## Your Task:

1. **Identify NEW information** from the ping that isn't already in the article
2. **Merge intelligently** - add new info where it fits naturally
3. ${preserveNote}
4. **Maintain style** - keep the original article's structure and formatting
5. **Update agent content** - add any new technical steps or tips from private notes
6. **Describe changes** - clearly list what was added or modified

## Guidelines for Each Section:

**Title:** Keep the original title unless the new information significantly expands the scope. If changing, make it more comprehensive.

**Content (user-facing):**
- Add new troubleshooting steps or solutions discovered
- Expand symptom descriptions if new variations were found
- Add clarifications based on user questions
- Keep language accessible for end users

**Agent Content (internal):**
- Add new technical resolution steps
- Document any new backend fixes or configurations
- Include tips for handling edge cases
- Add any relevant scripts or commands used

Respond ONLY with valid JSON in this exact format (no markdown code blocks):
{
  "title": "Article title (original or improved)",
  "content": "## Overview\\n\\n[Merged user-facing content with new information integrated]",
  "agentContent": "## Technical Resolution\\n\\n[Merged internal agent content]",
  "changesSummary": "Brief description of what was added or changed (1-3 sentences)"
}`;
}

/**
 * Parses the AI merge response
 */
function parseMergeResponse(response: string): AIMergeResponse | null {
  try {
    // Clean the response - remove markdown code blocks if present
    let jsonStr = response.trim();

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

    // Validate required fields
    if (
      typeof parsed.title !== 'string' ||
      typeof parsed.content !== 'string' ||
      typeof parsed.agentContent !== 'string' ||
      typeof parsed.changesSummary !== 'string'
    ) {
      console.error('Merge response missing required fields:', parsed);
      return null;
    }

    return parsed as AIMergeResponse;
  } catch (error) {
    console.error('Failed to parse merge response:', error, response);
    return null;
  }
}

/**
 * Generates a text completion using the configured AI provider
 * Follows the pattern from kb-article-generation-service.ts
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
      timeout: 45000, // Longer timeout for merge operations
    });

    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: config.temperature ?? 0.7,
      max_tokens: 3000, // Merge needs more tokens for combined content
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
      max_tokens: 3000,
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

  throw new Error(`Unsupported AI provider: ${config.provider}`);
}

/**
 * Generates a brief summary of differences between original and merged content.
 * Useful for displaying to agents before they approve an enhancement.
 *
 * @param original - Original article content
 * @param merged - Merged article content
 * @returns Summary of differences
 */
export function generateDiffSummary(
  original: { title: string; content: string; agentContent: string | null },
  merged: { title: string; content: string; agentContent: string }
): {
  titleChanged: boolean;
  contentLengthDiff: number;
  agentContentLengthDiff: number;
  summary: string;
} {
  const titleChanged = original.title !== merged.title;
  const contentLengthDiff = merged.content.length - original.content.length;
  const originalAgentLength = original.agentContent?.length || 0;
  const agentContentLengthDiff =
    merged.agentContent.length - originalAgentLength;

  const changes: string[] = [];
  if (titleChanged) {
    changes.push('Title updated');
  }
  if (contentLengthDiff > 50) {
    changes.push(
      `+${Math.round(contentLengthDiff / 10) * 10} characters to user content`
    );
  } else if (contentLengthDiff < -50) {
    changes.push(
      `${Math.round(contentLengthDiff / 10) * 10} characters from user content`
    );
  }
  if (agentContentLengthDiff > 50) {
    changes.push(
      `+${Math.round(agentContentLengthDiff / 10) * 10} characters to agent content`
    );
  } else if (agentContentLengthDiff < -50) {
    changes.push(
      `${Math.round(agentContentLengthDiff / 10) * 10} characters from agent content`
    );
  }

  return {
    titleChanged,
    contentLengthDiff,
    agentContentLengthDiff,
    summary: changes.length > 0 ? changes.join(', ') : 'Minor updates',
  };
}
