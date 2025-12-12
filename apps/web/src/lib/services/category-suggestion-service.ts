/**
 * Category Suggestion Service
 * Story 3.4: Organization Profile & Category Management
 *
 * Generates relevant category suggestions based on the organization's support profile.
 * Uses AI when available, falls back to preset categories otherwise.
 */

import type { SupportProfile, SupportType } from '@easyping/types';

// ============================================================================
// Types
// ============================================================================

export interface CategorySuggestion {
  name: string;
  description: string;
  color: string; // hex color
  icon: string; // Lucide icon name
  confidence: number; // 0-1, how relevant this category is
  isDefault?: boolean; // true for "Other" and "Needs Review"
}

export interface CategorySuggestionConfig {
  provider: 'openai' | 'anthropic' | 'azure';
  model: string;
  apiKey: string;
  baseUrl?: string; // For Azure
}

// ============================================================================
// Preset Categories (Fallback when AI unavailable)
// ============================================================================

const PRESET_COLORS = {
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  purple: '#a855f7',
  pink: '#ec4899',
  teal: '#14b8a6',
  indigo: '#6366f1',
  gray: '#6b7280',
};

const PRESET_CATEGORIES: Record<SupportType, CategorySuggestion[]> = {
  it_support: [
    {
      name: 'Hardware',
      description: 'Computer, monitor, keyboard, mouse issues',
      color: PRESET_COLORS.blue,
      icon: 'Monitor',
      confidence: 0.9,
    },
    {
      name: 'Software',
      description: 'Application installation, updates, crashes',
      color: PRESET_COLORS.purple,
      icon: 'Package',
      confidence: 0.9,
    },
    {
      name: 'Network',
      description: 'Wi-Fi, VPN, connectivity problems',
      color: PRESET_COLORS.teal,
      icon: 'Wifi',
      confidence: 0.9,
    },
    {
      name: 'Access Request',
      description: 'Permission to systems, folders, applications',
      color: PRESET_COLORS.green,
      icon: 'KeyRound',
      confidence: 0.85,
    },
    {
      name: 'Password Reset',
      description: 'Locked accounts, forgotten passwords',
      color: PRESET_COLORS.orange,
      icon: 'Lock',
      confidence: 0.9,
    },
    {
      name: 'Email',
      description: 'Email client, calendar, mailbox issues',
      color: PRESET_COLORS.indigo,
      icon: 'Mail',
      confidence: 0.85,
    },
    {
      name: 'Printer',
      description: 'Printing, scanning, faxing issues',
      color: PRESET_COLORS.gray,
      icon: 'Printer',
      confidence: 0.8,
    },
  ],
  hr_support: [
    {
      name: 'Benefits',
      description: 'Health insurance, retirement, perks questions',
      color: PRESET_COLORS.green,
      icon: 'Heart',
      confidence: 0.9,
    },
    {
      name: 'Payroll',
      description: 'Salary, deductions, direct deposit issues',
      color: PRESET_COLORS.blue,
      icon: 'DollarSign',
      confidence: 0.9,
    },
    {
      name: 'Time Off',
      description: 'PTO, sick leave, vacation requests',
      color: PRESET_COLORS.teal,
      icon: 'Calendar',
      confidence: 0.9,
    },
    {
      name: 'Onboarding',
      description: 'New employee setup, orientation',
      color: PRESET_COLORS.purple,
      icon: 'UserPlus',
      confidence: 0.85,
    },
    {
      name: 'Policy Question',
      description: 'Company policies, handbook, compliance',
      color: PRESET_COLORS.indigo,
      icon: 'BookOpen',
      confidence: 0.85,
    },
    {
      name: 'Training',
      description: 'Courses, certifications, professional development',
      color: PRESET_COLORS.orange,
      icon: 'GraduationCap',
      confidence: 0.8,
    },
  ],
  customer_service: [
    {
      name: 'Billing',
      description: 'Invoices, payments, charges',
      color: PRESET_COLORS.green,
      icon: 'Receipt',
      confidence: 0.9,
    },
    {
      name: 'Orders',
      description: 'Order status, shipping, delivery',
      color: PRESET_COLORS.blue,
      icon: 'Package',
      confidence: 0.9,
    },
    {
      name: 'Returns',
      description: 'Refunds, exchanges, returns',
      color: PRESET_COLORS.orange,
      icon: 'RotateCcw',
      confidence: 0.9,
    },
    {
      name: 'Product Question',
      description: 'Product features, specifications, compatibility',
      color: PRESET_COLORS.purple,
      icon: 'HelpCircle',
      confidence: 0.85,
    },
    {
      name: 'Account Issue',
      description: 'Login problems, account settings, preferences',
      color: PRESET_COLORS.teal,
      icon: 'UserCog',
      confidence: 0.85,
    },
    {
      name: 'Feedback',
      description: 'Suggestions, complaints, compliments',
      color: PRESET_COLORS.pink,
      icon: 'MessageSquare',
      confidence: 0.8,
    },
  ],
  facilities: [
    {
      name: 'Maintenance',
      description: 'Repairs, broken equipment, fixtures',
      color: PRESET_COLORS.orange,
      icon: 'Wrench',
      confidence: 0.9,
    },
    {
      name: 'Safety',
      description: 'Hazards, accidents, safety equipment',
      color: PRESET_COLORS.red,
      icon: 'AlertTriangle',
      confidence: 0.9,
    },
    {
      name: 'Cleaning',
      description: 'Janitorial services, spills, restrooms',
      color: PRESET_COLORS.teal,
      icon: 'Sparkles',
      confidence: 0.85,
    },
    {
      name: 'HVAC',
      description: 'Temperature, air quality, heating/cooling',
      color: PRESET_COLORS.blue,
      icon: 'Thermometer',
      confidence: 0.85,
    },
    {
      name: 'Security',
      description: 'Access badges, alarms, surveillance',
      color: PRESET_COLORS.purple,
      icon: 'Shield',
      confidence: 0.85,
    },
    {
      name: 'Parking',
      description: 'Parking permits, spaces, garage issues',
      color: PRESET_COLORS.gray,
      icon: 'Car',
      confidence: 0.8,
    },
  ],
  general: [
    {
      name: 'Question',
      description: 'General inquiries and questions',
      color: PRESET_COLORS.blue,
      icon: 'HelpCircle',
      confidence: 0.85,
    },
    {
      name: 'Request',
      description: 'Service requests and asks',
      color: PRESET_COLORS.green,
      icon: 'Send',
      confidence: 0.85,
    },
    {
      name: 'Issue',
      description: 'Problems and issues needing resolution',
      color: PRESET_COLORS.orange,
      icon: 'AlertCircle',
      confidence: 0.85,
    },
    {
      name: 'Feedback',
      description: 'Suggestions, ideas, and feedback',
      color: PRESET_COLORS.purple,
      icon: 'MessageSquare',
      confidence: 0.8,
    },
    {
      name: 'Urgent',
      description: 'Time-sensitive matters requiring immediate attention',
      color: PRESET_COLORS.red,
      icon: 'Zap',
      confidence: 0.8,
    },
  ],
  other: [
    {
      name: 'General Inquiry',
      description: 'General questions and requests',
      color: PRESET_COLORS.blue,
      icon: 'HelpCircle',
      confidence: 0.8,
    },
    {
      name: 'Technical Issue',
      description: 'Technical problems and support',
      color: PRESET_COLORS.orange,
      icon: 'AlertCircle',
      confidence: 0.8,
    },
    {
      name: 'Administrative',
      description: 'Administrative requests and tasks',
      color: PRESET_COLORS.purple,
      icon: 'ClipboardList',
      confidence: 0.75,
    },
    {
      name: 'Feedback',
      description: 'Suggestions and feedback',
      color: PRESET_COLORS.green,
      icon: 'MessageSquare',
      confidence: 0.75,
    },
  ],
};

