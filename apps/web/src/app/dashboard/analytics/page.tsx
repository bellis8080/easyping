import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserRole } from '@easyping/types';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

async function getUserRole(): Promise<UserRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role || null;
}

export default async function AnalyticsPage() {
  const role = await getUserRole();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-4xl rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-2 text-sm text-gray-600">
            View ticket metrics and performance data
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg
                className="h-full w-full"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-medium text-gray-900">
              Analytics Dashboard Coming Soon
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              This page will display ticket metrics, response times, and team
              performance.
            </p>
            <p className="mt-4 text-xs text-gray-400">
              Your role: <span className="font-semibold">{role}</span>
            </p>
          </div>

          <a
            href="/dashboard"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
