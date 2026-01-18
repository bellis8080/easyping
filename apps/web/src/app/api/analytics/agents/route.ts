/**
 * Agent Analytics API Endpoint
 * Story 5.5: Agent Performance Metrics
 *
 * GET /api/analytics/agents - Get agent performance metrics
 * - Managers/Owners: See all agents' metrics
 * - Agents: See only their own metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface AgentMetrics {
  agentId: string;
  agentName: string;
  avatarUrl: string | null;
  pingsResolved: number;
  avgResolutionTimeMinutes: number | null;
  slaComplianceRate: number | null;
  avgFirstResponseMinutes: number | null;
  pingsAssigned: number;
}

interface AgentAnalyticsResponse {
  agents: AgentMetrics[];
  period: {
    startDate: string;
    endDate: string;
  };
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
): { start: Date; end: Date } {
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

  return { start, end };
}

/**
 * Generate empty response for error cases
 */
function emptyResponse(
  error: string,
  status: number
): NextResponse<AgentAnalyticsResponse> {
  return NextResponse.json(
    {
      agents: [],
      period: {
        startDate: '',
        endDate: '',
      },
      success: false,
      error,
    },
    { status }
  );
}

/**
 * Calculate average in minutes between two timestamps
 */
function calculateAvgMinutes(
  pings: Array<{ start: string | null; end: string | null }>
): number | null {
  const validPings = pings.filter((p) => p.start && p.end);
  if (validPings.length === 0) return null;

  const totalMinutes = validPings.reduce((sum, p) => {
    const startTime = new Date(p.start!).getTime();
    const endTime = new Date(p.end!).getTime();
    return sum + (endTime - startTime) / 60000; // Convert ms to minutes
  }, 0);

  return Math.round(totalMinutes / validPings.length);
}

/**
 * GET /api/analytics/agents
 * Get agent performance metrics with date filtering
 */
export async function GET(
  req: NextRequest
): Promise<NextResponse<AgentAnalyticsResponse>> {
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
      .select('id, role, tenant_id, full_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return emptyResponse('User not found', 404);
    }

    // Check role - agents, managers, and owners can access this endpoint
    const isManagerOrOwner = ['manager', 'owner'].includes(userProfile.role);
    const isAgent = userProfile.role === 'agent';

    if (!isManagerOrOwner && !isAgent) {
      return emptyResponse('Forbidden', 403);
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const period = searchParams.get('period') || '7d';

    const { start, end } = getDateRange(startDateParam, endDateParam, period);

    const adminClient = createAdminClient();
    const tenantId = userProfile.tenant_id;

    // Get list of agents to show metrics for
    // If user is an agent, only fetch their own metrics
    // If user is manager/owner, fetch all agents' metrics
    let agents: Array<{
      id: string;
      full_name: string | null;
      avatar_url: string | null;
    }>;

    if (isAgent) {
      // Agent only sees themselves
      agents = [
        {
          id: userProfile.id,
          full_name: userProfile.full_name,
          avatar_url: userProfile.avatar_url,
        },
      ];
    } else {
      // Manager/owner sees all agents in tenant
      const { data: agentUsers, error: agentError } = await adminClient
        .from('users')
        .select('id, full_name, avatar_url')
        .eq('tenant_id', tenantId)
        .eq('role', 'agent');

      if (agentError) {
        console.error('Error fetching agents:', agentError);
        return emptyResponse('Error fetching agents', 500);
      }

      agents = agentUsers || [];
    }

    // If no agents found, return empty array
    if (agents.length === 0) {
      return NextResponse.json({
        agents: [],
        period: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        success: true,
      });
    }

    // Fetch pings data for all agents in parallel
    const agentMetrics: AgentMetrics[] = await Promise.all(
      agents.map(async (agent) => {
        // Query 1: Pings resolved by this agent during the date range
        // This is the primary metric for performance - what did they accomplish?
        const { data: resolvedPingsData } = await adminClient
          .from('pings')
          .select(
            'id, status, assigned_at, resolved_at, first_response_at, created_at, sla_policy_id, sla_first_response_due, sla_resolution_due'
          )
          .eq('tenant_id', tenantId)
          .eq('assigned_to', agent.id)
          .in('status', ['resolved', 'closed'])
          .gte('resolved_at', start.toISOString())
          .lt('resolved_at', end.toISOString());

        const resolvedPings = resolvedPingsData || [];
        const pingsResolved = resolvedPings.length;

        // Query 2: All pings currently assigned to this agent (for workload context)
        const { data: assignedPingsData } = await adminClient
          .from('pings')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('assigned_to', agent.id)
          .not('status', 'in', '("resolved","closed")');

        const pingsAssigned = (assignedPingsData?.length || 0) + pingsResolved;

        // Average resolution time (from assigned_at to resolved_at)
        const avgResolutionTimeMinutes = calculateAvgMinutes(
          resolvedPings.map((p) => ({
            start: p.assigned_at,
            end: p.resolved_at,
          }))
        );

        // Average first response time (from created_at to first_response_at)
        const pingsWithFirstResponse = resolvedPings.filter(
          (p) => p.first_response_at
        );
        const avgFirstResponseMinutes = calculateAvgMinutes(
          pingsWithFirstResponse.map((p) => ({
            start: p.created_at,
            end: p.first_response_at,
          }))
        );

        // SLA compliance rate
        // Only count pings that have an SLA policy and are resolved
        const slaPings = resolvedPings.filter((p) => p.sla_policy_id);
        let slaComplianceRate: number | null = null;
        if (slaPings.length > 0) {
          // A ping is SLA compliant if:
          // 1. first_response_at <= sla_first_response_due (if set)
          // 2. resolved_at <= sla_resolution_due (if set)
          const compliantPings = slaPings.filter((p) => {
            // Check first response SLA
            if (p.sla_first_response_due && p.first_response_at) {
              if (
                new Date(p.first_response_at) >
                new Date(p.sla_first_response_due)
              ) {
                return false;
              }
            }
            // Check resolution SLA
            if (p.sla_resolution_due && p.resolved_at) {
              if (new Date(p.resolved_at) > new Date(p.sla_resolution_due)) {
                return false;
              }
            }
            return true;
          });
          slaComplianceRate = Math.round(
            (compliantPings.length / slaPings.length) * 100
          );
        }

        return {
          agentId: agent.id,
          agentName: agent.full_name || 'Unknown Agent',
          avatarUrl: agent.avatar_url,
          pingsResolved,
          avgResolutionTimeMinutes,
          slaComplianceRate,
          avgFirstResponseMinutes,
          pingsAssigned,
        };
      })
    );

    // Sort by pings resolved (descending) for leaderboard effect
    agentMetrics.sort((a, b) => b.pingsResolved - a.pingsResolved);

    return NextResponse.json({
      agents: agentMetrics,
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      success: true,
    });
  } catch (error) {
    console.error('Error in Agent analytics endpoint:', error);
    return emptyResponse('Internal server error', 500);
  }
}
