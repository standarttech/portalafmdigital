import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, DollarSign, MousePointerClick, Users, Eye, TrendingUp,
  BarChart3, FileText, Table2, Link2, ListTodo, Clock, Target, Plus, Loader2,
  Sheet, RefreshCw, Settings2, ChevronDown, ShoppingBag, ShoppingCart, CreditCard,
  Save, GripVertical,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { subDays, startOfMonth, endOfMonth, subMonths, format, startOfWeek, endOfWeek } from 'date-fns';
import {
  ALL_METRIC_COLUMNS, CATEGORY_DEFAULTS, CATEGORY_KPIS, CATEGORY_CHART_METRICS, CATEGORY_OPTIONS,
  toClientCategory, computeDailyRow, formatMetricValue,
  type ClientCategory,
} from '@/components/dashboard/categoryMetrics';
import type { TranslationKey } from '@/i18n/translations';

interface ClientData {
  id: string; name: string; status: string; currency: string; timezone: string;
  notes: string | null; category: string; visible_columns: string[] | null;
}
interface Campaign { id: string; campaign_name: string; status: string; platform_campaign_id: string; }
interface Task { id: string; title: string; description: string | null; status: string; due_date: string | null; created_at: string; }
interface ClientTarget { target_cpl: number | null; target_ctr: number | null; target_leads: number | null; target_roas: number | null; }
interface DailyRow {
  date: string; spend: number; impressions: number; link_clicks: number; leads: number;
  add_to_cart: number | null; checkouts: number | null; purchases: number | null; revenue: number | null;
  campaign_id: string;
}
interface ClientListItem { id: string; name: string; }

