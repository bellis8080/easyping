import { ReactNode } from 'react';
import { getUserProfile } from '@/lib/auth/helpers';
import { UserRole } from '@easyping/types';
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client';
import { createClient } from '@/lib/supabase/server';

async function getActiveAssignedCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count } = await supabase
    .from('pings')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_to', userId)
    .not('status', 'in', '(resolved,closed)');

  return count || 0;
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await getUserProfile();
  const userRole = profile?.role as UserRole;

  // Get active assigned ping count for agents
  let activeAssignedCount = 0;
  if (
    profile &&
    (userRole === UserRole.AGENT ||
      userRole === UserRole.MANAGER ||
      userRole === UserRole.OWNER)
  ) {
    activeAssignedCount = await getActiveAssignedCount(profile.id);
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
      badge: activeAssignedCount > 0 ? activeAssignedCount : undefined,
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
    <DashboardLayoutClient navigation={navigation} secondaryNav={secondaryNav}>
      {children}
    </DashboardLayoutClient>
  );
}
