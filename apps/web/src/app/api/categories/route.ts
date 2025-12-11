/**
 * GET /api/categories
 * Story 3.3: Auto-Categorization of Pings with Conversational Clarification
 *
 * Returns list of active categories for the current organization.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
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
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch active categories for this organization
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('tenant_id', userData.tenant_id)
      .eq('is_active', true)
      .order('sort_order');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Unexpected error fetching categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
