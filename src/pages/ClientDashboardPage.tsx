import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
// getAfmCampaignIds no longer used — client dashboard shows all campaigns for full historical data
import { motion } from 'framer-motion';
import {
  Building2, DollarSign, MousePointerClick, Users, Eye, TrendingUp,
  BarChart3, FileText, Table2, GripVertical, Wallet, Settings2, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import ConversionFunnel from '@/components/client/ConversionFunnel';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import {
  ALL_METRIC_COLUMNS, CATEGORY_DEFAULTS, CATEGORY_KPIS, CATEGORY_CHART_METRICS,
  toClientCategory, computeDailyRow, formatMetricValue, type ClientCategory,
} from '@/components/dashboard/categoryMetrics';
import type { TranslationKey } from '@/i18n/translations';
import type { DateRange, Comparison } from '@/components/dashboard/dashboardData';
import { subDays, format } from 'date-fns';
import UnifiedChart, { type ChartMetric, type ChartDisplayMode } from '@/components/charts/UnifiedChart';
import { ShoppingBag, ShoppingCart, CreditCard } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

type PlatformKey = 'all' | 'meta' | 'google' | 'tiktok';

interface ClientData {
  id: string; name: string; status: string; currency: string; timezone: string;
  category: string; visible_columns: string[] | null;
  google_sheet_url: string | null; meta_sheet_url: string | null; tiktok_sheet_url: string | null;
}

interface DailyRow {
  date: string; spend: number; impressions: number; link_clicks: number; leads: number;
  add_to_cart: number | null; checkouts: number | null; purchases: number | null; revenue: number | null;
  campaign_id: string;
}

interface BudgetPlan { planned_spend: number; planned_leads: number; month: string; }
interface Report { id: string; title: string; status: string; date_from: string; date_to: string; created_at: string; pdf_url: string | null; }

const statusStyles: Record<string, string> = {
  active: 'bg-success/15 text-success border-success/20',
  paused: 'bg-warning/15 text-warning border-warning/20',
  inactive: 'bg-muted text-muted-foreground border-border',
  onboarding: 'bg-info/15 text-info border-info/20',
  stop: 'bg-destructive/15 text-destructive border-destructive/20',
};

export default function ClientDashboardPage() {
  const { t, formatCurrency, formatNumber } = useLanguage();
  const { user } = useAuth();

  const [client, setClient] = useState<ClientData | null>(null);
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyMetrics, setDailyMetrics] = useState<DailyRow[]>([]);
  const [campaignPlatformMap, setCampaignPlatformMap] = useState<Record<string, string>>({});
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [recommendations, setRecommendations] = useState<{ id: string; content: string; created_at: string; user_name: string }[]>([]);
  const [hasMetaApiAccounts, setHasMetaApiAccounts] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<PlatformKey>('all');
  const [chartMode, setChartMode] = useState<ChartDisplayMode>('normalized');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  // Date range
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [comparison, setComparison] = useState<Comparison>('none');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | undefined>(() => ({
    from: subDays(new Date(), 29), to: new Date(),
  }));
  const [compareEnabled, setCompareEnabled] = useState(false);

  const category: ClientCategory = useMemo(() => toClientCategory(client?.category), [client?.category]);

  // Init visible columns from category defaults
  useEffect(() => {
    if (client) {
      const dbCols = client.visible_columns;
      if (dbCols && Array.isArray(dbCols) && dbCols.length > 0) setVisibleColumns(dbCols);
      else setVisibleColumns(CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.other);
    }
  }, [client, category]);

  // Fetch client info
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cu } = await supabase.from('client_users').select('client_id').eq('user_id', user.id);
      const ids = cu?.map(d => d.client_id) || [];
      setClientIds(ids);
      if (ids.length > 0) {
        const { data } = await supabase.from('clients')
          .select('id, name, status, currency, timezone, category, visible_columns, google_sheet_url, meta_sheet_url, tiktok_sheet_url')
          .eq('id', ids[0]).single();
        if (data) setClient({ ...data, visible_columns: data.visible_columns ? (Array.isArray(data.visible_columns) ? data.visible_columns : JSON.parse(data.visible_columns as any)) : null } as ClientData);
      }
      setLoading(false);
    })();
  }, [user]);

  // Fetch metrics, campaigns, budget, reports, recommendations
  const fetchData = useCallback(async () => {
    if (clientIds.length === 0) return;
    const cid = clientIds[0];

    // Show ALL campaigns data for full historical view (no AFM filter for client dashboard)
    const [metricsRes, campaignsRes, budgetRes, reportsRes, adAccountsRes, commentsRes] = await Promise.all([
      supabase.from('daily_metrics')
        .select('date, spend, impressions, link_clicks, leads, add_to_cart, checkouts, purchases, revenue, campaign_id')
        .eq('client_id', cid).order('date', { ascending: true }),
      supabase.from('campaigns')
        .select('id, campaign_name, status, platform_campaign_id, ad_accounts(platform_connections(platform))')
        .eq('client_id', cid),
      supabase.from('budget_plans')
        .select('planned_spend, planned_leads, month')
        .eq('client_id', cid)
        .gte('month', `${format(new Date(), 'yyyy-MM')}-01`)
        .order('month', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('reports')
        .select('id, title, status, date_from, date_to, created_at, pdf_url')
        .eq('client_id', cid)
        .eq('status', 'published')
        .order('created_at', { ascending: false }),
      supabase.from('ad_accounts')
        .select('id')
        .eq('client_id', cid)
        .eq('is_active', true)
        .limit(1),
      supabase.from('client_comments')
        .select('id, content, created_at, user_id')
        .eq('client_id', cid)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (metricsRes.data) setDailyMetrics(metricsRes.data as DailyRow[]);

    if (campaignsRes.data) {
      const map: Record<string, string> = {};
      (campaignsRes.data as any[]).forEach((c: any) => {
        const platform = c.ad_accounts?.platform_connections?.platform;
        if (platform) map[c.id] = platform;
      });
      setCampaignPlatformMap(map);
    }

    if (budgetRes.data) setBudgetPlan(budgetRes.data as BudgetPlan);
    if (reportsRes.data) setReports(reportsRes.data as Report[]);
    setHasMetaApiAccounts((adAccountsRes.data?.length || 0) > 0);

    if (commentsRes.data && commentsRes.data.length > 0) {
      const userIds = [...new Set(commentsRes.data.map(c => c.user_id))];
      const { data: users } = await supabase.from('agency_users').select('user_id, display_name').in('user_id', userIds);
      const nameMap: Record<string, string> = {};
      (users || []).forEach(u => { nameMap[u.user_id] = u.display_name || 'Team'; });
      setRecommendations(commentsRes.data.map(c => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        user_name: nameMap[c.user_id] || 'Team',
      })));
    }
  }, [clientIds]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Current month metrics — always based on today's month, ignoring date picker
  const currentMonthMetrics = useMemo(() => {
    const now = new Date();
    const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
    const monthEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');
    return dailyMetrics.filter(m => m.date >= monthStart && m.date <= monthEnd);
  }, [dailyMetrics]);

  // Filter metrics by date + platform (for KPIs, chart, daily table)
  const filteredMetrics = useMemo(() => {
    let metrics = dailyMetrics;
    if (customDateRange) {
      const from = format(customDateRange.from, 'yyyy-MM-dd');
      const to = format(customDateRange.to, 'yyyy-MM-dd');
      metrics = metrics.filter(m => m.date >= from && m.date <= to);
    }
    if (platformFilter !== 'all' && Object.keys(campaignPlatformMap).length > 0) {
      metrics = metrics.filter(m => campaignPlatformMap[m.campaign_id] === platformFilter);
    }
    return metrics;
  }, [dailyMetrics, customDateRange, platformFilter, campaignPlatformMap]);

  // Budget spend — always current month total spend (ignoring platform filter too)
  const currentMonthSpend = useMemo(() => {
    return currentMonthMetrics.reduce((sum, m) => sum + Number(m.spend), 0);
  }, [currentMonthMetrics]);

  const currentMonthLeads = useMemo(() => {
    return currentMonthMetrics.reduce((sum, m) => sum + m.leads, 0);
  }, [currentMonthMetrics]);

  // Platform-specific spend check — check both sheet URLs and direct Meta API accounts
  const platformHasData = useMemo(() => ({
    meta: !!client?.meta_sheet_url || hasMetaApiAccounts,
    google: !!client?.google_sheet_url,
    tiktok: !!client?.tiktok_sheet_url,
  }), [client, hasMetaApiAccounts]);

  // Daily table data
  const dailyTableData = useMemo(() => {
    const byDate: Record<string, { spend: number; impressions: number; clicks: number; leads: number; add_to_cart: number; checkouts: number; purchases: number; revenue: number }> = {};
    filteredMetrics.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = { spend: 0, impressions: 0, clicks: 0, leads: 0, add_to_cart: 0, checkouts: 0, purchases: 0, revenue: 0 };
      const d = byDate[r.date];
      d.spend += Number(r.spend);
      d.impressions += r.impressions;
      d.clicks += r.link_clicks;
      d.leads += r.leads;
      d.add_to_cart += r.add_to_cart || 0;
      d.checkouts += r.checkouts || 0;
      d.purchases += r.purchases || 0;
      d.revenue += Number(r.revenue || 0);
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => computeDailyRow({ date, spend: v.spend, impressions: v.impressions, clicks: v.clicks, leads: v.leads, add_to_cart: v.add_to_cart, checkouts: v.checkouts, purchases: v.purchases, revenue: v.revenue }));
  }, [filteredMetrics]);

  const totals = useMemo(() => {
    const t = dailyTableData.reduce((acc, r) => ({
      spend: acc.spend + r.spend, impressions: acc.impressions + r.impressions, clicks: acc.clicks + r.clicks,
      leads: acc.leads + r.leads, addToCart: acc.addToCart + r.addToCart,
      checkouts: acc.checkouts + r.checkouts, purchases: acc.purchases + r.purchases, revenue: acc.revenue + r.revenue,
    }), { spend: 0, impressions: 0, clicks: 0, leads: 0, addToCart: 0, checkouts: 0, purchases: 0, revenue: 0 });
    return computeDailyRow({ date: 'TOTAL', spend: t.spend, impressions: t.impressions, clicks: t.clicks, leads: t.leads, add_to_cart: t.addToCart, checkouts: t.checkouts, purchases: t.purchases, revenue: t.revenue });
  }, [dailyTableData]);

  const catChartMetrics = CATEGORY_CHART_METRICS[category] || CATEGORY_CHART_METRICS.other;

  const unifiedChartMetrics: ChartMetric[] = useMemo(() => {
    return catChartMetrics.map(m => ({
      key: m.key,
      label: t(`metric.${m.key}` as any) || m.key,
      color: m.color,
      format: (['spend', 'cpl', 'revenue', 'cpc', 'cpm', 'costPerPurchase', 'costPerAtc', 'costPerCheckout'].includes(m.key) ? 'currency' : ['ctr', 'leadCv', 'cartToCheckout', 'checkoutToPurchase'].includes(m.key) ? 'percent' : 'number') as 'currency' | 'number' | 'percent',
      asBar: m.key === 'spend',
      secondaryAxis: ['cpl', 'cpc', 'roas'].includes(m.key),
    }));
  }, [catChartMetrics, t]);

  const unifiedChartData = useMemo(() => {
    return dailyTableData.map(r => {
      const point: Record<string, any> = { date: r.date.slice(5) };
      catChartMetrics.forEach(m => { point[m.key] = (r as any)[m.key] || 0; });
      return point;
    });
  }, [dailyTableData, catChartMetrics]);

  const kpiKeys = CATEGORY_KPIS[category] || CATEGORY_KPIS.other;
  const kpiCards = useMemo(() => {
    return kpiKeys.map(key => {
      const col = ALL_METRIC_COLUMNS.find(c => c.key === key);
      if (!col) return null;
      const val = (totals as any)[key] || 0;
      const iconMap: Record<string, any> = {
        spend: DollarSign, revenue: DollarSign, roas: TrendingUp,
        leads: Users, purchases: ShoppingBag, addToCart: ShoppingCart,
        checkouts: CreditCard, clicks: MousePointerClick, impressions: Eye,
        cpl: TrendingUp, ctr: BarChart3, cpc: DollarSign,
      };
      return { key, label: t(col.labelKey as TranslationKey), value: formatMetricValue(key, val, formatCurrency, formatNumber), icon: iconMap[key] || BarChart3 };
    }).filter(Boolean) as { key: string; label: string; value: string; icon: any }[];
  }, [kpiKeys, totals, t, formatCurrency, formatNumber]);

  // Drag-reorder columns
  const dragColRef = useRef<number | null>(null);
  const dragOverColRef = useRef<number | null>(null);
  const handleColDragStart = (idx: number) => { dragColRef.current = idx; };
  const handleColDragEnter = (idx: number) => { dragOverColRef.current = idx; };
  const handleColDragEnd = () => {
    if (dragColRef.current === null || dragOverColRef.current === null) return;
    const from = dragColRef.current; const to = dragOverColRef.current;
    if (from === to) { dragColRef.current = null; dragOverColRef.current = null; return; }
    const updated = [...visibleColumns];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setVisibleColumns(updated);
    dragColRef.current = null; dragOverColRef.current = null;
  };
  const toggleColumn = (key: string) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  const orderedVisibleColumns = useMemo(() =>
    visibleColumns.map(key => ALL_METRIC_COLUMNS.find(c => c.key === key)).filter(Boolean) as typeof ALL_METRIC_COLUMNS,
    [visibleColumns]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-semibold">No client assigned</p>
        <p className="text-sm text-muted-foreground mt-1">Contact your agency to get access.</p>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 sm:space-y-5">

      {/* Header — read-only status/category */}
      <motion.div variants={item} className="flex items-start sm:items-center gap-3">
        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">{client.name}</h1>
          <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
            {/* Status badge — READ ONLY for clients */}
            <Badge variant="outline" className={`text-[10px] sm:text-xs ${statusStyles[client.status] || ''}`}>
              {client.status}
            </Badge>
            {/* Category badge — READ ONLY for clients */}
            <Badge variant="outline" className="text-[10px] sm:text-xs">
              {category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </Badge>
            <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">
              {client.timezone} · {client.currency}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Date range + Platform filter */}
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          comparison={comparison}
          onComparisonChange={setComparison}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
          compareEnabled={compareEnabled}
          onCompareEnabledChange={setCompareEnabled}
        />
        <div className="flex items-center gap-0.5 bg-secondary/50 rounded-lg p-0.5 sm:ml-auto">
          {(['all', 'meta', 'google', 'tiktok'] as PlatformKey[]).map(p => {
            // Disable platform buttons if no sheet connected
            const hasData = p === 'all' || platformHasData[p as keyof typeof platformHasData];
            return (
              <Button
                key={p}
                variant={platformFilter === p ? 'default' : 'ghost'}
                size="sm"
                onClick={() => hasData && setPlatformFilter(p)}
                className={`text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0 ${!hasData && (p as string) !== 'all' ? 'opacity-40 cursor-default' : ''}`}
              >
                {p === 'all' ? 'All' : p === 'meta' ? 'Meta' : p === 'google' ? 'Google' : 'TikTok'}
              </Button>
            );
          })}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {kpiCards.map(kpi => (
          <div key={kpi.key} className="kpi-card py-3 px-3 sm:py-4 sm:px-4">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              <kpi.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
              <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{kpi.label}</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground truncate">{kpi.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Budget Progress */}
      {budgetPlan && (
        <motion.div variants={item}>
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Budget</p>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(budgetPlan.planned_spend)}</p>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Spent: <span className="text-foreground font-medium">{formatCurrency(currentMonthSpend)}</span></span>
                    <span className={`font-semibold ${currentMonthSpend / budgetPlan.planned_spend > 0.9 ? 'text-destructive' : currentMonthSpend / budgetPlan.planned_spend > 0.7 ? 'text-warning' : 'text-success'}`}>
                      {Math.min(100, Math.round((currentMonthSpend / budgetPlan.planned_spend) * 100))}%
                    </span>
                  </div>
                  <div className="relative h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className={`absolute left-0 top-0 h-full rounded-full ${
                        currentMonthSpend / budgetPlan.planned_spend > 0.9 ? 'bg-destructive'
                          : currentMonthSpend / budgetPlan.planned_spend > 0.7 ? 'bg-warning' : 'bg-primary'
                      }`}
                      initial={{ width: '0%' }}
                      animate={{ width: `${Math.min(100, (currentMonthSpend / budgetPlan.planned_spend) * 100)}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>$0</span>
                    <span>{formatCurrency(Math.max(0, budgetPlan.planned_spend - currentMonthSpend))} remaining</span>
                    <span>{formatCurrency(budgetPlan.planned_spend)}</span>
                  </div>
                </div>
                {budgetPlan.planned_leads > 0 && (
                  <div className="flex-shrink-0 text-right sm:text-left">
                    <p className="text-xs text-muted-foreground">Lead Goal</p>
                    <p className="text-sm font-semibold text-foreground">
                      <span className={currentMonthLeads >= budgetPlan.planned_leads ? 'text-success' : 'text-foreground'}>{currentMonthLeads}</span>
                      <span className="text-muted-foreground"> / {budgetPlan.planned_leads}</span>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs — clients only see Overview, Daily Stats, Reports */}
      <motion.div variants={item}>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full overflow-x-auto scrollbar-none justify-start h-auto flex-nowrap p-1">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm flex-shrink-0">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="daily" className="gap-1.5 text-xs sm:text-sm flex-shrink-0">
              <Table2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span>Daily Stats</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5 text-xs sm:text-sm flex-shrink-0">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span>Reports</span>
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Performance Chart */}
              <Card className="glass-card lg:col-span-2">
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <CardTitle className="text-sm sm:text-base">Performance</CardTitle>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      {chartMetrics.map(m => (
                        <div key={m.key} className="flex items-center gap-1.5 text-xs">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                          <span className="text-muted-foreground capitalize">{m.key}</span>
                        </div>
                      ))}
                      <div className="flex bg-secondary/50 rounded-md p-0.5 ml-2">
                        <Button variant="ghost" size="sm" onClick={() => setChartNormalized(false)}
                          className={`h-6 px-2 text-[10px] rounded-sm ${!chartNormalized ? 'bg-primary text-primary-foreground' : ''}`}>
                          Absolute
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setChartNormalized(true)}
                          className={`h-6 px-2 text-[10px] rounded-sm ${chartNormalized ? 'bg-primary text-primary-foreground' : ''}`}>
                          Normalized
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <div className="h-[220px] sm:h-[280px]">
                    {chartData.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data for this period</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            {chartMetrics.map(m => (
                              <linearGradient key={m.gradientId} id={m.gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={m.color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 20%, 14%)" strokeOpacity={0.5} />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(220, 15%, 55%)' }} stroke="hsl(225, 20%, 14%)" interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 9, fill: 'hsl(220, 15%, 55%)' }} stroke="hsl(225, 20%, 14%)" width={35} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(225, 30%, 9%)', border: '1px solid hsl(225, 20%, 14%)', borderRadius: '8px', fontSize: '12px' }}
                            formatter={(value: number, name: string, props: any) => {
                              const rawVal = props.payload?.[`_raw_${name}`];
                              const displayVal = chartNormalized && rawVal !== undefined ? rawVal : value;
                              const fmt = typeof displayVal === 'number' ? (displayVal % 1 === 0 ? displayVal.toLocaleString() : displayVal.toFixed(2)) : displayVal;
                              return [fmt, name];
                            }}
                          />
                          {chartMetrics.map(m => (
                            <Area key={m.key} type="monotone" dataKey={m.key} stroke={m.color} fill={`url(#${m.gradientId})`} strokeWidth={2} />
                          ))}
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Right column — Funnel + Spend by Platform */}
              <div className="space-y-4">
                <ConversionFunnel
                  category={category}
                  metrics={{
                    impressions: totals.impressions,
                    clicks: totals.clicks,
                    leads: totals.leads,
                    addToCart: totals.addToCart,
                    checkouts: totals.checkouts,
                    purchases: totals.purchases,
                  }}
                />
                <Card className="glass-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-base">{t('clients.spendByPlatform')}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(['meta', 'google', 'tiktok'] as const).map(p => {
                        const hasSheet = platformHasData[p];
                        const label = p === 'meta' ? 'Meta Ads' : p === 'google' ? 'Google Ads' : 'TikTok Ads';
                        const platformMetrics = dailyMetrics.filter(m => (campaignPlatformMap[m.campaign_id] as string) === (p as string));
                        const platformSpend = platformMetrics.reduce((s, m) => s + Number(m.spend), 0);
                        const sourceLabel = p === 'meta' && hasMetaApiAccounts ? 'API' : hasSheet ? 'Sheets' : '';
                        return (
                          <div key={p} className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-secondary/20">
                            <div>
                              <span className="text-xs font-medium">{label}</span>
                              {hasSheet && platformSpend > 0 && (
                                <p className="text-[10px] text-muted-foreground">{formatCurrency(platformSpend)}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {sourceLabel && (
                                <Badge variant="outline" className="text-[8px] border-primary/30 text-primary">{sourceLabel}</Badge>
                              )}
                              <Badge variant="outline" className={`text-[9px] ${hasSheet ? 'border-success/30 text-success' : 'border-border text-muted-foreground'}`}>
                                {hasSheet ? t('common.connected') : t('common.notConnected')}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations from team */}
                {recommendations.length > 0 && (
                  <Card className="glass-card">
                    <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-base">{t('clients.recommendations')}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {recommendations.slice(0, 5).map(rec => (
                          <div key={rec.id} className="p-2.5 rounded-lg bg-secondary/30 border border-border/30">
                            <p className="text-xs text-foreground">{rec.content}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">— {rec.user_name} · {format(new Date(rec.created_at), 'dd.MM.yyyy')}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* DAILY STATS TAB */}
          <TabsContent value="daily" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold">Daily Statistics</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-[10px] sm:text-xs h-7 sm:h-8">
                    <Settings2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Columns</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="end">
                  <p className="text-sm font-semibold mb-2">Manage Columns</p>
                  <div className="space-y-0.5 max-h-[350px] overflow-y-auto">
                    {ALL_METRIC_COLUMNS.map(col => (
                      <div key={col.key} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-secondary/50">
                        <Checkbox checked={visibleColumns.includes(col.key)} onCheckedChange={() => toggleColumn(col.key)} id={`col-${col.key}`} />
                        <label htmlFor={`col-${col.key}`} className="flex-1 text-xs cursor-pointer">{t(col.labelKey as TranslationKey)}</label>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => setVisibleColumns(CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.other)}>
                    Reset Defaults
                  </Button>
                </PopoverContent>
              </Popover>
            </div>

            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="spreadsheet-table">
                    <thead>
                      <tr>
                        {orderedVisibleColumns.map((col, idx) => (
                          <th key={col.key}
                            className={`${col.right ? 'text-right' : ''} cursor-grab select-none`}
                            draggable
                            onDragStart={() => handleColDragStart(idx)}
                            onDragEnter={() => handleColDragEnter(idx)}
                            onDragEnd={handleColDragEnd}
                            onDragOver={(e) => e.preventDefault()}>
                            <span className="inline-flex items-center gap-1">
                              <GripVertical className="h-3 w-3 text-muted-foreground/40" />
                              {t(col.labelKey as TranslationKey)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dailyTableData.length === 0 ? (
                        <tr><td colSpan={orderedVisibleColumns.length} className="text-center py-8 text-muted-foreground">No data for this period</td></tr>
                      ) : (
                        <>
                          {dailyTableData.map(row => (
                            <tr key={row.date}>
                              {orderedVisibleColumns.map(col => (
                                <td key={col.key} className={col.right ? 'text-right' : col.key === 'date' ? 'text-foreground font-medium whitespace-nowrap' : 'text-muted-foreground'}>
                                  {col.key === 'date' ? row.date : formatMetricValue(col.key, (row as any)[col.key] || 0, formatCurrency, formatNumber)}
                                </td>
                              ))}
                            </tr>
                          ))}
                          <tr className="totals-row">
                            {orderedVisibleColumns.map(col => (
                              <td key={col.key} className={`${col.right ? 'text-right' : ''} text-foreground font-bold`}>
                                {col.key === 'date' ? 'TOTAL' : formatMetricValue(col.key, (totals as any)[col.key] || 0, formatCurrency, formatNumber)}
                              </td>
                            ))}
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* REPORTS TAB */}
          <TabsContent value="reports" className="space-y-3">
            <h3 className="text-base sm:text-lg font-semibold">Reports</h3>
            {reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">No reports yet</p>
                <p className="text-sm text-muted-foreground mt-1">Published reports from your agency will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map(report => (
                  <Card key={report.id} className="glass-card">
                    <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{report.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(report.date_from), 'dd.MM.yyyy')} — {format(new Date(report.date_to), 'dd.MM.yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-[10px] border-success/30 text-success">Published</Badge>
                        {report.pdf_url && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                            <a href={report.pdf_url} target="_blank" rel="noopener noreferrer">Download</a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
