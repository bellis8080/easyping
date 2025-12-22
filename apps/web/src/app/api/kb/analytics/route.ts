/**
 * KB Analytics API Endpoint
 * Story 4.7: KB Analytics & Popular Articles
 *
 * GET /api/kb/analytics - Get KB analytics data
 * Requires manager or owner role
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  categoryId: string | null;
  categoryName: string | null;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  helpfulPercentage: number | null;
}

interface TimelineEntry {
  period: string;
  count: number;
}

interface CategoryBreakdown {
  categoryId: string | null;
  categoryName: string;
  count: number;
  percentage: number;
}

interface Totals {
  totalArticles: number;
  totalViews: number;
  totalDeflections: number;
  avgHelpfulness: number | null;
  previousPeriod: {
    totalArticles: number;
    totalViews: number;
    totalDeflections: number;
    avgHelpfulness: number | null;
  };
}

interface KBAnalyticsResponse {
  popularArticles: ArticleSummary[];
  mostHelpful: ArticleSummary[];
  leastHelpful: ArticleSummary[];
  timeline: TimelineEntry[];
  categoryBreakdown: CategoryBreakdown[];
  totals: Totals;
  success: boolean;
  error?: string;
}

/**
 * Calculate date range based on period string
 */
function getDateRange(
  startDate: string | null,
  endDate: string | null,
  period: string
): { start: Date; end: Date; previousStart: Date; previousEnd: Date } {
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);

  let start: Date;
  if (startDate) {
    start = new Date(startDate);
  } else {
    // Default periods
    switch (period) {
      case '7d':
        start = new Date(end);
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start = new Date(end);
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start = new Date(end);
        start.setDate(start.getDate() - 90);
        break;
      default:
        start = new Date(end);
        start.setDate(start.getDate() - 7);
    }
  }
  start.setHours(0, 0, 0, 0);

  // Calculate previous period for trend comparison
  const duration = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  previousEnd.setHours(23, 59, 59, 999);
  const previousStart = new Date(previousEnd.getTime() - duration);
  previousStart.setHours(0, 0, 0, 0);

  return { start, end, previousStart, previousEnd };
}

/**
 * Calculate helpful percentage
 */
function calculateHelpfulPercentage(
  helpful: number,
  notHelpful: number
): number | null {
  const total = helpful + notHelpful;
  if (total === 0) return null;
  return Math.round((helpful / total) * 100);
}

/**
 * GET /api/kb/analytics
 * Get KB analytics data with date filtering
 */
