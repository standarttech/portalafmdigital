/**
 * ============================================================
 * AFM CAMPAIGN FILTER — GLOBAL RULE
 * ============================================================
 * 
 * RULE: Only campaigns whose name contains "AFM" (case-insensitive)
 * should be included in ALL metrics calculations across the platform.
 * 
 * This filters out:
 * - Old/legacy campaigns without the AFM prefix
 * - Parallel campaigns run by the client independently
 * - Any non-agency campaigns that shouldn't be attributed to us
 * 
 * This filter is applied:
 * - Agency Dashboard (useDashboardMetrics)
 * - Client Detail Page (daily metrics + campaigns)
 * - Client Dashboard Page (daily metrics)
 * - AFM Dashboard (internal)
 * - AFM Media Buying (ad_level_metrics)
 * - AFM Performance (buyer stats)
 * - Campaigns Breakdown Tab
 * - Budget Planner (actuals)
 * - Reports (metrics + campaign list)
 * - Attention Required alerts
 * 
 * To change the prefix, update AFM_CAMPAIGN_PREFIX below.
 * ============================================================
 */

import { supabase } from '@/integrations/supabase/client';

/** The prefix/substring that campaign names must contain */
export const AFM_CAMPAIGN_PREFIX = 'AFM';

/**
 * Fetch campaign IDs for a specific client where campaign_name contains "AFM".
 * Returns an array of campaign UUIDs.
 */
export async function getAfmCampaignIds(clientId: string): Promise<string[]> {
  const { data } = await supabase
    .from('campaigns')
    .select('id, campaign_name')
    .eq('client_id', clientId);

  if (!data) return [];
  return data
    .filter(c => c.campaign_name.toUpperCase().includes(AFM_CAMPAIGN_PREFIX))
    .map(c => c.id);
}

/**
 * Fetch ALL AFM campaign IDs across all clients (for dashboard-level queries).
 * Optionally scoped to specific client IDs.
 */
export async function getAllAfmCampaignIds(clientIds?: string[]): Promise<string[]> {
  let query = supabase
    .from('campaigns')
    .select('id, campaign_name');

  if (clientIds && clientIds.length > 0) {
    query = query.in('client_id', clientIds);
  }

  const { data } = await query;
  if (!data) return [];
  return data
    .filter(c => c.campaign_name.toUpperCase().includes(AFM_CAMPAIGN_PREFIX))
    .map(c => c.id);
}

/**
 * Check if a campaign name matches the AFM filter.
 */
export function isAfmCampaign(campaignName: string): boolean {
  return campaignName.toUpperCase().includes(AFM_CAMPAIGN_PREFIX);
}