// Default categories that are always included
const DEFAULT_CATEGORIES: CategorySuggestion[] = [
  {
    name: 'Other',
    description: "Pings that don't fit other categories",
    color: PRESET_COLORS.gray,
    icon: 'MoreHorizontal',
    confidence: 1.0,
    isDefault: true, // Required - catch-all for uncategorized pings
  },
];

// ============================================================================
// Main Service Functions
// ============================================================================

/**
 * Suggest categories based on the organization's support profile.
 * Uses AI if config is provided, falls back to presets otherwise.
 */
export async function suggestCategories(
  profile: SupportProfile,
  config?: CategorySuggestionConfig
): Promise<CategorySuggestion[]> {
  // If AI config is provided, try to generate suggestions
  if (config) {
    try {
      const aiSuggestions = await generateAISuggestions(profile, config);
      if (aiSuggestions.length > 0) {
        return [...aiSuggestions, ...DEFAULT_CATEGORIES];
      }
    } catch (error) {
      console.error('Error generating AI category suggestions:', error);
      // Fall through to preset categories
    }
  }

  // Fall back to preset categories
  return getPresetCategories(profile.support_type);
}

/**
 * Get preset categories for a given support type.
 * Always includes default categories (Needs Review, Other).
 * Maps free-form support types to closest preset category.
 */
export function getPresetCategories(
  supportType: SupportType
): CategorySuggestion[] {
  // Direct match first
  if (PRESET_CATEGORIES[supportType]) {
    return [...PRESET_CATEGORIES[supportType], ...DEFAULT_CATEGORIES];
  }

  // Map common free-form types to preset categories
  const normalizedType = supportType.toLowerCase();

  if (
    normalizedType.includes('it') ||
    normalizedType.includes('tech') ||
    normalizedType.includes('helpdesk')
  ) {
    return [...PRESET_CATEGORIES.it_support, ...DEFAULT_CATEGORIES];
  }
  if (
    normalizedType.includes('hr') ||
    normalizedType.includes('human resource')
  ) {
    return [...PRESET_CATEGORIES.hr_support, ...DEFAULT_CATEGORIES];
  }
  if (
    normalizedType.includes('customer') ||
    normalizedType.includes('client')
  ) {
    return [...PRESET_CATEGORIES.customer_service, ...DEFAULT_CATEGORIES];
  }
  if (
    normalizedType.includes('facilities') ||
    normalizedType.includes('building') ||
    normalizedType.includes('maintenance')
  ) {
    return [...PRESET_CATEGORIES.facilities, ...DEFAULT_CATEGORIES];
  }

  // Default to general categories
  return [...PRESET_CATEGORIES.general, ...DEFAULT_CATEGORIES];
}

