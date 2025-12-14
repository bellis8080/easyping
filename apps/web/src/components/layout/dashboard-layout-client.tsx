'use client';

import { ReactNode, Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Radio,
  Inbox,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  Users,
  Plus,
  User,
  AlertCircle,
  CheckCircle2,
  CircleDot,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { WelcomeToast } from '@/components/welcome-toast';
import { useMyPingsBadgeCount } from '@/hooks/use-my-pings-badge-count';
import { useTeamInboxBadgeCounts } from '@/hooks/use-team-inbox-badge-count';
import { useQuickFilterBadgeCounts } from '@/hooks/use-quick-filter-badge-counts';
import { TeamFormDialog } from '@/components/teams/team-form-dialog';
import { TeamsProvider, useTeams } from '@/contexts/teams-context';
import { UserRole } from '@easyping/types';

type IconName =
  | 'Radio'
  | 'Inbox'
  | 'BookOpen'
  | 'BarChart3'
  | 'Settings'
  | 'LogOut'
  | 'Users';

interface NavigationItem {
  name: string;
  href: string;
  icon: IconName;
  description?: string;
  badge?: number;
}

interface TeamNavItem {
  id: string;
  name: string;
  description: string | null;
}

interface DashboardLayoutClientProps {
  navigation: NavigationItem[];
  secondaryNav: NavigationItem[];
  initialTeams?: TeamNavItem[];
  children: ReactNode;
  userId: string | null;
  isAgent: boolean;
  userRole?: UserRole;
}

const iconMap = {
  Radio,
  Inbox,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  Users,
};

export function DashboardLayoutClient({
  navigation,
  secondaryNav,
  initialTeams = [],
  children,
  userId,
  isAgent,
  userRole,
}: DashboardLayoutClientProps) {
  return (
    <TeamsProvider initialTeams={initialTeams} userId={userId}>
      <DashboardLayoutInner
        navigation={navigation}
        secondaryNav={secondaryNav}
        userId={userId}
        isAgent={isAgent}
        userRole={userRole}
      >
        {children}
      </DashboardLayoutInner>
    </TeamsProvider>
  );
}

interface DashboardLayoutInnerProps {
  navigation: NavigationItem[];
  secondaryNav: NavigationItem[];
  children: ReactNode;
  userId: string | null;
  isAgent: boolean;
  userRole?: UserRole;
}

function DashboardLayoutInner({
  navigation,
  secondaryNav,
  children,
  userId,
  isAgent,
  userRole,
}: DashboardLayoutInnerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);
  const [isQuickFiltersExpanded, setIsQuickFiltersExpanded] = useState(true);
  const [isTeamInboxesExpanded, setIsTeamInboxesExpanded] = useState(true);

  // Get teams from context (enables real-time updates)
  const { teams, addTeam } = useTeams();

  const canManageTeams =
    userRole === UserRole.MANAGER || userRole === UserRole.OWNER;

  // Get real-time My Pings badge count for end users
  const myPingsBadgeCount = useMyPingsBadgeCount(!isAgent ? userId : null);

  // Get real-time Quick Filter badge counts for agents
  const quickFilterCounts = useQuickFilterBadgeCounts(isAgent ? userId : null);

  // Get real-time team inbox badge counts for agents
  const teamIds = teams.map((t) => t.id);
  const teamBadgeCounts = useTeamInboxBadgeCounts(
    isAgent ? teamIds : [],
    isAgent ? userId : null
  );

  const isActive = (href: string) => {
    if (href === '/pings') {
      return pathname === '/pings' || pathname?.startsWith('/pings/');
    }
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="flex h-screen">
        <aside className="w-64 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 flex flex-col shadow-2xl">
          <div className="p-6 border-b border-slate-700">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center ring-2 ring-orange-500/50">
                  <Radio className="w-6 h-6 text-white" />
                </div>
                <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">EasyPing</h1>
                <p className="text-xs text-slate-400">AI-native service desk</p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = iconMap[item.icon];
              const active = isActive(item.href);

              // Use real-time badge counts based on the route
              let badgeCount = item.badge;
              if (item.href === '/pings') {
                badgeCount = myPingsBadgeCount;
              }

              // For inbox, render with sub-filters
              if (item.href === '/inbox' && isAgent) {
                const inboxFilters = [
                  {
                    name: 'All Pings',
                    href: '/inbox',
                    icon: Inbox,
                    badgeKey: 'all' as const,
                  },
                  {
                    name: 'Assigned to Me',
                    href: '/inbox?filter=assigned',
                    icon: User,
                    badgeKey: 'assigned' as const,
                  },
                  {
                    name: 'Unassigned',
                    href: '/inbox?filter=unassigned',
                    icon: CircleDot,
                    badgeKey: 'unassigned' as const,
                  },
                  {
                    name: 'Urgent',
                    href: '/inbox?filter=urgent',
                    icon: AlertCircle,
                    badgeKey: 'urgent' as const,
                  },
                  {
                    name: 'Closed',
                    href: '/inbox?filter=closed',
                    icon: CheckCircle2,
                    badgeKey: null,
                  },
                ];

                const isInboxActive = pathname?.startsWith('/inbox');

                return (
                  <div key={item.name} className="space-y-1">
                    {/* Main Inbox Header */}
                    <Link
                      href={item.href}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isInboxActive && !pathname?.startsWith('/teams') ? 'bg-orange-500/10 text-orange-500 border-2 border-orange-500 shadow-lg shadow-orange-500/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white border-2 border-transparent'}`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {item.name}
                        </div>
                        {item.description && (
                          <div
                            className={`text-xs truncate ${isInboxActive ? 'text-orange-400' : 'text-slate-500 group-hover:text-slate-400'}`}
                          >
                            {item.description}
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Inbox Sub-filters */}
                    <div className="mt-2">
                      <button
                        onClick={() =>
                          setIsQuickFiltersExpanded(!isQuickFiltersExpanded)
                        }
                        className="w-full px-3 mb-2 flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {isQuickFiltersExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                        <h3 className="text-xs font-semibold uppercase tracking-wider">
                          Quick Filters
                        </h3>
                      </button>
                      {isQuickFiltersExpanded && (
                        <div className="ml-4 space-y-0.5">
                          {inboxFilters.map((filter) => {
                            const FilterIcon = filter.icon;
                            const currentFilter = searchParams.get('filter');
                            const filterParam = filter.href.includes('?filter=')
                              ? filter.href.split('?filter=')[1]
                              : null;
                            const filterActive =
                              filter.href === '/inbox'
                                ? pathname === '/inbox' && !currentFilter
                                : pathname === '/inbox' &&
                                  currentFilter === filterParam;
                            const filterBadgeCount = filter.badgeKey
                              ? quickFilterCounts[filter.badgeKey]
                              : 0;

                            return (
                              <Link
                                key={filter.name}
                                href={filter.href}
                                className={`group flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm ${
                                  filterActive
                                    ? 'text-orange-400 bg-orange-500/5'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                }`}
                              >
                                <FilterIcon className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate flex-1">
                                  {filter.name}
                                </span>
                                {filterBadgeCount > 0 && (
                                  <span className="flex-shrink-0 min-w-[1.25rem] h-5 px-1 rounded-full bg-orange-500 text-white text-xs font-semibold flex items-center justify-center">
                                    {filterBadgeCount > 99
                                      ? '99+'
                                      : filterBadgeCount}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Team Inboxes Section - Right after inbox filters */}
                    <div className="mt-3">
                      <div className="px-3 mb-2 flex items-center justify-between">
                        <button
                          onClick={() =>
                            setIsTeamInboxesExpanded(!isTeamInboxesExpanded)
                          }
                          className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {isTeamInboxesExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                          <h3 className="text-xs font-semibold uppercase tracking-wider">
                            Team Inboxes
                          </h3>
                        </button>
                        {canManageTeams && teams.length < 20 && (
                          <button
                            onClick={() => setShowCreateTeamDialog(true)}
                            className="p-1 text-slate-500 hover:text-orange-500 transition-colors"
                            title="Create Team"
                            aria-label="Create new team"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {isTeamInboxesExpanded && (
                        <>
                          {teams.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-500">
                              {canManageTeams
                                ? 'No teams yet. Click + to create one.'
                                : "You're not a member of any team yet."}
                            </div>
                          ) : (
                            <div className="ml-4 space-y-0.5">
                              {teams.map((team) => {
                                const teamHref = `/teams/${team.id}`;
                                const teamActive = isActive(teamHref);
                                const teamUnreadCount =
                                  teamBadgeCounts.get(team.id) || 0;

                                return (
                                  <Link
                                    key={team.id}
                                    href={teamHref}
                                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm ${
                                      teamActive
                                        ? 'text-orange-400 bg-orange-500/5'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                    }`}
                                  >
                                    <Users className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate flex-1">
                                      {team.name}
                                    </span>
                                    {teamUnreadCount > 0 && (
                                      <span className="flex-shrink-0 min-w-[1.25rem] h-5 px-1 rounded-full bg-orange-500 text-white text-xs font-semibold flex items-center justify-center">
                                        {teamUnreadCount > 99
                                          ? '99+'
                                          : teamUnreadCount}
                                      </span>
                                    )}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${active ? 'bg-orange-500/10 text-orange-500 border-2 border-orange-500 shadow-lg shadow-orange-500/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white border-2 border-transparent'}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {item.name}
                    </div>
                    {item.description && (
                      <div
                        className={`text-xs truncate ${active ? 'text-orange-400' : 'text-slate-500 group-hover:text-slate-400'}`}
                      >
                        {item.description}
                      </div>
                    )}
                  </div>
                  {badgeCount !== undefined && badgeCount > 0 && (
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-semibold flex items-center justify-center">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-700 space-y-1">
            {secondaryNav.map((item) => {
              const Icon = iconMap[item.icon];
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 overflow-hidden">{children}</main>
      </div>

      <Suspense fallback={null}>
        <WelcomeToast />
      </Suspense>

      {/* Create Team Dialog */}
      {canManageTeams && (
        <TeamFormDialog
          open={showCreateTeamDialog}
          onOpenChange={setShowCreateTeamDialog}
          onSuccess={(createdTeam) => {
            // Add the new team to the sidebar immediately via context
            if (createdTeam) {
              addTeam(createdTeam);
            }
          }}
        />
      )}
    </div>
  );
}
