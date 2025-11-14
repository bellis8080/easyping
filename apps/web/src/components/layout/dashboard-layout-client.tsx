'use client';

import { ReactNode, Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Radio,
  Inbox,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { WelcomeToast } from '@/components/welcome-toast';

type IconName =
  | 'Radio'
  | 'Inbox'
  | 'BookOpen'
  | 'BarChart3'
  | 'Settings'
  | 'LogOut';

interface NavigationItem {
  name: string;
  href: string;
  icon: IconName;
  description?: string;
  badge?: number;
}

interface DashboardLayoutClientProps {
  navigation: NavigationItem[];
  secondaryNav: NavigationItem[];
  children: ReactNode;
}

const iconMap = {
  Radio,
  Inbox,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
};

export function DashboardLayoutClient({
  navigation,
  secondaryNav,
  children,
}: DashboardLayoutClientProps) {
  const pathname = usePathname();

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
                  {item.badge && (
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-semibold flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
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
    </div>
  );
}