export async function GET(
  req: NextRequest
): Promise<NextResponse<KBAnalyticsResponse>> {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          popularArticles: [],
          mostHelpful: [],
          leastHelpful: [],
          timeline: [],
          categoryBreakdown: [],
          totals: {
            totalArticles: 0,
            totalViews: 0,
            totalDeflections: 0,
            avgHelpfulness: null,
            previousPeriod: {
              totalArticles: 0,
              totalViews: 0,
              totalDeflections: 0,
              avgHelpfulness: null,
            },
          },
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        {
          popularArticles: [],
          mostHelpful: [],
          leastHelpful: [],
          timeline: [],
          categoryBreakdown: [],
          totals: {
            totalArticles: 0,
            totalViews: 0,
            totalDeflections: 0,
            avgHelpfulness: null,
            previousPeriod: {
              totalArticles: 0,
              totalViews: 0,
              totalDeflections: 0,
              avgHelpfulness: null,
            },
          },
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Only managers and owners can access KB analytics
    if (!['manager', 'owner'].includes(userProfile.role)) {
      return NextResponse.json(
        {
          popularArticles: [],
          mostHelpful: [],
          leastHelpful: [],
          timeline: [],
          categoryBreakdown: [],
          totals: {
            totalArticles: 0,
            totalViews: 0,
            totalDeflections: 0,
            avgHelpfulness: null,
            previousPeriod: {
              totalArticles: 0,
              totalViews: 0,
              totalDeflections: 0,
              avgHelpfulness: null,
            },
          },
          success: false,
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const period = searchParams.get('period') || '7d';

    const { start, end, previousStart, previousEnd } = getDateRange(
      startDateParam,
      endDateParam,
      period
    );

    const adminClient = createAdminClient();
    const tenantId = userProfile.tenant_id;

    // Fetch all published articles with their metrics
    const { data: articles } = await adminClient
      .from('kb_articles')
      .select(
        `
        id,
        title,
        slug,
        category_id,
        view_count,
        helpful_count,
        not_helpful_count,
        deflection_count,
        published_at,
        categories(id, name)
      `
      )
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .is('deleted_at', null)
      .gte('published_at', start.toISOString())
      .lte('published_at', end.toISOString())
      .order('view_count', { ascending: false });

    // Fetch all published articles (no date filter) for overall stats
    const { data: allArticles, count: totalArticlesCount } = await adminClient
      .from('kb_articles')
      .select('id, view_count, helpful_count, not_helpful_count', {
        count: 'exact',
      })
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .is('deleted_at', null);

    // Get previous period articles for trend comparison
    const { count: previousArticlesCount } = await adminClient
      .from('kb_articles')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .is('deleted_at', null)
      .gte('published_at', previousStart.toISOString())
      .lte('published_at', previousEnd.toISOString());

    // Get total deflections in current period
    const { count: currentPeriodDeflections } = await adminClient
      .from('kb_deflections')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    // Get previous period deflections
    const { count: previousPeriodDeflections } = await adminClient
      .from('kb_deflections')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .gte('created_at', previousStart.toISOString())
      .lte('created_at', previousEnd.toISOString());

    // Transform articles data
    const transformedArticles: ArticleSummary[] = (articles || []).map(
      (article: any) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        categoryId: article.category_id,
        categoryName: article.categories?.name || 'Uncategorized',
        viewCount: article.view_count || 0,
        helpfulCount: article.helpful_count || 0,
        notHelpfulCount: article.not_helpful_count || 0,
        helpfulPercentage: calculateHelpfulPercentage(
          article.helpful_count || 0,
          article.not_helpful_count || 0
        ),
      })
    );

    // Popular articles (top 10 by views)
    const popularArticles = transformedArticles.slice(0, 10);

    // Most helpful articles (top 10 by helpful percentage, min 5 votes)
    const articlesWithVotes = transformedArticles.filter(
      (a) => a.helpfulCount + a.notHelpfulCount >= 5
    );
    const mostHelpful = [...articlesWithVotes]
      .sort((a, b) => (b.helpfulPercentage || 0) - (a.helpfulPercentage || 0))
      .slice(0, 10);

    // Least helpful articles (bottom 10 by helpful percentage, min 5 votes)
    const leastHelpful = [...articlesWithVotes]
      .sort((a, b) => (a.helpfulPercentage || 0) - (b.helpfulPercentage || 0))
      .slice(0, 10);

    // Timeline: group articles by day/week based on period length
    const periodDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const groupByWeek = periodDays > 14;

    const timelineMap = new Map<string, number>();

    (articles || []).forEach((article: any) => {
      if (!article.published_at) return;
      const date = new Date(article.published_at);

      let key: string;
      if (groupByWeek) {
        // Group by week (start of week)
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        // Group by day
        key = date.toISOString().split('T')[0];
      }

      timelineMap.set(key, (timelineMap.get(key) || 0) + 1);
    });

    // Fill in missing dates
    const timeline: TimelineEntry[] = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
      let key: string;
      if (groupByWeek) {
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        key = weekStart.toISOString().split('T')[0];
        currentDate.setDate(currentDate.getDate() + 7);
      } else {
        key = currentDate.toISOString().split('T')[0];
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (!timeline.find((t) => t.period === key)) {
        timeline.push({
          period: key,
          count: timelineMap.get(key) || 0,
        });
      }
    }

    // Sort timeline chronologically
    timeline.sort(
      (a, b) => new Date(a.period).getTime() - new Date(b.period).getTime()
    );

    // Category breakdown
    const categoryMap = new Map<
      string,
      { categoryId: string | null; categoryName: string; count: number }
    >();

    (articles || []).forEach((article: any) => {
      const categoryId = article.category_id || 'uncategorized';
      const categoryName = article.categories?.name || 'Uncategorized';

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          categoryId: article.category_id,
          categoryName,
          count: 0,
        });
      }
      const entry = categoryMap.get(categoryId)!;
      entry.count++;
    });

    const totalCategoryArticles = Array.from(categoryMap.values()).reduce(
      (sum, c) => sum + c.count,
      0
    );

    const categoryBreakdown: CategoryBreakdown[] = Array.from(
      categoryMap.values()
    )
      .map((c) => ({
        ...c,
        percentage:
          totalCategoryArticles > 0
            ? Math.round((c.count / totalCategoryArticles) * 100)
            : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Calculate totals
    const totalViews = (allArticles || []).reduce(
      (sum, a: any) => sum + (a.view_count || 0),
      0
    );

    // Calculate average helpfulness from all published articles with votes
    const allWithVotes = (allArticles || []).filter(
      (a: any) => (a.helpful_count || 0) + (a.not_helpful_count || 0) >= 1
    );
    let avgHelpfulness: number | null = null;
    if (allWithVotes.length > 0) {
      const totalHelpful = allWithVotes.reduce(
        (sum, a: any) => sum + (a.helpful_count || 0),
        0
      );
      const totalNotHelpful = allWithVotes.reduce(
        (sum, a: any) => sum + (a.not_helpful_count || 0),
        0
      );
      avgHelpfulness = calculateHelpfulPercentage(
        totalHelpful,
        totalNotHelpful
      );
    }

    const totals: Totals = {
      totalArticles: totalArticlesCount || 0,
      totalViews,
      totalDeflections: currentPeriodDeflections || 0,
      avgHelpfulness,
      previousPeriod: {
        totalArticles: previousArticlesCount || 0,
        totalViews: 0, // Would need view tracking by date for accurate comparison
        totalDeflections: previousPeriodDeflections || 0,
        avgHelpfulness: null, // Would need historical data
      },
    };

    return NextResponse.json({
      popularArticles,
      mostHelpful,
      leastHelpful,
      timeline,
      categoryBreakdown,
      totals,
      success: true,
    });
  } catch (error) {
    console.error('Error in KB analytics endpoint:', error);
    return NextResponse.json(
      {
        popularArticles: [],
        mostHelpful: [],
        leastHelpful: [],
        timeline: [],
        categoryBreakdown: [],
        totals: {
          totalArticles: 0,
          totalViews: 0,
          totalDeflections: 0,
          avgHelpfulness: null,
          previousPeriod: {
            totalArticles: 0,
            totalViews: 0,
            totalDeflections: 0,
            avgHelpfulness: null,
          },
        },
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
