/**
 * Unit tests for role-based permission helpers
 */

import { describe, it, expect } from 'vitest';
import { UserRole } from '@easyping/types';
import {
  hasPermission,
  canAccessRoute,
  canAssignRole,
  canViewAllTickets,
  canManageCategories,
  canManageSLA,
  canViewAnalytics,
  canManageUsers,
  canConfigureAI,
  getAccessibleRoutes,
  getRequiredRole,
} from '@/lib/auth/permissions';

describe('hasPermission', () => {
  it('should allow owner to access all role levels', () => {
    expect(hasPermission(UserRole.OWNER, UserRole.OWNER)).toBe(true);
    expect(hasPermission(UserRole.OWNER, UserRole.MANAGER)).toBe(true);
    expect(hasPermission(UserRole.OWNER, UserRole.AGENT)).toBe(true);
    expect(hasPermission(UserRole.OWNER, UserRole.END_USER)).toBe(true);
  });

  it('should allow manager to access manager and below', () => {
    expect(hasPermission(UserRole.MANAGER, UserRole.OWNER)).toBe(false);
    expect(hasPermission(UserRole.MANAGER, UserRole.MANAGER)).toBe(true);
    expect(hasPermission(UserRole.MANAGER, UserRole.AGENT)).toBe(true);
    expect(hasPermission(UserRole.MANAGER, UserRole.END_USER)).toBe(true);
  });

  it('should allow agent to access agent and below', () => {
    expect(hasPermission(UserRole.AGENT, UserRole.OWNER)).toBe(false);
    expect(hasPermission(UserRole.AGENT, UserRole.MANAGER)).toBe(false);
    expect(hasPermission(UserRole.AGENT, UserRole.AGENT)).toBe(true);
    expect(hasPermission(UserRole.AGENT, UserRole.END_USER)).toBe(true);
  });

  it('should allow end_user to access only end_user level', () => {
    expect(hasPermission(UserRole.END_USER, UserRole.OWNER)).toBe(false);
    expect(hasPermission(UserRole.END_USER, UserRole.MANAGER)).toBe(false);
    expect(hasPermission(UserRole.END_USER, UserRole.AGENT)).toBe(false);
    expect(hasPermission(UserRole.END_USER, UserRole.END_USER)).toBe(true);
  });

  it('should allow same role access', () => {
    expect(hasPermission(UserRole.OWNER, UserRole.OWNER)).toBe(true);
    expect(hasPermission(UserRole.MANAGER, UserRole.MANAGER)).toBe(true);
    expect(hasPermission(UserRole.AGENT, UserRole.AGENT)).toBe(true);
    expect(hasPermission(UserRole.END_USER, UserRole.END_USER)).toBe(true);
  });
});

