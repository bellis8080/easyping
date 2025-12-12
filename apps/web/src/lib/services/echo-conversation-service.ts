/**
 * Echo Conversation Service
 * Story 3.3: Auto-Categorization of Pings with Conversational Clarification
 *
 * Implements the problem-first conversation logic for Echo AI assistant.
 * Echo asks clarifying questions to understand the PROBLEM, not to categorize early.
 */

/**
 * Result of conversation analysis
 */
export interface ConversationAnalysis {
  problemUnderstood: boolean;
  nextQuestion?: string;
  problemStatement?: string;
  confidence: number;
  outOfScope?: boolean;
  outOfScopeResponse?: string;
}

/**
 * A message in the conversation with role information
 */
export interface ConversationMessage {
  role: 'user' | 'echo' | 'system';
  content: string;
}

/**
 * Organization's support profile context
 */
export interface SupportProfileContext {
  support_type: string;
  description: string;
  typical_users: string;
  common_issues?: string[];
}

/**
 * Configuration for Echo conversation
 */
export interface EchoConfig {
  provider: string;
  model: string;
  apiKey: string;
  temperature?: number;
  supportProfile?: SupportProfileContext;
}

/**
 * Builds support context description for prompts
 */
function buildSupportContext(profile?: SupportProfileContext): {
  supportType: string;
  supportDescription: string;
  inScopeExamples: string;
  outOfScopeExamples: string;
} {
  if (!profile) {
    // Fallback to generic support (shouldn't happen in practice)
    return {
      supportType: 'support',
      supportDescription: 'general support requests',
      inScopeExamples: 'issues, requests, or questions related to their work',
      outOfScopeExamples:
        'personal matters or topics clearly unrelated to work',
    };
  }

  // Build examples from common_issues if available
  const inScopeExamples = profile.common_issues?.length
    ? profile.common_issues.slice(0, 5).join(', ')
    : `issues related to ${profile.support_type}`;

  return {
    supportType: profile.support_type,
    supportDescription: profile.description,
    inScopeExamples,
    outOfScopeExamples: `topics unrelated to ${profile.support_type}`,
  };
}

/**
 * Analyzes conversation to determine if problem is understood
 * and generates next action (question or problem statement)
 *
 * @param conversation - Full conversation history with roles
 * @param config - AI provider configuration
 * @returns Analysis with problem understanding status and next action
 */
