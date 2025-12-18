import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { PingDetail } from '@/components/pings/ping-detail';
import { PingAttachment, UserRole, MessageVisibility } from '@easyping/types';
import { canViewPrivateMessages } from '@easyping/types';

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
  // Story 4.2.1: Include role for message visibility filtering
  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id, id, email, full_name, role')
    .eq('id', user.id)
    .single();

  if (!userProfile) notFound();

  const tenantId = userProfile.tenant_id;

  // Fetch ping with all related data using ping_number
  // Story 4.2.1: Include visibility for message filtering
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
        visibility,
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

  // Story 4.2.1: Filter messages based on user role
  // End users should never see private messages
  const userRole = userProfile.role as UserRole;
  const canSeePrivate = canViewPrivateMessages(userRole);
  const filteredMessages =
    ping.messages?.filter((msg: any) => {
      if (canSeePrivate) return true;
      return (
        msg.visibility === MessageVisibility.PUBLIC ||
        msg.visibility === 'public'
      );
    }) || [];

  // Add attachments to messages
  const pingWithAttachments = {
    ...ping,
    messages: filteredMessages.map((msg: any) => ({
      ...msg,
      attachments: attachmentsByMessageId[msg.id] || [],
    })),
  };

  return <PingDetail ping={pingWithAttachments} currentUser={userProfile} />;
}
