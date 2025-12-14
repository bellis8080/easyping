/**
 * Routing Service
 * Story 3.5: Automatic Ping Routing
 *
 * Determines routing for new pings based on category and active routing rules.
 * Returns routing result with destination (team or agent) and system message.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@easyping/types';
import type { RoutingResult } from '@easyping/types';

interface RoutingRuleWithDetails {
  id: string;
  category_id: string;
  rule_type: 'agent' | 'team';
  destination_agent_id: string | null;
  destination_team_id: string | null;
  priority: number;
  is_active: boolean;
  destination_agent: {
    id: string;
    full_name: string | null;
  } | null;
  destination_team: {
    id: string;
    name: string;
  } | null;
}

export class RoutingService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private tenantId: string
  ) {}

  /**
   * Determine routing for a ping based on its category.
   *
   * @param categoryId - The category ID of the ping
   * @returns RoutingResult with routing decision and system message
   */
  async routePing(categoryId: string | null): Promise<RoutingResult> {
    // If no category, cannot route
    if (!categoryId) {
      return {
        routed: false,
        routedTo: null,
        systemMessage:
          'Ping created without category - no automatic routing applied.',
      };
    }

    try {
      // Find active routing rule for this category
      const { data: rule, error } = await this.supabase
        .from('routing_rules')
        .select(
          `
          id,
          category_id,
          rule_type,
          destination_agent_id,
          destination_team_id,
          priority,
          is_active,
          destination_agent:users!routing_rules_destination_agent_id_fkey(id, full_name),
          destination_team:agent_teams!routing_rules_destination_team_id_fkey(id, name)
        `
        )
        .eq('tenant_id', this.tenantId)
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching routing rule:', error);
        return {
          routed: false,
          routedTo: null,
          systemMessage:
            'Error determining routing - ping created without automatic routing.',
        };
      }

      // No rule found for this category
      if (!rule) {
        return {
          routed: false,
          routedTo: null,
          systemMessage: 'No routing rule configured for this category.',
        };
      }

      // Cast to our interface for type safety
      const typedRule = rule as unknown as RoutingRuleWithDetails;

      // Route to agent
      if (typedRule.rule_type === 'agent' && typedRule.destination_agent_id) {
        const agentName =
          typedRule.destination_agent?.full_name || 'Unknown Agent';
        return {
          routed: true,
          routedTo: {
            type: 'agent',
            id: typedRule.destination_agent_id,
            name: agentName,
          },
          systemMessage: `Ping automatically assigned to ${agentName} based on category routing rule.`,
        };
      }

      // Route to team
      if (typedRule.rule_type === 'team' && typedRule.destination_team_id) {
        const teamName = typedRule.destination_team?.name || 'Unknown Team';
        return {
          routed: true,
          routedTo: {
            type: 'team',
            id: typedRule.destination_team_id,
            name: teamName,
          },
          systemMessage: `Ping automatically routed to ${teamName} team based on category routing rule.`,
        };
      }

      // Rule exists but no valid destination
      return {
        routed: false,
        routedTo: null,
        systemMessage: 'Routing rule found but destination is invalid.',
      };
    } catch (error) {
      console.error('Unexpected error in routing service:', error);
      return {
        routed: false,
        routedTo: null,
        systemMessage:
          'Error determining routing - ping created without automatic routing.',
      };
    }
  }

  /**
   * Apply routing result to a ping update object.
   *
   * @param routingResult - The routing result from routePing()
   * @returns Object with team_id and/or assigned_to fields to apply to ping
   */
  applyRoutingToUpdate(routingResult: RoutingResult): {
    team_id?: string | null;
    assigned_to?: string | null;
  } {
    if (!routingResult.routed || !routingResult.routedTo) {
      return {};
    }

    if (routingResult.routedTo.type === 'agent') {
      return {
        assigned_to: routingResult.routedTo.id,
      };
    }

    if (routingResult.routedTo.type === 'team') {
      return {
        team_id: routingResult.routedTo.id,
      };
    }

    return {};
  }

  /**
   * Generate a system message for a routing action.
   *
   * @param routingResult - The routing result
   * @param pingNumber - The ping number for context
   * @returns Formatted system message content
   */
  generateSystemMessageContent(
    routingResult: RoutingResult,
    pingNumber: number
  ): string {
    if (!routingResult.routed) {
      return `Ping #${pingNumber}: ${routingResult.systemMessage}`;
    }

    return `Ping #${pingNumber}: ${routingResult.systemMessage}`;
  }
}

/**
 * Create a routing service instance.
 *
 * @param supabase - Supabase admin client
 * @param tenantId - The tenant ID for routing context
 * @returns RoutingService instance
 */
export function createRoutingService(
  supabase: SupabaseClient<Database>,
  tenantId: string
): RoutingService {
  return new RoutingService(supabase, tenantId);
}
