// Shared TypeScript types and interfaces for EasyPing

// Re-export Supabase auto-generated types
export type { Database, Json } from './supabase';

// Re-export application data models
export type {
  Organization,
  User,
  InsertOrganization,
  InsertUser,
  UpdateOrganization,
  UpdateUser,
} from './models';
