import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="flex">
        <aside className="w-64 bg-gray-100 dark:bg-gray-800 min-h-screen p-4">
          <div className="font-bold text-lg mb-4">EasyPing</div>
          <nav className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Sidebar - to be implemented
            </div>
          </nav>
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
