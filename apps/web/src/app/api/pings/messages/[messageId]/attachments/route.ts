import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const supabase = await createClient();
  const { messageId } = await params;

  // Authenticate
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch attachments - RLS will ensure user can only see attachments for pings in their tenant
  const { data: attachments, error } = await supabase
    .from('ping_attachments')
    .select('*')
    .eq('ping_message_id', messageId);

  if (error) {
    console.error('Error fetching attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 }
    );
  }

  return NextResponse.json({ attachments: attachments || [] }, { status: 200 });
}