export async function analyzeConversation(
  conversation: ConversationMessage[],
  config: EchoConfig
): Promise<ConversationAnalysis> {
  // Format conversation with clear role labels
  const conversationText = conversation
    .map((msg) => {
      const speaker =
        msg.role === 'user' ? 'User' : msg.role === 'echo' ? 'Echo' : 'System';
      return `${speaker}: ${msg.content}`;
    })
    .join('\n');

  // Get support context from profile
  const ctx = buildSupportContext(config.supportProfile);

  // Build prompt that focuses on problem understanding with full context
  const prompt = `You are Echo, an AI support assistant for **${ctx.supportType}**. Your organization handles: ${ctx.supportDescription}

Your goal is to understand the user's request or issue through conversation. Users are typically: ${config.supportProfile?.typical_users || 'organization members'}.

**CRITICAL RULE - READ THIS FIRST:**
You CANNOT create a problem statement until you know WHAT SPECIFIC THING the user needs help with.
- "I need help" is NOT specific enough → you MUST ask "What specifically do you need help with?"
- "It's not working" is NOT specific enough → you MUST ask "What exactly isn't working?"
- "I have a question" is NOT specific enough → you MUST ask "What's your question about?"

DO NOT say "problemUnderstood: true" unless you can identify the SPECIFIC topic, request, or issue.

Here is the conversation so far:

${conversationText}

CONVERSATION CONTEXT:
- You are Echo (the "Echo" messages above are YOUR previous responses)
- Build on what you've learned - DON'T repeat questions you already asked
- If user gives vague answers to 3+ questions, summarize what you know and move forward

SUPPORT SCOPE for ${ctx.supportType}:
✓ IN SCOPE - topics you can help with: ${ctx.inScopeExamples}
✗ OUT OF SCOPE - redirect politely: ${ctx.outOfScopeExamples}

IMPORTANT: Not every message is a problem or issue! Users may have:
- Questions (needing information, not fixes)
- Requests (wanting something done, not a problem)
- Feedback (sharing thoughts, not needing action)
- Actual issues (something broken or not working)

Adapt your problem statement format accordingly:
- For ISSUES: "User struggles with [problem] because [cause], resulting in [impact]."
- For QUESTIONS: "User wants to know [topic/question]."
- For REQUESTS: "User requests [what they want], for [reason if given]."
- For FEEDBACK: "User provides feedback about [topic]: [summary]."

IMPORTANT - CAPTURE ALL USER NEEDS:
- If the user mentions MULTIPLE things, include ALL of them
- Use "and" to connect multiple items
- Don't drop secondary requests - they're often equally important

Respond with JSON:

If the request is OUT OF SCOPE (not related to ${ctx.supportType}):
{
  "outOfScope": true,
  "outOfScopeResponse": "A polite message explaining what you CAN help with. For example: 'I'm Echo, your ${ctx.supportType} assistant. I can help with ${ctx.inScopeExamples}. Is there something in that area I can help you with today?'",
  "confidence": 0.95
}

If you understand the SPECIFIC request/issue/question:
{
  "problemUnderstood": true,
  "problemStatement": "[Appropriate format based on type - see above]",
  "confidence": 0.XX
}

If the user's message is too vague:
{
  "problemUnderstood": false,
  "nextQuestion": "A friendly question to get more details about their specific need",
  "confidence": 0.XX
}

Respond with ONLY valid JSON.`;

  try {
    console.log('=== ECHO ANALYZE CONVERSATION ===');
    console.log('Prompt being sent to AI:');
    console.log(prompt);
    console.log('=================================');

    const systemPrompt = `You are Echo, an AI assistant for ${ctx.supportType}. You are continuing a conversation. Respond with JSON only.`;
    const response = await generateTextCompletion(prompt, config, systemPrompt);

    console.log('=== AI RESPONSE ===');
    console.log(response);
    console.log('===================');

    const analysis = parseAnalysisFromResponse(response);

    console.log('=== PARSED ANALYSIS ===');
    console.log(JSON.stringify(analysis, null, 2));
    console.log('=======================');

    return analysis;
  } catch (error) {
    console.error('Error analyzing conversation:', error);

    // Fallback: Generate a generic question
    const userMessages = conversation.filter((m) => m.role === 'user');
    if (userMessages.length < 2) {
      return {
        problemUnderstood: false,
        nextQuestion: 'Can you tell me more about what exactly is happening?',
        confidence: 0.3,
      };
    }

    // If we have enough conversation but AI failed, generate a basic problem statement using proper format
    const lastMeaningfulMessage = userMessages
      .map((m) => m.content)
      .filter((msg) => msg.length > 10)
      .pop();
    return {
      problemUnderstood: true,
      problemStatement: lastMeaningfulMessage
        ? `User struggles with ${lastMeaningfulMessage.substring(0, 100)} because of an unidentified issue, resulting in need for assistance.`
        : 'User struggles with an unspecified issue because details were not provided, resulting in unknown impact.',
      confidence: 0.4,
    };
  }
}

/**
 * Generates a problem-focused follow-up question
 *
 * @param conversation - Full conversation history with roles
 * @param config - AI provider configuration
 * @returns Next clarifying question
 */
export async function generateNextQuestion(
  conversation: ConversationMessage[],
  config: EchoConfig
): Promise<string> {
  const analysis = await analyzeConversation(conversation, config);

  if (analysis.problemUnderstood) {
    // Shouldn't reach here, but if we do, ask for confirmation
    return 'Is there anything else I should know about this issue?';
  }

  return (
    analysis.nextQuestion ||
    'Can you provide more details about what you are experiencing?'
  );
}

/**
 * Generates a problem statement from the conversation
 *
 * @param conversation - Full conversation history with roles
 * @param config - AI provider configuration
 * @returns Problem statement - a clear summary of what the user needs help with
 */
