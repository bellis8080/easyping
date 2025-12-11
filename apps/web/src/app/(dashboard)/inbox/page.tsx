import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { InboxClient } from '@/components/inbox/inbox-client';
import { PingAttachment } from '@easyping/types';

export default async function AgentInboxPage() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get user profile and verify role
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, full_name, avatar_url, role, tenant_id')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile) {
    redirect('/login');
  }

  // Redirect end users to /pings (inbox is for agents only)
  if (userProfile.role === 'end_user') {
    redirect('/pings');
  }

  // Fetch all pings in tenant (no assignment filter)
  // Exclude draft pings (they're still in Echo conversation)
  const { data: pings, error: pingsError } = await supabase
    .from('pings')
    .select(
      `
      id,
      ping_number,
      title,
      ai_summary,
      status,
      priority,
      created_at,
      updated_at,
      sla_due_at,
      created_by:users!pings_created_by_fkey(id, full_name, email, avatar_url),
      assigned_to:users!pings_assigned_to_fkey(id, full_name, avatar_url),
      category:categories(id, name, color),
      messages:ping_messages(
        id,
        content,
        message_type,
        created_at,
        sender:users(id, full_name, avatar_url)
      )
    `
    )
    .eq('tenant_id', userProfile.tenant_id)
    .neq('status', 'draft')
    .order('updated_at', { ascending: false })
    .order('created_at', { foreignTable: 'ping_messages', ascending: true });

  if (pingsError) {
    console.error('Error fetching pings:', pingsError);
    // Return empty array on error rather than crashing
    return (
      <InboxClient
        pings={[]}
        currentUser={{
          id: userProfile.id,
          full_name: userProfile.full_name,
          avatar_url: userProfile.avatar_url,
          role: userProfile.role,
          tenant_id: userProfile.tenant_id,
        }}
      />
    );
  }

  // Fetch all message IDs to get attachments (split-query pattern to avoid RLS issues)
  const allMessageIds =
    pings?.flatMap((ping) => ping.messages?.map((msg) => msg.id) || []) || [];

  let attachmentsByMessageId: Record<string, PingAttachment[]> = {};
  if (allMessageIds.length > 0) {
    const { data: attachments } = await supabase
      .from('ping_attachments')
      .select('*')
      .in('ping_message_id', allMessageIds);

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

  // Fetch ping_reads to calculate unread counts
  const { data: pingReads } = await supabase
    .from('ping_reads')
    .select('ping_id, last_read_at')
    .eq('user_id', userProfile.id);

  const pingReadsMap = new Map(
    pingReads?.map((pr) => [pr.ping_id, pr.last_read_at]) || []
  );

  // Transform data to match expected types
  const transformedPings =
    pings?.map((ping) => ({
      id: ping.id,
      ping_number: ping.ping_number,
      title: ping.title,
      ai_summary: ping.ai_summary || null,
      status: ping.status,
      priority: ping.priority,
      created_at: ping.created_at,
      updated_at: ping.updated_at,
      sla_due_at: ping.sla_due_at,
      created_by: Array.isArray(ping.created_by)
        ? ping.created_by[0]
        : ping.created_by,
      assigned_to:
        ping.assigned_to && Array.isArray(ping.assigned_to)
          ? ping.assigned_to[0]
          : ping.assigned_to,
      category:
        ping.category && Array.isArray(ping.category)
          ? ping.category[0]
          : ping.category,
      messages: (ping.messages || []).map((msg) => ({
        id: msg.id,
        content: msg.content,
        message_type: msg.message_type,
        created_at: msg.created_at,
        sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
        attachments: attachmentsByMessageId[msg.id] || [],
      })),
      unread_count: (() => {
        const lastReadAt = pingReadsMap.get(ping.id);
        if (!lastReadAt) {
          // Never read - all messages are unread (excluding current user's own messages)
          return (ping.messages || []).filter((msg) => {
            const sender = Array.isArray(msg.sender)
              ? msg.sender[0]
              : msg.sender;
            return sender?.id !== userProfile.id;
          }).length;
        }
        // Count messages created after last read time (excluding current user's own messages)
        return (ping.messages || []).filter((msg) => {
          const sender = Array.isArray(msg.sender) ? msg.sender[0] : msg.sender;
          return (
            sender?.id !== userProfile.id &&
            new Date(msg.created_at) > new Date(lastReadAt)
          );
        }).length;
      })(),
    })) || [];

  return (
    <InboxClient
      pings={transformedPings}
      currentUser={{
        id: userProfile.id,
        full_name: userProfile.full_name,
        avatar_url: userProfile.avatar_url,
        role: userProfile.role,
        tenant_id: userProfile.tenant_id,
      }}
    />
  );
}
