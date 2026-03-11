import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, differenceInDays } from 'date-fns';
import { getAllAfmCampaignIds } from '@/lib/afmCampaignFilter';
import type { DashboardFilters, DateRange } from '@/components/dashboard/dashboardData';

export interface KpiData {
  spend: number; leads: number; clicks: number; impressions: number;
  cpl: number; ctr: number; activeClients: number; activeCampaigns: number;
  revenue: number; purchases: number; roas: number;
  prevSpend: number; prevLeads: number; prevClicks: number; prevImpressions: number;
  prevCpl: number; prevCtr: number; prevRevenue: number; prevPurchases: number; prevRoas: number;
}

export interface ChartDataPoint { date: string; spend: number; leads: number; cpl: number; }
export interface PlatformDataPoint { name: string; key: string; spend: number; leads: number; color: string; }
export interface ClientMetric {
  id: string; name: string; spend: number; leads: number; cpl: number; ctr: number;
  deltaCpl: number; status: 'active' | 'inactive' | 'paused'; category: string;
  clicks: number; impressions: number; revenue: number; purchases: number;
}

function getDateRange(range: DateRange, custom?: { from: Date; to: Date }): { from: string; to: string; days: number } {
  const now = new Date();
  let from: Date;
  let to = now;
  switch (range) {
    case 'today': from = now; break;
    case '7d': from = subDays(now, 7); break;
    case '14d': from = subDays(now, 14); break;
    case '30d': from = subDays(now, 30); break;
    case '90d': from = subDays(now, 90); break;
    case 'custom':
      if (custom) { from = custom.from; to = custom.to; } else { from = subDays(now, 30); }
      break;
    default: from = subDays(now, 30);
  }
  const days = Math.max(differenceInDays(to, from), 1);
  return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd'), days };
}

const ZERO_KPIS: KpiData = {
  spend: 0, leads: 0, clicks: 0, impressions: 0, cpl: 0, ctr: 0,
  activeClients: 0, activeCampaigns: 0, revenue: 0, purchases: 0, roas: 0,
  prevSpend: 0, prevLeads: 0, prevClicks: 0, prevImpressions: 0, prevCpl: 0, prevCtr: 0,
  prevRevenue: 0, prevPurchases: 0, prevRoas: 0,
};

