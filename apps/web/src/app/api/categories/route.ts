/**
 * GET/POST /api/categories
 * Story 3.3 & 3.4: Category Management
 *
 * GET: Returns list of categories for the current organization.
 * POST: Creates a new category (manager+ only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_CATEGORIES = 20;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id
    const adminClient = createAdminClient();
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if we should include archived categories
    const includeArchived =
      request.nextUrl.searchParams.get('include_archived') === 'true';

    // Fetch categories for this organization
    let query = adminClient
      .from('categories')
      .select('*')
      .eq('tenant_id', userData.tenant_id)
      .order('sort_order');

    if (!includeArchived) {
      query = query.eq('is_active', true);
    }

    const { data: categories, error: categoriesError } = await query;

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    // Return array directly for simpler client-side handling
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Unexpected error fetching categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id and role
    const adminClient = createAdminClient();
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only managers and owners can create categories
    if (userData.role !== 'owner' && userData.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only managers and owners can create categories' },
        { status: 403 }
      );
    }

    // Check current active category count
    const { count, error: countError } = await adminClient
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', userData.tenant_id)
      .eq('is_active', true);

    if (countError) {
      console.error('Error counting categories:', countError);
      return NextResponse.json(
        { error: 'Failed to check category count' },
        { status: 500 }
      );
    }

    if (count !== null && count >= MAX_CATEGORIES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_CATEGORIES} active categories allowed` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, color, icon, sort_order } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Create category
    const { data: category, error: createError } = await adminClient
      .from('categories')
      .insert({
        tenant_id: userData.tenant_id,
        name: name.trim(),
        description: description?.trim() || '',
        color: color || '#3B82F6',
        icon: icon || null,
        sort_order: sort_order || ((count ?? 0) + 1) * 10,
        is_active: true,
        is_default: false,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating category:', createError);
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 }
      );
    }

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Unexpected error creating category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
