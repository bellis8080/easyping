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
  // Story 4.2.1: Include visibility to filter out private messages for end users
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
        visibility,
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

  // Calculate unread counts for each ping
  // Story 4.2.1: Filter out private messages from counts and message lists for end users
  const pingsWithUnread = await Promise.all(
    (pings || []).map(async (ping) => {
      // Get the last read timestamp for this ping
      const { data: pingRead } = await supabase
        .from('ping_reads')
        .select('last_read_at')
        .eq('ping_id', ping.id)
        .eq('user_id', user.id)
        .single();

      let unreadCount = 0;

      if (!pingRead) {
        // Never read - count all PUBLIC messages not from this user
        // Story 4.2.1: Exclude private messages from unread count
        const { count } = await supabase
          .from('ping_messages')
          .select('*', { count: 'exact', head: true })
          .eq('ping_id', ping.id)
          .neq('sender_id', user.id)
          .neq('visibility', 'private');

        unreadCount = count || 0;
      } else {
        // Count PUBLIC messages after last read that aren't from this user
        // Story 4.2.1: Exclude private messages from unread count
        const { count } = await supabase
          .from('ping_messages')
          .select('*', { count: 'exact', head: true })
          .eq('ping_id', ping.id)
          .neq('sender_id', user.id)
          .neq('visibility', 'private')
          .gt('created_at', pingRead.last_read_at);

        unreadCount = count || 0;
      }

      // Story 4.2.1: Filter out private messages from the messages array
      const publicMessages = (ping.messages || []).filter(
        (msg: any) => msg.visibility !== 'private'
      );

      return {
        ...ping,
        messages: publicMessages,
        unread_count: unreadCount,
      };
    })
  );

  return (
    <MyPingsClient
      pings={pingsWithUnread as unknown as PingWithMessages[]}
      currentUserId={user.id}
    />
  );
}