export async function generateProblemStatement(
  conversation: ConversationMessage[],
  config: EchoConfig
): Promise<string> {
  // Format conversation with clear role labels
  const conversationText = conversation
    .map((msg) => {
      const speaker =
        msg.role === 'user' ? 'User' : msg.role === 'echo' ? 'Echo' : 'System';
      return `${speaker}: ${msg.content}`;
    })
    .join('\n');

  // Get support context
  const ctx = buildSupportContext(config.supportProfile);

  const prompt = `Analyze this ${ctx.supportType} conversation and create a summary statement.

Conversation:
${conversationText}

Context: This is a ${ctx.supportType} team that handles: ${ctx.supportDescription}

IMPORTANT: Not everything is a "problem" or "issue". Adapt the format based on what the user needs:

For ISSUES/PROBLEMS (something broken or not working):
- Format: "User struggles with [problem] because [cause], resulting in [impact]."

For QUESTIONS (seeking information):
- Format: "User wants to know [topic/question]."

For REQUESTS (wanting something done):
- Format: "User requests [what they want], for [reason if given]."

For FEEDBACK (sharing thoughts):
- Format: "User provides feedback about [topic]: [summary]."

Guidelines:
- Choose the appropriate format based on the user's actual need
- If unknown root cause, say "because of an unidentified issue" (for problems only)
- Capture ALL user needs if they mention multiple things

Respond with ONLY the statement - no quotes, no additional text, no explanation.`;

  try {
    const response = await generateTextCompletion(
      prompt,
      config,
      `You are a ${ctx.supportType} ticket summarizer. Create clear, concise statements.`
    );

    let statement = response.trim();
    // Strip surrounding quotes if AI added them despite instructions
    if (
      (statement.startsWith('"') && statement.endsWith('"')) ||
      (statement.startsWith("'") && statement.endsWith("'"))
    ) {
      statement = statement.slice(1, -1);
    }
    if (statement && statement.length > 10) {
      return statement.substring(0, 500);
    }

    // Fallback if AI returns empty/short response
    const userMessages = conversation
      .filter((m) => m.role === 'user')
      .map((m) => m.content);
    return generateFallbackProblemStatement(userMessages);
  } catch (error) {
    console.error('Error generating problem statement:', error);
    const userMessages = conversation
      .filter((m) => m.role === 'user')
      .map((m) => m.content);
    return generateFallbackProblemStatement(userMessages);
  }
}

/**
 * Generates a fallback problem statement when AI fails
 * Uses the proper format: [User] struggles with [problem] because [cause], resulting in [impact]
 */
function generateFallbackProblemStatement(conversation: string[]): string {
  // Find the most meaningful message (longest one that looks like a real description)
  const meaningfulMessages = conversation
    .filter((msg) => msg.length > 15 && !isSingleWord(msg))
    .sort((a, b) => b.length - a.length);

  if (meaningfulMessages.length > 0) {
    const bestMessage = meaningfulMessages[0];
    // Clean it up and use proper format
    const cleaned = bestMessage.substring(0, 100).trim();
    return `User struggles with ${cleaned} because of an unidentified issue, resulting in need for assistance.`;
  }

  // If all messages are very short/vague
  const lastMessage = conversation[conversation.length - 1] || '';
  if (lastMessage.length > 5) {
    return `User struggles with "${lastMessage.substring(0, 50)}" because details were not provided, resulting in unclear impact.`;
  }

  return 'User struggles with an unspecified issue because details were not provided, resulting in unknown impact.';
}

/**
 * Checks if a string is essentially a single word or very short phrase
 */
function isSingleWord(str: string): boolean {
  const words = str.trim().split(/\s+/);
  return words.length <= 2;
}

/**
 * Result of analyzing user's confirmation response
 */
export interface ConfirmationAnalysis {
  intent: 'confirm' | 'deny' | 'clarify' | 'unclear';
  echoResponse?: string;
  confidence: number;
}

/**
 * Uses AI to understand user's response to a confirmation question
 * Instead of keyword matching, this understands the actual intent
 *
 * @param userMessage - The user's response message
 * @param problemStatement - The problem statement we asked them to confirm
 * @param config - AI provider configuration
 * @returns Analysis of user's intent with suggested Echo response
 */
