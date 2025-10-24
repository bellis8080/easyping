import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserRole } from '@easyping/types';
import UserManagementTable from './UserManagementTable';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface UserData {
  currentUserRole: UserRole;
  tenantId: string;
}

async function getCurrentUserData(): Promise<UserData> {
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
    .select('role, tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  // Only OWNER role can access this page
  if (profile.role !== 'owner') {
    redirect('/dashboard?error=insufficient_permissions');
  }

  return {
    currentUserRole: profile.role as UserRole,
    tenantId: profile.tenant_id,
  };
}

async function getOrganizationUsers(tenantId: string) {
  const adminClient = createAdminClient();

  const { data: users, error } = await adminClient
    .from('users')
    .select('id, email, full_name, avatar_url, role, created_at, last_seen_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return users;
}

async function getFirstUserId(tenantId: string): Promise<string> {
  const adminClient = createAdminClient();

  const { data: firstUser } = await adminClient
    .from('users')
    .select('id')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  return firstUser?.id || '';
}

export default async function UserManagementPage() {
  const { currentUserRole, tenantId } = await getCurrentUserData();
  const users = await getOrganizationUsers(tenantId);
  const firstUserId = await getFirstUserId(tenantId);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
          >
            <svg
              className="mr-1 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-6 border-b border-gray-200 pb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              User Management
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage users and assign roles within your organization
            </p>
          </div>

          {users.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p>No users found in your organization.</p>
            </div>
          ) : (
            <UserManagementTable
              users={users}
              currentUserRole={currentUserRole}
              firstUserId={firstUserId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
