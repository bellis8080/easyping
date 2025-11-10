import { describe, it, expect } from 'vitest';
import { UserRole, isUserRole, getAllUserRoles } from '../src/enums';

describe('Type Definitions', () => {
  it('should define user roles correctly', () => {
    expect(UserRole.END_USER).toBe('end_user');
    expect(UserRole.AGENT).toBe('agent');
    expect(UserRole.MANAGER).toBe('manager');
    expect(UserRole.OWNER).toBe('owner');
  });

  it('should validate user roles with isUserRole type guard', () => {
    expect(isUserRole('end_user')).toBe(true);
    expect(isUserRole('agent')).toBe(true);
    expect(isUserRole('manager')).toBe(true);
    expect(isUserRole('owner')).toBe(true);
    expect(isUserRole('invalid_role')).toBe(false);
    expect(isUserRole('')).toBe(false);
  });

  it('should return all user roles with getAllUserRoles', () => {
    const roles = getAllUserRoles();
    expect(roles).toHaveLength(4);
    expect(roles).toContain(UserRole.END_USER);
    expect(roles).toContain(UserRole.AGENT);
    expect(roles).toContain(UserRole.MANAGER);
    expect(roles).toContain(UserRole.OWNER);
  });
});
