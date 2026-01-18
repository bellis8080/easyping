/**
 * Ping Analytics CSV Export API Endpoint
 * Story 5.4: Basic Analytics Dashboard
 *
 * Exports ping analytics data as CSV file for offline analysis.
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

// Format minutes to human-readable time
function formatTime(minutes: number | null): string {
  if (minutes === null) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
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
    end.setHours(23, 59, 59, 999);
    const start = startDateParam
      ? new Date(startDateParam)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);

    // Define ping type for Supabase response
    interface PingRow {
      id: string;
      ping_number: number;
      title: string;
      status: string;
      priority: string | null;
      created_at: string;
      resolved_at: string | null;
      sla_breached: boolean | null;
      category_id: string | null;
      categories: { id: string; name: string } | null;
    }

    // Fetch all pings in date range
    const { data: pings } = await adminClient
      .from('pings')
      .select(
        `
        id,
        ping_number,
        title,
        status,
        priority,
        created_at,
        resolved_at,
        sla_breached,
        category_id,
        categories(id, name)
      `
      )
      .eq('tenant_id', tenantId)
      .neq('status', 'draft')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    // Cast to proper type (Supabase returns single object for to-one relations)
    const pingList = (pings || []) as unknown as PingRow[];

    // Calculate summary metrics
    const totalPings = pingList.length;
    const resolvedPings = pingList.filter((p) => p.resolved_at !== null);
    const totalResolved = resolvedPings.length;

    // Calculate average resolution time
    let avgResolutionMinutes: number | null = null;
    if (resolvedPings.length > 0) {
      const totalMinutes = resolvedPings.reduce((sum, p) => {
        const created = new Date(p.created_at).getTime();
        const resolved = new Date(p.resolved_at!).getTime();
        return sum + (resolved - created) / (1000 * 60);
      }, 0);
      avgResolutionMinutes = totalMinutes / resolvedPings.length;
    }

    // Calculate SLA compliance
    let slaComplianceRate: number | null = null;
    if (totalResolved > 0) {
      const compliant = resolvedPings.filter(
        (p) => p.sla_breached === null || p.sla_breached === false
      ).length;
      slaComplianceRate = (compliant / totalResolved) * 100;
    }

    // Get open pings count
    const { count: openPingsCount } = await adminClient
      .from('pings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['new', 'in_progress', 'waiting_on_user']);

    // Build CSV content
    const csvSections: string[] = [];

    // Section 1: Summary
    csvSections.push('PING ANALYTICS SUMMARY');
    csvSections.push(
      generateCSV(
        ['Metric', 'Value'],
        [
          ['Report Date', new Date().toISOString().split('T')[0]],
          ['Date Range Start', start.toISOString().split('T')[0]],
          ['Date Range End', end.toISOString().split('T')[0]],
          ['Total Pings', totalPings],
          ['Resolved Pings', totalResolved],
          ['Open Pings', openPingsCount || 0],
          ['Average Resolution Time', formatTime(avgResolutionMinutes)],
          [
            'SLA Compliance Rate',
            slaComplianceRate !== null
              ? `${Math.round(slaComplianceRate * 10) / 10}%`
              : 'N/A',
          ],
        ]
      )
    );

    // Section 2: Daily Volume
    csvSections.push('');
    csvSections.push('DAILY PING VOLUME');

    const volumeMap = new Map<string, { total: number; resolved: number }>();
    pingList.forEach((ping) => {
      const date = new Date(ping.created_at).toISOString().split('T')[0];
      const current = volumeMap.get(date) || { total: 0, resolved: 0 };
      current.total++;
      if (ping.resolved_at) current.resolved++;
      volumeMap.set(date, current);
    });

    // Fill in all dates in range
    const currentDate = new Date(start);
    const volumeData: (string | number)[][] = [];
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = volumeMap.get(dateStr) || { total: 0, resolved: 0 };
      volumeData.push([dateStr, dayData.total, dayData.resolved]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    csvSections.push(
      generateCSV(['Date', 'Total Pings', 'Resolved'], volumeData)
    );

    // Section 3: Category Breakdown
    csvSections.push('');
    csvSections.push('PINGS BY CATEGORY');

    interface CategoryData {
      name: string;
      count: number;
      resolved: number;
    }
    const categoryMap = new Map<string, CategoryData>();
    pingList.forEach((ping) => {
      const categoryId = ping.category_id || 'uncategorized';
      const categoryName = ping.categories?.name || 'Uncategorized';
      const current = categoryMap.get(categoryId) || {
        name: categoryName,
        count: 0,
        resolved: 0,
      };
      current.count++;
      if (ping.resolved_at) current.resolved++;
      categoryMap.set(categoryId, current);
    });

    const categoryData = Array.from(categoryMap.values())
      .sort((a, b) => b.count - a.count)
      .map((cat) => {
        const pct = totalPings > 0 ? Math.round((cat.count / totalPings) * 100) : 0;
        return [cat.name, cat.count, `${pct}%`, cat.resolved];
      });

    csvSections.push(
      generateCSV(['Category', 'Total', 'Percentage', 'Resolved'], categoryData)
    );

    // Section 4: Status Breakdown
    csvSections.push('');
    csvSections.push('PINGS BY STATUS');

    const statusMap = new Map<string, number>();
    pingList.forEach((ping) => {
      statusMap.set(ping.status, (statusMap.get(ping.status) || 0) + 1);
    });

    const statusData = Array.from(statusMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => {
        const pct = totalPings > 0 ? Math.round((count / totalPings) * 100) : 0;
        return [status, count, `${pct}%`];
      });

    csvSections.push(generateCSV(['Status', 'Count', 'Percentage'], statusData));

    // Section 5: Priority Breakdown
    csvSections.push('');
    csvSections.push('PINGS BY PRIORITY');

    const priorityMap = new Map<string, number>();
    pingList.forEach((ping) => {
      const priority = ping.priority || 'none';
      priorityMap.set(priority, (priorityMap.get(priority) || 0) + 1);
    });

    const priorityData = Array.from(priorityMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([priority, count]) => {
        const pct = totalPings > 0 ? Math.round((count / totalPings) * 100) : 0;
        return [priority, count, `${pct}%`];
      });

    csvSections.push(
      generateCSV(['Priority', 'Count', 'Percentage'], priorityData)
    );

    // Section 6: All Pings Detail
    csvSections.push('');
    csvSections.push('ALL PINGS DETAIL');

    const pingDetailData = pingList.map((ping) => {
      const resolutionTime =
        ping.resolved_at && ping.created_at
          ? (new Date(ping.resolved_at).getTime() -
              new Date(ping.created_at).getTime()) /
            (1000 * 60)
          : null;

      return [
        ping.ping_number,
        ping.title,
        ping.categories?.name || 'Uncategorized',
        ping.status,
        ping.priority || 'none',
        new Date(ping.created_at).toISOString().split('T')[0],
        ping.resolved_at
          ? new Date(ping.resolved_at).toISOString().split('T')[0]
          : 'N/A',
        formatTime(resolutionTime),
        ping.sla_breached === true
          ? 'Yes'
          : ping.sla_breached === false
            ? 'No'
            : 'N/A',
      ];
    });

    csvSections.push(
      generateCSV(
        [
          'Ping #',
          'Title',
          'Category',
          'Status',
          'Priority',
          'Created',
          'Resolved',
          'Resolution Time',
          'SLA Breached',
        ],
        pingDetailData
      )
    );

    // Combine all sections
    const csvContent = csvSections.join('\n');

    // Generate filename
    const filename = `ping-analytics-${new Date().toISOString().split('T')[0]}.csv`;

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting ping analytics:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
