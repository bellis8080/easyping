/**
 * Problem Categorization Service
 * Story 3.3: Auto-Categorization of Pings with Conversational Clarification
 *
 * Categorizes pings based on confirmed problem statements (not raw conversation).
 * This ensures high-accuracy categorization since the problem is well-understood.
 */

import { createAIProvider } from '@easyping/ai';
import type {
  AIProvider,
  AIProviderConfig,
  CategoryResult,
} from '@easyping/ai';

/**
 * Category information from database
 */
export interface Category {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  icon?: string | null;
}

/**
 * Configuration for problem categorization
 */
export interface CategoryConfig {
  provider: string;
  model: string;
  apiKey: string;
  temperature?: number;
}

/**
 * Categorizes a problem statement into one of the available categories
 *
 * @param problemStatement - The confirmed problem statement (2-3 sentences)
 * @param availableCategories - List of active categories for this organization
 * @param config - AI provider configuration
 * @returns Category result with confidence score and reasoning
 */
export async function categorizeProblemStatement(
  problemStatement: string,
  availableCategories: Category[],
  config: CategoryConfig
): Promise<CategoryResult> {
  const provider = await getAIProvider(config);

  // Build category list for prompt
  const categoryList = availableCategories
    .map((cat) => `- ${cat.name}: ${cat.description || 'No description'}`)
    .join('\n');

  const prompt = `Categorize this support problem into the most appropriate category.

Problem Statement:
${problemStatement}

Available Categories:
${categoryList}

Choose the single best matching category. Consider:
1. The primary nature of the problem (what is broken/needed)
2. The technical domain (hardware, software, network, access, etc.)
3. The user's intent (what they're trying to accomplish)

If the problem doesn't clearly fit any category or is ambiguous, choose "Other" or "Needs Review".

Respond with JSON only:
{
  "category": "Exact category name from the list above",
  "confidence": 0.XX (0.00 to 1.00),
  "reasoning": "Brief explanation of why this category fits"
}`;

  try {
    const response = await provider.categorize([prompt]);

    // Parse the structured response
    const result = parseCategoryResult(response, availableCategories);

    return result;
  } catch (error) {
    console.error('Error categorizing problem statement:', error);

    // Fallback: Use "Needs Review" category
    const needsReviewCategory = availableCategories.find(
      (cat) => cat.name === 'Needs Review'
    );
    const fallbackCategory = needsReviewCategory || availableCategories[0];

    return {
      category: fallbackCategory.name,
      confidence: 0.3,
      reasoning: 'AI categorization failed, defaulting to manual review',
    };
  }
}

/**
 * Generates a concise title from the problem statement
 *
 * @param problemStatement - The confirmed problem statement
 * @param config - AI provider configuration
 * @returns Concise title (max 45 characters for display on cards)
 */
export async function generateTitle(
  problemStatement: string,
  config: CategoryConfig
): Promise<string> {
  try {
    // Use direct API call for title generation since categorize() has a fixed system prompt
    const response = await generateTextCompletion(
      `Generate a very concise support ticket title (max 45 characters) from this problem statement.

Problem Statement:
${problemStatement}

Rules:
1. Maximum 45 characters
2. Be specific and descriptive
3. Use format: "[Issue Type] - [Brief Context]" or just "[Brief Description]"

Good examples (all under 45 chars):
- "Login 403 error - NexusOne"
- "Network outage affecting VPN"
- "Printer offline in IT dept"
- "Password reset needed"
- "Can't access shared drive"

Bad examples:
- "User is having trouble..." (too vague)
- "The user reported that they cannot login to the system and are getting an error" (too long)

Respond with ONLY the title text, no quotes, no explanation.`,
      config
    );

    let title = response.trim();

    // Clean up the title
    title = title.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
    title = title.replace(/^Title:\s*/i, ''); // Remove "Title:" prefix if present
    title = title.substring(0, 45); // Enforce max length

    // Fallback if title is empty
    if (!title) {
      title = extractFallbackTitle(problemStatement);
    }

    return title;
  } catch (error) {
    console.error('Error generating title:', error);
    return extractFallbackTitle(problemStatement);
  }
}

