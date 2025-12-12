/**
 * Profile Interview Service
 * Story 3.4: Organization Profile & Category Management
 *
 * Implements Echo's conversational interview to understand the organization's
 * support needs during setup. Similar pattern to echo-conversation-service.ts
 * but focused on understanding the organization rather than a specific problem.
 */

import type { SupportProfile, SupportType } from '@easyping/types';

/**
 * A message in the interview conversation
 */
export interface InterviewMessage {
  role: 'user' | 'echo';
  content: string;
}

/**
 * Result of continuing the interview
 */
export interface InterviewResult {
  complete: boolean;
  nextQuestion?: string;
  profile?: SupportProfile;
  confidence: number;
}

/**
 * Configuration for AI provider (same as EchoConfig)
 */
export interface ProfileInterviewConfig {
  provider: string;
  model: string;
  apiKey: string;
  temperature?: number;
}

/**
 * Opening question for Echo profile interview
 */
export const INTERVIEW_OPENING =
  "Hi! I'm Echo, your AI support assistant. To help configure EasyPing for your organization, I'd like to learn about your support needs. What type of support does your team provide? For example: IT helpdesk, HR support, customer service, facilities management, or something else?";

/**
 * Maximum number of questions before completing the interview
 */
const MAX_QUESTIONS = 4;

/**
 * Starts a new profile interview
 * @returns The opening question from Echo
 */
export function startInterview(): string {
  return INTERVIEW_OPENING;
}

/**
 * Continues the interview based on the conversation so far
 *
 * @param conversation - Full conversation history
 * @param config - AI provider configuration
 * @returns Interview result with next question or completed profile
 */
export async function continueInterview(
  conversation: InterviewMessage[],
  config: ProfileInterviewConfig
): Promise<InterviewResult> {
  // Count Echo messages (questions asked)
  const questionsAsked = conversation.filter((m) => m.role === 'echo').length;

  // If we've asked enough questions, generate the profile
  if (questionsAsked >= MAX_QUESTIONS) {
    const profile = await generateProfile(conversation, config);
    return {
      complete: true,
      profile,
      confidence: 0.8,
    };
  }

  // Format conversation for AI
  const conversationText = conversation
    .map((msg) => {
      const speaker = msg.role === 'user' ? 'User' : 'Echo';
      return `${speaker}: ${msg.content}`;
    })
    .join('\n');

  const prompt = `You are Echo, a friendly AI assistant helping a user set up EasyPing (a support desk/ticketing system). You're having a brief conversation to understand what kind of support their team provides so you can suggest relevant ticket categories.

CONVERSATION SO FAR:
${conversationText}

YOUR GOAL:
Learn enough to create a support profile with:
1. Support type (product support, IT helpdesk, HR, customer service, facilities, or general)
2. What kinds of issues/requests the team handles
3. Who submits requests (customers, employees, partners, etc.)
4. Common issue types (for category suggestions)

QUESTIONS ASKED SO FAR: ${questionsAsked}

HOW TO RESPOND:
- Be CONVERSATIONAL - acknowledge what they said, respond to questions, make it feel like a real chat
- If they ask YOU a question (like "what else do you think?" or "any suggestions?"), ANSWER IT helpfully based on what you know about their support type, then smoothly continue gathering info
- Don't just robotically ask the next question - engage with their responses first
- Keep responses friendly but concise (2-3 sentences max before your question)
- NEVER ask what tools/systems they use for support - they're setting up EasyPing right now!
- Focus only on: what support they provide, who they help, and common request types
- After 3-4 exchanges, wrap up if you have enough info (support type + users + some common issues)

EXAMPLES OF GOOD ENGAGEMENT:
- User says "installation, feature requests, bug reports... what else?" → "For product support, you might also see onboarding questions, documentation requests, or integration help. Do your customers..."
- User says "mostly internal employees" → "Got it! Internal support often involves things like..."

RESPONSE FORMAT (JSON only):

If you have enough info (support type + users + at least 2-3 issue types):
{
  "complete": true,
  "profile": {
    "support_type": "A concise label like 'Product Support', 'IT Support', 'Customer Service', etc.",
    "description": "Brief summary of what this support team handles",
    "typical_users": "Who submits requests",
    "common_issues": ["issue type 1", "issue type 2", "etc"]
  },
  "confidence": 0.8
}

If continuing the conversation:
{
  "complete": false,
  "nextQuestion": "Your conversational response (acknowledge + answer any questions + your follow-up)",
  "confidence": 0.5
}

JSON only, no other text.`;

  try {
    const response = await generateTextCompletion(prompt, config);
    return parseInterviewResponse(response);
  } catch (error) {
    console.error('Error continuing interview:', error);

    // Fallback: generate a generic follow-up question
    const fallbackQuestions = [
      'Could you tell me more about the types of issues or requests your team typically handles?',
      'Who are the main people that will be submitting support requests?',
      'Are there any specific systems, applications, or tools that your support team helps with?',
      'What would you say are the most common types of requests you receive?',
    ];

    const nextQuestion =
      fallbackQuestions[questionsAsked % fallbackQuestions.length];

    return {
      complete: false,
      nextQuestion,
      confidence: 0.3,
    };
  }
}

