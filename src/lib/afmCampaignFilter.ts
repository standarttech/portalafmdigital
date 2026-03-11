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
    .select('id, campaign_name, platform_campaign_id')
    .eq('client_id', clientId);

  if (!data) return [];
  
  const afmCampaigns = data.filter(c => c.campaign_name.toUpperCase().includes(AFM_CAMPAIGN_PREFIX));
  
  // If there are API-sourced AFM campaigns, exclude sheets-sourced ones to prevent duplication
  const apiCampaigns = afmCampaigns.filter(c => !c.platform_campaign_id.startsWith('sheets-'));
  if (apiCampaigns.length > 0) {
    return apiCampaigns.map(c => c.id);
  }
  
  // Fallback: use sheets campaigns if no API campaigns exist
  return afmCampaigns.map(c => c.id);
}

/**
 * Fetch ALL AFM campaign IDs across all clients (for dashboard-level queries).
 * Optionally scoped to specific client IDs.
 */
export async function getAllAfmCampaignIds(clientIds?: string[]): Promise<string[]> {
  let query = supabase
    .from('campaigns')
    .select('id, campaign_name, platform_campaign_id, client_id');

  if (clientIds && clientIds.length > 0) {
    query = query.in('client_id', clientIds);
  }

  const { data } = await query;
  if (!data) return [];
  
  const afmCampaigns = data.filter(c => c.campaign_name.toUpperCase().includes(AFM_CAMPAIGN_PREFIX));
  
  // Group by client to apply API-priority per client
  const byClient: Record<string, typeof afmCampaigns> = {};
  for (const c of afmCampaigns) {
    const cid = (c as any).client_id as string;
    if (!byClient[cid]) byClient[cid] = [];
    byClient[cid].push(c);
  }
  
  const result: string[] = [];
  for (const clientCampaigns of Object.values(byClient)) {
    const apiCampaigns = clientCampaigns.filter(c => !c.platform_campaign_id.startsWith('sheets-'));
    if (apiCampaigns.length > 0) {
      // Client has API campaigns — use only those, skip sheets duplicates
      result.push(...apiCampaigns.map(c => c.id));
    } else {
      // Fallback: use sheets campaigns
      result.push(...clientCampaigns.map(c => c.id));
    }
  }
  
  return result;
}

/**
 * Check if a campaign name matches the AFM filter.
 */
export function isAfmCampaign(campaignName: string): boolean {
  return campaignName.toUpperCase().includes(AFM_CAMPAIGN_PREFIX);
}
