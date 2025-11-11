import { ReactNode } from 'react';
import { getUserProfile } from '@/lib/auth/helpers';
import { UserRole } from '@easyping/types';
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await getUserProfile();
  const userRole = profile?.role as UserRole;

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
      badge: 8,
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