export async function analyzeUserConfirmation(
  userMessage: string,
  problemStatement: string,
  config: EchoConfig
): Promise<ConfirmationAnalysis> {
  const prompt = `You are Echo, an AI support assistant. A user was asked to confirm this problem statement:

"${problemStatement}"

The user responded: "${userMessage}"

Analyze the user's response and determine their intent:

1. "confirm" - User agrees the problem statement is correct (e.g., "yes", "that's right", "correct", "yep", affirmative responses)
2. "deny" - User says it's wrong or provides corrections (e.g., "no", "that's not it", "actually the problem is...")
3. "clarify" - User provides additional information or details about their problem (even if not directly saying yes/no)
4. "unclear" - Response doesn't clearly relate to confirming or denying (random words, off-topic, nonsensical)

IMPORTANT: If the user provides NEW information about their problem (even without saying "no"), treat it as "clarify" since they're giving us more details.

Respond with JSON:
{
  "intent": "confirm" | "deny" | "clarify" | "unclear",
  "echoResponse": "A natural, conversational response Echo should give (1-2 sentences). For 'clarify', acknowledge the new info and confirm understanding. For 'unclear', ask a specific clarifying question.",
  "confidence": 0.XX
}

Examples:
- User: "yes" → {"intent": "confirm", "confidence": 0.95}
- User: "no, it's actually a printer issue" → {"intent": "deny", "echoResponse": "Got it, so the issue is with your printer, not what I mentioned. Can you tell me more about what's happening with the printer?", "confidence": 0.9}
- User: "I also can't access my email" → {"intent": "clarify", "echoResponse": "Thanks for that additional detail - so you're also having trouble accessing your email. Let me update my understanding of the issue.", "confidence": 0.85}
- User: "blue" → {"intent": "unclear", "echoResponse": "I'm not sure I understood your response. Were you able to confirm that my understanding of the issue is correct? Or is there something different going on?", "confidence": 0.3}

Respond with ONLY valid JSON.`;

  try {
    const response = await generateTextCompletion(
      prompt,
      config,
      'You are Echo, an AI assistant analyzing user responses. Respond with JSON only.'
    );

    return parseConfirmationResponse(response, userMessage);
  } catch (error) {
    console.error('Error analyzing user confirmation:', error);
    // Fallback - try simple keyword matching as backup
    return fallbackConfirmationAnalysis(userMessage);
  }
}

/**
 * Parses the AI response for confirmation analysis
 */
function parseConfirmationResponse(
  response: string,
  userMessage: string
): ConfirmationAnalysis {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        intent: parsed.intent || 'unclear',
        echoResponse: parsed.echoResponse,
        confidence: parsed.confidence ?? 0.5,
      };
    }
  } catch (error) {
    console.error('Error parsing confirmation response:', error);
  }

  // Fallback to simple analysis
  return fallbackConfirmationAnalysis(userMessage);
}

/**
 * Simple fallback confirmation analysis using basic keyword matching
 * Only used when AI fails
 */
function fallbackConfirmationAnalysis(
  userMessage: string
): ConfirmationAnalysis {
  const lower = userMessage.toLowerCase().trim();

  // Clear confirmations
  if (
    /^(yes|yep|yeah|correct|right|exactly|confirmed|true|ok|okay)$/i.test(lower)
  ) {
    return { intent: 'confirm', confidence: 0.8 };
  }

  // Clear denials
  if (/^(no|nope|wrong|incorrect|not right)$/i.test(lower)) {
    return { intent: 'deny', confidence: 0.8 };
  }

  // If message is longer, assume it's clarification/new info
  if (userMessage.length > 15) {
    return {
      intent: 'clarify',
      echoResponse: `Thanks for that additional information. Let me update my understanding of your issue.`,
      confidence: 0.6,
    };
  }

  // Default to unclear for short, ambiguous responses
  return {
    intent: 'unclear',
    echoResponse: `I'm not sure I understood. Could you tell me if my understanding of your issue was correct, or let me know what's different?`,
    confidence: 0.3,
  };
}

/**
 * Determines if Echo should escalate to a human agent
 *
 * @param conversation - Full conversation history with roles
 * @param clarificationCount - Number of questions asked so far
 * @param config - AI provider configuration
 * @returns True if should escalate, false if should continue
 */
