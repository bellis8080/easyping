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
  // Agent Teams
  AgentTeam,
  AgentTeamMember,
  AgentTeamWithMembers,
  PingWithTeam,
  // Routing Rules
  RoutingRuleType,
  RoutingRule,
  Category,
  RoutingRuleWithDetails,
  RoutingResult,
  // Insert/Update types
  InsertOrganization,
  InsertUser,
  InsertPing,
  InsertPingMessage,
  UpdateOrganization,
  UpdateUser,
  UpdatePing,
  UpdatePingMessage,
  InsertAgentTeam,
  UpdateAgentTeam,
  InsertAgentTeamMember,
  InsertRoutingRule,
  UpdateRoutingRule,
  // Knowledge Base
  KBArticleStatus,
  KBArticle,
  KBGlossaryTermCategory,
  KBGlossaryTerm,
  KBArticleView,
  KBArticleFeedback,
  KBArticleWithCategory,
  KBArticleWithAuthor,
  InsertKBArticle,
  UpdateKBArticle,
  InsertKBGlossaryTerm,
  UpdateKBGlossaryTerm,
  InsertKBArticleView,
  InsertKBArticleFeedback,
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
