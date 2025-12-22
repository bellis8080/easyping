/**
 * KB Analytics CSV Export API Endpoint
 * Story 4.7: KB Analytics & Popular Articles
 *
 * Exports KB analytics data as CSV file for offline analysis.
 * Requires manager or owner role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Helper function to escape CSV values
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// Helper function to generate CSV from data
function generateCSV(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map((row) => row.map(escapeCSV).join(','));
  return [headerLine, ...dataLines].join('\n');
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get user profile to check role
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return new NextResponse('User profile not found', { status: 404 });
    }

    // Check role - only managers and owners can export analytics
    if (!['manager', 'owner'].includes(userProfile.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const tenantId = userProfile.tenant_id;
    const adminClient = createAdminClient();

    // Parse date range from query params
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const end = endDateParam ? new Date(endDateParam) : new Date();
    const start = startDateParam
      ? new Date(startDateParam)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Define article type for Supabase response
    interface ArticleRow {
      id: string;
      title: string;
      slug: string;
      view_count: number;
      helpful_count: number;
      deflection_count: number;
      status: string;
      published_at: string | null;
      category_id: string | null;
      kb_categories: { id: string; name: string } | null;
    }

    // Fetch all published articles
    const { data: articlesRaw } = await adminClient
      .from('kb_articles')
      .select(
        `
        id,
        title,
        slug,
        view_count,
        helpful_count,
        deflection_count,
        status,
        published_at,
        category_id,
        kb_categories (
          id,
          name
        )
      `
      )
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('view_count', { ascending: false });

    // Cast to proper type (Supabase returns single object for to-one relations)
    const articles = (articlesRaw || []) as unknown as ArticleRow[];

    // Fetch feedback counts
    const { data: feedbackData } = await adminClient
      .from('kb_article_feedback')
      .select('article_id, is_helpful')
      .in(
        'article_id',
        articles.map((a) => a.id)
      );

    // Create feedback map
    const feedbackMap = new Map<
      string,
      { helpful: number; notHelpful: number }
    >();
    (feedbackData || []).forEach(
      (fb: { article_id: string; is_helpful: boolean }) => {
        const current = feedbackMap.get(fb.article_id) || {
          helpful: 0,
          notHelpful: 0,
        };
        if (fb.is_helpful) {
          current.helpful++;
        } else {
          current.notHelpful++;
        }
        feedbackMap.set(fb.article_id, current);
      }
    );

    // Fetch deflections in date range
    const { count: deflectionCount } = await adminClient
      .from('kb_deflections')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    // Build CSV content
    const csvSections: string[] = [];

    // Section 1: Summary
    const totalArticles = articles.length;
    const totalViews = articles.reduce(
      (sum, a) => sum + (a.view_count || 0),
      0
    );
    const totalDeflections = deflectionCount || 0;

    // Calculate average helpfulness
    let totalHelpful = 0;
    let totalNotHelpful = 0;
    feedbackMap.forEach((fb) => {
      totalHelpful += fb.helpful;
      totalNotHelpful += fb.notHelpful;
    });
    const avgHelpfulness =
      totalHelpful + totalNotHelpful > 0
        ? Math.round((totalHelpful / (totalHelpful + totalNotHelpful)) * 100)
        : null;

    csvSections.push('KB ANALYTICS SUMMARY');
    csvSections.push(
      generateCSV(
        ['Metric', 'Value'],
        [
          ['Report Date', new Date().toISOString().split('T')[0]],
          ['Date Range Start', start.toISOString().split('T')[0]],
          ['Date Range End', end.toISOString().split('T')[0]],
          ['Total Published Articles', totalArticles],
          ['Total Article Views', totalViews],
          ['Total Deflections', totalDeflections],
          [
            'Average Helpfulness',
            avgHelpfulness !== null ? `${avgHelpfulness}%` : 'N/A',
          ],
        ]
      )
    );

    // Section 2: Popular Articles (Top 20)
    csvSections.push('');
    csvSections.push('POPULAR ARTICLES (Top 20 by Views)');

    const popularArticlesData = articles.slice(0, 20).map((article, index) => {
      const feedback = feedbackMap.get(article.id) || {
        helpful: 0,
        notHelpful: 0,
      };
      const totalVotes = feedback.helpful + feedback.notHelpful;
      const helpfulPct =
        totalVotes > 0
          ? Math.round((feedback.helpful / totalVotes) * 100)
          : null;

      return [
        index + 1,
        article.title,
        article.kb_categories?.name || 'Uncategorized',
        article.view_count,
        feedback.helpful,
        feedback.notHelpful,
        helpfulPct !== null ? `${helpfulPct}%` : 'N/A',
        article.deflection_count,
        article.published_at
          ? new Date(article.published_at).toISOString().split('T')[0]
          : 'N/A',
      ];
    });

    csvSections.push(
      generateCSV(
        [
          'Rank',
          'Title',
          'Category',
          'Views',
          'Helpful',
          'Not Helpful',
          'Helpful %',
          'Deflections',
          'Published Date',
        ],
        popularArticlesData
      )
    );

    // Section 3: Category Breakdown
    const categoryMap = new Map<
      string,
      { name: string; count: number; views: number }
    >();
    articles.forEach((article) => {
      const categoryId = article.category_id || 'uncategorized';
      const categoryName = article.kb_categories?.name || 'Uncategorized';
      const current = categoryMap.get(categoryId) || {
        name: categoryName,
        count: 0,
        views: 0,
      };
      current.count++;
      current.views += article.view_count || 0;
      categoryMap.set(categoryId, current);
    });

    csvSections.push('');
    csvSections.push('ARTICLES BY CATEGORY');

    const categoryData = Array.from(categoryMap.values())
      .sort((a, b) => b.count - a.count)
      .map((cat) => {
        const pct =
          totalArticles > 0 ? Math.round((cat.count / totalArticles) * 100) : 0;
        return [cat.name, cat.count, `${pct}%`, cat.views];
      });

    csvSections.push(
      generateCSV(
        ['Category', 'Articles', 'Percentage', 'Total Views'],
        categoryData
      )
    );

    // Section 4: All Articles Data
    csvSections.push('');
    csvSections.push('ALL PUBLISHED ARTICLES');

    const allArticlesData = articles.map((article) => {
      const feedback = feedbackMap.get(article.id) || {
        helpful: 0,
        notHelpful: 0,
      };
      const totalVotes = feedback.helpful + feedback.notHelpful;
      const helpfulPct =
        totalVotes > 0
          ? Math.round((feedback.helpful / totalVotes) * 100)
          : null;

      return [
        article.title,
        article.slug,
        article.kb_categories?.name || 'Uncategorized',
        article.view_count,
        feedback.helpful,
        feedback.notHelpful,
        helpfulPct !== null ? `${helpfulPct}%` : 'N/A',
        article.deflection_count,
        article.published_at
          ? new Date(article.published_at).toISOString().split('T')[0]
          : 'N/A',
      ];
    });

    csvSections.push(
      generateCSV(
        [
          'Title',
          'Slug',
          'Category',
          'Views',
          'Helpful',
          'Not Helpful',
          'Helpful %',
          'Deflections',
          'Published Date',
        ],
        allArticlesData
      )
    );

    // Combine all sections
    const csvContent = csvSections.join('\n');

    // Generate filename
    const filename = `kb-analytics-${new Date().toISOString().split('T')[0]}.csv`;

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting KB analytics:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
