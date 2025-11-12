import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { PingDetail } from '@/components/pings/ping-detail';
import { PingAttachment } from '@easyping/types';

export default async function PingDetailPage(props: {
  params: Promise<{ pingNumber: string }>;
}) {
  const params = await props.params;
  const supabase = await createClient();

  // Get current user and tenant
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // Get user's tenant_id and profile from users table
  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id, id, email, full_name')
    .eq('id', user.id)
    .single();

  if (!userProfile) notFound();

  const tenantId = userProfile.tenant_id;

  // Fetch ping with all related data using ping_number
  const { data: ping, error } = await supabase
    .from('pings')
    .select(
      `
      *,
      created_by:users!pings_created_by_fkey(id, full_name, avatar_url, role),
      assigned_to:users!pings_assigned_to_fkey(id, full_name, avatar_url, role),
      category:categories(id, name, color, icon),
      messages:ping_messages(
        id,
        content,
        message_type,
        created_at,
        sender:users(id, full_name, avatar_url, role)
      )
    `
    )
    .eq('tenant_id', tenantId)
    .eq('ping_number', parseInt(params.pingNumber))
    .order('created_at', { foreignTable: 'ping_messages', ascending: true })
    .single();

  if (error || !ping) notFound();

  // Fetch attachments for all messages (split-query pattern to avoid RLS issues)
  const messageIds = ping.messages?.map((msg: any) => msg.id) || [];
  let attachmentsByMessageId: Record<string, PingAttachment[]> = {};

  if (messageIds.length > 0) {
    const { data: attachments } = await supabase
      .from('ping_attachments')
      .select('*')
      .in('ping_message_id', messageIds);

    if (attachments) {
      attachmentsByMessageId = attachments.reduce(
        (acc, att) => {
          if (!acc[att.ping_message_id]) {
            acc[att.ping_message_id] = [];
          }
          acc[att.ping_message_id].push(att as PingAttachment);
          return acc;
        },
        {} as Record<string, PingAttachment[]>
      );
    }
  }

  // Add attachments to messages
  const pingWithAttachments = {
    ...ping,
    messages: ping.messages?.map((msg: any) => ({
      ...msg,
      attachments: attachmentsByMessageId[msg.id] || [],
    })),
  };

  return <PingDetail ping={pingWithAttachments} currentUser={userProfile} />;
}
