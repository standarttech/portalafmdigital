import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getAfmCampaignIds } from '@/lib/afmCampaignFilter';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DollarSign, Users, TrendingUp, Eye, MousePointerClick, BarChart3,
  Table2, Settings2, GripVertical, Wallet, Zap, RefreshCw, Loader2,
  ShoppingBag, ShoppingCart, CreditCard, Sheet, Link2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import ConversionFunnel from '@/components/client/ConversionFunnel';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import {
  ALL_METRIC_COLUMNS, CATEGORY_DEFAULTS, CATEGORY_KPIS, CATEGORY_CHART_METRICS,
  toClientCategory, computeDailyRow, formatMetricValue, type ClientCategory,
} from '@/components/dashboard/categoryMetrics';
import type { TranslationKey } from '@/i18n/translations';
import type { DateRange, Comparison } from '@/components/dashboard/dashboardData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { subDays, format } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

type PlatformKey = 'all' | 'meta' | 'google' | 'tiktok';

interface AgencyClient {
  id: string; name: string; category: string; currency: string; timezone: string;
  google_sheet_url: string | null; meta_sheet_url: string | null; tiktok_sheet_url: string | null;
  auto_sync_enabled: boolean; visible_columns: string[] | null;
}

interface DailyRow {
  date: string; spend: number; impressions: number; link_clicks: number; leads: number;
  add_to_cart: number | null; checkouts: number | null; purchases: number | null; revenue: number | null;
  campaign_id: string;
}

interface BudgetPlan { planned_spend: number; planned_leads: number; month: string; }

/* ── Platform Sheet Row ── */
function PlatformSheetRow({ clientId, platform, label, fieldName }: {
  clientId: string; platform: string; label: string; fieldName: string;
}) {
  const { t } = useLanguage();
  const [url, setUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('clients').select(fieldName).eq('id', clientId).single().then(({ data }) => {
      const val = (data as any)?.[fieldName] || '';
      setUrl(val); setSavedUrl(val);
    });
  }, [clientId, fieldName]);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('clients').update({ [fieldName]: url || null } as any).eq('id', clientId);
    setSavedUrl(url); setSaving(false);
    toast.success(t('clients.sheetUrlSaved'));
  };

  const handleSync = async () => {
    if (!savedUrl) return;
    setSyncing(true); setLastResult(null);
    try {
      const res = await supabase.functions.invoke('sync-google-sheet', { body: { client_id: clientId, platform } });
      if (res.error) setLastResult(`Error: ${res.error.message}`);
      else { const d = res.data as any; setLastResult(`${d.rows_synced || 0} ${t('clients.rowsSynced')}`); }
    } catch (err: any) { setLastResult(`Error: ${err.message}`); }
    setSyncing(false);
  };

  return (
    <div className="rounded-lg border border-border/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {savedUrl ? (
          <Badge variant="outline" className="text-[10px] border-success/30 text-success">{t('dashboard.connected')}</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">{t('dashboard.notConnected')}</Badge>
        )}
      </div>
      <div className="flex gap-2">
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." className="flex-1 text-xs h-8" />
        <Button onClick={handleSave} disabled={saving || url === savedUrl} variant="outline" size="sm" className="h-8 text-xs flex-shrink-0">{t('common.save')}</Button>
      </div>
      {savedUrl && (
        <div className="flex items-center gap-2">
          <Button onClick={handleSync} disabled={syncing} size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
            {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {t('clients.syncSheet')}
          </Button>
          {lastResult && <span className={`text-xs ${lastResult.startsWith('Error') ? 'text-destructive' : 'text-success'}`}>{lastResult}</span>}
        </div>
      )}
    </div>
  );
}

