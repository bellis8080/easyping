import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Get the current authenticated user (server-side)
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const supabase = await createClient();

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

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
 * Get user profile with tenant information (server-side)
 * Returns null if not authenticated or profile doesn't exist
 */
export async function getUserProfile() {
  const supabase = await createClient();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return null;
    }

    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Get the current user's role (server-side)
 * Returns null if not authenticated or profile doesn't exist
 */
export async function getUserRole(): Promise<'owner' | 'admin' | 'agent' | 'end_user' | null> {
  const profile = await getUserProfile();
  return profile?.role || null;
}

/**
 * Require authentication - redirects to login if not authenticated
 * Use this in Server Components or Server Actions
 */
export async function requireAuth(redirectTo?: string) {
  const user = await getCurrentUser();

  if (!user) {
    const loginUrl = redirectTo
      ? `/login?redirect=${encodeURIComponent(redirectTo)}`
      : '/login';
    redirect(loginUrl);
  }

  return user;
}

/**
 * Require specific role - redirects to dashboard if unauthorized
 * Use this in Server Components or Server Actions
 */
export async function requireRole(allowedRoles: Array<'owner' | 'admin' | 'agent' | 'end_user'>) {
  await requireAuth();

  const role = await getUserRole();

  if (!role || !allowedRoles.includes(role)) {
    redirect('/dashboard?error=unauthorized');
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
    admin: [
      'tickets:*',
      'kb:*',
      'users:read',
      'users:update',
      'settings:read',
      'settings:update',
    ],
    agent: [
      'tickets:read',
      'tickets:update',
      'tickets:create',
      'kb:read',
      'kb:create',
    ],
    end_user: [
      'tickets:read',
      'tickets:create',
      'kb:read',
    ],
  };

  const permissions = rolePermissions[role] || [];

  // Check for wildcard or exact match
  return permissions.includes('*') || permissions.includes(permission);
}
