import { z } from 'zod';

export const organizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').trim(),
  domain: z.string().optional().nullable(),
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
});

export type OrganizationData = z.infer<typeof organizationSchema>;
export type AdminAccountData = z.infer<typeof adminAccountSchema>;
export type AIConfigData = z.infer<typeof aiConfigSchema>;
export type SetupData = z.infer<typeof setupSchema>;