/**
 * Generates a structured support profile from the conversation
 *
 * @param conversation - Full interview conversation
 * @param config - AI provider configuration
 * @returns Structured support profile
 */
export async function generateProfile(
  conversation: InterviewMessage[],
  config: ProfileInterviewConfig
): Promise<SupportProfile> {
  const conversationText = conversation
    .map((msg) => {
      const speaker = msg.role === 'user' ? 'User' : 'Echo';
      return `${speaker}: ${msg.content}`;
    })
    .join('\n');

  const prompt = `Analyze this interview conversation and extract a structured support profile.

CONVERSATION:
${conversationText}

Create a support profile with these fields:
- support_type: A concise, human-readable label for this type of support (e.g., "Product Support", "IT Helpdesk", "Customer Service", "HR Support", "Sales Operations", "Legal", etc.)
- description: A 2-3 sentence summary of what this support team handles (based on what the user said)
- typical_users: Who submits support requests
- systems_supported: Array of systems/tools mentioned (or empty array if none)
- common_issues: Array of common issue types mentioned (or empty array if none)

GUIDELINES for support_type:
- Create a clear, descriptive label based on what the user described
- Use title case (e.g., "Product Support" not "product_support")
- Keep it concise (2-3 words max)
- Common examples: IT Support, HR Support, Customer Service, Product Support, Sales Operations, Legal, Finance, Facilities

Respond with JSON only:
{
  "support_type": "...",
  "description": "...",
  "typical_users": "...",
  "systems_supported": [...] or [],
  "common_issues": [...] or []
}`;

  try {
    const response = await generateTextCompletion(prompt, config);
    return parseProfileFromResponse(response);
  } catch (error) {
    console.error('Error generating profile:', error);
    return createFallbackProfile(conversation);
  }
}

/**
 * Parses interview response from AI
 */
function parseInterviewResponse(response: string): InterviewResult {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.complete && parsed.profile) {
        const now = new Date().toISOString();
        return {
          complete: true,
          profile: {
            support_type: parsed.profile.support_type || 'general',
            description: parsed.profile.description || '',
            typical_users: parsed.profile.typical_users || '',
            systems_supported: parsed.profile.systems_supported || undefined,
            common_issues: parsed.profile.common_issues || undefined,
            ai_generated: true,
            created_at: now,
            updated_at: now,
          },
          confidence: parsed.confidence ?? 0.7,
        };
      }

      return {
        complete: false,
        nextQuestion:
          parsed.nextQuestion ||
          'What else should I know about your support team?',
        confidence: parsed.confidence ?? 0.5,
      };
    }
  } catch (error) {
    console.error('Error parsing interview response:', error);
  }

  return {
    complete: false,
    nextQuestion:
      "Could you tell me more about your support team's responsibilities?",
    confidence: 0.3,
  };
}

