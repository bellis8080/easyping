/**
 * KB Article Filtering Utility
 * Story 4.2.2: Auto-Generate KB Articles from Resolved Pings
 *
 * Filters KB article content based on user role.
 * End users should never see agent_content (internal resolution steps).
 */

import { UserRole, canViewPrivateMessages } from '@easyping/types';

/**
 * Represents a KB article that may have agent_content
 */
interface KBArticleWithAgentContent {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  content: string;
  agent_content: string | null;
  category_id: string | null;
  status: string;
  source_ping_id: string | null;
  created_by: string;
  published_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  deleted_at: string | null;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  [key: string]: unknown; // Allow for additional fields like category relations
}

/**
 * Filters a KB article to remove agent_content for end users.
 *
 * @param article - The KB article to filter
 * @param userRole - The role of the requesting user
 * @returns The article with agent_content removed for end users
 */
export function filterKBArticleForUser<T extends KBArticleWithAgentContent>(
  article: T,
  userRole: UserRole
): T {
  // Agents, managers, and owners can see agent_content
  if (canViewPrivateMessages(userRole)) {
    return article;
  }

  // End users should not see agent_content
  const { agent_content: _agent_content, ...publicArticle } = article;
  return publicArticle as T;
}

/**
 * Filters an array of KB articles to remove agent_content for end users.
 *
 * @param articles - The KB articles to filter
 * @param userRole - The role of the requesting user
 * @returns The articles with agent_content removed for end users
 */
export function filterKBArticlesForUser<T extends KBArticleWithAgentContent>(
  articles: T[],
  userRole: UserRole
): T[] {
  return articles.map((article) => filterKBArticleForUser(article, userRole));
}

/**
 * Checks if a user role can view agent_content in KB articles.
 *
 * @param userRole - The role to check
 * @returns True if the role can view agent_content
 */
export function canViewAgentContent(userRole: UserRole): boolean {
  return canViewPrivateMessages(userRole);
}
