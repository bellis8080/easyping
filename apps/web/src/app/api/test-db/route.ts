import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Test query: Fetch all organizations
    const { data, error } = await supabase.from('organizations').select('*');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      organizations: data,
      count: data?.length || 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to connect to database',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
