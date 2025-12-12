// Shared TypeScript types and interfaces for EasyPing

// Re-export Supabase auto-generated types
export type { Database, Json } from './supabase';

// Re-export application data models
export type {
  AIConfig,
  SupportType,
  SupportProfile,
  Organization,
  User,
  Ping,
  PingMessage,
  PingAttachment,
  PingMessageWithAttachments,
  PingWithMessages,
  InsertOrganization,
  InsertUser,
  InsertPing,
  InsertPingMessage,
  UpdateOrganization,
  UpdateUser,
  UpdatePing,
  UpdatePingMessage,
} from './models';

// Re-export enums and helpers
export {
  UserRole,
  PingStatus,
  PingPriority,
  MessageType,
  isUserRole,
  getAllUserRoles,
} from './enums';