const statusStyles: Record<string, string> = {
  active: 'bg-success/15 text-success border-success/20', paused: 'bg-warning/15 text-warning border-warning/20',
  inactive: 'bg-muted text-muted-foreground border-border', archived: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-warning/15 text-warning border-warning/20', in_progress: 'bg-info/15 text-info border-info/20',
  completed: 'bg-success/15 text-success border-success/20',
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const ICON_MAP: Record<string, any> = {
  DollarSign, MousePointerClick, Users, Eye, TrendingUp, BarChart3,
  ShoppingBag, ShoppingCart, CreditCard,
};

type PeriodKey = 'today' | 'yesterday' | 'last7' | 'last30' | 'last_month' | 'custom' | 'all';

function getDateRange(period: PeriodKey): { from: string; to: string } | null {
  const today = new Date();
  switch (period) {
    case 'today': return { from: format(today, 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') };
    case 'yesterday': { const y = subDays(today, 1); return { from: format(y, 'yyyy-MM-dd'), to: format(y, 'yyyy-MM-dd') }; }
    case 'last7': return { from: format(subDays(today, 7), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') };
    case 'last30': return { from: format(subDays(today, 30), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') };
    case 'last_month': { const lm = subMonths(today, 1); return { from: format(startOfMonth(lm), 'yyyy-MM-dd'), to: format(endOfMonth(lm), 'yyyy-MM-dd') }; }
    default: return null;
  }
}

// Google Sheet Connection sub-component
function GoogleSheetConnection({ clientId, isAdmin }: { clientId: string; isAdmin: boolean }) {
  const { t } = useLanguage();
  const [sheetUrl, setSheetUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(false);

  useEffect(() => {
    supabase.from('clients').select('google_sheet_url, auto_sync_enabled').eq('id', clientId).single().then(({ data }) => {
      if (data?.google_sheet_url) { setSheetUrl(data.google_sheet_url); setSavedUrl(data.google_sheet_url); }
      if (data?.auto_sync_enabled) setAutoSync(data.auto_sync_enabled);
    });
  }, [clientId]);

  const handleToggleAutoSync = async (enabled: boolean) => {
    setAutoSync(enabled);
    await supabase.from('clients').update({ auto_sync_enabled: enabled } as any).eq('id', clientId);
    toast.success(enabled ? t('clients.autoSyncEnabled') : t('clients.autoSyncDisabled'));
  };
  const handleSaveUrl = async () => {
    setSaving(true);
    await supabase.from('clients').update({ google_sheet_url: sheetUrl || null } as any).eq('id', clientId);
    setSavedUrl(sheetUrl); setSaving(false); toast.success(t('clients.sheetUrlSaved'));
  };
  const handleSync = async () => {
    if (!savedUrl) return;
    setSyncing(true); setLastResult(null);
    try {
      const res = await supabase.functions.invoke('sync-google-sheet', { body: { client_id: clientId } });
      if (res.error) { setLastResult(`Error: ${res.error.message}`); toast.error(t('clients.sheetSyncError')); }
      else { const d = res.data as any; setLastResult(`${d.rows_synced} ${t('clients.rowsSynced')}`); toast.success(t('clients.sheetSynced')); }
    } catch (err: any) { setLastResult(`Error: ${err.message}`); toast.error(t('clients.sheetSyncError')); }
    setSyncing(false);
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card max-w-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sheet className="h-5 w-5 text-primary" />Google Sheets</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('clients.syncSheetDesc')}</p>
          <div className="space-y-2">
            <Label>{t('clients.googleSheetUrl')}</Label>
            <div className="flex gap-2">
              <Input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." className="flex-1" />
              <Button onClick={handleSaveUrl} disabled={saving || sheetUrl === savedUrl} variant="outline" size="sm">{t('common.save')}</Button>
            </div>
          </div>
          {savedUrl && (
            <div className="flex items-center gap-3">
              <Button onClick={handleSync} disabled={syncing} className="gap-2">
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{t('clients.syncSheet')}
              </Button>
              {lastResult && <span className={`text-sm ${lastResult.startsWith('Error') ? 'text-destructive' : 'text-success'}`}>{lastResult}</span>}
            </div>
          )}
          {savedUrl && (
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div><p className="text-sm font-medium">{t('clients.autoSync')}</p><p className="text-xs text-muted-foreground">{t('clients.autoSyncDesc')}</p></div>
              <Switch checked={autoSync} onCheckedChange={handleToggleAutoSync} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, formatCurrency, formatNumber } = useLanguage();
  const { user, agencyRole } = useAuth();
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [targets, setTargets] = useState<ClientTarget | null>(null);
  const [savingTargets, setSavingTargets] = useState(false);
  const [targetCpl, setTargetCpl] = useState('');
  const [targetCtr, setTargetCtr] = useState('');
  const [targetLeads, setTargetLeads] = useState('');
  const [dailyMetrics, setDailyMetrics] = useState<DailyRow[]>([]);
  const [allClients, setAllClients] = useState<ClientListItem[]>([]);
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [savingColumns, setSavingColumns] = useState(false);

  // Chart normalization — default ON
  const [chartNormalized, setChartNormalized] = useState(true);

  const isAgency = agencyRole === 'AgencyAdmin' || agencyRole === 'MediaBuyer';
  const isAdmin = agencyRole === 'AgencyAdmin';

  const category: ClientCategory = useMemo(() => toClientCategory(client?.category), [client?.category]);

  // Visible columns: from DB (admin-saved) or category defaults
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  useEffect(() => {
    if (client) {
      const dbCols = client.visible_columns;
      if (dbCols && Array.isArray(dbCols) && dbCols.length > 0) {
        setVisibleColumns(dbCols);
      } else {
        setVisibleColumns(CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.other);
      }
    }
  }, [client, category]);

  // Date filtering
  const dateRange = useMemo(() => {
    if (period === 'custom') return customFrom && customTo ? { from: customFrom, to: customTo } : null;
    if (period === 'all') return null;
    return getDateRange(period);
  }, [period, customFrom, customTo]);

  const filteredMetrics = useMemo(() => {
    if (!dateRange) return dailyMetrics;
    return dailyMetrics.filter(m => m.date >= dateRange.from && m.date <= dateRange.to);
  }, [dailyMetrics, dateRange]);

  // Compute daily table rows with all metrics
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

  // Totals
  const totals = useMemo(() => {
    const t = dailyTableData.reduce((acc, r) => ({
      spend: acc.spend + r.spend, impressions: acc.impressions + r.impressions, clicks: acc.clicks + r.clicks,
      leads: acc.leads + r.leads, reach: acc.reach + r.reach, addToCart: acc.addToCart + r.addToCart,
      checkouts: acc.checkouts + r.checkouts, purchases: acc.purchases + r.purchases, revenue: acc.revenue + r.revenue,
    }), { spend: 0, impressions: 0, clicks: 0, leads: 0, reach: 0, addToCart: 0, checkouts: 0, purchases: 0, revenue: 0 });
    return computeDailyRow({ date: 'TOTAL', spend: t.spend, impressions: t.impressions, clicks: t.clicks, leads: t.leads, add_to_cart: t.addToCart, checkouts: t.checkouts, purchases: t.purchases, revenue: t.revenue });
  }, [dailyTableData]);

  // Chart data with normalization
  const chartMetrics = CATEGORY_CHART_METRICS[category] || CATEGORY_CHART_METRICS.other;
  const chartData = useMemo(() => {
    const raw = dailyTableData.map(r => {
      const point: Record<string, any> = { date: r.date.slice(5) };
      chartMetrics.forEach(m => { point[m.key] = (r as any)[m.key] || 0; });
      return point;
    });
    if (chartNormalized && raw.length > 0) {
      const first = raw[0];
      return raw.map(d => {
        const norm: Record<string, any> = { date: d.date };
        chartMetrics.forEach(m => {
          const base = first[m.key] as number;
          norm[m.key] = base > 0 ? Math.round((d[m.key] as number) / base * 100) : 0;
        });
        return norm;
      });
    }
    return raw;
  }, [dailyTableData, chartNormalized, chartMetrics]);

  // KPI data
  const kpiKeys = CATEGORY_KPIS[category] || CATEGORY_KPIS.other;
  const kpiCards = useMemo(() => {
    return kpiKeys.map(key => {
      const col = ALL_METRIC_COLUMNS.find(c => c.key === key);
      if (!col) return null;
      const val = (totals as any)[key] || 0;
      const iconName = {
        spend: DollarSign, revenue: DollarSign, roas: TrendingUp,
        leads: Users, purchases: ShoppingBag, addToCart: ShoppingCart,
        checkouts: CreditCard, clicks: MousePointerClick, impressions: Eye,
        cpl: TrendingUp, ctr: BarChart3, cpc: DollarSign, costPerPurchase: TrendingUp,
      }[key] || BarChart3;
      return { key, label: t(col.labelKey as TranslationKey), value: formatMetricValue(key, val, formatCurrency, formatNumber), icon: iconName };
    }).filter(Boolean) as { key: string; label: string; value: string; icon: any }[];
  }, [kpiKeys, totals, t, formatCurrency, formatNumber]);

  // Data fetching
  const fetchClient = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase.from('clients').select('id, name, status, currency, timezone, notes, category, visible_columns').eq('id', id).single();
    if (error || !data) { navigate('/clients'); return; }
    setClient({
      ...data,
      visible_columns: data.visible_columns ? (Array.isArray(data.visible_columns) ? data.visible_columns : JSON.parse(data.visible_columns as any)) : null,
    } as ClientData);
    setLoading(false);
  }, [id, navigate]);

  const fetchDailyMetrics = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from('daily_metrics')
      .select('date, spend, impressions, link_clicks, leads, add_to_cart, checkouts, purchases, revenue, campaign_id')
      .eq('client_id', id).order('date', { ascending: true });
    if (data) setDailyMetrics(data as DailyRow[]);
  }, [id]);

  const fetchCampaigns = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from('campaigns').select('id, campaign_name, status, platform_campaign_id').eq('client_id', id).order('campaign_name');
    if (data) setCampaigns(data);
  }, [id]);

  const fetchTasks = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from('tasks').select('id, title, description, status, due_date, created_at').eq('client_id', id).order('created_at', { ascending: false });
    if (data) setTasks(data);
  }, [id]);

  const fetchTargets = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from('client_targets').select('target_cpl, target_ctr, target_leads, target_roas').eq('id', id).maybeSingle();
    if (data) { setTargets(data); setTargetCpl(data.target_cpl?.toString() || ''); setTargetCtr(data.target_ctr?.toString() || ''); setTargetLeads(data.target_leads?.toString() || ''); }
  }, [id]);

  const [allClientsLoaded, setAllClientsLoaded] = useState(false);
  const fetchAllClients = useCallback(async () => {
    const { data } = await supabase.from('clients').select('id, name').order('name');
    setAllClients(data || []);
    setAllClientsLoaded(true);
  }, []);

  useEffect(() => { fetchClient(); fetchDailyMetrics(); fetchCampaigns(); fetchTasks(); fetchTargets(); fetchAllClients(); }, [fetchClient, fetchDailyMetrics, fetchCampaigns, fetchTasks, fetchTargets, fetchAllClients]);

  const handleSaveTargets = async () => {
    if (!id) return;
    setSavingTargets(true);
    const payload = { client_id: id, target_cpl: targetCpl ? parseFloat(targetCpl) : null, target_ctr: targetCtr ? parseFloat(targetCtr) : null, target_leads: targetLeads ? parseInt(targetLeads) : null };
    if (targets) await supabase.from('client_targets').update(payload).eq('client_id', id);
    else await supabase.from('client_targets').insert(payload);
    setSavingTargets(false); toast.success(t('targets.saved')); fetchTargets();
  };

  const handleCreateTask = async () => {
    if (!id || !newTaskTitle.trim()) return;
    setCreatingTask(true);
    const { error } = await supabase.from('tasks').insert({ client_id: id, title: newTaskTitle.trim(), description: newTaskDesc.trim() || null, created_by: user?.id });
    setCreatingTask(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('tasks.taskCreated')); setTaskDialogOpen(false); setNewTaskTitle(''); setNewTaskDesc(''); fetchTasks();
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : task.status === 'pending' ? 'in_progress' : 'completed';
    await supabase.from('tasks').update({ status: nextStatus }).eq('id', task.id);
    toast.success(t('tasks.taskUpdated')); fetchTasks();
  };

  const toggleColumn = (key: string) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  // Admin save columns to DB (for all users)
  const handleSaveColumnsToDb = async () => {
    if (!id || !isAdmin) return;
    setSavingColumns(true);
    await supabase.from('clients').update({ visible_columns: visibleColumns as any } as any).eq('id', id);
    setSavingColumns(false);
    toast.success(t('clients.columnsSaved'));
  };

  // --- Category change ---
  const handleCategoryChange = async (newCat: string) => {
    if (!id || !isAdmin) return;
    await supabase.from('clients').update({ category: newCat, visible_columns: null } as any).eq('id', id);
    toast.success(t('clients.columnsSaved'));
    fetchClient();
  };

  // --- Drag & Drop columns ---
  const dragColRef = useRef<number | null>(null);
  const dragOverColRef = useRef<number | null>(null);

  const handleColDragStart = (idx: number) => { dragColRef.current = idx; };
  const handleColDragEnter = (idx: number) => { dragOverColRef.current = idx; };
  const handleColDragEnd = () => {
    if (dragColRef.current === null || dragOverColRef.current === null) return;
    const from = dragColRef.current;
    const to = dragOverColRef.current;
    if (from === to) { dragColRef.current = null; dragOverColRef.current = null; return; }
    const updated = [...visibleColumns];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setVisibleColumns(updated);
    dragColRef.current = null;
    dragOverColRef.current = null;
  };

  // Ordered visible column definitions
  const orderedVisibleColumns = useMemo(() =>
    visibleColumns.map(key => ALL_METRIC_COLUMNS.find(c => c.key === key)).filter(Boolean) as typeof ALL_METRIC_COLUMNS,
    [visibleColumns]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!client) return null;

  const periodOptions: { key: PeriodKey; labelKey: TranslationKey }[] = [
    { key: 'all', labelKey: 'common.all' },
    { key: 'today', labelKey: 'common.today' },
    { key: 'yesterday', labelKey: 'common.yesterday' },
    { key: 'last7', labelKey: 'dashboard.last7days' },
    { key: 'last30', labelKey: 'dashboard.last30days' },
    { key: 'last_month', labelKey: 'dashboard.lastMonth' },
    { key: 'custom', labelKey: 'common.custom' },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header with client switcher */}
      <motion.div variants={item} className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')} className="flex-shrink-0"><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><Building2 className="h-5 w-5 text-primary" /></div>
          <div className="min-w-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
                  <h1 className="text-2xl font-bold text-foreground truncate">{client.name}</h1>
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto w-[250px]">
                {allClients.map(c => (
                  <DropdownMenuItem key={c.id} onClick={() => navigate(`/clients/${c.id}`)} className={c.id === id ? 'bg-accent' : ''}>
                    <Building2 className="h-4 w-4 mr-2" />{c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className={statusStyles[client.status] || ''}>{t(`common.${client.status}` as any)}</Badge>
              {isAdmin ? (
                <Select value={client.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-6 w-auto text-xs border-border/50 bg-secondary/50 px-2 py-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey as TranslationKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className="text-xs">{t(`clients.${category === 'info_product' ? 'infoProduct' : category === 'online_business' ? 'onlineBusiness' : category === 'local_business' ? 'localBusiness' : category === 'real_estate' ? 'realEstate' : category}` as TranslationKey)}</Badge>
              )}
              <span className="text-xs text-muted-foreground">{client.timezone} · {client.currency}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Period selector */}
      <motion.div variants={item} className="flex items-center gap-2 flex-wrap">
        {periodOptions.map(p => (
          <Button key={p.key} variant={period === p.key ? 'default' : 'outline'} size="sm" onClick={() => setPeriod(p.key)} className="text-xs">
            {t(p.labelKey)}
          </Button>
        ))}
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-8 w-[140px] text-xs" />
            <span className="text-muted-foreground text-xs">→</span>
            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-8 w-[140px] text-xs" />
          </div>
        )}
      </motion.div>

      {/* KPI Cards — category-specific */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map(kpi => (
          <div key={kpi.key} className="kpi-card py-4 px-4">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item}>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" />Overview</TabsTrigger>
            <TabsTrigger value="daily" className="gap-2"><Table2 className="h-4 w-4" />Daily</TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2"><Target className="h-4 w-4" />{t('campaigns.title')}</TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2"><ListTodo className="h-4 w-4" />{t('tasks.title')}</TabsTrigger>
            {isAdmin && <TabsTrigger value="targets" className="gap-2"><TrendingUp className="h-4 w-4" />{t('targets.title')}</TabsTrigger>}
            <TabsTrigger value="reports" className="gap-2"><FileText className="h-4 w-4" />{t('nav.reports')}</TabsTrigger>
            {isAgency && <TabsTrigger value="connections" className="gap-2"><Link2 className="h-4 w-4" />Connections</TabsTrigger>}
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="glass-card lg:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t('dashboard.performance')}</CardTitle>
                    <div className="flex items-center gap-2">
                      {chartMetrics.map(m => (
                        <div key={m.key} className="flex items-center gap-1.5 text-xs">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                          {t(ALL_METRIC_COLUMNS.find(c => c.key === m.key)?.labelKey as TranslationKey || 'common.noData')}
                        </div>
                      ))}
                      <div className="flex bg-secondary/50 rounded-md p-0.5 ml-2">
                        <Button variant="ghost" size="sm" onClick={() => setChartNormalized(false)}
                          className={`h-6 px-2 text-[10px] rounded-sm ${!chartNormalized ? 'bg-primary text-primary-foreground' : ''}`}>
                          {t('dashboard.absolute')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setChartNormalized(true)}
                          className={`h-6 px-2 text-[10px] rounded-sm ${chartNormalized ? 'bg-primary text-primary-foreground' : ''}`}>
                          {t('dashboard.normalized')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {chartData.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t('common.noData')}</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            {chartMetrics.map(m => (
                              <linearGradient key={m.gradientId} id={m.gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={m.color} stopOpacity={0.3} /><stop offset="95%" stopColor={m.color} stopOpacity={0} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 20%, 14%)" strokeOpacity={0.5} />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(220, 15%, 55%)' }} stroke="hsl(225, 20%, 14%)" />
                          <YAxis tick={{ fontSize: 11, fill: 'hsl(220, 15%, 55%)' }} stroke="hsl(225, 20%, 14%)" />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(225, 30%, 9%)', border: '1px solid hsl(225, 20%, 14%)', borderRadius: '8px', fontSize: '12px', color: 'hsl(40, 20%, 90%)' }} />
                          {chartMetrics.map(m => (
                            <Area key={m.key} type="monotone" dataKey={m.key} stroke={m.color} fill={`url(#${m.gradientId})`} strokeWidth={2} />
                          ))}
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardHeader className="pb-2"><CardTitle className="text-base">{t('dashboard.spendByPlatform')}</CardTitle></CardHeader>
                <CardContent><div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">{t('common.noData')}</div></CardContent>
              </Card>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Clock className="h-3.5 w-3.5" /><span>{t('dashboard.lastUpdated')}: {new Date().toLocaleDateString()}</span>
            </div>
          </TabsContent>

          {/* DAILY TABLE TAB */}
          <TabsContent value="daily" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Daily Report</h3>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={handleSaveColumnsToDb} disabled={savingColumns} className="gap-2 text-xs">
                    {savingColumns ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {t('common.save')}
                  </Button>
                )}
                <Popover>
                  <PopoverTrigger asChild><Button variant="outline" size="sm" className="gap-2"><Settings2 className="h-4 w-4" />{t('clients.manageColumns')}</Button></PopoverTrigger>
                  <PopoverContent className="w-72 p-3" align="end">
                    <p className="text-sm font-semibold mb-2">{t('clients.manageColumns')}</p>
                    <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
                      {ALL_METRIC_COLUMNS.map(col => (
                        <div key={col.key} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-secondary/50">
                          <Checkbox checked={visibleColumns.includes(col.key)} onCheckedChange={() => toggleColumn(col.key)} id={`col-${col.key}`} />
                          <label htmlFor={`col-${col.key}`} className="flex-1 text-xs cursor-pointer">{t(col.labelKey as TranslationKey)}</label>
                          <Badge variant="outline" className="text-[9px] px-1">{col.group}</Badge>
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="w-full mt-2 text-xs"
                      onClick={() => setVisibleColumns(CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.other)}>
                      Reset to {t(`clients.${category === 'info_product' ? 'infoProduct' : category === 'online_business' ? 'onlineBusiness' : category === 'local_business' ? 'localBusiness' : category === 'real_estate' ? 'realEstate' : category}` as TranslationKey)} defaults
                    </Button>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="spreadsheet-table">
                    <thead><tr>{orderedVisibleColumns.map((col, idx) => (
                      <th key={col.key} className={`${col.right ? 'text-right' : ''} cursor-grab select-none`}
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
                    ))}</tr></thead>
                    <tbody>
                      {dailyTableData.length === 0 ? (
                        <tr><td colSpan={orderedVisibleColumns.length} className="text-center py-6 text-muted-foreground">{t('common.noData')}</td></tr>
                      ) : (
                        <>
                          {dailyTableData.map(row => (
                            <tr key={row.date}>{orderedVisibleColumns.map(col => (
                              <td key={col.key} className={col.right ? 'text-right' : col.key === 'date' ? 'text-foreground font-medium whitespace-nowrap' : 'text-muted-foreground'}>
                                {col.key === 'date' ? row.date : formatMetricValue(col.key, (row as any)[col.key] || 0, formatCurrency, formatNumber)}
                              </td>
                            ))}</tr>
                          ))}
                          <tr className="totals-row">{orderedVisibleColumns.map(col => (
                            <td key={col.key} className={`${col.right ? 'text-right' : ''} text-foreground font-bold`}>
                              {col.key === 'date' ? 'TOTAL' : formatMetricValue(col.key, (totals as any)[col.key] || 0, formatCurrency, formatNumber)}
                            </td>
                          ))}</tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CAMPAIGNS TAB */}
          <TabsContent value="campaigns" className="space-y-4">
            {campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Target className="h-10 w-10 text-muted-foreground mb-3" /><p className="font-medium text-foreground">{t('campaigns.noCampaigns')}</p><p className="text-sm text-muted-foreground mt-1">{t('campaigns.noCampaignsDesc')}</p>
              </div>
            ) : (
              <Card className="glass-card overflow-hidden"><CardContent className="p-0"><div className="overflow-x-auto"><table className="spreadsheet-table">
                <thead><tr><th>Campaign</th><th>{t('common.status')}</th><th>Platform ID</th></tr></thead>
                <tbody>{campaigns.map(c => (
                  <tr key={c.id}><td className="text-foreground font-medium font-sans">{c.campaign_name}</td><td><Badge variant="outline" className={statusStyles[c.status] || ''}>{c.status}</Badge></td><td className="text-muted-foreground text-xs">{c.platform_campaign_id}</td></tr>
                ))}</tbody>
              </table></div></CardContent></Card>
            )}
          </TabsContent>

          {/* TASKS TAB */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t('tasks.title')}</h3>
              {isAgency && (
                <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                  <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" />{t('tasks.addTask')}</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{t('tasks.addTask')}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2"><Label>{t('common.title')} *</Label><Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Task title" /></div>
                      <div className="space-y-2"><Label>{t('common.description')}</Label><Input value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} placeholder="Optional description" /></div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
                      <Button onClick={handleCreateTask} disabled={creatingTask}>{creatingTask ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{t('common.create')}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ListTodo className="h-10 w-10 text-muted-foreground mb-3" /><p className="font-medium text-foreground">{t('tasks.noTasks')}</p><p className="text-sm text-muted-foreground mt-1">{t('tasks.noTasksDesc')}</p>
              </div>
            ) : (
              <div className="space-y-2">{tasks.map(task => (
                <Card key={task.id} className="glass-card"><CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleToggleTaskStatus(task)} className="flex-shrink-0">
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'completed' ? 'bg-success border-success' : task.status === 'in_progress' ? 'border-info' : 'border-muted-foreground/30'}`}>
                        {task.status === 'completed' && <span className="text-white text-xs">✓</span>}
                      </div>
                    </button>
                    <div><p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.due_date && <span className="text-xs text-muted-foreground">{task.due_date}</span>}
                    <Badge variant="outline" className={statusStyles[task.status] || ''}>{task.status === 'pending' ? t('common.pending') : task.status === 'in_progress' ? t('common.inProgress') : t('common.completed')}</Badge>
                  </div>
                </CardContent></Card>
              ))}</div>
            )}
          </TabsContent>

          {/* TARGETS TAB */}
          {isAdmin && (
            <TabsContent value="targets" className="space-y-4">
              <Card className="glass-card max-w-lg">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-5 w-5 text-primary" />{t('targets.title')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>{t('targets.cpl')} ($)</Label><Input type="number" step="0.01" value={targetCpl} onChange={(e) => setTargetCpl(e.target.value)} placeholder="e.g. 50.00" /></div>
                  <div className="space-y-2"><Label>{t('targets.ctr')} (%)</Label><Input type="number" step="0.01" value={targetCtr} onChange={(e) => setTargetCtr(e.target.value)} placeholder="e.g. 1.50" /></div>
                  <div className="space-y-2"><Label>{t('targets.leads')}</Label><Input type="number" value={targetLeads} onChange={(e) => setTargetLeads(e.target.value)} placeholder="e.g. 100" /></div>
                  <Button onClick={handleSaveTargets} disabled={savingTargets}>{savingTargets ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{t('common.save')}</Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* REPORTS TAB */}
          <TabsContent value="reports" className="space-y-4">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium text-foreground">{t('nav.reports')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('reports.subtitle')}</p>
              <Button className="mt-4 gap-2" onClick={() => navigate('/reports')}><FileText className="h-4 w-4" />{t('reports.createReport')}</Button>
            </div>
          </TabsContent>

          {/* CONNECTIONS TAB */}
          {isAgency && (
            <TabsContent value="connections"><GoogleSheetConnection clientId={id!} isAdmin={isAdmin} /></TabsContent>
          )}
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
