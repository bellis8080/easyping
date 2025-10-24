import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { UserRole, User } from '@easyping/types';
import { hasPermission as hasRolePermission } from './permissions';

/**
 * Get the current authenticated user (server-side)
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get user profile with tenant and role information (server-side)
 * Uses admin client to bypass RLS policies
 * Returns null if not authenticated or profile doesn't exist
 */
export async function getUserProfile(): Promise<User | null> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return null;
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();
    const { data: profile, error } = await adminClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return profile as User;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Get the current user's role (server-side)
 * Returns null if not authenticated or profile doesn't exist
 */
export async function getUserRole(): Promise<UserRole | null> {
  const profile = await getUserProfile();
  return profile?.role ? (profile.role as UserRole) : null;
}

/**
 * Require authentication - redirects to login if not authenticated
 * Optionally checks for minimum role requirement
 * Use this in Server Components or Server Actions
 */
export async function requireAuth(options?: {
  redirectTo?: string;
  minRole?: UserRole;
}): Promise<User> {
  const profile = await getUserProfile();

  if (!profile) {
    const loginUrl = options?.redirectTo
      ? `/login?redirect=${encodeURIComponent(options.redirectTo)}`
      : '/login';
    redirect(loginUrl);
  }

  // Check minimum role requirement
  if (options?.minRole) {
    const userRole = profile.role as UserRole;
    if (!hasRolePermission(userRole, options.minRole)) {
      redirect('/dashboard?error=insufficient_permissions');
    }
  }

  return profile;
}

/**
 * Require specific role - redirects to dashboard if unauthorized
 * Use this in Server Components or Server Actions
 * @deprecated Use requireAuth({ minRole }) instead
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<UserRole> {
  const profile = await getUserProfile();

  if (!profile) {
    redirect('/login');
  }

  const role = profile.role as UserRole;

  if (!allowedRoles.includes(role)) {
    redirect('/dashboard?error=insufficient_permissions');
  }

  return role;
}

/**
 * Check if user has specific permission
 * Returns false if not authenticated
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const role = await getUserRole();

  if (!role) {
    return false;
  }

  // Define role-based permissions
  const rolePermissions: Record<string, string[]> = {
    owner: ['*'], // Owner has all permissions
    manager: [
      'tickets:*',
      'kb:*',
      'users:read',
      'categories:*',
      'sla:*',
      'settings:read',
      'settings:update',
    ],
    agent: [
      'tickets:read',
      'tickets:update',
      'tickets:create',
      'kb:read',
      'kb:create',
      'analytics:read',
    ],
    end_user: ['tickets:read', 'tickets:create', 'kb:read'],
  };

  const permissions = rolePermissions[role] || [];

  // Check for wildcard or exact match
  return permissions.includes('*') || permissions.includes(permission);
}