export default function AfmDashboard() {
  const { t, formatCurrency, formatNumber } = useLanguage();
  const { agencyRole } = useAuth();
  const isAdmin = agencyRole === 'AgencyAdmin';

  const [agencyClient, setAgencyClient] = useState<AgencyClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyMetrics, setDailyMetrics] = useState<DailyRow[]>([]);
  const [campaignPlatformMap, setCampaignPlatformMap] = useState<Record<string, string>>({});
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan | null>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformKey>('all');
  const [chartNormalized, setChartNormalized] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  // Date range
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [comparison, setComparison] = useState<Comparison>('none');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | undefined>(() => ({
    from: subDays(new Date(), 29), to: new Date(),
  }));
  const [compareEnabled, setCompareEnabled] = useState(false);

  const category: ClientCategory = useMemo(() => toClientCategory(agencyClient?.category || 'other'), [agencyClient?.category]);

  // Chart metrics
  const ALL_CHART_OPTIONS = useMemo(() => [
    { key: 'spend', color: 'hsl(42, 87%, 55%)', gradientId: 'spendG', labelKey: 'metric.spend' },
    { key: 'leads', color: 'hsl(160, 84%, 39%)', gradientId: 'leadsG', labelKey: 'metric.leads' },
    { key: 'clicks', color: 'hsl(280, 70%, 60%)', gradientId: 'clicksG', labelKey: 'metric.clicks' },
    { key: 'impressions', color: 'hsl(190, 80%, 50%)', gradientId: 'impressionsG', labelKey: 'metric.impressions' },
    { key: 'cpl', color: 'hsl(217, 91%, 60%)', gradientId: 'cplG', labelKey: 'metric.cpl' },
    { key: 'ctr', color: 'hsl(340, 70%, 55%)', gradientId: 'ctrG', labelKey: 'metric.ctr' },
    { key: 'revenue', color: 'hsl(120, 60%, 45%)', gradientId: 'revenueG', labelKey: 'metric.revenue' },
    { key: 'purchases', color: 'hsl(30, 80%, 55%)', gradientId: 'purchasesG', labelKey: 'metric.purchases' },
    { key: 'addToCart', color: 'hsl(260, 60%, 55%)', gradientId: 'atcG', labelKey: 'metric.addToCart' },
    { key: 'roas', color: 'hsl(50, 90%, 50%)', gradientId: 'roasG', labelKey: 'metric.roas' },
  ], []);

  const defaultChartKeys = useMemo(() =>
    (CATEGORY_CHART_METRICS[category] || CATEGORY_CHART_METRICS.other).map(m => m.key),
  [category]);

  const [activeChartLines, setActiveChartLines] = useState<string[]>(defaultChartKeys);
  useEffect(() => { setActiveChartLines(defaultChartKeys); }, [defaultChartKeys]);

  const activeChartMetrics = useMemo(() =>
    ALL_CHART_OPTIONS.filter(m => activeChartLines.includes(m.key)),
  [activeChartLines, ALL_CHART_OPTIONS]);

  const toggleChartLine = (key: string) => {
    setActiveChartLines(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Init visible columns
  useEffect(() => {
    if (agencyClient) {
      const dbCols = agencyClient.visible_columns;
      if (dbCols && Array.isArray(dbCols) && dbCols.length > 0) setVisibleColumns(dbCols);
      else setVisibleColumns(CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.other);
    }
  }, [agencyClient, category]);

  // Fetch agency client (category = 'agency')
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('clients')
        .select('id, name, category, currency, timezone, google_sheet_url, meta_sheet_url, tiktok_sheet_url, auto_sync_enabled, visible_columns')
        .eq('category', 'agency')
        .limit(1)
        .maybeSingle();
      if (data) {
        setAgencyClient({
          ...data,
          visible_columns: data.visible_columns ? (Array.isArray(data.visible_columns) ? data.visible_columns : JSON.parse(data.visible_columns as any)) : null,
        } as AgencyClient);
      }
      setLoading(false);
    })();
  }, []);

  // Fetch metrics
  const fetchData = useCallback(async () => {
    if (!agencyClient) return;
    const cid = agencyClient.id;
    const [metricsRes, campaignsRes, budgetRes] = await Promise.all([
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
  }, [agencyClient]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Platform data check
  const platformHasData = useMemo(() => ({
    meta: !!agencyClient?.meta_sheet_url,
    google: !!agencyClient?.google_sheet_url,
    tiktok: !!agencyClient?.tiktok_sheet_url,
  }), [agencyClient]);

  // Current month metrics
  const currentMonthMetrics = useMemo(() => {
    const now = new Date();
    const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
    const monthEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');
    return dailyMetrics.filter(m => m.date >= monthStart && m.date <= monthEnd);
  }, [dailyMetrics]);

  // Filter by date + platform
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

  // Daily table data
  const dailyTableData = useMemo(() => {
    const byDate: Record<string, { spend: number; impressions: number; clicks: number; leads: number; add_to_cart: number; checkouts: number; purchases: number; revenue: number }> = {};
    filteredMetrics.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = { spend: 0, impressions: 0, clicks: 0, leads: 0, add_to_cart: 0, checkouts: 0, purchases: 0, revenue: 0 };
      const d = byDate[r.date];
      d.spend += Number(r.spend); d.impressions += r.impressions; d.clicks += r.link_clicks;
      d.leads += r.leads; d.add_to_cart += r.add_to_cart || 0; d.checkouts += r.checkouts || 0;
      d.purchases += r.purchases || 0; d.revenue += Number(r.revenue || 0);
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => computeDailyRow({ date, ...v, clicks: v.clicks }));
  }, [filteredMetrics]);

  // Totals
  const totals = useMemo(() => {
    const t = dailyTableData.reduce((acc, r) => ({
      spend: acc.spend + r.spend, impressions: acc.impressions + r.impressions, clicks: acc.clicks + r.clicks,
      leads: acc.leads + r.leads, addToCart: acc.addToCart + r.addToCart,
      checkouts: acc.checkouts + r.checkouts, purchases: acc.purchases + r.purchases, revenue: acc.revenue + r.revenue,
    }), { spend: 0, impressions: 0, clicks: 0, leads: 0, addToCart: 0, checkouts: 0, purchases: 0, revenue: 0 });
    return computeDailyRow({ date: 'TOTAL', spend: t.spend, impressions: t.impressions, clicks: t.clicks, leads: t.leads, add_to_cart: t.addToCart, checkouts: t.checkouts, purchases: t.purchases, revenue: t.revenue });
  }, [dailyTableData]);

  const currentMonthSpend = useMemo(() => currentMonthMetrics.reduce((s, m) => s + Number(m.spend), 0), [currentMonthMetrics]);
  const currentMonthLeads = useMemo(() => currentMonthMetrics.reduce((s, m) => s + m.leads, 0), [currentMonthMetrics]);

  // Chart data
  const chartData = useMemo(() => {
    const raw = dailyTableData.map(r => {
      const point: Record<string, any> = { date: r.date.slice(5) };
      ALL_CHART_OPTIONS.forEach(m => {
        point[m.key] = (r as any)[m.key] || 0;
        point[`_raw_${m.key}`] = (r as any)[m.key] || 0;
      });
      return point;
    });
    if (chartNormalized && raw.length > 0) {
      const maxes: Record<string, number> = {};
      activeChartMetrics.forEach(m => {
        maxes[m.key] = Math.max(...raw.map(d => d[m.key] as number), 1);
      });
      return raw.map(d => {
        const norm: Record<string, any> = { date: d.date };
        ALL_CHART_OPTIONS.forEach(m => {
          norm[m.key] = maxes[m.key] ? Math.round((d[m.key] as number) / maxes[m.key] * 100) : 0;
          norm[`_raw_${m.key}`] = d[`_raw_${m.key}`];
        });
        return norm;
      });
    }
    return raw;
  }, [dailyTableData, chartNormalized, activeChartMetrics, ALL_CHART_OPTIONS]);

  // KPI cards
  const kpiKeys = CATEGORY_KPIS[category] || CATEGORY_KPIS.other;
  const kpiCards = useMemo(() => {
    const iconMap: Record<string, any> = {
      spend: DollarSign, revenue: DollarSign, roas: TrendingUp,
      leads: Users, purchases: ShoppingBag, addToCart: ShoppingCart,
      checkouts: CreditCard, clicks: MousePointerClick, impressions: Eye,
      cpl: TrendingUp, ctr: BarChart3, cpc: DollarSign,
    };
    return kpiKeys.map(key => {
      const col = ALL_METRIC_COLUMNS.find(c => c.key === key);
      if (!col) return null;
      const val = (totals as any)[key] || 0;
      return { key, label: t(col.labelKey as TranslationKey), value: formatMetricValue(key, val, formatCurrency, formatNumber), icon: iconMap[key] || BarChart3 };
    }).filter(Boolean) as { key: string; label: string; value: string; icon: any }[];
  }, [kpiKeys, totals, t, formatCurrency, formatNumber]);

  // Column drag
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

  // No agency client found — show setup prompt
  if (!agencyClient) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <h1 className="text-2xl font-bold text-foreground">{t('afm.dashboard')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('afm.subtitle')}</p>
        </motion.div>
        <motion.div variants={item}>
          <Card className="glass-card border-warning/20 bg-warning/5">
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <Zap className="h-10 w-10 text-warning" />
              <p className="text-sm font-medium text-foreground">
                {t('afm.dash.setupRequired' as any)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('afm.dash.setupHidden' as any)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 sm:space-y-5">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('afm.dashboard')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('afm.subtitle')}</p>
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
            const hasData = p === 'all' || platformHasData[p as 'meta' | 'google' | 'tiktok'];
            return (
              <Button
                key={p}
                variant={platformFilter === p ? 'default' : 'ghost'}
                size="sm"
                onClick={() => hasData && setPlatformFilter(p)}
                className={`text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0 ${!hasData && (p as string) !== 'all' ? 'opacity-40 cursor-default' : ''}`}
              >
                {p === 'all' ? t('common.all') : p === 'meta' ? 'Meta' : p === 'google' ? 'Google' : 'TikTok'}
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
                    <p className="text-xs text-muted-foreground">{t('afm.adBudget')}</p>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(budgetPlan.planned_spend)}</p>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t('metric.spend')}: <span className="text-foreground font-medium">{formatCurrency(currentMonthSpend)}</span></span>
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
                </div>
                {budgetPlan.planned_leads > 0 && (
                  <div className="flex-shrink-0 text-right sm:text-left">
                    <p className="text-xs text-muted-foreground">{t('afm.monthlyLeads')}</p>
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

      {/* Tabs */}
      <motion.div variants={item}>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full overflow-x-auto scrollbar-none justify-start h-auto flex-nowrap p-1">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm flex-shrink-0">
              <BarChart3 className="h-3.5 w-3.5" /> {t('afm.dash.overview' as any)}
            </TabsTrigger>
            <TabsTrigger value="daily" className="gap-1.5 text-xs sm:text-sm flex-shrink-0">
              <Table2 className="h-3.5 w-3.5" /> {t('afm.dash.daily' as any)}
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-1.5 text-xs sm:text-sm flex-shrink-0">
              <Link2 className="h-3.5 w-3.5" /> {t('dashboard.dataSources')}
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Performance Chart */}
              <Card className="glass-card lg:col-span-2">
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <CardTitle className="text-sm sm:text-base">{t('dashboard.performance')}</CardTitle>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ALL_CHART_OPTIONS.map(m => (
                        <button
                          key={m.key}
                          onClick={() => toggleChartLine(m.key)}
                          className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-opacity ${activeChartLines.includes(m.key) ? 'opacity-100' : 'opacity-30'}`}
                        >
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                          <span className="text-muted-foreground">{t(m.labelKey as TranslationKey)}</span>
                        </button>
                      ))}
                      <div className="flex bg-secondary/50 rounded-md p-0.5 ml-1">
                        <Button variant="ghost" size="sm" onClick={() => setChartNormalized(false)}
                          className={`h-5 px-2 text-[10px] rounded-sm ${!chartNormalized ? 'bg-primary text-primary-foreground' : ''}`}>
                          Absolute
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setChartNormalized(true)}
                          className={`h-5 px-2 text-[10px] rounded-sm ${chartNormalized ? 'bg-primary text-primary-foreground' : ''}`}>
                          Normalized
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <div className="h-[220px] sm:h-[280px]">
                    {chartData.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t('common.noData')}</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            {activeChartMetrics.map(m => (
                              <linearGradient key={m.gradientId} id={`afm-${m.gradientId}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={m.color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" width={35} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                            formatter={(value: number, name: string, props: any) => {
                              const rawVal = props.payload?.[`_raw_${name}`];
                              const displayVal = chartNormalized && rawVal !== undefined ? rawVal : value;
                              const fmt = typeof displayVal === 'number' ? (displayVal % 1 === 0 ? displayVal.toLocaleString() : displayVal.toFixed(2)) : displayVal;
                              return [fmt, name];
                            }}
                          />
                          {activeChartMetrics.map(m => (
                            <Area key={m.key} type="monotone" dataKey={m.key} stroke={m.color} fill={`url(#afm-${m.gradientId})`} strokeWidth={2} />
                          ))}
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Right column — Funnel + Platform Breakdown */}
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
                  <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-base">{t('dashboard.spendByPlatform')}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(['meta', 'google', 'tiktok'] as const).map(p => {
                        const hasSheet = platformHasData[p];
                        const label = p === 'meta' ? 'Meta Ads' : p === 'google' ? 'Google Ads' : 'TikTok Ads';
                        const platformMetrics = dailyMetrics.filter(m => (campaignPlatformMap[m.campaign_id] as string) === (p as string));
                        const platformSpend = platformMetrics.reduce((s, m) => s + Number(m.spend), 0);
                        return (
                          <div key={p} className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-secondary/20">
                            <div>
                              <span className="text-xs font-medium">{label}</span>
                              {hasSheet && platformSpend > 0 && (
                                <p className="text-[10px] text-muted-foreground">{formatCurrency(platformSpend)}</p>
                              )}
                            </div>
                            <Badge variant="outline" className={`text-[9px] ${hasSheet ? 'border-success/30 text-success' : 'border-border text-muted-foreground'}`}>
                              {hasSheet ? t('dashboard.connected') : t('dashboard.notConnected')}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* DAILY STATS TAB */}
          <TabsContent value="daily" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold">{t('afm.dash.dailyStats' as any)}</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-[10px] sm:text-xs h-7 sm:h-8">
                    <Settings2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Columns</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="end">
                  <p className="text-sm font-semibold mb-2">{t('clients.manageColumns')}</p>
                  <div className="space-y-0.5 max-h-[350px] overflow-y-auto">
                    {ALL_METRIC_COLUMNS.map(col => (
                      <div key={col.key} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-secondary/50">
                        <Checkbox checked={visibleColumns.includes(col.key)} onCheckedChange={() => toggleColumn(col.key)} id={`afm-col-${col.key}`} />
                        <label htmlFor={`afm-col-${col.key}`} className="flex-1 text-xs cursor-pointer">{t(col.labelKey as TranslationKey)}</label>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => setVisibleColumns(CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.other)}>
                    Reset
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
                        <tr><td colSpan={orderedVisibleColumns.length} className="text-center py-8 text-muted-foreground">{t('common.noData')}</td></tr>
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

          {/* CONNECTIONS TAB */}
          <TabsContent value="connections" className="space-y-4">
            <Card className="glass-card max-w-2xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sheet className="h-5 w-5 text-primary" />
                  {t('dashboard.dataSources')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('clients.syncSheetDesc')}</p>

                {/* Auto-sync toggle */}
                <div className="rounded-lg border border-border/50 p-3 bg-secondary/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-primary" />
                        {t('afm.dash.autoSync' as any)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t('afm.dash.autoSyncDesc' as any)}</p>
                    </div>
                    <Switch
                      checked={agencyClient.auto_sync_enabled}
                      onCheckedChange={async (v) => {
                        await supabase.from('clients').update({ auto_sync_enabled: v }).eq('id', agencyClient.id);
                        setAgencyClient(prev => prev ? { ...prev, auto_sync_enabled: v } : prev);
                        toast.success(v ? t('afm.dash.autoSyncOn' as any) : t('afm.dash.autoSyncOff' as any));
                      }}
                    />
                  </div>
                  {agencyClient.auto_sync_enabled && (
                    <p className="text-[10px] text-success mt-2 flex items-center gap-1">
                      ✓ {t('afm.dash.autoSyncHint' as any)}
                    </p>
                  )}
                </div>

                <PlatformSheetRow clientId={agencyClient.id} platform="meta" label="Meta Ads" fieldName="meta_sheet_url" />
                <PlatformSheetRow clientId={agencyClient.id} platform="google" label="Google Ads" fieldName="google_sheet_url" />
                <PlatformSheetRow clientId={agencyClient.id} platform="tiktok" label="TikTok Ads" fieldName="tiktok_sheet_url" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
