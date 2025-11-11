import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { InboxClient } from '@/components/inbox/inbox-client';

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

  // Fetch pings assigned to agent or unassigned
  const { data: pings, error: pingsError } = await supabase
    .from('pings')
    .select(
      `
      id,
      ping_number,
      title,
      status,
      priority,
      created_at,
      updated_at,
      sla_due_at,
      created_by:users!pings_created_by_fkey(id, full_name, email, avatar_url),
      assigned_to:users!pings_assigned_to_fkey(id, full_name, avatar_url),
      category:categories(name, color),
      messages:ping_messages(
        id,
        content,
        message_type,
        created_at,
        sender:users(id, full_name, avatar_url)
      )
    `
    )
    .or(`assigned_to.eq.${userProfile.id},assigned_to.is.null`)
    .eq('tenant_id', userProfile.tenant_id)
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

  // Transform data to match expected types
  const transformedPings =
    pings?.map((ping) => ({
      id: ping.id,
      ping_number: ping.ping_number,
      title: ping.title,
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
      })),
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
