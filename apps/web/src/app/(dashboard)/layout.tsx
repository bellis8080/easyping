import { ReactNode, Suspense } from 'react';
import { getUserProfile } from '@/lib/auth/helpers';
import { UserRole } from '@easyping/types';
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await getUserProfile();
  const userRole = profile?.role as UserRole;
  const isAgentOrAbove =
    userRole === UserRole.AGENT ||
    userRole === UserRole.MANAGER ||
    userRole === UserRole.OWNER;

  // Fetch teams for agents
  let teams: { id: string; name: string; description: string | null }[] = [];
  if (isAgentOrAbove && profile?.id && profile?.tenant_id) {
    const adminClient = createAdminClient();

    if (userRole === UserRole.MANAGER || userRole === UserRole.OWNER) {
      // Managers/owners see all teams
      const { data } = await adminClient
        .from('agent_teams')
        .select('id, name, description')
        .eq('tenant_id', profile.tenant_id)
        .order('name');

      teams = data || [];
    } else {
      // Agents only see teams they're members of
      const { data } = await adminClient
        .from('agent_team_members')
        .select(
          `
          team_id,
          agent_teams!inner(id, name, description, tenant_id)
        `
        )
        .eq('user_id', profile.id);

      if (data) {
        teams = data
          .filter(
            (m) =>
              m.agent_teams &&
              (m.agent_teams as any).tenant_id === profile.tenant_id
          )
          .map((m) => ({
            id: (m.agent_teams as any).id,
            name: (m.agent_teams as any).name,
            description: (m.agent_teams as any).description,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }
    }
  }

  // Define all navigation items with role requirements
  const allNavigationItems = [
    {
      name: 'My Pings',
      href: '/pings',
      icon: 'Radio' as const,
      description: 'View your conversations',
      roles: [
        UserRole.END_USER,
        UserRole.AGENT,
        UserRole.MANAGER,
        UserRole.OWNER,
      ],
    },
    {
      name: 'Inbox',
      href: '/inbox',
      icon: 'Inbox' as const,
      description: 'Agent queue',
      // Badge count is now calculated client-side in real-time via useInboxBadgeCount hook
      roles: [UserRole.AGENT, UserRole.MANAGER, UserRole.OWNER],
    },
    {
      name: 'Knowledge Base',
      href: '/kb',
      icon: 'BookOpen' as const,
      description: 'Browse articles',
      roles: [
        UserRole.END_USER,
        UserRole.AGENT,
        UserRole.MANAGER,
        UserRole.OWNER,
      ],
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: 'BarChart3' as const,
      description: 'Reports & insights',
      roles: [UserRole.AGENT, UserRole.MANAGER, UserRole.OWNER],
    },
  ];

  // Filter navigation based on user role
  const navigation = allNavigationItems.filter((item) =>
    item.roles.includes(userRole)
  );

  const secondaryNav = [
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: 'Settings' as const,
    },
    {
      name: 'Logout',
      href: '/logout',
      icon: 'LogOut' as const,
    },
  ];

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" />
      }
    >
      <DashboardLayoutClient
        navigation={navigation}
        secondaryNav={secondaryNav}
        initialTeams={teams}
        userId={profile?.id || null}
        isAgent={isAgentOrAbove}
        userRole={userRole}
      >
        {children}
      </DashboardLayoutClient>
    </Suspense>
  );
}
