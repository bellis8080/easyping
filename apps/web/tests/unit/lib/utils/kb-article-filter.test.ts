/**
 * KB Article Filter Utility Tests
 * Story 4.2.2: Auto-Generate KB Articles from Resolved Pings
 */

import { describe, it, expect } from 'vitest';
import {
  filterKBArticleForUser,
  filterKBArticlesForUser,
  canViewAgentContent,
} from '@/lib/utils/kb-article-filter';

// Sample KB article with agent_content
const sampleArticle = {
  id: 'article-1',
  tenant_id: 'tenant-1',
  title: 'How to Reset Your Password',
  slug: 'how-to-reset-your-password',
  content: 'To reset your password, click Forgot Password on the login page.',
  agent_content:
    'User account was locked. Unlocked via admin panel. Cleared Redis cache.',
  category_id: 'cat-1',
  status: 'published',
  source_ping_id: 'ping-1',
  created_by: 'user-1',
  published_by: 'user-2',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-02T00:00:00Z',
  published_at: '2025-01-02T12:00:00Z',
  deleted_at: null,
  view_count: 100,
  helpful_count: 50,
  not_helpful_count: 5,
};

describe('filterKBArticleForUser', () => {
  describe('for end_user role', () => {
    it('should remove agent_content from article', () => {
      const filtered = filterKBArticleForUser(sampleArticle, 'end_user');

      expect(filtered.content).toBe(sampleArticle.content);
      expect(filtered.title).toBe(sampleArticle.title);
      expect('agent_content' in filtered).toBe(false);
    });

    it('should preserve all other fields', () => {
      const filtered = filterKBArticleForUser(sampleArticle, 'end_user');

      expect(filtered.id).toBe(sampleArticle.id);
      expect(filtered.slug).toBe(sampleArticle.slug);
      expect(filtered.view_count).toBe(sampleArticle.view_count);
      expect(filtered.helpful_count).toBe(sampleArticle.helpful_count);
    });
  });

  describe('for agent role', () => {
    it('should preserve agent_content', () => {
      const filtered = filterKBArticleForUser(sampleArticle, 'agent');

      expect(filtered.agent_content).toBe(sampleArticle.agent_content);
      expect(filtered.content).toBe(sampleArticle.content);
    });
  });

  describe('for manager role', () => {
    it('should preserve agent_content', () => {
      const filtered = filterKBArticleForUser(sampleArticle, 'manager');

      expect(filtered.agent_content).toBe(sampleArticle.agent_content);
    });
  });

  describe('for owner role', () => {
    it('should preserve agent_content', () => {
      const filtered = filterKBArticleForUser(sampleArticle, 'owner');

      expect(filtered.agent_content).toBe(sampleArticle.agent_content);
    });
  });
});

describe('filterKBArticlesForUser', () => {
  const articles = [
    { ...sampleArticle, id: 'article-1' },
    { ...sampleArticle, id: 'article-2', agent_content: 'Different notes' },
    { ...sampleArticle, id: 'article-3', agent_content: null },
  ];

  it('should filter all articles for end_user', () => {
    const filtered = filterKBArticlesForUser(articles, 'end_user');

    expect(filtered).toHaveLength(3);
    filtered.forEach((article) => {
      expect('agent_content' in article).toBe(false);
    });
  });

  it('should preserve agent_content for agents', () => {
    const filtered = filterKBArticlesForUser(articles, 'agent');

    expect(filtered).toHaveLength(3);
    expect(filtered[0].agent_content).toBe(sampleArticle.agent_content);
    expect(filtered[1].agent_content).toBe('Different notes');
    expect(filtered[2].agent_content).toBeNull();
  });
});

describe('canViewAgentContent', () => {
  it('should return false for end_user', () => {
    expect(canViewAgentContent('end_user')).toBe(false);
  });

  it('should return true for agent', () => {
    expect(canViewAgentContent('agent')).toBe(true);
  });

  it('should return true for manager', () => {
    expect(canViewAgentContent('manager')).toBe(true);
  });

  it('should return true for owner', () => {
    expect(canViewAgentContent('owner')).toBe(true);
  });
});