/**
 * Generates a simple text completion using the configured AI provider
 * This is used for free-form text generation (like titles) that doesn't need structured output
 */
async function generateTextCompletion(
  prompt: string,
  config: CategoryConfig
): Promise<string> {
  // Import OpenAI dynamically to avoid issues if not using OpenAI
  if (config.provider === 'openai' || config.provider === 'azure') {
    const OpenAI = (await import('openai')).default;

    const client = new OpenAI({
      apiKey: config.apiKey,
      timeout: 10000,
    });

    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: 'system',
          content:
            'You are a concise title generator for support tickets. Generate short, descriptive titles.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    return response.choices[0]?.message?.content || '';
  } else if (config.provider === 'anthropic') {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;

    const client = new Anthropic({
      apiKey: config.apiKey,
    });

    const response = await client.messages.create({
      model: config.model,
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      system:
        'You are a concise title generator for support tickets. Generate short, descriptive titles.',
    });

    const textBlock = response.content.find(
      (block: { type: string }) => block.type === 'text'
    );
    return textBlock && 'text' in textBlock
      ? (textBlock as { text: string }).text
      : '';
  }

  throw new Error(
    `Unsupported provider for text generation: ${config.provider}`
  );
}

/**
 * Extracts a fallback title from the problem statement when AI generation fails
 */
function extractFallbackTitle(problemStatement: string): string {
  // Try to get the first sentence
  const firstSentence = problemStatement.split(/[.!?]/)[0]?.trim();

  if (firstSentence && firstSentence.length <= 45) {
    return firstSentence;
  }

  // Truncate intelligently at word boundary
  if (firstSentence) {
    const words = firstSentence.split(' ');
    let title = '';
    for (const word of words) {
      if ((title + ' ' + word).trim().length <= 42) {
        title = (title + ' ' + word).trim();
      } else {
        break;
      }
    }
    return title + '...' || 'Support Request';
  }

  return 'Support Request';
}

/**
 * Creates an AI provider instance from configuration
 */
async function getAIProvider(config: CategoryConfig): Promise<AIProvider> {
  const providerConfig: AIProviderConfig = {
    apiKey: config.apiKey,
    model: config.model,
    temperature: config.temperature ?? 0.3, // Lower temperature for categorization (more deterministic)
    maxTokens: 500,
    timeout: 5000, // 5 second timeout
  };

  return createAIProvider(config.provider as any, providerConfig);
}

/**
 * Parses category result from AI response
 */
function parseCategoryResult(
  response: CategoryResult,
  availableCategories: Category[]
): CategoryResult {
  try {
    // If the response already has a category name, try to match it
    if (response.category) {
      // Try exact match first
      const exactMatch = availableCategories.find(
        (cat) => cat.name.toLowerCase() === response.category.toLowerCase()
      );

      if (exactMatch) {
        return {
          category: exactMatch.name,
          confidence: response.confidence,
          reasoning: response.reasoning,
        };
      }

      // Try partial match
      const partialMatch = availableCategories.find((cat) =>
        cat.name.toLowerCase().includes(response.category.toLowerCase())
      );

      if (partialMatch) {
        return {
          category: partialMatch.name,
          confidence: response.confidence * 0.9, // Slightly lower confidence for partial match
          reasoning: response.reasoning,
        };
      }
    }

    // If reasoning contains JSON, try to parse it
    if (response.reasoning) {
      const jsonMatch = response.reasoning.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Try to match the parsed category name
        const matchedCategory = availableCategories.find(
          (cat) => cat.name.toLowerCase() === parsed.category?.toLowerCase()
        );

        if (matchedCategory) {
          return {
            category: matchedCategory.name,
            confidence: parsed.confidence ?? 0.7,
            reasoning: parsed.reasoning || response.reasoning,
          };
        }
      }
    }
  } catch (error) {
    console.error('Error parsing category result:', error);
  }

  // Fallback: Use "Needs Review" or "Other"
  const fallbackCategory =
    availableCategories.find((cat) => cat.name === 'Needs Review') ||
    availableCategories.find((cat) => cat.name === 'Other') ||
    availableCategories[0];

  return {
    category: fallbackCategory.name,
    confidence: 0.5,
    reasoning: 'Could not determine category from AI response',
  };
}