/**
 * Parses profile from AI response
 */
function parseProfileFromResponse(response: string): SupportProfile {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const now = new Date().toISOString();

      return {
        support_type: validateSupportType(parsed.support_type),
        description:
          parsed.description || 'Support team handling various requests.',
        typical_users: parsed.typical_users || 'Organization members',
        systems_supported: Array.isArray(parsed.systems_supported)
          ? parsed.systems_supported
          : undefined,
        common_issues: Array.isArray(parsed.common_issues)
          ? parsed.common_issues
          : undefined,
        ai_generated: true,
        created_at: now,
        updated_at: now,
      };
    }
  } catch (error) {
    console.error('Error parsing profile response:', error);
  }

  // Return a generic profile
  const now = new Date().toISOString();
  return {
    support_type: 'General Support',
    description: 'Support team handling various requests.',
    typical_users: 'Organization members',
    ai_generated: true,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Validates and returns a valid support type (now accepts any non-empty string)
 */
function validateSupportType(value: string | undefined): SupportType {
  if (value && value.trim().length > 0) {
    return value.trim();
  }
  return 'General Support';
}

/**
 * Creates a fallback profile when AI fails
 */
function createFallbackProfile(
  conversation: InterviewMessage[]
): SupportProfile {
  // Try to extract some info from user messages
  const userMessages = conversation
    .filter((m) => m.role === 'user')
    .map((m) => m.content.toLowerCase())
    .join(' ');

  let supportType: SupportType = 'General Support';

  // Simple keyword matching for support type using word boundaries
  // to avoid false positives (e.g., "it" matching inside "Benefits")
  const hasWord = (text: string, word: string): boolean => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(text);
  };

  if (
    hasWord(userMessages, 'it') ||
    hasWord(userMessages, 'tech') ||
    hasWord(userMessages, 'computer') ||
    hasWord(userMessages, 'software') ||
    hasWord(userMessages, 'helpdesk')
  ) {
    supportType = 'IT Support';
  } else if (
    hasWord(userMessages, 'hr') ||
    userMessages.includes('human resources') ||
    hasWord(userMessages, 'employee') ||
    hasWord(userMessages, 'payroll') ||
    hasWord(userMessages, 'benefits')
  ) {
    supportType = 'HR Support';
  } else if (
    hasWord(userMessages, 'customer') ||
    hasWord(userMessages, 'sales') ||
    hasWord(userMessages, 'order')
  ) {
    supportType = 'Customer Service';
  } else if (
    hasWord(userMessages, 'facilities') ||
    hasWord(userMessages, 'building') ||
    hasWord(userMessages, 'maintenance')
  ) {
    supportType = 'Facilities';
  } else if (
    hasWord(userMessages, 'product') ||
    hasWord(userMessages, 'feature') ||
    hasWord(userMessages, 'bug')
  ) {
    supportType = 'Product Support';
  }

  const now = new Date().toISOString();

  return {
    support_type: supportType,
    description: 'Support team providing assistance to users.',
    typical_users: 'Organization members',
    ai_generated: false,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Generates a text completion using the configured AI provider
 */
async function generateTextCompletion(
  prompt: string,
  config: ProfileInterviewConfig
): Promise<string> {
  const systemPrompt =
    'You are Echo, an AI assistant helping configure a support desk system. Respond with JSON only.';

  if (config.provider === 'openai' || config.provider === 'azure') {
    const OpenAI = (await import('openai')).default;

    const client = new OpenAI({
      apiKey: config.apiKey,
      timeout: 15000,
    });

    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: config.temperature ?? 0.7,
      max_tokens: 800,
    });

    return response.choices[0]?.message?.content || '';
  } else if (config.provider === 'anthropic') {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;

    const client = new Anthropic({
      apiKey: config.apiKey,
    });

    const response = await client.messages.create({
      model: config.model,
      max_tokens: 800,
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