async function fetchDashboardData(
  range: { from: string; to: string; days: number },
  prevRange: { from: string; to: string },
  platform: string,
  clientIds: string[] | null | undefined,
) {
  // Check if real data exists
  const { count } = await supabase.from('daily_metrics').select('id', { count: 'exact', head: true });
  if ((count || 0) === 0) return { kpis: ZERO_KPIS, chartData: [], platformData: [], clientsData: [], hasRealData: false };

  // Get AFM campaign IDs
  const afmCampaignIds = await getAllAfmCampaignIds(
    clientIds && clientIds.length > 0 ? clientIds : undefined
  );
  if (afmCampaignIds.length === 0) return { kpis: ZERO_KPIS, chartData: [], platformData: [], clientsData: [], hasRealData: true };

  // Platform filter
  let filteredCampaignIds = afmCampaignIds;
  if (platform !== 'all') {
    const { data: connections } = await supabase.from('platform_connections').select('id').eq('platform', platform as any);
    if (connections?.length) {
      const { data: adAccounts } = await supabase.from('ad_accounts').select('id').in('connection_id', connections.map(c => c.id));
      if (adAccounts?.length) {
        const { data: campaigns } = await supabase.from('campaigns').select('id').in('ad_account_id', adAccounts.map(a => a.id));
        const platformIds = new Set(campaigns?.map(c => c.id) || []);
        filteredCampaignIds = afmCampaignIds.filter(id => platformIds.has(id));
      } else filteredCampaignIds = [];
    } else filteredCampaignIds = [];
  }

  if (filteredCampaignIds.length === 0) return { kpis: ZERO_KPIS, chartData: [], platformData: [], clientsData: [], hasRealData: true };

  // === Paginated fetch helper to bypass 1000-row limit ===
  async function fetchAllMetrics(
    dateFrom: string, dateTo: string,
    campaignIds: string[], scopeClientIds: string[] | null | undefined,
    columns: string,
  ) {
    const PAGE_SIZE = 1000;
    let allRows: any[] = [];
    let offset = 0;
    while (true) {
      let q = supabase
        .from('daily_metrics')
        .select(columns)
        .gte('date', dateFrom).lte('date', dateTo)
        .in('campaign_id', campaignIds)
        .range(offset, offset + PAGE_SIZE - 1);
      if (scopeClientIds && scopeClientIds.length > 0) q = q.in('client_id', scopeClientIds);
      const { data } = await q;
      if (!data || data.length === 0) break;
      allRows = allRows.concat(data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    return allRows;
  }

  let activeClientsQuery = supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'active').neq('category', 'agency');
  if (clientIds && clientIds.length > 0) activeClientsQuery = activeClientsQuery.in('id', clientIds);

  let activeCampaignsQuery = supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active').ilike('campaign_name', '%AFM%');
  if (clientIds && clientIds.length > 0) activeCampaignsQuery = activeCampaignsQuery.in('client_id', clientIds);

  // Fire ALL queries in parallel (metrics use paginated fetch)
  const [
    currentMetrics,
    prevMetrics,
    { count: clientCount },
    { count: campaignCount },
    { data: allConnections },
    { data: allAdAccounts },
    { data: allCampaigns },
  ] = await Promise.all([
    fetchAllMetrics(range.from, range.to, filteredCampaignIds, clientIds, 'spend, leads, link_clicks, impressions, date, client_id, campaign_id, revenue, purchases'),
    fetchAllMetrics(prevRange.from, prevRange.to, filteredCampaignIds, clientIds, 'spend, leads, link_clicks, impressions, revenue, purchases'),
    activeClientsQuery,
    activeCampaignsQuery,
    supabase.from('platform_connections').select('id, platform').eq('is_active', true),
    supabase.from('ad_accounts').select('id, connection_id'),
    supabase.from('campaigns').select('id, ad_account_id'),
  ]);

  // Aggregate
  const agg = (rows: any[]) => rows.reduce((a, r) => ({
    spend: a.spend + Number(r.spend), leads: a.leads + r.leads,
    clicks: a.clicks + (r.link_clicks || 0), impressions: a.impressions + r.impressions,
    revenue: a.revenue + Number(r.revenue || 0), purchases: a.purchases + (r.purchases || 0),
  }), { spend: 0, leads: 0, clicks: 0, impressions: 0, revenue: 0, purchases: 0 });

  const cur = agg(currentMetrics || []);
  const prev = agg(prevMetrics || []);

  const kpis: KpiData = {
    spend: cur.spend, leads: cur.leads, clicks: cur.clicks, impressions: cur.impressions,
    cpl: cur.leads > 0 ? cur.spend / cur.leads : 0,
    ctr: cur.impressions > 0 ? (cur.clicks / cur.impressions) * 100 : 0,
    activeClients: clientCount || 0, activeCampaigns: campaignCount || 0,
    revenue: cur.revenue, purchases: cur.purchases,
    roas: cur.spend > 0 ? cur.revenue / cur.spend : 0,
    prevSpend: prev.spend, prevLeads: prev.leads, prevClicks: prev.clicks, prevImpressions: prev.impressions,
    prevCpl: prev.leads > 0 ? prev.spend / prev.leads : 0,
    prevCtr: prev.impressions > 0 ? (prev.clicks / prev.impressions) * 100 : 0,
    prevRevenue: prev.revenue, prevPurchases: prev.purchases,
    prevRoas: prev.spend > 0 ? prev.revenue / prev.spend : 0,
  };

  // Chart data
  const byDate: Record<string, { spend: number; leads: number }> = {};
  (currentMetrics || []).forEach(r => {
    if (!byDate[r.date]) byDate[r.date] = { spend: 0, leads: 0 };
    byDate[r.date].spend += Number(r.spend);
    byDate[r.date].leads += r.leads;
  });
  const chartData = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date: date.slice(5), spend: Math.round(v.spend), leads: v.leads, cpl: v.leads > 0 ? Math.round((v.spend / v.leads) * 100) / 100 : 0 }));

  // Platform breakdown
  const connMap = new Map((allConnections || []).map(c => [c.id, c.platform]));
  const adAccMap = new Map((allAdAccounts || []).map(a => [a.id, a.connection_id]));
  const campMap = new Map((allCampaigns || []).map(c => [c.id, c.ad_account_id]));
  const getPlatform = (cid: string) => { const aid = campMap.get(cid); if (!aid) return null; const conn = adAccMap.get(aid); return conn ? connMap.get(conn) || null : null; };

  const platAgg: Record<string, { spend: number; leads: number }> = { meta: { spend: 0, leads: 0 }, google: { spend: 0, leads: 0 }, tiktok: { spend: 0, leads: 0 } };
  (currentMetrics || []).forEach(r => { const p = getPlatform(r.campaign_id); if (p && platAgg[p]) { platAgg[p].spend += Number(r.spend); platAgg[p].leads += r.leads; } });
  const colors: Record<string, string> = { meta: 'hsl(220, 80%, 55%)', google: 'hsl(140, 60%, 45%)', tiktok: 'hsl(340, 70%, 55%)' };
  const platformData = [
    { name: 'Meta Ads', key: 'meta', ...platAgg.meta, color: colors.meta },
    { name: 'Google Ads', key: 'google', ...platAgg.google, color: colors.google },
    { name: 'TikTok Ads', key: 'tiktok', ...platAgg.tiktok, color: colors.tiktok },
  ].filter(p => p.spend > 0 || p.leads > 0);

  // Client metrics — fetch names in parallel from already-aggregated data
  const byClient: Record<string, { spend: number; leads: number; clicks: number; impressions: number; revenue: number; purchases: number }> = {};
  (currentMetrics || []).forEach(r => {
    if (!byClient[r.client_id]) byClient[r.client_id] = { spend: 0, leads: 0, clicks: 0, impressions: 0, revenue: 0, purchases: 0 };
    const b = byClient[r.client_id];
    b.spend += Number(r.spend); b.leads += r.leads; b.clicks += r.link_clicks; b.impressions += r.impressions;
    b.revenue += Number(r.revenue || 0); b.purchases += (r.purchases || 0);
  });

  const cIds = Object.keys(byClient);
  let clientsData: ClientMetric[] = [];
  if (cIds.length > 0) {
    const { data: clientNames } = await supabase.from('clients').select('id, name, status, category').in('id', cIds);
    clientsData = (clientNames || []).map(c => {
      const m = byClient[c.id] || { spend: 0, leads: 0, clicks: 0, impressions: 0, revenue: 0, purchases: 0 };
      return {
        id: c.id, name: c.name, spend: m.spend, leads: m.leads,
        cpl: m.leads > 0 ? m.spend / m.leads : 0,
        ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
        deltaCpl: 0, status: c.status as any, category: (c as any).category || 'other',
        clicks: m.clicks, impressions: m.impressions, revenue: m.revenue, purchases: m.purchases,
      };
    });
  }

  return { kpis, chartData, platformData, clientsData, hasRealData: true };
}

export function useDashboardMetrics(
  filters: DashboardFilters & { customDateRange?: { from: Date; to: Date }; clientIds?: string[] | null }
) {
  const range = useMemo(() => getDateRange(filters.dateRange, filters.customDateRange), [filters.dateRange, filters.customDateRange]);
  const prevRange = useMemo(() => {
    const prevTo = subDays(new Date(range.from), 1);
    const prevFrom = subDays(prevTo, range.days);
    return { from: format(prevFrom, 'yyyy-MM-dd'), to: format(prevTo, 'yyyy-MM-dd') };
  }, [range]);

  const queryKey = ['dashboard-metrics', range.from, range.to, filters.platform, filters.clientIds];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchDashboardData(range, prevRange, filters.platform, filters.clientIds),
    staleTime: 2 * 60 * 1000, // 2 min — dashboard data doesn't change rapidly
    gcTime: 5 * 60 * 1000,
  });

  return {
    kpis: data?.kpis ?? null,
    chartData: data?.chartData ?? [],
    platformData: data?.platformData ?? [],
    clientsData: data?.clientsData ?? [],
    loading: isLoading,
    hasRealData: data?.hasRealData ?? false,
  };
}
