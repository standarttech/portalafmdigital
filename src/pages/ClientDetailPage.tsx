import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, DollarSign, MousePointerClick, Users, Eye, TrendingUp,
  BarChart3, FileText, Table2, Link2, ListTodo, Clock, Target, Plus, Loader2,
  Sheet, RefreshCw, Settings2, ChevronDown,
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

interface ClientData { id: string; name: string; status: string; currency: string; timezone: string; notes: string | null; }
interface Campaign { id: string; campaign_name: string; status: string; platform_campaign_id: string; }
interface Task { id: string; title: string; description: string | null; status: string; due_date: string | null; created_at: string; }
interface ClientTarget { target_cpl: number | null; target_ctr: number | null; target_leads: number | null; target_roas: number | null; }
interface DailyRow { date: string; spend: number; impressions: number; link_clicks: number; leads: number; campaign_id: string; }
interface ClientListItem { id: string; name: string; }

const statusStyles: Record<string, string> = {
  active: 'bg-success/15 text-success border-success/20', paused: 'bg-warning/15 text-warning border-warning/20',
  inactive: 'bg-muted text-muted-foreground border-border', archived: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-warning/15 text-warning border-warning/20', in_progress: 'bg-info/15 text-info border-info/20',
  completed: 'bg-success/15 text-success border-success/20',
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface ColumnDef { key: string; label: string; right?: boolean; format: (row: any, totals: any, fc: any, fn: any) => string; }

function getColumnDefs(t: any): ColumnDef[] {
  return [
    { key: 'date', label: 'Date', format: (r) => r.date },
    { key: 'spend', label: t('dashboard.spend'), right: true, format: (r, _, fc) => fc(r.spend) },
    { key: 'impressions', label: t('dashboard.totalImpressions'), right: true, format: (r, _, __, fn) => fn(r.impressions) },
    { key: 'reach', label: 'Reach', right: true, format: (r, _, __, fn) => fn(r.reach) },
    { key: 'clicks', label: t('dashboard.totalClicks'), right: true, format: (r, _, __, fn) => fn(r.clicks) },
    { key: 'cpc', label: 'CPC', right: true, format: (r, _, fc) => fc(r.cpc) },
    { key: 'cpm', label: 'CPM', right: true, format: (r, _, fc) => fc(r.cpm) },
    { key: 'ctr', label: t('dashboard.ctr'), right: true, format: (r) => `${r.ctr.toFixed(2)}%` },
    { key: 'leadFormCv', label: 'Lead CV', right: true, format: (r) => `${r.leadFormCv.toFixed(2)}%` },
    { key: 'leads', label: t('dashboard.leads'), right: true, format: (r, _, __, fn) => fn(r.leads) },
    { key: 'cpl', label: t('dashboard.cpl'), right: true, format: (r, _, fc) => fc(r.cpl) },
  ];
}

const DEFAULT_VISIBLE_COLUMNS = ['date', 'spend', 'impressions', 'clicks', 'cpc', 'ctr', 'leads', 'cpl'];

type PeriodKey = 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'custom' | 'all';

function getDateRange(period: PeriodKey): { from: string; to: string } | null {
  const today = new Date();
  switch (period) {
    case 'today': return { from: format(today, 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') };
    case 'yesterday': { const y = subDays(today, 1); return { from: format(y, 'yyyy-MM-dd'), to: format(y, 'yyyy-MM-dd') }; }
    case 'week': return { from: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
    case 'month': return { from: format(startOfMonth(today), 'yyyy-MM-dd'), to: format(endOfMonth(today), 'yyyy-MM-dd') };
    case 'last_month': { const lm = subMonths(today, 1); return { from: format(startOfMonth(lm), 'yyyy-MM-dd'), to: format(endOfMonth(lm), 'yyyy-MM-dd') }; }
    default: return null;
  }
}

// Google Sheet Connection sub-component (kept as-is)
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
          <div className="rounded-lg bg-secondary/30 p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-sm mb-2">Expected format (first row = headers):</p>
            <p>Date | UTM | Spend | Reach | Click | Leads</p>
            <p>09.01.2026 | afm_digital | $104.83 | 3194 | 34 | 4</p>
          </div>
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

  // Date period
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Column manager
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem(`daily-cols-${id}`);
    return saved ? JSON.parse(saved) : DEFAULT_VISIBLE_COLUMNS;
  });
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(`daily-col-order-${id}`);
    return saved ? JSON.parse(saved) : getColumnDefs(t).map(c => c.key);
  });

  // Task creation
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  const isAgency = agencyRole === 'AgencyAdmin' || agencyRole === 'MediaBuyer';
  const isAdmin = agencyRole === 'AgencyAdmin';
  const allColumns = useMemo(() => getColumnDefs(t), [t]);

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

  // Compute daily table rows
  const dailyTableData = useMemo(() => {
    const byDate: Record<string, { spend: number; impressions: number; clicks: number; leads: number }> = {};
    filteredMetrics.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = { spend: 0, impressions: 0, clicks: 0, leads: 0 };
      byDate[r.date].spend += Number(r.spend);
      byDate[r.date].impressions += r.impressions;
      byDate[r.date].clicks += r.link_clicks;
      byDate[r.date].leads += r.leads;
    });
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({
      date, spend: Math.round(v.spend * 100) / 100, impressions: v.impressions,
      reach: Math.round(v.impressions * 0.85), clicks: v.clicks,
      cpc: v.clicks > 0 ? Math.round((v.spend / v.clicks) * 100) / 100 : 0,
      cpm: v.impressions > 0 ? Math.round((v.spend / (v.impressions / 1000)) * 100) / 100 : 0,
      ctr: v.impressions > 0 ? Math.round((v.clicks / v.impressions) * 10000) / 100 : 0,
      leadFormCv: v.clicks > 0 ? Math.round((v.leads / v.clicks) * 10000) / 100 : 0,
      leads: v.leads, cpl: v.leads > 0 ? Math.round((v.spend / v.leads) * 100) / 100 : 0,
    }));
  }, [filteredMetrics]);

  const totals = useMemo(() => dailyTableData.reduce((acc, row) => ({
    spend: acc.spend + row.spend, reach: acc.reach + row.reach,
    impressions: acc.impressions + row.impressions, clicks: acc.clicks + row.clicks, leads: acc.leads + row.leads,
  }), { spend: 0, reach: 0, impressions: 0, clicks: 0, leads: 0 }), [dailyTableData]);

  const totalCpl = totals.leads > 0 ? totals.spend / totals.leads : 0;
  const totalCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

  const chartData = useMemo(() => dailyTableData.map(r => ({ date: r.date.slice(5), spend: r.spend, leads: r.leads, clicks: r.clicks })), [dailyTableData]);

  const fetchClient = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase.from('clients').select('id, name, status, currency, timezone, notes').eq('id', id).single();
    if (error || !data) { navigate('/clients'); return; }
    setClient(data); setLoading(false);
  }, [id, navigate]);

  const fetchDailyMetrics = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from('daily_metrics').select('date, spend, impressions, link_clicks, leads, campaign_id').eq('client_id', id).order('date', { ascending: true });
    if (data) setDailyMetrics(data);
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
    const { data } = await supabase.from('client_targets').select('target_cpl, target_ctr, target_leads, target_roas').eq('client_id', id).maybeSingle();
    if (data) { setTargets(data); setTargetCpl(data.target_cpl?.toString() || ''); setTargetCtr(data.target_ctr?.toString() || ''); setTargetLeads(data.target_leads?.toString() || ''); }
  }, [id]);

  const fetchAllClients = useCallback(async () => {
    const { data } = await supabase.from('clients').select('id, name').order('name');
    setAllClients(data || []);
  }, []);

  useEffect(() => { fetchClient(); fetchDailyMetrics(); fetchCampaigns(); fetchTasks(); fetchTargets(); fetchAllClients(); }, [fetchClient, fetchDailyMetrics, fetchCampaigns, fetchTasks, fetchTargets, fetchAllClients]);

  useEffect(() => { if (id) { localStorage.setItem(`daily-cols-${id}`, JSON.stringify(visibleColumns)); localStorage.setItem(`daily-col-order-${id}`, JSON.stringify(columnOrder)); } }, [visibleColumns, columnOrder, id]);

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
  const moveColumn = (key: string, direction: 'up' | 'down') => {
    setColumnOrder(prev => {
      const idx = prev.indexOf(key); if (idx === -1) return prev;
      const newIdx = direction === 'up' ? Math.max(0, idx - 1) : Math.min(prev.length - 1, idx + 1);
      const next = [...prev]; [next[idx], next[newIdx]] = [next[newIdx], next[idx]]; return next;
    });
  };

  const orderedVisibleColumns = useMemo(() =>
    columnOrder.filter(key => visibleColumns.includes(key)).map(key => allColumns.find(c => c.key === key)!).filter(Boolean),
    [columnOrder, visibleColumns, allColumns]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!client) return null;

  const kpis = [
    { label: t('dashboard.totalSpend'), value: formatCurrency(totals.spend), icon: DollarSign },
    { label: t('dashboard.totalLeads'), value: formatNumber(totals.leads), icon: Users },
    { label: t('dashboard.totalClicks'), value: formatNumber(totals.clicks), icon: MousePointerClick },
    { label: t('dashboard.totalImpressions'), value: formatNumber(totals.impressions), icon: Eye },
    { label: t('dashboard.costPerLead'), value: formatCurrency(totalCpl), icon: TrendingUp },
    { label: t('dashboard.ctr'), value: `${totalCtr.toFixed(2)}%`, icon: BarChart3 },
  ];

  const periodOptions: { key: PeriodKey; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'today', label: t('common.today') },
    { key: 'yesterday', label: t('common.yesterday') },
    { key: 'week', label: t('common.week') },
    { key: 'month', label: t('common.month') },
    { key: 'last_month', label: t('dashboard.vsPreviousMonth') },
    { key: 'custom', label: t('common.custom') },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header with client switcher */}
      <motion.div variants={item} className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')} className="flex-shrink-0"><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><Building2 className="h-5 w-5 text-primary" /></div>
          <div className="min-w-0">
            {/* Client switcher dropdown */}
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
              <span className="text-xs text-muted-foreground">{client.timezone} · {client.currency}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Period selector */}
      <motion.div variants={item} className="flex items-center gap-2 flex-wrap">
        {periodOptions.map(p => (
          <Button key={p.key} variant={period === p.key ? 'default' : 'outline'} size="sm" onClick={() => setPeriod(p.key)} className="text-xs">
            {p.label}
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

      {/* KPI Cards */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="kpi-card py-4 px-4">
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
                <CardHeader className="pb-2"><CardTitle className="text-base">{t('dashboard.performance')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {chartData.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t('common.noData')}</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="clientSpendGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(42, 87%, 55%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(42, 87%, 55%)" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="clientLeadsGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(225, 20%, 14%)" strokeOpacity={0.5} />
                          <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'hsl(220, 15%, 55%)' }} stroke="hsl(225, 20%, 14%)" />
                          <YAxis tick={{ fontSize: 12, fill: 'hsl(220, 15%, 55%)' }} stroke="hsl(225, 20%, 14%)" />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(225, 30%, 9%)', border: '1px solid hsl(225, 20%, 14%)', borderRadius: '8px', fontSize: '12px', color: 'hsl(40, 20%, 90%)' }} />
                          <Area type="monotone" dataKey="spend" stroke="hsl(42, 87%, 55%)" fill="url(#clientSpendGrad)" strokeWidth={2} name="Spend ($)" />
                          <Area type="monotone" dataKey="leads" stroke="hsl(160, 84%, 39%)" fill="url(#clientLeadsGrad)" strokeWidth={2} name="Leads" />
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
              <Popover>
                <PopoverTrigger asChild><Button variant="outline" size="sm" className="gap-2"><Settings2 className="h-4 w-4" />Columns</Button></PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="end">
                  <p className="text-sm font-semibold mb-2">Manage Columns</p>
                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {columnOrder.map(key => {
                      const col = allColumns.find(c => c.key === key);
                      if (!col) return null;
                      return (
                        <div key={key} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-secondary/50">
                          <Checkbox checked={visibleColumns.includes(key)} onCheckedChange={() => toggleColumn(key)} id={`col-${key}`} />
                          <label htmlFor={`col-${key}`} className="flex-1 text-xs cursor-pointer">{col.label}</label>
                          <div className="flex gap-0.5">
                            <button onClick={() => moveColumn(key, 'up')} className="text-muted-foreground hover:text-foreground p-0.5"><span className="text-[10px]">▲</span></button>
                            <button onClick={() => moveColumn(key, 'down')} className="text-muted-foreground hover:text-foreground p-0.5"><span className="text-[10px]">▼</span></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-xs"
                    onClick={() => { setVisibleColumns(DEFAULT_VISIBLE_COLUMNS); setColumnOrder(allColumns.map(c => c.key)); }}>Reset to default</Button>
                </PopoverContent>
              </Popover>
            </div>
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="spreadsheet-table">
                    <thead><tr>{orderedVisibleColumns.map(col => <th key={col.key} className={col.right ? 'text-right' : ''}>{col.label}</th>)}</tr></thead>
                    <tbody>
                      {dailyTableData.length === 0 ? (
                        <tr><td colSpan={orderedVisibleColumns.length} className="text-center py-6 text-muted-foreground">{t('common.noData')}</td></tr>
                      ) : (
                        <>
                          {dailyTableData.map(row => (
                            <tr key={row.date}>{orderedVisibleColumns.map(col => (
                              <td key={col.key} className={col.right ? 'text-right' : col.key === 'date' ? 'text-foreground font-medium whitespace-nowrap' : 'text-muted-foreground'}>
                                {col.format(row, totals, formatCurrency, formatNumber)}
                              </td>
                            ))}</tr>
                          ))}
                          <tr className="totals-row">{orderedVisibleColumns.map(col => {
                            if (col.key === 'date') return <td key={col.key} className="text-foreground font-bold">TOTAL</td>;
                            const totalRow = { spend: totals.spend, impressions: totals.impressions, reach: totals.reach, clicks: totals.clicks, leads: totals.leads,
                              cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0, cpm: totals.impressions > 0 ? totals.spend / (totals.impressions / 1000) : 0,
                              ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0, leadFormCv: totals.clicks > 0 ? (totals.leads / totals.clicks) * 100 : 0,
                              cpl: totalCpl, date: 'TOTAL' };
                            return <td key={col.key} className={`${col.right ? 'text-right' : ''} text-foreground font-bold`}>{col.format(totalRow, totals, formatCurrency, formatNumber)}</td>;
                          })}</tr>
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

          {/* REPORTS TAB - placeholder link */}
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
