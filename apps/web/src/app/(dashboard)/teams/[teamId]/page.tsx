/**
 * Team Inbox Page
 * Story 3.5: Team Inboxes
 *
 * Displays pings assigned to a specific team.
 * Agents can claim pings, managers can view all team pings.
 */

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TeamInboxClient } from '@/components/teams/team-inbox-client';
import { PingAttachment } from '@easyping/types';

interface TeamInboxPageProps {
  params: Promise<{ teamId: string }>;
}

export default async function TeamInboxPage({ params }: TeamInboxPageProps) {
  const { teamId } = await params;
  const supabase = await createClient();
  const adminClient = createAdminClient();

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

  // Only agents, managers, and owners can view team inboxes
  if (userProfile.role === 'end_user') {
    redirect('/pings');
  }

  // Verify team exists and belongs to tenant
  const { data: team, error: teamError } = await adminClient
    .from('agent_teams')
    .select('id, name, description, created_at')
    .eq('id', teamId)
    .eq('tenant_id', userProfile.tenant_id)
    .single();

  if (teamError || !team) {
    notFound();
  }

  // Check access: agents must be members, managers/owners can access any team
  const isManagerOrOwner =
    userProfile.role === 'owner' || userProfile.role === 'manager';

  if (!isManagerOrOwner) {
    const { data: membership, error: memberError } = await adminClient
      .from('agent_team_members')
      .select('team_id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError || !membership) {
      // Agent is not a member of this team
      redirect('/inbox');
    }
  }

  // Fetch team members
  const { data: members } = await adminClient
    .from('agent_team_members')
    .select(
      `
      user_id,
      added_at,
      users(id, full_name, email, avatar_url, role)
    `
    )
    .eq('team_id', teamId);

  const teamMembers =
    members?.map((m) => ({
      ...(Array.isArray(m.users) ? m.users[0] : m.users),
      added_at: m.added_at,
    })) || [];

  // Fetch pings assigned to this team
  const { data: pings, error: pingsError } = await adminClient
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
      team_id,
      created_by:users!pings_created_by_fkey(id, full_name, email, avatar_url),
      assigned_to:users!pings_assigned_to_fkey(id, full_name, avatar_url),
      category:categories(id, name, color),
      messages:ping_messages(
        id,
        content,
        message_type,
        visibility,
        created_at,
        sender:users(id, full_name, avatar_url)
      )
    `
    )
    .eq('team_id', teamId)
    .neq('status', 'draft')
    .order('updated_at', { ascending: false })
    .order('created_at', { foreignTable: 'ping_messages', ascending: true });

  if (pingsError) {
    console.error('Error fetching team pings:', pingsError);
    return (
      <TeamInboxClient
        team={team}
        members={teamMembers}
        pings={[]}
        currentUser={{
          id: userProfile.id,
          full_name: userProfile.full_name,
          avatar_url: userProfile.avatar_url,
          role: userProfile.role,
          tenant_id: userProfile.tenant_id,
        }}
        isManagerOrOwner={isManagerOrOwner}
      />
    );
  }

  // Fetch all message IDs to get attachments
  const allMessageIds =
    pings?.flatMap((ping) => ping.messages?.map((msg) => msg.id) || []) || [];

  let attachmentsByMessageId: Record<string, PingAttachment[]> = {};
  if (allMessageIds.length > 0) {
    const { data: attachments } = await adminClient
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
      team_id: ping.team_id,
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
        visibility: msg.visibility as 'public' | 'private', // Story 4.2.1: Include visibility for private note styling
        created_at: msg.created_at,
        sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
        attachments: attachmentsByMessageId[msg.id] || [],
      })),
      unread_count: (() => {
        const lastReadAt = pingReadsMap.get(ping.id);
        if (!lastReadAt) {
          return (ping.messages || []).filter((msg) => {
            const sender = Array.isArray(msg.sender)
              ? msg.sender[0]
              : msg.sender;
            return sender?.id !== userProfile.id;
          }).length;
        }
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
    <TeamInboxClient
      team={team}
      members={teamMembers}
      pings={transformedPings}
      currentUser={{
        id: userProfile.id,
        full_name: userProfile.full_name,
        avatar_url: userProfile.avatar_url,
        role: userProfile.role,
        tenant_id: userProfile.tenant_id,
      }}
      isManagerOrOwner={isManagerOrOwner}
    />
  );
}
