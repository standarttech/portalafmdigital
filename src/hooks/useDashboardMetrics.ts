import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, differenceInDays } from 'date-fns';
import type { DashboardFilters, DateRange } from '@/components/dashboard/dashboardData';

export interface KpiData {
  spend: number;
  leads: number;
  clicks: number;
  impressions: number;
  cpl: number;
  ctr: number;
  activeClients: number;
  activeCampaigns: number;
  revenue: number;
  purchases: number;
  roas: number;
  prevSpend: number;
  prevLeads: number;
  prevClicks: number;
  prevImpressions: number;
  prevCpl: number;
  prevCtr: number;
  prevRevenue: number;
  prevPurchases: number;
  prevRoas: number;
}

export interface ChartDataPoint {
  date: string;
  spend: number;
  leads: number;
  cpl: number;
}

export interface PlatformDataPoint {
  name: string;
  key: string;
  spend: number;
  leads: number;
  color: string;
}

export interface ClientMetric {
  id: string;
  name: string;
  spend: number;
  leads: number;
  cpl: number;
  ctr: number;
  deltaCpl: number;
  status: 'active' | 'inactive' | 'paused';
  category: string;
  clicks: number;
  impressions: number;
  revenue: number;
  purchases: number;
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
      if (custom) { from = custom.from; to = custom.to; }
      else { from = subDays(now, 30); }
      break;
    default: from = subDays(now, 30);
  }

  const days = Math.max(differenceInDays(to, from), 1);
  return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd'), days };
}