describe('canAccessRoute', () => {
  describe('agent routes', () => {
    it('should allow agent to access analytics', () => {
      expect(canAccessRoute(UserRole.AGENT, '/dashboard/analytics')).toBe(true);
      expect(canAccessRoute(UserRole.MANAGER, '/dashboard/analytics')).toBe(
        true
      );
      expect(canAccessRoute(UserRole.OWNER, '/dashboard/analytics')).toBe(true);
    });

    it('should deny end_user access to analytics', () => {
      expect(canAccessRoute(UserRole.END_USER, '/dashboard/analytics')).toBe(
        false
      );
    });
  });

  describe('manager routes', () => {
    it('should allow manager and owner to access categories', () => {
      expect(
        canAccessRoute(UserRole.MANAGER, '/dashboard/settings/categories')
      ).toBe(true);
      expect(
        canAccessRoute(UserRole.OWNER, '/dashboard/settings/categories')
      ).toBe(true);
    });

    it('should deny agent and end_user access to categories', () => {
      expect(
        canAccessRoute(UserRole.AGENT, '/dashboard/settings/categories')
      ).toBe(false);
      expect(
        canAccessRoute(UserRole.END_USER, '/dashboard/settings/categories')
      ).toBe(false);
    });

    it('should allow manager and owner to access SLA settings', () => {
      expect(canAccessRoute(UserRole.MANAGER, '/dashboard/settings/sla')).toBe(
        true
      );
      expect(canAccessRoute(UserRole.OWNER, '/dashboard/settings/sla')).toBe(
        true
      );
    });

    it('should deny agent and end_user access to SLA settings', () => {
      expect(canAccessRoute(UserRole.AGENT, '/dashboard/settings/sla')).toBe(
        false
      );
      expect(canAccessRoute(UserRole.END_USER, '/dashboard/settings/sla')).toBe(
        false
      );
    });
  });

  describe('owner routes', () => {
    it('should allow only owner to access user management', () => {
      expect(canAccessRoute(UserRole.OWNER, '/dashboard/settings/users')).toBe(
        true
      );
    });

    it('should deny non-owners access to user management', () => {
      expect(
        canAccessRoute(UserRole.MANAGER, '/dashboard/settings/users')
      ).toBe(false);
      expect(canAccessRoute(UserRole.AGENT, '/dashboard/settings/users')).toBe(
        false
      );
      expect(
        canAccessRoute(UserRole.END_USER, '/dashboard/settings/users')
      ).toBe(false);
    });

    it('should allow only owner to access AI settings', () => {
      expect(canAccessRoute(UserRole.OWNER, '/dashboard/settings/ai')).toBe(
        true
      );
    });

    it('should deny non-owners access to AI settings', () => {
      expect(canAccessRoute(UserRole.MANAGER, '/dashboard/settings/ai')).toBe(
        false
      );
      expect(canAccessRoute(UserRole.AGENT, '/dashboard/settings/ai')).toBe(
        false
      );
      expect(canAccessRoute(UserRole.END_USER, '/dashboard/settings/ai')).toBe(
        false
      );
    });
  });

  describe('unprotected routes', () => {
    it('should allow all authenticated users to access dashboard', () => {
      expect(canAccessRoute(UserRole.END_USER, '/dashboard')).toBe(true);
      expect(canAccessRoute(UserRole.AGENT, '/dashboard')).toBe(true);
      expect(canAccessRoute(UserRole.MANAGER, '/dashboard')).toBe(true);
      expect(canAccessRoute(UserRole.OWNER, '/dashboard')).toBe(true);
    });

    it('should allow all authenticated users to access personal settings', () => {
      expect(canAccessRoute(UserRole.END_USER, '/dashboard/settings')).toBe(
        true
      );
      expect(
        canAccessRoute(UserRole.END_USER, '/dashboard/settings/profile')
      ).toBe(true);
    });
  });
});

describe('canAssignRole', () => {
  it('should allow owner to assign any role', () => {
    expect(canAssignRole(UserRole.OWNER, UserRole.OWNER)).toBe(true);
    expect(canAssignRole(UserRole.OWNER, UserRole.MANAGER)).toBe(true);
    expect(canAssignRole(UserRole.OWNER, UserRole.AGENT)).toBe(true);
    expect(canAssignRole(UserRole.OWNER, UserRole.END_USER)).toBe(true);
  });

  it('should deny manager from assigning roles', () => {
    expect(canAssignRole(UserRole.MANAGER, UserRole.MANAGER)).toBe(false);
    expect(canAssignRole(UserRole.MANAGER, UserRole.AGENT)).toBe(false);
    expect(canAssignRole(UserRole.MANAGER, UserRole.END_USER)).toBe(false);
  });

  it('should deny agent from assigning roles', () => {
    expect(canAssignRole(UserRole.AGENT, UserRole.AGENT)).toBe(false);
    expect(canAssignRole(UserRole.AGENT, UserRole.END_USER)).toBe(false);
  });

  it('should deny end_user from assigning roles', () => {
    expect(canAssignRole(UserRole.END_USER, UserRole.END_USER)).toBe(false);
  });

  it('should deny non-owners from assigning owner role', () => {
    expect(canAssignRole(UserRole.MANAGER, UserRole.OWNER)).toBe(false);
    expect(canAssignRole(UserRole.AGENT, UserRole.OWNER)).toBe(false);
    expect(canAssignRole(UserRole.END_USER, UserRole.OWNER)).toBe(false);
  });
});

describe('canViewAllTickets', () => {
  it('should allow agent, manager, and owner to view all tickets', () => {
    expect(canViewAllTickets(UserRole.AGENT)).toBe(true);
    expect(canViewAllTickets(UserRole.MANAGER)).toBe(true);
    expect(canViewAllTickets(UserRole.OWNER)).toBe(true);
  });

  it('should deny end_user from viewing all tickets', () => {
    expect(canViewAllTickets(UserRole.END_USER)).toBe(false);
  });
});

