import { UserRole } from '@easyping/types';
import { hasPermission } from '@/lib/auth/permissions';
import { useAuth } from './use-auth';

export interface Permissions {
  canViewAnalytics: boolean;
  canManageCategories: boolean;
  canManageSLA: boolean;
  canManageUsers: boolean;
  canConfigureAI: boolean;
  canAssignRoles: boolean;
  canViewAllPings: boolean;
  role: UserRole | null;
}

/**
 * Hook to check user permissions based on their role
 * @returns Object with permission flags for various features
 */
export function usePermissions(): Permissions {
  const { user } = useAuth();

  if (!user || !user.role) {
    return {
      canViewAnalytics: false,
      canManageCategories: false,
      canManageSLA: false,
      canManageUsers: false,
      canConfigureAI: false,
      canAssignRoles: false,
      canViewAllPings: false,
      role: null,
    };
  }

  const userRole = user.role as UserRole;

  return {
    // Agent+ can view analytics
    canViewAnalytics: hasPermission(userRole, UserRole.AGENT),

    // Manager+ can manage categories
    canManageCategories: hasPermission(userRole, UserRole.MANAGER),

    // Manager+ can manage SLA policies
    canManageSLA: hasPermission(userRole, UserRole.MANAGER),

    // Only Owner can manage users
    canManageUsers: hasPermission(userRole, UserRole.OWNER),

    // Only Owner can configure AI settings
    canConfigureAI: hasPermission(userRole, UserRole.OWNER),

    // Only Owner can assign roles
    canAssignRoles: hasPermission(userRole, UserRole.OWNER),

    // Agent+ can view all pings in organization
    canViewAllPings: hasPermission(userRole, UserRole.AGENT),

    // Current user role
    role: userRole,
  };
}