export function useDashboardMetrics(
  filters: DashboardFilters & { customDateRange?: { from: Date; to: Date }; clientIds?: string[] | null }
) {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [platformData, setPlatformData] = useState<PlatformDataPoint[]>([]);
  const [clientsData, setClientsData] = useState<ClientMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);

  const range = useMemo(
    () => getDateRange(filters.dateRange, filters.customDateRange),
    [filters.dateRange, filters.customDateRange]
  );

  const prevRange = useMemo(() => {
    const days = range.days;
    const prevTo = subDays(new Date(range.from), 1);
    const prevFrom = subDays(prevTo, days);
    return { from: format(prevFrom, 'yyyy-MM-dd'), to: format(prevTo, 'yyyy-MM-dd') };
  }, [range]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { count } = await supabase
        .from('daily_metrics')
        .select('id', { count: 'exact', head: true });

      const realDataExists = (count || 0) > 0;
      setHasRealData(realDataExists);

      if (!realDataExists) {
        setLoading(false);
        return;
      }

      // If platform filter is active, get campaign IDs for that platform
      let platformCampaignIds: string[] | null = null;
      if (filters.platform !== 'all') {
        const { data: connections } = await supabase
          .from('platform_connections')
          .select('id')
          .eq('platform', filters.platform);
        
        if (connections && connections.length > 0) {
          const connectionIds = connections.map(c => c.id);
          const { data: adAccounts } = await supabase
            .from('ad_accounts')
            .select('id')
            .in('connection_id', connectionIds);
          
          if (adAccounts && adAccounts.length > 0) {
            const adAccountIds = adAccounts.map(a => a.id);
            const { data: campaigns } = await supabase
              .from('campaigns')
              .select('id')
              .in('ad_account_id', adAccountIds);
            
            platformCampaignIds = campaigns?.map(c => c.id) || [];
          } else {
            platformCampaignIds = [];
          }
        } else {
          platformCampaignIds = [];
        }
      }

      // Fetch current period metrics
      let query = supabase
        .from('daily_metrics')
        .select('spend, leads, link_clicks, impressions, date, client_id, campaign_id, revenue, purchases')
        .gte('date', range.from)
        .lte('date', range.to);

      // Filter by specific client IDs (for user simulation)
      if (filters.clientIds && filters.clientIds.length > 0) {
        query = query.in('client_id', filters.clientIds);
      } else if (filters.clientIds && filters.clientIds.length === 0) {
        // User has no clients assigned — empty result
        setKpis({
          spend: 0, leads: 0, clicks: 0, impressions: 0, cpl: 0, ctr: 0,
          activeClients: 0, activeCampaigns: 0, revenue: 0, purchases: 0, roas: 0,
          prevSpend: 0, prevLeads: 0, prevClicks: 0, prevImpressions: 0, prevCpl: 0, prevCtr: 0,
          prevRevenue: 0, prevPurchases: 0, prevRoas: 0,
        });
        setChartData([]); setClientsData([]); setPlatformData([]); setLoading(false);
        return;
      }

      if (platformCampaignIds !== null) {
        if (platformCampaignIds.length === 0) {
          // No campaigns for this platform — empty result
          setKpis({
            spend: 0, leads: 0, clicks: 0, impressions: 0, cpl: 0, ctr: 0,
            activeClients: 0, activeCampaigns: 0, revenue: 0, purchases: 0, roas: 0,
            prevSpend: 0, prevLeads: 0, prevClicks: 0, prevImpressions: 0, prevCpl: 0, prevCtr: 0,
            prevRevenue: 0, prevPurchases: 0, prevRoas: 0,
          });
          setChartData([]);
          setClientsData([]);
          setPlatformData([]);
          setLoading(false);
          return;
        }
        query = query.in('campaign_id', platformCampaignIds);
      }

      const { data: currentMetrics } = await query;

      // Fetch previous period
      let prevQuery = supabase
        .from('daily_metrics')
        .select('spend, leads, link_clicks, impressions, revenue, purchases')
        .gte('date', prevRange.from)
        .lte('date', prevRange.to);

      if (filters.clientIds && filters.clientIds.length > 0) {
        prevQuery = prevQuery.in('client_id', filters.clientIds);
      }

      if (platformCampaignIds !== null && platformCampaignIds.length > 0) {
        prevQuery = prevQuery.in('campaign_id', platformCampaignIds);
      }

      const { data: prevMetrics } = await prevQuery;

      // Aggregate current
      const cur = (currentMetrics || []).reduce(
        (acc, r) => ({
          spend: acc.spend + Number(r.spend),
          leads: acc.leads + r.leads,
          clicks: acc.clicks + r.link_clicks,
          impressions: acc.impressions + r.impressions,
          revenue: acc.revenue + Number(r.revenue || 0),
          purchases: acc.purchases + (r.purchases || 0),
        }),
        { spend: 0, leads: 0, clicks: 0, impressions: 0, revenue: 0, purchases: 0 }
      );

      const prev = (prevMetrics || []).reduce(
        (acc, r) => ({
          spend: acc.spend + Number(r.spend),
          leads: acc.leads + r.leads,
          clicks: acc.clicks + r.link_clicks,
          impressions: acc.impressions + r.impressions,
          revenue: acc.revenue + Number(r.revenue || 0),
          purchases: acc.purchases + (r.purchases || 0),
        }),
        { spend: 0, leads: 0, clicks: 0, impressions: 0, revenue: 0, purchases: 0 }
      );

      // Counts scoped to visible clients
      let activeClientsQuery = supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .neq('category', 'agency');

      if (filters.clientIds && filters.clientIds.length > 0) {
        activeClientsQuery = activeClientsQuery.in('id', filters.clientIds);
      }

      let activeCampaignsQuery = supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      if (filters.clientIds && filters.clientIds.length > 0) {
        activeCampaignsQuery = activeCampaignsQuery.in('client_id', filters.clientIds);
      }

      const [{ count: clientCount }, { count: campaignCount }] = await Promise.all([
        activeClientsQuery,
        activeCampaignsQuery,
      ]);

      setKpis({
        spend: cur.spend,
        leads: cur.leads,
        clicks: cur.clicks,
        impressions: cur.impressions,
        cpl: cur.leads > 0 ? cur.spend / cur.leads : 0,
        ctr: cur.impressions > 0 ? (cur.clicks / cur.impressions) * 100 : 0,
        activeClients: clientCount || 0,
        activeCampaigns: campaignCount || 0,
        revenue: cur.revenue,
        purchases: cur.purchases,
        roas: cur.spend > 0 ? cur.revenue / cur.spend : 0,
        prevSpend: prev.spend,
        prevLeads: prev.leads,
        prevClicks: prev.clicks,
        prevImpressions: prev.impressions,
        prevCpl: prev.leads > 0 ? prev.spend / prev.leads : 0,
        prevCtr: prev.impressions > 0 ? (prev.clicks / prev.impressions) * 100 : 0,
        prevRevenue: prev.revenue,
        prevPurchases: prev.purchases,
        prevRoas: prev.spend > 0 ? prev.revenue / prev.spend : 0,
      });

      // Chart data: group by date
      const byDate: Record<string, { spend: number; leads: number }> = {};
      (currentMetrics || []).forEach((r) => {
        if (!byDate[r.date]) byDate[r.date] = { spend: 0, leads: 0 };
        byDate[r.date].spend += Number(r.spend);
        byDate[r.date].leads += r.leads;
      });
      const chart = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({
          date: date.slice(5),
          spend: Math.round(vals.spend),
          leads: vals.leads,
          cpl: vals.leads > 0 ? Math.round((vals.spend / vals.leads) * 100) / 100 : 0,
        }));
      setChartData(chart);

      // Platform breakdown from real data
      const { data: allConnections } = await supabase
        .from('platform_connections')
        .select('id, platform')
        .eq('is_active', true);

      const { data: allAdAccounts } = await supabase
        .from('ad_accounts')
        .select('id, connection_id');

      const { data: allCampaigns } = await supabase
        .from('campaigns')
        .select('id, ad_account_id');

      // Build campaign -> platform map
      const connPlatformMap = new Map((allConnections || []).map(c => [c.id, c.platform]));
      const adAccConnMap = new Map((allAdAccounts || []).map(a => [a.id, a.connection_id]));
      const campAdAccMap = new Map((allCampaigns || []).map(c => [c.id, c.ad_account_id]));

      const getCampaignPlatform = (campaignId: string): string | null => {
        const adAccId = campAdAccMap.get(campaignId);
        if (!adAccId) return null;
        const connId = adAccConnMap.get(adAccId);
        if (!connId) return null;
        return connPlatformMap.get(connId) || null;
      };

      const platAgg: Record<string, { spend: number; leads: number }> = {
        meta: { spend: 0, leads: 0 },
        google: { spend: 0, leads: 0 },
        tiktok: { spend: 0, leads: 0 },
      };

      (currentMetrics || []).forEach(r => {
        const plat = getCampaignPlatform(r.campaign_id);
        if (plat && platAgg[plat]) {
          platAgg[plat].spend += Number(r.spend);
          platAgg[plat].leads += r.leads;
        }
      });

      const platformColors: Record<string, string> = {
        meta: 'hsl(220, 80%, 55%)',
        google: 'hsl(140, 60%, 45%)',
        tiktok: 'hsl(340, 70%, 55%)',
      };

      // Only include platforms that have actual data (spend > 0 or leads > 0)
      const platformEntries = [
        { name: 'Meta Ads', key: 'meta', ...platAgg.meta, color: platformColors.meta },
        { name: 'Google Ads', key: 'google', ...platAgg.google, color: platformColors.google },
        { name: 'TikTok Ads', key: 'tiktok', ...platAgg.tiktok, color: platformColors.tiktok },
      ].filter(p => p.spend > 0 || p.leads > 0);
      setPlatformData(platformEntries);

      // Client metrics
      const byClient: Record<string, { spend: number; leads: number; clicks: number; impressions: number; revenue: number; purchases: number }> = {};
      (currentMetrics || []).forEach((r) => {
        if (!byClient[r.client_id]) byClient[r.client_id] = { spend: 0, leads: 0, clicks: 0, impressions: 0, revenue: 0, purchases: 0 };
        byClient[r.client_id].spend += Number(r.spend);
        byClient[r.client_id].leads += r.leads;
        byClient[r.client_id].clicks += r.link_clicks;
        byClient[r.client_id].impressions += r.impressions;
        byClient[r.client_id].revenue += Number(r.revenue || 0);
        byClient[r.client_id].purchases += (r.purchases || 0);
      });

      const clientIds = Object.keys(byClient);
      if (clientIds.length > 0) {
        const { data: clientNames } = await supabase
          .from('clients')
          .select('id, name, status, category')
          .in('id', clientIds);

        const clientMetrics: ClientMetric[] = (clientNames || []).map((c) => {
          const m = byClient[c.id] || { spend: 0, leads: 0, clicks: 0, impressions: 0, revenue: 0, purchases: 0 };
          return {
            id: c.id,
            name: c.name,
            spend: m.spend,
            leads: m.leads,
            cpl: m.leads > 0 ? m.spend / m.leads : 0,
            ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
            deltaCpl: 0,
            status: c.status as 'active' | 'inactive' | 'paused',
            category: (c as any).category || 'other',
            clicks: m.clicks,
            impressions: m.impressions,
            revenue: m.revenue,
            purchases: m.purchases,
          };
        });
        setClientsData(clientMetrics);
      } else {
        setClientsData([]);
      }
    } catch (err) {
      console.error('Dashboard metrics error:', err);
    }
    setLoading(false);
  }, [range, prevRange, filters.platform, filters.clientIds]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { kpis, chartData, platformData, clientsData, loading, hasRealData };
}