describe('canManageCategories', () => {
  it('should allow manager and owner to manage categories', () => {
    expect(canManageCategories(UserRole.MANAGER)).toBe(true);
    expect(canManageCategories(UserRole.OWNER)).toBe(true);
  });

  it('should deny agent and end_user from managing categories', () => {
    expect(canManageCategories(UserRole.AGENT)).toBe(false);
    expect(canManageCategories(UserRole.END_USER)).toBe(false);
  });
});

describe('canManageSLA', () => {
  it('should allow manager and owner to manage SLA', () => {
    expect(canManageSLA(UserRole.MANAGER)).toBe(true);
    expect(canManageSLA(UserRole.OWNER)).toBe(true);
  });

  it('should deny agent and end_user from managing SLA', () => {
    expect(canManageSLA(UserRole.AGENT)).toBe(false);
    expect(canManageSLA(UserRole.END_USER)).toBe(false);
  });
});

describe('canViewAnalytics', () => {
  it('should allow agent, manager, and owner to view analytics', () => {
    expect(canViewAnalytics(UserRole.AGENT)).toBe(true);
    expect(canViewAnalytics(UserRole.MANAGER)).toBe(true);
    expect(canViewAnalytics(UserRole.OWNER)).toBe(true);
  });

  it('should deny end_user from viewing analytics', () => {
    expect(canViewAnalytics(UserRole.END_USER)).toBe(false);
  });
});

describe('canManageUsers', () => {
  it('should allow only owner to manage users', () => {
    expect(canManageUsers(UserRole.OWNER)).toBe(true);
  });

  it('should deny non-owners from managing users', () => {
    expect(canManageUsers(UserRole.MANAGER)).toBe(false);
    expect(canManageUsers(UserRole.AGENT)).toBe(false);
    expect(canManageUsers(UserRole.END_USER)).toBe(false);
  });
});

describe('canConfigureAI', () => {
  it('should allow only owner to configure AI', () => {
    expect(canConfigureAI(UserRole.OWNER)).toBe(true);
  });

  it('should deny non-owners from configuring AI', () => {
    expect(canConfigureAI(UserRole.MANAGER)).toBe(false);
    expect(canConfigureAI(UserRole.AGENT)).toBe(false);
    expect(canConfigureAI(UserRole.END_USER)).toBe(false);
  });
});

describe('getAccessibleRoutes', () => {
  it('should return owner-accessible routes for owner', () => {
    const routes = getAccessibleRoutes(UserRole.OWNER);
    expect(routes).toContain('/dashboard/analytics');
    expect(routes).toContain('/dashboard/settings/categories');
    expect(routes).toContain('/dashboard/settings/sla');
    expect(routes).toContain('/dashboard/settings/users');
    expect(routes).toContain('/dashboard/settings/ai');
  });

  it('should return manager-accessible routes for manager (no owner routes)', () => {
    const routes = getAccessibleRoutes(UserRole.MANAGER);
    expect(routes).toContain('/dashboard/analytics');
    expect(routes).toContain('/dashboard/settings/categories');
    expect(routes).toContain('/dashboard/settings/sla');
    expect(routes).not.toContain('/dashboard/settings/users');
    expect(routes).not.toContain('/dashboard/settings/ai');
  });

  it('should return agent-accessible routes for agent', () => {
    const routes = getAccessibleRoutes(UserRole.AGENT);
    expect(routes).toContain('/dashboard/analytics');
    expect(routes).not.toContain('/dashboard/settings/categories');
    expect(routes).not.toContain('/dashboard/settings/sla');
  });

  it('should return no protected routes for end_user', () => {
    const routes = getAccessibleRoutes(UserRole.END_USER);
    expect(routes).toHaveLength(0);
  });
});

describe('getRequiredRole', () => {
  it('should return correct required role for protected routes', () => {
    expect(getRequiredRole('/dashboard/analytics')).toBe(UserRole.AGENT);
    expect(getRequiredRole('/dashboard/settings/categories')).toBe(
      UserRole.MANAGER
    );
    expect(getRequiredRole('/dashboard/settings/users')).toBe(UserRole.OWNER);
  });

  it('should return END_USER for unprotected routes', () => {
    expect(getRequiredRole('/dashboard')).toBe(UserRole.END_USER);
    expect(getRequiredRole('/dashboard/tickets')).toBe(UserRole.END_USER);
    expect(getRequiredRole('/dashboard/settings')).toBe(UserRole.END_USER);
  });
});