export async function determineWhenToEscalate(
  conversation: ConversationMessage[],
  clarificationCount: number,
  config: EchoConfig
): Promise<boolean> {
  // Hard limit at 5 questions - anything beyond is frustrating
  if (clarificationCount >= 5) {
    return true;
  }

  // Check for explicit requests for human help in user messages
  const userMessages = conversation.filter((m) => m.role === 'user');
  const lastMessage =
    userMessages[userMessages.length - 1]?.content.toLowerCase() || '';
  if (
    lastMessage.includes('talk to') ||
    lastMessage.includes('speak to') ||
    lastMessage.includes('human') ||
    lastMessage.includes('real person') ||
    lastMessage.includes('agent') ||
    lastMessage.includes("don't understand") ||
    lastMessage.includes('stop asking') ||
    lastMessage.includes('already told you')
  ) {
    return true;
  }

  // If approaching limit (3+ questions), let AI decide if making progress
  if (clarificationCount >= 3) {
    // Format conversation with clear role labels
    const conversationText = conversation
      .map((msg) => {
        const speaker =
          msg.role === 'user'
            ? 'User'
            : msg.role === 'echo'
              ? 'Echo'
              : 'System';
        return `${speaker}: ${msg.content}`;
      })
      .join('\n');

    const prompt = `Analyze if this conversation is making progress or if we should escalate to a human agent.

Conversation (${clarificationCount} questions asked so far):
${conversationText}

Factors to consider:
- Are responses getting more vague or unhelpful?
- Are we asking the same thing in different ways?
- Is the user getting frustrated?
- Is there enough information to create a ticket?

Respond with JSON:
{
  "shouldEscalate": true/false,
  "reason": "Brief explanation"
}`;

    try {
      const response = await generateTextCompletion(
        prompt,
        config,
        'You are analyzing support conversations to determine if they should be escalated to a human.'
      );
      const decision = parseEscalationDecision(response);
      return decision;
    } catch (_error) {
      // On error, be cautious and escalate if we're close to limit
      return clarificationCount >= 4;
    }
  }

  // Continue conversation
  return false;
}

/**
 * Generates a text completion using the configured AI provider
 * This is used for free-form text generation that doesn't fit the categorize() method
 */
async function generateTextCompletion(
  prompt: string,
  config: EchoConfig,
  systemPrompt: string
): Promise<string> {
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
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || '';
  } else if (config.provider === 'anthropic') {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;

    const client = new Anthropic({
      apiKey: config.apiKey,
    });

    const response = await client.messages.create({
      model: config.model,
      max_tokens: 500,
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

/**
 * Checks if a problem statement is too vague and needs more specificity
 * Returns true if the statement contains markers indicating vagueness
 */
function isProblemStatementTooVague(problemStatement: string): boolean {
  if (!problemStatement) return true;

  const lower = problemStatement.toLowerCase();

  // Markers that indicate the AI couldn't identify the specific system/application
  const vagueMarkers = [
    'unspecified',
    'unidentified',
    'unknown system',
    'unknown application',
    'unknown device',
    'a service',
    'a system',
    'an application',
    'something',
    'the network', // Too generic without specifying VPN, WiFi, etc.
    'online resources', // Too generic
  ];

  for (const marker of vagueMarkers) {
    if (lower.includes(marker)) {
      return true;
    }
  }

  return false;
}

/**
 * Parses conversation analysis from AI response
 */
function parseAnalysisFromResponse(response: string): ConversationAnalysis {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Handle out-of-scope responses
      if (parsed.outOfScope) {
        return {
          problemUnderstood: false,
          outOfScope: true,
          outOfScopeResponse:
            parsed.outOfScopeResponse ||
            "I'm Echo, your support assistant. Is there something specific I can help you with today?",
          confidence: parsed.confidence ?? 0.95,
        };
      }

      // VALIDATION: If AI says problem is understood but statement is too vague,
      // override and force a follow-up question
      if (parsed.problemUnderstood && parsed.problemStatement) {
        if (isProblemStatementTooVague(parsed.problemStatement)) {
          console.log(
            'Problem statement too vague, forcing follow-up question:',
            parsed.problemStatement
          );
          return {
            problemUnderstood: false,
            nextQuestion:
              'What specifically are you trying to connect to or access? For example: VPN, WiFi, email, a website, or a specific application?',
            confidence: 0.3,
          };
        }
      }

      return {
        problemUnderstood: parsed.problemUnderstood ?? false,
        nextQuestion: parsed.nextQuestion,
        problemStatement: parsed.problemStatement,
        confidence: parsed.confidence ?? 0.5,
      };
    }
  } catch (error) {
    console.error('Error parsing analysis response:', error);
  }

  // Fallback
  return {
    problemUnderstood: false,
    nextQuestion: 'Can you tell me more about the issue?',
    confidence: 0.3,
  };
}

/**
 * Parses escalation decision from AI response
 */
function parseEscalationDecision(response: string): boolean {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.shouldEscalate ?? true;
    }
  } catch (error) {
    console.error('Error parsing escalation decision:', error);
  }

  // Default to escalate on parse error
  return true;
}
