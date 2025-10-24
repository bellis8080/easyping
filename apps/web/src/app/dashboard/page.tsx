import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { User } from '@easyping/types';
import LogoutButton from './LogoutButton';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

async function getUserProfile(): Promise<User | null> {
  try {
    const supabase = await createClient();

    // Get current user from auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect('/login');
    }

    // Use admin client to fetch user profile (bypasses RLS)
    const adminClient = createAdminClient();
    const { data: profile, error } = await adminClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error loading user profile:', error);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
}

function getRoleBadgeColor(role: string) {
  const colors = {
    owner: 'bg-purple-100 text-purple-800',
    manager: 'bg-blue-100 text-blue-800',
    agent: 'bg-green-100 text-green-800',
    end_user: 'bg-gray-100 text-gray-800',
  };
  return colors[role as keyof typeof colors] || colors.end_user;
}

export default async function DashboardPage() {
  const userProfile = await getUserProfile();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome to EasyPing!</p>

          {userProfile ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="space-y-2 text-left">
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Email:
                    </span>
                    <p className="text-sm text-gray-900">{userProfile.email}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Name:
                    </span>
                    <p className="text-sm text-gray-900">
                      {userProfile.full_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Role:
                    </span>
                    <div className="mt-1">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getRoleBadgeColor(
                          userProfile.role
                        )}`}
                      >
                        {userProfile.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                {userProfile.role === 'owner' && (
                  <p>✓ You have full admin access to all features</p>
                )}
                {userProfile.role === 'agent' && (
                  <p>✓ You can view all tickets and access analytics</p>
                )}
                {userProfile.role === 'manager' && (
                  <p>✓ You can manage categories, SLA policies, and reports</p>
                )}
                {userProfile.role === 'end_user' && (
                  <p>✓ You can create tickets and view your own tickets</p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 text-gray-500">
              Unable to load profile data
            </div>
          )}

          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