/**
 * Get all available preset colors.
 */
export function getPresetColors(): Record<string, string> {
  return { ...PRESET_COLORS };
}

/**
 * Get default categories that are always included.
 */
export function getDefaultCategories(): CategorySuggestion[] {
  return [...DEFAULT_CATEGORIES];
}

// ============================================================================
// AI Suggestion Generation
// ============================================================================

const AI_SYSTEM_PROMPT = `You are an AI assistant helping configure a support desk system.

Based on the organization's support profile, suggest 5-8 relevant ticket categories.
Each category should have:
- name: Short, clear name (2-4 words max)
- description: Brief description of what pings fit this category
- color: A hex color from this palette: ${JSON.stringify(PRESET_COLORS)}
- icon: A Lucide icon name (e.g., Monitor, Mail, Lock, HelpCircle, etc.)
- confidence: 0-1 rating of how relevant this category is

Focus on categories that match the specific support context described.
Be specific rather than generic - tailor to their actual needs.

Respond with ONLY valid JSON in this exact format:
{
  "categories": [
    {
      "name": "Category Name",
      "description": "Brief description",
      "color": "#hex",
      "icon": "IconName",
      "confidence": 0.9
    }
  ]
}`;

async function generateAISuggestions(
  profile: SupportProfile,
  config: CategorySuggestionConfig
): Promise<CategorySuggestion[]> {
  const userPrompt = buildUserPrompt(profile);

  try {
    const response = await generateTextCompletion(userPrompt, config);
    return parseAISuggestions(response);
  } catch (error) {
    console.error('AI suggestion generation failed:', error);
    throw error;
  }
}

function buildUserPrompt(profile: SupportProfile): string {
  const parts: string[] = [
    `Organization Support Type: ${profile.support_type}`,
    `Description: ${profile.description}`,
    `Typical Users: ${profile.typical_users}`,
  ];

  if (profile.systems_supported && profile.systems_supported.length > 0) {
    parts.push(`Systems Supported: ${profile.systems_supported.join(', ')}`);
  }

  if (profile.common_issues && profile.common_issues.length > 0) {
    parts.push(`Common Issues: ${profile.common_issues.join(', ')}`);
  }

  return `Please suggest relevant ticket categories for this support team:\n\n${parts.join('\n')}`;
}

function parseAISuggestions(response: string): CategorySuggestion[] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      categories?: CategorySuggestion[];
    };

    if (!parsed.categories || !Array.isArray(parsed.categories)) {
      throw new Error('Invalid categories format');
    }

    // Validate and clean up each category
    return parsed.categories
      .filter((cat) => cat.name && typeof cat.name === 'string')
      .map((cat) => ({
        name: cat.name.trim().slice(0, 50),
        description: (cat.description || '').trim().slice(0, 200),
        color: isValidHexColor(cat.color) ? cat.color : PRESET_COLORS.gray,
        icon: (cat.icon || 'Circle').trim(),
        confidence:
          typeof cat.confidence === 'number'
            ? Math.max(0, Math.min(1, cat.confidence))
            : 0.5,
      }));
  } catch (error) {
    console.error('Failed to parse AI suggestions:', error);
    return [];
  }
}

function isValidHexColor(color: string | undefined): boolean {
  if (!color) return false;
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

// ============================================================================
// AI Provider Integration
// ============================================================================

async function generateTextCompletion(
  prompt: string,
  config: CategorySuggestionConfig
): Promise<string> {
  if (config.provider === 'openai' || config.provider === 'azure') {
    const OpenAI = (await import('openai')).default;

    const client = new OpenAI({
      apiKey: config.apiKey,
      timeout: 15000,
      ...(config.provider === 'azure' && config.baseUrl
        ? {
            baseURL: config.baseUrl,
            defaultHeaders: { 'api-key': config.apiKey },
            defaultQuery: { 'api-version': '2024-02-15-preview' },
          }
        : {}),
    });

    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    return response.choices[0]?.message?.content || '';
  }

  if (config.provider === 'anthropic') {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;

    const client = new Anthropic({
      apiKey: config.apiKey,
      timeout: 15000,
    });

    const response = await client.messages.create({
      model: config.model,
      max_tokens: 1500,
      system: AI_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    return textBlock && 'text' in textBlock ? textBlock.text : '';
  }

  throw new Error(`Unsupported AI provider: ${config.provider}`);
}

// ============================================================================
// Exports
// ============================================================================

export { PRESET_COLORS, PRESET_CATEGORIES, DEFAULT_CATEGORIES };
