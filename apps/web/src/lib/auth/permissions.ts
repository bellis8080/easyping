/**
 * Role-based permission helpers for authorization checks
 *
 * These functions implement the role hierarchy and permission logic
 * for the EasyPing application.
 */

import { UserRole } from '@easyping/types';

/**
 * Role hierarchy mapping
 * Higher numbers indicate more permissions
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.END_USER]: 1,
  [UserRole.AGENT]: 2,
  [UserRole.MANAGER]: 3,
  [UserRole.OWNER]: 4,
};

/**
 * Route patterns and their required minimum role
 */
const PROTECTED_ROUTES: Record<string, UserRole> = {
  // Agent+ routes
  '/dashboard/analytics': UserRole.AGENT,
  '/dashboard/tickets/all': UserRole.AGENT,

  // Manager+ routes
  '/dashboard/settings/categories': UserRole.MANAGER,
  '/dashboard/settings/sla': UserRole.MANAGER,
  '/dashboard/reports': UserRole.MANAGER,

  // Owner-only routes
  '/dashboard/settings/users': UserRole.OWNER,
  '/dashboard/settings/ai': UserRole.OWNER,
  '/dashboard/settings/organization': UserRole.OWNER,
};

/**
 * Check if a user role has permission to access a required role level
 *
 * @param userRole - The user's current role
 * @param requiredRole - The minimum required role
 * @returns true if userRole >= requiredRole in hierarchy
 *
 * @example
 * hasPermission(UserRole.OWNER, UserRole.AGENT) // true
 * hasPermission(UserRole.END_USER, UserRole.AGENT) // false
 * hasPermission(UserRole.AGENT, UserRole.AGENT) // true
 */
export function hasPermission(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if a user role can access a specific route path
 *
 * Routes not in PROTECTED_ROUTES are accessible to all authenticated users (END_USER+)
 *
 * @param userRole - The user's current role
 * @param routePath - The route path to check (e.g., '/dashboard/analytics')
 * @returns true if user can access the route
 *
 * @example
 * canAccessRoute(UserRole.AGENT, '/dashboard/analytics') // true
 * canAccessRoute(UserRole.END_USER, '/dashboard/analytics') // false
 * canAccessRoute(UserRole.END_USER, '/dashboard') // true (not protected)
 */
export function canAccessRoute(userRole: UserRole, routePath: string): boolean {
  // Check if route has specific role requirement
  for (const [route, requiredRole] of Object.entries(PROTECTED_ROUTES)) {
    if (routePath.startsWith(route)) {
      return hasPermission(userRole, requiredRole);
    }
  }

  // If no specific requirement, all authenticated users can access
  return true;
}

/**
 * Check if a user can assign a specific role to another user
 *
 * Role assignment rules:
 * - Only OWNER can assign OWNER role
 * - Only OWNER can assign any role (OWNER, MANAGER, AGENT, END_USER)
 * - MANAGER and below cannot assign roles
 *
 * @param assignerRole - The role of the user performing the assignment
 * @param targetRole - The role to be assigned
 * @returns true if assigner can assign the target role
 *
 * @example
 * canAssignRole(UserRole.OWNER, UserRole.MANAGER) // true
 * canAssignRole(UserRole.MANAGER, UserRole.AGENT) // false
 * canAssignRole(UserRole.AGENT, UserRole.END_USER) // false
 */
export function canAssignRole(
  assignerRole: UserRole,
  _targetRole: UserRole
): boolean {
  // Only OWNER can assign roles (targetRole is kept for API consistency)
  // Future enhancement: Allow MANAGER to assign AGENT/END_USER roles
  return assignerRole === UserRole.OWNER;
}

/**
 * Check if a user role can view all tickets in the organization
 *
 * @param userRole - The user's current role
 * @returns true for AGENT, MANAGER, OWNER; false for END_USER
 *
 * @example
 * canViewAllTickets(UserRole.AGENT) // true
 * canViewAllTickets(UserRole.END_USER) // false
 */
export function canViewAllTickets(userRole: UserRole): boolean {
  return hasPermission(userRole, UserRole.AGENT);
}

/**
 * Check if a user can manage ticket categories
 *
 * @param userRole - The user's current role
 * @returns true for MANAGER and OWNER
 */
export function canManageCategories(userRole: UserRole): boolean {
  return hasPermission(userRole, UserRole.MANAGER);
}

/**
 * Check if a user can manage SLA policies
 *
 * @param userRole - The user's current role
 * @returns true for MANAGER and OWNER
 */
export function canManageSLA(userRole: UserRole): boolean {
  return hasPermission(userRole, UserRole.MANAGER);
}

/**
 * Check if a user can access analytics and reports
 *
 * @param userRole - The user's current role
 * @returns true for AGENT, MANAGER, and OWNER
 */
export function canViewAnalytics(userRole: UserRole): boolean {
  return hasPermission(userRole, UserRole.AGENT);
}

/**
 * Check if a user can manage other users (view, assign roles)
 *
 * @param userRole - The user's current role
 * @returns true for OWNER only
 */
export function canManageUsers(userRole: UserRole): boolean {
  return userRole === UserRole.OWNER;
}

/**
 * Check if a user can configure AI provider settings
 *
 * @param userRole - The user's current role
 * @returns true for OWNER only
 */
export function canConfigureAI(userRole: UserRole): boolean {
  return userRole === UserRole.OWNER;
}

/**
 * Get all route paths that require a specific role or higher
 *
 * @param role - The minimum role to filter by
 * @returns Array of route paths accessible to the role
 */
export function getAccessibleRoutes(role: UserRole): string[] {
  return Object.entries(PROTECTED_ROUTES)
    .filter(([, requiredRole]) => hasPermission(role, requiredRole))
    .map(([route]) => route);
}

/**
 * Get the minimum required role for a specific route
 *
 * @param routePath - The route path to check
 * @returns The minimum required role, or END_USER if no specific requirement
 */
export function getRequiredRole(routePath: string): UserRole {
  for (const [route, requiredRole] of Object.entries(PROTECTED_ROUTES)) {
    if (routePath.startsWith(route)) {
      return requiredRole;
    }
  }
  return UserRole.END_USER;
}
