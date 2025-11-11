import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { MyPingsClient } from '@/components/pings/my-pings-client';
import type { PingWithMessages } from '@/components/pings/my-pings-client';

export default async function MyPingsPage() {
  const supabase = await createClient();

  // Get current user and tenant
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!userProfile) notFound();

  const tenantId = userProfile.tenant_id;

  // Fetch all pings for the current user
  const { data: pings, error } = await supabase
    .from('pings')
    .select(
      `
      id,
      ping_number,
      status,
      created_at,
      updated_at,
      messages:ping_messages(
        id,
        content,
        message_type,
        created_at,
        sender:users!ping_messages_sender_id_fkey(
          id,
          full_name,
          avatar_url
        )
      )
    `
    )
    .eq('tenant_id', tenantId)
    .eq('created_by', user.id)
    .order('updated_at', { ascending: false })
    .order('created_at', { foreignTable: 'ping_messages', ascending: true });

  if (error) {
    console.error('Error fetching pings:', error);
    notFound();
  }

  return (
    <MyPingsClient pings={(pings || []) as unknown as PingWithMessages[]} />
  );
}
