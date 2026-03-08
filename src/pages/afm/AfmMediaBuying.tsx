import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart3, RefreshCw, Target, DollarSign, Users, Zap, CalendarIcon, Loader2, Link2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { isAfmCampaign, getAfmCampaignIds } from '@/lib/afmCampaignFilter';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useLanguage } from '@/i18n/LanguageContext';
import type { TranslationKey } from '@/i18n/translations';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

interface Client { id: string; name: string; google_sheet_url: string | null; meta_sheet_url: string | null; tiktok_sheet_url: string | null; }
interface DailyMetric { date: string; spend: number; leads: number; impressions: number; link_clicks: number; }
interface BudgetPlan { id: string; month: string; planned_spend: number; planned_leads: number; planned_cpl: number | null; }
interface ClientTarget { target_cpl: number | null; target_leads: number | null; target_roas: number | null; }
interface AdLevelRow {
  name: string; level: string; platform_id: string; parent_platform_id: string | null;
  spend: number; impressions: number; link_clicks: number; leads: number; purchases: number; revenue: number;
}

function MbDatePicker({ dateRange, onDateRangeChange, t }: {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (r: { from: Date; to: Date }) => void;
  t: (k: any) => string;
}) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<DateRange | undefined>({ from: dateRange.from, to: dateRange.to });
  const presets = useMemo(() => [
    { label: t('afm.mb.days7' as TranslationKey), getDates: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
    { label: t('afm.mb.days30' as TranslationKey), getDates: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
    { label: t('afm.mb.thisMonth' as TranslationKey), getDates: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
    { label: t('afm.mb.lastMonth' as TranslationKey), getDates: () => { const lm = subMonths(new Date(), 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; } },
    { label: t('afm.mb.thisWeek' as TranslationKey), getDates: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: new Date() }) },
  ], [t]);
  const [preset, setPreset] = useState(presets[1]?.label || '');

  const handlePreset = (p: typeof presets[0]) => {
    const range = p.getDates();
    setPick({ from: range.from, to: range.to });
    setPreset(p.label);
  };

  const handleApply = () => {
    if (pick?.from && pick?.to) onDateRangeChange({ from: pick.from, to: pick.to });
    setOpen(false);
  };

  const displayLabel = dateRange
    ? `${format(dateRange.from, 'dd.MM.yy')} – ${format(dateRange.to, 'dd.MM.yy')}`
    : presets[1]?.label || '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-border/50">
          <CalendarIcon className="h-3.5 w-3.5" />
          <span>{displayLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}>
        <div className="flex">
          <div className="w-36 border-r border-border/50 py-2">
            {presets.map(p => (
              <button key={p.label} onClick={() => handlePreset(p)}
                className={cn('w-full text-left px-4 py-1.5 text-xs transition-colors', preset === p.label ? 'text-primary font-semibold bg-primary/5' : 'text-foreground hover:bg-muted/50')}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col">
            <Calendar mode="range" selected={pick} onSelect={r => { setPick(r); setPreset(''); }} numberOfMonths={2} disabled={d => d > new Date()} className="p-3 pointer-events-auto" weekStartsOn={1} />
            <div className="flex items-center justify-between px-4 pb-3 gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 bg-muted/50 rounded">{pick?.from ? format(pick.from, 'dd.MM.yy') : '—'}</span>
                <span>–</span>
                <span className="px-2 py-1 bg-muted/50 rounded">{pick?.to ? format(pick.to, 'dd.MM.yy') : '—'}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
                <Button size="sm" className="h-8 text-xs" onClick={handleApply}>{t('afm.mb.apply' as TranslationKey)}</Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ── Campaign Breakdown ── */
function CampaignBreakdown({ clientId, dateRange, t, formatCurrency, formatNumber }: {
  clientId: string; dateRange: { from: Date; to: Date };
  t: (k: any) => string; formatCurrency: (n: number) => string; formatNumber: (n: number) => string;
}) {
  const [rows, setRows] = useState<AdLevelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [breadcrumb, setBreadcrumb] = useState<{ level: string; platformId: string; name: string }[]>([]);

  const currentLevel = breadcrumb.length === 0 ? 'campaign' : breadcrumb.length === 1 ? 'adset' : 'ad';
  const parentPlatformId = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].platformId : null;

  useEffect(() => {
    const fetchRows = async () => {
      setLoading(true);
      const fromStr = format(dateRange.from, 'yyyy-MM-dd');
      const toStr = format(dateRange.to, 'yyyy-MM-dd');

      let query = supabase.from('ad_level_metrics')
        .select('name, level, platform_id, parent_platform_id, spend, impressions, link_clicks, leads, purchases, revenue')
        .eq('client_id', clientId)
        .eq('level', currentLevel)
        .gte('date', fromStr)
        .lte('date', toStr);

      if (parentPlatformId) {
        query = query.eq('parent_platform_id', parentPlatformId);
      }

      const { data } = await query;
      // AFM FILTER: at campaign level, filter by name containing AFM
      const filtered = currentLevel === 'campaign'
        ? (data || []).filter((r: any) => isAfmCampaign(r.name))
        : data || [];
      if (data) {
        // Aggregate by platform_id
        const agg: Record<string, AdLevelRow> = {};
        filtered.forEach((r: any) => {
          if (!agg[r.platform_id]) {
            agg[r.platform_id] = { ...r, spend: 0, impressions: 0, link_clicks: 0, leads: 0, purchases: 0, revenue: 0 };
          }
          const a = agg[r.platform_id];
          a.spend += Number(r.spend); a.impressions += r.impressions; a.link_clicks += r.link_clicks;
          a.leads += r.leads; a.purchases += r.purchases; a.revenue += Number(r.revenue);
        });
        setRows(Object.values(agg).sort((a, b) => b.spend - a.spend));
      }
      setLoading(false);
    };
    fetchRows();
  }, [clientId, dateRange, currentLevel, parentPlatformId]);

  const drillDown = (row: AdLevelRow) => {
    if (currentLevel === 'ad') return;
    setBreadcrumb(prev => [...prev, { level: currentLevel, platformId: row.platform_id, name: row.name }]);
  };

  const navigateTo = (idx: number) => {
    setBreadcrumb(prev => prev.slice(0, idx));
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
        <button onClick={() => navigateTo(0)} className={cn('hover:text-primary transition-colors', breadcrumb.length === 0 && 'text-foreground font-medium')}>
          {t('afm.mb.campaigns' as TranslationKey)}
        </button>
        {breadcrumb.map((bc, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigateTo(i + 1)} className={cn('hover:text-primary transition-colors truncate max-w-[150px]', i === breadcrumb.length - 1 && 'text-foreground font-medium')}>
              {bc.name}
            </button>
          </span>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">{t('common.noData')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border/40">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">{t('common.name')}</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t('metric.spend' as TranslationKey)}</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t('metric.leads' as TranslationKey)}</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t('metric.cpl' as TranslationKey)}</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t('metric.clicks' as TranslationKey)}</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t('metric.impressions' as TranslationKey)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const cpl = row.leads > 0 ? row.spend / row.leads : 0;
                return (
                  <tr key={row.platform_id} className="border-b border-border/20 hover:bg-muted/10 cursor-pointer" onClick={() => drillDown(row)}>
                    <td className="px-3 py-2 text-foreground font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[250px]">{row.name || row.platform_id}</span>
                        {currentLevel !== 'ad' && <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{formatCurrency(row.spend)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatNumber(row.leads)}</td>
                    <td className="px-3 py-2 text-right font-mono">{cpl > 0 ? formatCurrency(cpl) : '—'}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatNumber(row.link_clicks)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatNumber(row.impressions)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AfmMediaBuying() {
  const { t, formatCurrency, formatNumber } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [budget, setBudget] = useState<BudgetPlan | null>(null);
  const [target, setTarget] = useState<ClientTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [budgetEdit, setBudgetEdit] = useState(false);
  const [planSpend, setPlanSpend] = useState('');
  const [planLeads, setPlanLeads] = useState('');
  const [planCpl, setPlanCpl] = useState('');
  const [targetCpl, setTargetCpl] = useState('');
  const [targetLeads, setTargetLeads] = useState('');
  const [targetRoas, setTargetRoas] = useState('');
  const [hasApiAccounts, setHasApiAccounts] = useState(false);
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 29), to: new Date() });

  useEffect(() => {
    supabase.from('clients').select('id, name, google_sheet_url, meta_sheet_url, tiktok_sheet_url')
      .order('name')
      .then(({ data }) => {
        const all = data || [];
        setClients(all);
        if (all.length > 0) setSelectedClientId(all[0].id);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedClientId) return;
    const fromStr = format(dateRange.from, 'yyyy-MM-dd');
    const toStr = format(dateRange.to, 'yyyy-MM-dd');
    const monthStr = format(new Date(), 'yyyy-MM-01');

    Promise.all([
      supabase.from('daily_metrics')
        .select('date, spend, leads, impressions, link_clicks')
        .eq('client_id', selectedClientId)
        .gte('date', fromStr).lte('date', toStr).order('date'),
      supabase.from('budget_plans')
        .select('id, month, planned_spend, planned_leads, planned_cpl')
        .eq('client_id', selectedClientId).eq('month', monthStr).maybeSingle(),
      supabase.from('client_targets')
        .select('target_cpl, target_leads, target_roas')
        .eq('client_id', selectedClientId).maybeSingle(),
      supabase.from('ad_accounts')
        .select('id').eq('client_id', selectedClientId).eq('is_active', true).limit(1),
    ]).then(([m, b, tg, aa]) => {
      setMetrics(m.data || []);
      setBudget(b.data);
      if (b.data) { setPlanSpend(String(b.data.planned_spend || '')); setPlanLeads(String(b.data.planned_leads || '')); setPlanCpl(String(b.data.planned_cpl || '')); }
      else { setPlanSpend(''); setPlanLeads(''); setPlanCpl(''); }
      setTarget(tg.data);
      if (tg.data) { setTargetCpl(String(tg.data.target_cpl || '')); setTargetLeads(String(tg.data.target_leads || '')); setTargetRoas(String(tg.data.target_roas || '')); }
      else { setTargetCpl(''); setTargetLeads(''); setTargetRoas(''); }
      setHasApiAccounts((aa.data || []).length > 0);
    });
  }, [selectedClientId, dateRange]);

  const totalSpend = metrics.reduce((s, m) => s + m.spend, 0);
  const totalLeads = metrics.reduce((s, m) => s + m.leads, 0);
  const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0);
  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const ctr = totalImpressions > 0 ? (metrics.reduce((s, m) => s + m.link_clicks, 0) / totalImpressions * 100) : 0;

  const chartData = metrics.map(m => ({
    date: format(new Date(m.date), 'dd.MM'),
    [t('afm.mb.spendPeriod' as any)]: Math.round(m.spend),
    [t('afm.mb.leadsPeriod' as any)]: m.leads,
    CPL: m.leads > 0 ? Math.round(m.spend / m.leads) : 0,
  }));

  const handleSync = async () => {
    if (!selectedClientId) return;
    setSyncing(true);
    try {
      await supabase.functions.invoke('sync-google-sheet', { body: { clientId: selectedClientId } });
      toast.success(t('afm.mb.synced' as any));
    } catch { toast.error(t('afm.mb.syncError' as any)); }
    setSyncing(false);
  };

  const saveBudget = useCallback(async () => {
    if (!selectedClientId) return;
    const monthStr = format(new Date(), 'yyyy-MM-01');
    if (budget?.id) {
      await supabase.from('budget_plans').update({ planned_spend: Number(planSpend) || 0, planned_leads: Number(planLeads) || 0, planned_cpl: Number(planCpl) || null }).eq('id', budget.id);
    } else {
      const { data } = await supabase.from('budget_plans').insert({ client_id: selectedClientId, month: monthStr, planned_spend: Number(planSpend) || 0, planned_leads: Number(planLeads) || 0, planned_cpl: Number(planCpl) || null }).select().maybeSingle();
      if (data) setBudget(data);
    }
    toast.success(t('afm.mb.budgetSaved' as any));
    setBudgetEdit(false);
  }, [selectedClientId, budget, planSpend, planLeads, planCpl, t]);

  const saveTargets = useCallback(async () => {
    if (!selectedClientId) return;
    if (target) {
      await supabase.from('client_targets').update({ target_cpl: Number(targetCpl) || null, target_leads: Number(targetLeads) || null, target_roas: Number(targetRoas) || null }).eq('client_id', selectedClientId);
    } else {
      await supabase.from('client_targets').insert({ client_id: selectedClientId, target_cpl: Number(targetCpl) || null, target_leads: Number(targetLeads) || null, target_roas: Number(targetRoas) || null });
    }
    toast.success(t('afm.mb.goalsSaved' as any));
  }, [selectedClientId, target, targetCpl, targetLeads, targetRoas, t]);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const connectedPlatforms = selectedClient ? [
    (selectedClient.google_sheet_url || selectedClient.meta_sheet_url) && 'Meta',
    selectedClient.google_sheet_url && 'Google',
    selectedClient.tiktok_sheet_url && 'TikTok',
    hasApiAccounts && 'Meta API',
  ].filter(Boolean) as string[] : [];

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            {t('afm.mb.title' as any)}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('afm.mb.internalAds' as any)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MbDatePicker dateRange={dateRange} onDateRangeChange={setDateRange} t={t} />
          <select value={selectedClientId || ''} onChange={e => setSelectedClientId(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary">
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="gap-1.5 text-xs h-8">
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {t('afm.mb.sync' as any)}
          </Button>
        </div>
      </motion.div>

      {connectedPlatforms.length > 0 && (
        <motion.div variants={item} className="flex gap-2 flex-wrap">
          {connectedPlatforms.map(p => (
            <span key={p} className="inline-flex items-center gap-1.5 text-xs border border-border/60 rounded-full px-2.5 py-0.5 text-muted-foreground">
              <Link2 className="h-3 w-3 text-primary" />{p}
            </span>
          ))}
        </motion.div>
      )}

      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('afm.mb.spendPeriod' as any), value: formatCurrency(totalSpend), icon: DollarSign, color: 'text-blue-400' },
          { label: t('afm.mb.leadsPeriod' as any), value: formatNumber(totalLeads), icon: Users, color: 'text-green-400' },
          { label: 'CPL', value: cpl > 0 ? formatCurrency(cpl) : '—', icon: Target, color: 'text-amber-400' },
          { label: 'CTR', value: `${ctr.toFixed(2)}%`, icon: Zap, color: 'text-purple-400' },
        ].map(kpi => (
          <Card key={kpi.label} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className={`text-xl font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="daily" className="text-xs">{t('afm.mb.dailyStats' as any)}</TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs">{t('afm.mb.campaigns' as any)}</TabsTrigger>
          <TabsTrigger value="budget" className="text-xs">{t('afm.mb.budgetPlanMonth' as any)}</TabsTrigger>
          <TabsTrigger value="goals" className="text-xs">{t('afm.mb.goalsTitle' as any)}</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          {chartData.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <BarChart3 className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">{t('afm.mb.noDataSync' as any)}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="glass-card">
                <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-medium text-muted-foreground">{t('afm.mb.spendByDay' as any)}</CardTitle></CardHeader>
                <CardContent className="px-2 pb-3">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                      <Bar dataKey={t('afm.mb.spendPeriod' as any)} fill="#60a5fa" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs font-medium text-muted-foreground">{t('afm.mb.leadsAndCpl' as any)}</CardTitle></CardHeader>
                <CardContent className="px-2 pb-3">
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey={t('afm.mb.leadsPeriod' as any)} stroke="#34d399" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="CPL" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {chartData.length > 0 && (
            <Card className="glass-card">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/40">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">{t('afm.mb.date' as any)}</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t('afm.mb.spend' as any)}</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t('afm.mb.leadsPeriod' as any)}</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">CPL</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">{t('afm.mb.impressions' as any)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.slice().reverse().map(m => (
                        <tr key={m.date} className="border-b border-border/20 hover:bg-muted/10">
                          <td className="px-3 py-1.5 text-foreground">{format(new Date(m.date), 'dd.MM.yyyy')}</td>
                          <td className="px-3 py-1.5 text-right text-blue-400 font-mono">{formatCurrency(m.spend)}</td>
                          <td className="px-3 py-1.5 text-right text-green-400 font-mono">{formatNumber(m.leads)}</td>
                          <td className="px-3 py-1.5 text-right text-amber-400 font-mono">{m.leads > 0 ? formatCurrency(m.spend / m.leads) : '—'}</td>
                          <td className="px-3 py-1.5 text-right text-muted-foreground font-mono">{formatNumber(m.impressions)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* CAMPAIGNS TAB */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {t('afm.mb.campaigns' as any)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedClientId ? (
                <CampaignBreakdown clientId={selectedClientId} dateRange={dateRange} t={t} formatCurrency={formatCurrency} formatNumber={formatNumber} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{t('common.noData')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget">
          <Card className="glass-card">
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  {t('afm.mb.budgetPlanMonth' as any)} — {format(new Date(), 'MMMM yyyy')}
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setBudgetEdit(e => !e)} className="text-xs h-7">
                  {budgetEdit ? t('afm.mb.cancelEdit' as any) : t('afm.mb.editBudget' as any)}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: t('afm.mb.plannedSpend' as any), val: planSpend, set: setPlanSpend },
                  { label: t('afm.mb.plannedLeads' as any), val: planLeads, set: setPlanLeads },
                  { label: t('afm.mb.targetCpl' as any), val: planCpl, set: setPlanCpl },
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-xs text-muted-foreground block mb-1">{f.label}</label>
                    {budgetEdit ? (
                      <input type="text" inputMode="numeric" value={f.val} onChange={e => f.set(e.target.value)}
                        className="w-full bg-background border border-primary/40 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary font-mono" />
                    ) : (
                      <p className="text-lg font-bold font-mono text-foreground">{f.val || '—'}</p>
                    )}
                  </div>
                ))}
              </div>
              {budget && !budgetEdit && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('afm.mb.factVsPlan' as any)}</p>
                  {[
                    { label: t('afm.mb.spendPeriod' as any), actual: totalSpend, plan: budget.planned_spend, fmt: formatCurrency },
                    { label: t('afm.mb.leadsPeriod' as any), actual: totalLeads, plan: budget.planned_leads, fmt: formatNumber },
                  ].map(row => {
                    const pct = row.plan > 0 ? Math.min(100, (row.actual / row.plan) * 100) : 0;
                    return (
                      <div key={row.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{row.label}</span>
                          <span className="font-medium">{row.fmt(row.actual)} / {row.fmt(row.plan as number)}</span>
                        </div>
                        <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-primary' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{pct.toFixed(0)}% {t('afm.mb.ofPlan' as any)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              {budgetEdit && <Button onClick={saveBudget} size="sm" className="w-full text-xs h-8">{t('afm.mb.savePlan' as any)}</Button>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals">
          <Card className="glass-card">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                {t('afm.mb.goalsTitle' as any)}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: t('afm.mb.targetCpl' as any), val: targetCpl, set: setTargetCpl, actual: cpl > 0 ? formatCurrency(cpl) : '—' },
                  { label: t('afm.mb.plannedLeads' as any), val: targetLeads, set: setTargetLeads, actual: formatNumber(totalLeads) },
                  { label: t('afm.mb.targetRoas' as any), val: targetRoas, set: setTargetRoas, actual: '—' },
                ].map(f => (
                  <div key={f.label} className="space-y-1">
                    <label className="text-xs text-muted-foreground">{f.label}</label>
                    <input type="text" inputMode="numeric" value={f.val} onChange={e => f.set(e.target.value)} placeholder="0"
                      className="w-full bg-background border border-border/60 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary font-mono" />
                    <p className="text-[10px] text-muted-foreground">{t('afm.mb.actual' as any)}: <span className="text-foreground font-medium">{f.actual}</span></p>
                  </div>
                ))}
              </div>
              <Button onClick={saveTargets} size="sm" className="text-xs h-8">{t('afm.mb.saveGoals' as any)}</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
