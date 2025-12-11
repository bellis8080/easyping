import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { setupSchema } from '@/lib/schemas/setup';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'openai':
      return 'gpt-4o-mini'; // Updated to cost-optimized model
    case 'anthropic':
      return 'claude-3-haiku-20240307';
    case 'azure':
      return ''; // Azure uses custom deployment names
    default:
      return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 requests per 15 minutes per IP
    // This prevents abuse while allowing legitimate retries if setup fails
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, {
      limit: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many setup attempts. Please try again later.',
          resetAt: new Date(rateLimit.resetAt).toISOString(),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(
              (rateLimit.resetAt - Date.now()) / 1000
            ).toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          },
        }
      );
    }

    const body = await request.json();

    // Validate request body
    const validationResult = setupSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Create Supabase client with service role (admin privileges)
    // Use internal URL for server-side operations, fall back to public URL for client-side
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if setup is already complete
    const { count } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Setup already completed' },
        { status: 400 }
      );
    }

    // Create organization first (we need the org ID for encryption)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: data.organization.name,
        domain: data.organization.domain || null,
      })
      .select()
      .single();

    if (orgError) {
      console.error('Organization creation error:', orgError);
      throw new Error(`Failed to create organization: ${orgError.message}`);
    }

    // Create default categories for the organization
    const { error: categoriesError } = await supabase
      .from('categories')
      .insert([
        {
          tenant_id: org.id,
          name: 'Software Issue',
          description:
            'Problems with applications, software crashes, errors, or performance issues',
          color: '#3B82F6',
          sort_order: 10,
        },
        {
          tenant_id: org.id,
          name: 'Hardware Issue',
          description: 'Computer, printer, phone, or other hardware problems',
          color: '#EF4444',
          sort_order: 20,
        },
        {
          tenant_id: org.id,
          name: 'Network & Connectivity',
          description: 'Internet, WiFi, VPN, or network access problems',
          color: '#10B981',
          sort_order: 30,
        },
        {
          tenant_id: org.id,
          name: 'Account & Access',
          description:
            'Login issues, password resets, permissions, account setup',
          color: '#F59E0B',
          sort_order: 40,
        },
        {
          tenant_id: org.id,
          name: 'Email & Communication',
          description:
            'Email delivery, calendar, messaging, or communication tools',
          color: '#8B5CF6',
          sort_order: 50,
        },
        {
          tenant_id: org.id,
          name: 'Security',
          description:
            'Security concerns, suspicious activity, phishing, malware',
          color: '#DC2626',
          sort_order: 60,
        },
        {
          tenant_id: org.id,
          name: 'Request for Service',
          description:
            'New equipment, software installation, account creation, access requests',
          color: '#06B6D4',
          sort_order: 70,
        },
        {
          tenant_id: org.id,
          name: 'How-To / Training',
          description:
            'Questions about how to use software, features, or services',
          color: '#84CC16',
          sort_order: 80,
        },
        {
          tenant_id: org.id,
          name: 'Other',
          description: 'Issues that do not fit into other categories',
          color: '#6B7280',
          sort_order: 90,
        },
      ]);

    if (categoriesError) {
      console.error('Categories creation error:', categoriesError);
      // Rollback: delete organization
      await supabase.from('organizations').delete().eq('id', org.id);
      throw new Error('Failed to create default categories');
    }

    // Encrypt and save AI config if provided
    if (data.aiConfig.provider !== 'skip' && data.aiConfig.apiKey) {
      // Encrypt API key using database function
      const { data: encryptedKey, error: encryptError } = await supabase.rpc(
        'encrypt_api_key',
        {
          api_key: data.aiConfig.apiKey,
          org_id: org.id,
        }
      );

      if (encryptError || !encryptedKey) {
        console.error('API key encryption error:', encryptError);
        // Rollback: delete organization
        await supabase.from('organizations').delete().eq('id', org.id);
        throw new Error('Failed to encrypt API key');
      }

      // Update organization with AI config
      const aiConfig = {
        provider: data.aiConfig.provider,
        encrypted_api_key: encryptedKey,
        model: data.aiConfig.model || getDefaultModel(data.aiConfig.provider),
        enabled: true,
      };

      const { error: updateError } = await supabase
        .from('organizations')
        .update({ ai_config: aiConfig })
        .eq('id', org.id);

      if (updateError) {
        console.error('AI config update error:', updateError);
        // Rollback: delete organization
        await supabase.from('organizations').delete().eq('id', org.id);
        throw new Error('Failed to save AI configuration');
      }
    }

    // Create admin user with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: data.admin.email,
        password: data.admin.password,
        email_confirm: true,
        user_metadata: {
          full_name: data.admin.fullName,
          tenant_id: org.id,
        },
      });

    if (authError) {
      console.error('Auth user creation error:', authError);
      // Rollback: delete organization
      await supabase.from('organizations').delete().eq('id', org.id);
      throw new Error(`Failed to create admin user: ${authError.message}`);
    }

    // Create user profile with owner role
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      tenant_id: org.id,
      email: data.admin.email,
      full_name: data.admin.fullName,
      role: 'owner',
    });

    if (profileError) {
      console.error('User profile creation error:', profileError);
      // Rollback: delete auth user and organization
      await supabase.auth.admin.deleteUser(authData.user.id);
      await supabase.from('organizations').delete().eq('id', org.id);
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }

    console.log('Setup completed successfully:', {
      organizationId: org.id,
      userId: authData.user.id,
    });

    return NextResponse.json({
      success: true,
      organizationId: org.id,
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Setup failed due to an unexpected error',
      },
      { status: 500 }
    );
  }
}
