// Data model interfaces matching database schema
// These provide a cleaner interface for application code

import { UserRole } from './enums';

export interface Organization {
  id: string; // UUID
  name: string;
  domain: string | null;
  created_at: string; // ISO timestamp
  settings: Record<string, any>; // JSONB
}

export interface User {
  id: string; // UUID
  tenant_id: string; // UUID
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string; // ISO timestamp
  last_seen_at: string | null; // ISO timestamp
}

// Helper type for database insert operations
export type InsertOrganization = Omit<Organization, 'id' | 'created_at'>;
export type InsertUser = Omit<User, 'id' | 'created_at'>;

// Helper type for database update operations
export type UpdateOrganization = Partial<InsertOrganization>;
export type UpdateUser = Partial<InsertUser>;
