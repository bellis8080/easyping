import { z } from 'zod';

export const organizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').trim(),
  domain: z.string().optional().nullable(),
});

export const supportProfileSchema = z.object({
  support_type: z.string().min(1, 'Support type is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  typical_users: z.string().optional(),
  systems_supported: z.array(z.string()).optional(),
  common_issues: z.array(z.string()).optional(),
  ai_generated: z.boolean(),
});

export const categoriesSchema = z.object({
  categories: z
    .array(
      z.object({
        name: z.string().min(1, 'Category name is required'),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
        icon: z.string().optional(),
        is_default: z.boolean().optional(),
      })
    )
    .min(1, 'At least one category is required'),
});

export const adminAccountSchema = z
  .object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().optional(),
    fullName: z.string().min(1, 'Full name is required'),
  })
  .refine(
    (data) => !data.confirmPassword || data.password === data.confirmPassword,
    {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }
  );

export const aiConfigSchema = z
  .object({
    provider: z.enum(['openai', 'anthropic', 'azure', 'skip']),
    apiKey: z.string().optional(),
    model: z.string().optional(),
    embeddingModel: z.string().optional(), // OpenAI embedding model for semantic search
  })
  .refine(
    (data) => {
      if (data.provider !== 'skip' && !data.apiKey) {
        return false;
      }
      return true;
    },
    {
      message: 'API key required when provider is selected',
      path: ['apiKey'],
    }
  );

export const setupSchema = z.object({
  organization: organizationSchema,
  admin: adminAccountSchema,
  aiConfig: aiConfigSchema,
  supportProfile: supportProfileSchema.optional(),
  categories: categoriesSchema.optional(),
});

export type OrganizationData = z.infer<typeof organizationSchema>;
export type AdminAccountData = z.infer<typeof adminAccountSchema>;
export type AIConfigData = z.infer<typeof aiConfigSchema>;
export type SupportProfileData = z.infer<typeof supportProfileSchema>;
export type CategoriesData = z.infer<typeof categoriesSchema>;
export type SetupData = z.infer<typeof setupSchema>;
