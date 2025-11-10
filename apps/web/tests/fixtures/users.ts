import type { User } from '@easyping/types';
import { UserRole } from '@easyping/types';

export const mockUsers = {
  endUser: {
    id: 'user-1',
    tenant_id: 'org-1',
    email: 'user@example.com',
    full_name: 'Test User',
    avatar_url: null,
    role: UserRole.END_USER,
    created_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  } as User,
  agent: {
    id: 'agent-1',
    tenant_id: 'org-1',
    email: 'agent@example.com',
    full_name: 'Test Agent',
    avatar_url: null,
    role: UserRole.AGENT,
    created_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  } as User,
  manager: {
    id: 'manager-1',
    tenant_id: 'org-1',
    email: 'manager@example.com',
    full_name: 'Test Manager',
    avatar_url: null,
    role: UserRole.MANAGER,
    created_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  } as User,
};
