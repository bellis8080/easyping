// Data model interfaces matching database schema
// These provide a cleaner interface for application code

import { UserRole, PingStatus, PingPriority, MessageType } from './enums';

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

export interface Ping {
  id: string; // UUID
  tenant_id: string; // UUID
  ping_number: number;
  created_by: string; // UUID (User ID)
  assigned_to: string | null; // UUID (User ID)
  category_id: string | null; // UUID (Category ID)
  status: PingStatus;
  priority: PingPriority;
  title: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  resolved_at: string | null; // ISO timestamp
  closed_at: string | null; // ISO timestamp
  sla_due_at: string | null; // ISO timestamp
  ai_summary: string | null;
}

export interface PingMessage {
  id: string; // UUID
  ping_id: string; // UUID
  sender_id: string; // UUID (User ID)
  content: string;
  message_type: MessageType;
  created_at: string; // ISO timestamp
  edited_at: string | null; // ISO timestamp
}

// Helper type for database insert operations
export type InsertOrganization = Omit<Organization, 'id' | 'created_at'>;
export type InsertUser = Omit<User, 'id' | 'created_at'>;
export type InsertPing = Omit<
  Ping,
  'id' | 'ping_number' | 'created_at' | 'updated_at'
>;
export type InsertPingMessage = Omit<PingMessage, 'id' | 'created_at'>;

// Helper type for database update operations
export type UpdateOrganization = Partial<InsertOrganization>;
export type UpdateUser = Partial<InsertUser>;
export type UpdatePing = Partial<InsertPing>;
export type UpdatePingMessage = Partial<InsertPingMessage>;
