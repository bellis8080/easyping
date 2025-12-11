/**
 * User role enumeration defining the access control hierarchy.
 *
 * Role Hierarchy (ascending order):
 * END_USER < AGENT < MANAGER < OWNER
 *
 * Higher roles inherit all permissions from lower roles.
 */
export enum UserRole {
  /**
   * END_USER - Base role for all authenticated users
   *
   * Permissions:
   * - Create and view own tickets
   * - Access knowledge base
   * - Update own profile
   *
   * Restrictions:
   * - Cannot view other users' tickets
   * - Cannot access agent dashboard or analytics
   * - Cannot modify system settings
   */
  END_USER = 'end_user',

  /**
   * AGENT - Support staff role
   *
   * Permissions (includes all END_USER permissions):
   * - View all tickets in organization
   * - Respond to any ticket
   * - Access agent dashboard and analytics
   * - Assign tickets to self or other agents
   *
   * Restrictions:
   * - Cannot modify ticket categories or SLA policies
   * - Cannot assign roles to users
   * - Cannot access advanced settings
   */
  AGENT = 'agent',

  /**
   * MANAGER - Team lead role
   *
   * Permissions (includes all AGENT permissions):
   * - Manage ticket categories and tags
   * - Configure SLA policies
   * - View detailed analytics and reports
   * - Manage team workflows
   *
   * Restrictions:
   * - Cannot assign roles to users
   * - Cannot configure AI providers
   * - Cannot delete organization
   */
  MANAGER = 'manager',

  /**
   * OWNER - Administrator role with full system access
   *
   * Permissions (includes all MANAGER permissions):
   * - Assign roles to any user
   * - Configure AI provider settings
   * - Manage organization settings
   * - Access user management interface
   * - Delete organization (future)
   *
   * Note: First user in an organization is automatically assigned OWNER role.
   */
  OWNER = 'owner',
}

/**
 * Type guard to check if a string is a valid UserRole
 */
export function isUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

/**
 * Get all user roles as an array
 */
export function getAllUserRoles(): UserRole[] {
  return Object.values(UserRole);
}

/**
 * Ping status enumeration
 */
export enum PingStatus {
  DRAFT = 'draft',
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  WAITING_ON_USER = 'waiting_on_user',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

/**
 * Ping priority enumeration
 */
export enum PingPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Message type enumeration
 */
export enum MessageType {
  USER = 'user',
  AGENT = 'agent',
  SYSTEM = 'system',
}
