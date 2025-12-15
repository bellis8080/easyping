// Data model interfaces matching database schema
// These provide a cleaner interface for application code

import { UserRole, PingStatus, PingPriority, MessageType } from './enums';

export interface AIConfig {
  provider?: 'openai' | 'anthropic' | 'azure';
  encrypted_api_key?: string;
  model?: string;
  enabled?: boolean;
  // Azure-specific fields
  endpoint?: string;
  deployment?: string;
  api_version?: string;
}

// Support type is now a free-form string to allow any use case
export type SupportType = string;

export interface SupportProfile {
  support_type: SupportType;
  description: string; // Freeform description of what support handles
  typical_users: string; // Who submits pings (employees, customers, etc.)
  systems_supported?: string[]; // Optional list of systems/tools
  common_issues?: string[]; // Optional list of common issue types
  ai_generated: boolean; // Whether Echo created this profile
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface Organization {
  id: string; // UUID
  name: string;
  domain: string | null;
  created_at: string; // ISO timestamp
  settings: Record<string, any>; // JSONB
  ai_config?: AIConfig; // JSONB - AI provider configuration
  support_profile?: SupportProfile; // JSONB - Support profile describing what this org handles
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
  echo_enabled: boolean; // Whether Echo AI response suggestions are enabled
}

export interface Ping {
  id: string; // UUID
  tenant_id: string; // UUID
  ping_number: number;
  created_by: string; // UUID (User ID)
  assigned_to: string | null; // UUID (User ID)
  category_id: string | null; // UUID (Category ID)
  team_id: string | null; // UUID (AgentTeam ID) - team this ping is routed to
  status: PingStatus;
  priority: PingPriority;
  title: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  resolved_at: string | null; // ISO timestamp
  closed_at: string | null; // ISO timestamp
  sla_due_at: string | null; // ISO timestamp
  ai_summary: string | null;
  summary_updated_at: string | null; // ISO timestamp - when AI summary was last generated
  first_response_at: string | null; // ISO timestamp - when agent first replied
  last_user_reply_at: string | null; // ISO timestamp - last time user replied
  last_agent_reply_at: string | null; // ISO timestamp - last time agent replied
  status_changed_at: string | null; // ISO timestamp - last status change
}

export interface PingMessage {
  id: string; // UUID
  ping_id: string; // UUID
  sender_id: string; // UUID (User ID)
  content: string;
  message_type: MessageType;
  created_at: string; // ISO timestamp
  edited_at: string | null; // ISO timestamp
  sender?: User; // Optional joined relation
}

export interface PingAttachment {
  id: string; // UUID
  ping_message_id: string; // UUID
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  storage_bucket: string;
  uploaded_by: string; // UUID (User ID)
  created_at: string; // ISO timestamp
}

export interface PingMessageWithAttachments extends PingMessage {
  attachments?: PingAttachment[];
}

// Extended Ping type with messages for displaying conversation threads
export interface PingWithMessages extends Ping {
  messages: PingMessage[];
}

// ============================================================================
// Agent Teams
// ============================================================================

export interface AgentTeam {
  id: string; // UUID
  tenant_id: string; // UUID
  name: string;
  description: string | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface AgentTeamMember {
  team_id: string; // UUID
  user_id: string; // UUID
  added_at: string; // ISO timestamp
}

export interface AgentTeamWithMembers extends AgentTeam {
  members: User[];
  member_count: number;
}

// Extended ping type with team information
export interface PingWithTeam extends Ping {
  team?: AgentTeam | null;
}

// ============================================================================
// Routing Rules
// ============================================================================

export type RoutingRuleType = 'agent' | 'team';

export interface RoutingRule {
  id: string; // UUID
  tenant_id: string; // UUID
  category_id: string; // UUID
  rule_type: RoutingRuleType;
  destination_agent_id: string | null; // UUID
  destination_team_id: string | null; // UUID
  priority: number;
  is_active: boolean;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Category interface for use in RoutingRuleWithDetails
export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RoutingRuleWithDetails extends RoutingRule {
  category?: Category;
  destination_agent?: User;
  destination_team?: AgentTeam;
}

// Routing result returned after applying a routing rule
export interface RoutingResult {
  routed: boolean;
  routedTo: {
    type: 'agent' | 'team';
    id: string;
    name: string;
  } | null;
  systemMessage: string;
}

// ============================================================================
// Insert/Update helper types for new tables
// ============================================================================

export type InsertAgentTeam = Omit<
  AgentTeam,
  'id' | 'created_at' | 'updated_at'
>;
export type UpdateAgentTeam = Partial<Pick<AgentTeam, 'name' | 'description'>>;

export type InsertAgentTeamMember = Omit<AgentTeamMember, 'added_at'>;

export type InsertRoutingRule = Omit<
  RoutingRule,
  'id' | 'created_at' | 'updated_at'
>;
export type UpdateRoutingRule = Partial<
  Omit<RoutingRule, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
>;

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

// ============================================================================
// Knowledge Base
// ============================================================================

export type KBArticleStatus = 'draft' | 'published' | 'archived';

export interface KBArticle {
  id: string; // UUID
  tenant_id: string; // UUID
  title: string;
  slug: string;
  content: string; // Markdown
  category_id: string | null; // UUID (Category ID)
  status: KBArticleStatus;
  source_ping_id: string | null; // UUID (Ping ID)
  created_by: string; // UUID (User ID)
  published_by: string | null; // UUID (User ID)
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  published_at: string | null; // ISO timestamp
  deleted_at: string | null; // ISO timestamp (soft delete)
  embedding: number[] | null; // Vector(1536) for semantic search
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
}

export type KBGlossaryTermCategory =
  | 'acronym'
  | 'industry'
  | 'company'
  | 'general';

export interface KBGlossaryTerm {
  id: string; // UUID
  tenant_id: string; // UUID
  term: string;
  definition: string;
  category: KBGlossaryTermCategory | null;
  created_by: string; // UUID (User ID)
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface KBArticleView {
  id: string; // UUID
  article_id: string; // UUID
  user_id: string | null; // UUID (nullable for anonymous)
  session_id: string | null;
  viewed_at: string; // ISO timestamp
}

export interface KBArticleFeedback {
  id: string; // UUID
  article_id: string; // UUID
  user_id: string | null; // UUID (nullable)
  is_helpful: boolean;
  created_at: string; // ISO timestamp
}

// Extended types with relations
export interface KBArticleWithCategory extends KBArticle {
  category?: Category | null;
}

export interface KBArticleWithAuthor extends KBArticle {
  author?: User;
  publisher?: User | null;
}

// Insert/Update helper types for KB tables
export type InsertKBArticle = Omit<
  KBArticle,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'view_count'
  | 'helpful_count'
  | 'not_helpful_count'
>;
export type UpdateKBArticle = Partial<
  Omit<KBArticle, 'id' | 'tenant_id' | 'created_at' | 'created_by'>
>;

export type InsertKBGlossaryTerm = Omit<
  KBGlossaryTerm,
  'id' | 'created_at' | 'updated_at'
>;
export type UpdateKBGlossaryTerm = Partial<
  Omit<KBGlossaryTerm, 'id' | 'tenant_id' | 'created_at' | 'created_by'>
>;

export type InsertKBArticleView = Omit<KBArticleView, 'id' | 'viewed_at'>;
export type InsertKBArticleFeedback = Omit<
  KBArticleFeedback,
  'id' | 'created_at'
>;
