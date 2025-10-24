'use client';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

// Force dynamic rendering to avoid build-time errors with Supabase client
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p className="mt-4 text-gray-600">Welcome to EasyPing!</p>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="mt-6"
        >
          Log out
        </Button>
      </div>
    </div>
  );
}
