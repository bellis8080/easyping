/**
 * Ping Analytics API Endpoint
 * Story 5.4: Basic Analytics Dashboard
 *
 * GET /api/analytics/pings - Get ping analytics data
 * Requires manager or owner role
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface VolumeEntry {
  date: string;
  count: number;
}

interface CategoryBreakdown {
  categoryId: string | null;
  categoryName: string;
  count: number;
  percentage: number;
}

interface PeriodTotals {
  totalPings: number;
  avgResolutionTimeMinutes: number | null;
  slaComplianceRate: number | null;
}

interface Totals extends PeriodTotals {
  openPings: number;
  previousPeriod: PeriodTotals;
}

interface PingAnalyticsResponse {
  totals: Totals;
  volume: VolumeEntry[];
  categoryBreakdown: CategoryBreakdown[];
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
 * Generate empty response for error cases
 */
function emptyResponse(error: string, status: number): NextResponse<PingAnalyticsResponse> {
  return NextResponse.json(
    {
      totals: {
        totalPings: 0,
        avgResolutionTimeMinutes: null,
        slaComplianceRate: null,
        openPings: 0,
        previousPeriod: {
          totalPings: 0,
          avgResolutionTimeMinutes: null,
          slaComplianceRate: null,
        },
      },
      volume: [],
      categoryBreakdown: [],
      success: false,
      error,
    },
    { status }
  );
}

/**
 * GET /api/analytics/pings
 * Get ping analytics data with date filtering
 */
export async function GET(
  req: NextRequest
): Promise<NextResponse<PingAnalyticsResponse>> {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return emptyResponse('Unauthorized', 401);
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return emptyResponse('User not found', 404);
    }

    // Only managers and owners can access analytics
    if (!['manager', 'owner'].includes(userProfile.role)) {
      return emptyResponse('Forbidden', 403);
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

    // Run all queries in parallel for better performance
    const [
      totalPingsResult,
      avgResolutionResult,
      slaComplianceResult,
      openPingsResult,
      prevTotalPingsResult,
      prevAvgResolutionResult,
      prevSlaComplianceResult,
      volumeResult,
      categoryResult,
    ] = await Promise.all([
      // Current period: Total pings
      adminClient
        .from('pings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .neq('status', 'draft')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString()),

      // Current period: Average resolution time
      adminClient.rpc('get_avg_resolution_time', {
        p_tenant_id: tenantId,
        p_start_date: start.toISOString(),
        p_end_date: end.toISOString(),
      }),

      // Current period: SLA compliance rate
      adminClient.rpc('get_sla_compliance_rate', {
        p_tenant_id: tenantId,
        p_start_date: start.toISOString(),
        p_end_date: end.toISOString(),
      }),

      // Open pings (current snapshot, no date filter)
      adminClient
        .from('pings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['new', 'in_progress', 'waiting_on_user']),

      // Previous period: Total pings
      adminClient
        .from('pings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .neq('status', 'draft')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', previousEnd.toISOString()),

      // Previous period: Average resolution time
      adminClient.rpc('get_avg_resolution_time', {
        p_tenant_id: tenantId,
        p_start_date: previousStart.toISOString(),
        p_end_date: previousEnd.toISOString(),
      }),

      // Previous period: SLA compliance rate
      adminClient.rpc('get_sla_compliance_rate', {
        p_tenant_id: tenantId,
        p_start_date: previousStart.toISOString(),
        p_end_date: previousEnd.toISOString(),
      }),

      // Daily volume
      adminClient
        .from('pings')
        .select('created_at')
        .eq('tenant_id', tenantId)
        .neq('status', 'draft')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString()),

      // Category breakdown
      adminClient
        .from('pings')
        .select('category_id, categories(id, name)')
        .eq('tenant_id', tenantId)
        .neq('status', 'draft')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString()),
    ]);

    // Process volume data - group by day
    const volumeMap = new Map<string, number>();
    (volumeResult.data || []).forEach((ping: { created_at: string }) => {
      const date = new Date(ping.created_at).toISOString().split('T')[0];
      volumeMap.set(date, (volumeMap.get(date) || 0) + 1);
    });

    // Fill in missing dates
    const volume: VolumeEntry[] = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      volume.push({
        date: dateStr,
        count: volumeMap.get(dateStr) || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Process category breakdown
    const categoryMap = new Map<
      string,
      { categoryId: string | null; categoryName: string; count: number }
    >();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (categoryResult.data || []).forEach((ping: any) => {
      const categoryId = ping.category_id || 'uncategorized';
      // Supabase returns single object for to-one relations
      const categoryName = ping.categories?.name || 'Uncategorized';

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          categoryId: ping.category_id,
          categoryName,
          count: 0,
        });
      }
      const entry = categoryMap.get(categoryId)!;
      entry.count++;
    });

    const totalCategoryPings = Array.from(categoryMap.values()).reduce(
      (sum, c) => sum + c.count,
      0
    );

    const categoryBreakdown: CategoryBreakdown[] = Array.from(
      categoryMap.values()
    )
      .map((c) => ({
        ...c,
        percentage:
          totalCategoryPings > 0
            ? Math.round((c.count / totalCategoryPings) * 100)
            : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Build response
    const totals: Totals = {
      totalPings: totalPingsResult.count || 0,
      avgResolutionTimeMinutes: avgResolutionResult.data ?? null,
      slaComplianceRate: slaComplianceResult.data !== null
        ? Math.round(slaComplianceResult.data * 10) / 10
        : null,
      openPings: openPingsResult.count || 0,
      previousPeriod: {
        totalPings: prevTotalPingsResult.count || 0,
        avgResolutionTimeMinutes: prevAvgResolutionResult.data ?? null,
        slaComplianceRate: prevSlaComplianceResult.data !== null
          ? Math.round(prevSlaComplianceResult.data * 10) / 10
          : null,
      },
    };

    return NextResponse.json({
      totals,
      volume,
      categoryBreakdown,
      success: true,
    });
  } catch (error) {
    console.error('Error in Ping analytics endpoint:', error);
    return emptyResponse('Internal server error', 500);
  }
}
