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
import ConversionFunnel from '@/components/client/ConversionFunnel';
import ClientComments from '@/components/client/ClientComments';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
import { format, subDays } from 'date-fns';
import {
  ALL_METRIC_COLUMNS, CATEGORY_DEFAULTS, CATEGORY_KPIS, CATEGORY_CHART_METRICS, CATEGORY_OPTIONS,
  toClientCategory, computeDailyRow, formatMetricValue,
  type ClientCategory,
} from '@/components/dashboard/categoryMetrics';
import type { TranslationKey } from '@/i18n/translations';
import type { DateRange, Comparison, PlatformFilter } from '@/components/dashboard/dashboardData';

interface ClientData {
  id: string; name: string; status: string; currency: string; timezone: string;
  notes: string | null; category: string; visible_columns: string[] | null;
  google_sheet_url: string | null; meta_sheet_url: string | null; tiktok_sheet_url: string | null;
}
type PlatformKey = 'all' | 'meta' | 'google' | 'tiktok';
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

// Platform Sheet Connection sub-component
function PlatformSheetRow({ clientId, platform, label, fieldName, isAdmin }: { clientId: string; platform: string; label: string; fieldName: string; isAdmin: boolean }) {
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
      if (res.error) { setLastResult(`Error: ${res.error.message}`); }
      else { const d = res.data as any; setLastResult(`${d.rows_synced || 0} ${t('clients.rowsSynced')}`); }
    } catch (err: any) { setLastResult(`Error: ${err.message}`); }
    setSyncing(false);
  };

  return (
    <div className="rounded-lg border border-border/50 p-3 sm:p-4 space-y-2 sm:space-y-3">
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

function GoogleSheetConnection({ clientId, isAdmin }: { clientId: string; isAdmin: boolean }) {
  const { t } = useLanguage();
  const [autoSync, setAutoSync] = useState(false);

  useEffect(() => {
    supabase.from('clients').select('auto_sync_enabled').eq('id', clientId).single().then(({ data }) => {
      if (data?.auto_sync_enabled) setAutoSync(data.auto_sync_enabled);
    });
  }, [clientId]);

  const handleToggleAutoSync = async (enabled: boolean) => {
    setAutoSync(enabled);
    await supabase.from('clients').update({ auto_sync_enabled: enabled } as any).eq('id', clientId);
    toast.success(enabled ? t('clients.autoSyncEnabled') : t('clients.autoSyncDisabled'));
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card max-w-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sheet className="h-5 w-5 text-primary" />{t('dashboard.dataSources')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('clients.syncSheetDesc')}</p>
          
          <PlatformSheetRow clientId={clientId} platform="meta" label="Meta Ads" fieldName="meta_sheet_url" isAdmin={isAdmin} />
          <PlatformSheetRow clientId={clientId} platform="google" label="Google Ads" fieldName="google_sheet_url" isAdmin={isAdmin} />
          <PlatformSheetRow clientId={clientId} platform="tiktok" label="TikTok Ads" fieldName="tiktok_sheet_url" isAdmin={isAdmin} />

          <div className="flex items-center justify-between rounded-lg border border-border p-3 sm:p-4">
            <div className="min-w-0 flex-1 mr-3"><p className="text-sm font-medium">{t('clients.autoSync')}</p><p className="text-xs text-muted-foreground">{t('clients.autoSyncDesc')}</p></div>
            <Switch checked={autoSync} onCheckedChange={handleToggleAutoSync} className="flex-shrink-0" />
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
  const [platformFilter, setPlatformFilter] = useState<PlatformKey>('all');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [savingColumns, setSavingColumns] = useState(false);

  // Unified DateRangePicker state
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [comparison, setComparison] = useState<Comparison>('none');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [compareEnabled, setCompareEnabled] = useState(false);

  // Chart normalization
  const [chartNormalized, setChartNormalized] = useState(true);

  const isAgency = agencyRole === 'AgencyAdmin' || agencyRole === 'MediaBuyer';
  const isAdmin = agencyRole === 'AgencyAdmin';

  const category: ClientCategory = useMemo(() => toClientCategory(client?.category), [client?.category]);

  // Visible columns
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

  // Date filtering from DateRangePicker
  const filteredMetrics = useMemo(() => {
    if (!customDateRange) return dailyMetrics;
    const from = format(customDateRange.from, 'yyyy-MM-dd');
    const to = format(customDateRange.to, 'yyyy-MM-dd');
    return dailyMetrics.filter(m => m.date >= from && m.date <= to);
  }, [dailyMetrics, customDateRange]);

  // Compute daily table rows
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

  // Chart data
  const chartMetrics = CATEGORY_CHART_METRICS[category] || CATEGORY_CHART_METRICS.other;
  const chartData = useMemo(() => {
    const raw = dailyTableData.map(r => {
      const point: Record<string, any> = { date: r.date.slice(5) };
      chartMetrics.forEach(m => { point[m.key] = (r as any)[m.key] || 0; point[`_raw_${m.key}`] = (r as any)[m.key] || 0; });
      return point;
    });
    if (chartNormalized && raw.length > 0) {
      const first = raw[0];
      return raw.map(d => {
        const norm: Record<string, any> = { date: d.date };
        chartMetrics.forEach(m => {
          const base = first[m.key] as number;
          norm[m.key] = base > 0 ? Math.round((d[m.key] as number) / base * 100) : 0;
          norm[`_raw_${m.key}`] = d[`_raw_${m.key}`];
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
    const { data, error } = await supabase.from('clients').select('id, name, status, currency, timezone, notes, category, visible_columns, google_sheet_url, meta_sheet_url, tiktok_sheet_url').eq('id', id).single();
    if (error || !data) { navigate('/clients'); return; }
    setClient({
      ...data,
      google_sheet_url: (data as any).google_sheet_url || null,
      meta_sheet_url: (data as any).meta_sheet_url || null,
      tiktok_sheet_url: (data as any).tiktok_sheet_url || null,
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

  // Set default date range on mount
  useEffect(() => {
    setCustomDateRange({ from: subDays(new Date(), 29), to: new Date() });
  }, []);

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

  const handleSaveColumnsToDb = async () => {
    if (!id || !isAdmin) return;
    setSavingColumns(true);
    await supabase.from('clients').update({ visible_columns: visibleColumns as any } as any).eq('id', id);
    setSavingColumns(false);
    toast.success(t('clients.columnsSaved'));
  };

  const [pendingCategory, setPendingCategory] = useState<string | null>(null);

  const handleCategoryChange = (newCat: string) => {
    if (!id || !isAdmin || newCat === client?.category) return;
    setPendingCategory(newCat);
  };

  const confirmCategoryChange = async () => {
    if (!id || !pendingCategory) return;
    await supabase.from('clients').update({ category: pendingCategory, visible_columns: null } as any).eq('id', id);
    toast.success(t('clients.columnsSaved'));
    setPendingCategory(null);
    fetchClient();
  };

  // Drag & Drop columns
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

  const orderedVisibleColumns = useMemo(() =>
    visibleColumns.map(key => ALL_METRIC_COLUMNS.find(c => c.key === key)).filter(Boolean) as typeof ALL_METRIC_COLUMNS,
    [visibleColumns]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!client) return null;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 sm:space-y-6">
      {/* Header with client switcher */}
      <motion.div variants={item} className="flex items-start sm:items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')} className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10"><ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
        <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0"><Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /></div>
          <div className="min-w-0 flex-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 sm:gap-2 text-left hover:opacity-80 transition-opacity max-w-full">
                  <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">{client.name}</h1>
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
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
            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
              <Badge variant="outline" className={`text-[10px] sm:text-xs ${statusStyles[client.status] || ''}`}>{t(`common.${client.status}` as any)}</Badge>
              {isAdmin ? (
                <Select value={client.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-5 sm:h-6 w-auto text-[10px] sm:text-xs border-border/50 bg-secondary/50 px-1.5 sm:px-2 py-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey as TranslationKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className="text-[10px] sm:text-xs">{t(`clients.${category === 'info_product' ? 'infoProduct' : category === 'online_business' ? 'onlineBusiness' : category === 'local_business' ? 'localBusiness' : category === 'real_estate' ? 'realEstate' : category}` as TranslationKey)}</Badge>
              )}
              <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">{client.timezone} · {client.currency}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Unified DateRangePicker + Platform filter */}
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
          {(['all', 'meta', 'google', 'tiktok'] as PlatformKey[]).map(p => (
            <Button key={p} variant={platformFilter === p ? 'default' : 'ghost'} size="sm" onClick={() => setPlatformFilter(p)} className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0">
              {p === 'all' ? t('dashboard.allPlatforms') : p === 'meta' ? 'Meta' : p === 'google' ? 'Google' : 'TikTok'}
            </Button>
          ))}
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

      {/* Tabs */}
      <motion.div variants={item}>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full overflow-x-auto scrollbar-none justify-start h-auto flex-nowrap p-1">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm flex-shrink-0"><BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span>{t('dashboard.overview')}</span></TabsTrigger>
            <TabsTrigger value="daily" className="gap-1.5 text-xs sm:text-sm flex-shrink-0"><Table2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />{t('dashboard.daily')}</TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-1.5 text-xs sm:text-sm flex-shrink-0"><Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden sm:inline">{t('campaigns.title')}</span><span className="sm:hidden">Camps</span></TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5 text-xs sm:text-sm flex-shrink-0"><ListTodo className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden sm:inline">{t('tasks.title')}</span><span className="sm:hidden">{t('tasks.title')}</span></TabsTrigger>
            {isAdmin && <TabsTrigger value="targets" className="gap-1.5 text-xs sm:text-sm flex-shrink-0"><TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden sm:inline">{t('targets.title')}</span><span className="sm:hidden">Targets</span></TabsTrigger>}
            <TabsTrigger value="reports" className="gap-1.5 text-xs sm:text-sm flex-shrink-0"><FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden sm:inline">{t('nav.reports')}</span><span className="sm:hidden">{t('nav.reports')}</span></TabsTrigger>
            {isAgency && <TabsTrigger value="connections" className="gap-1.5 text-xs sm:text-sm flex-shrink-0"><Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden sm:inline">{t('clients.connections')}</span><span className="sm:hidden">Conn</span></TabsTrigger>}
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              <Card className="glass-card lg:col-span-2">
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <CardTitle className="text-sm sm:text-base">{t('dashboard.performance')}</CardTitle>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
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
                <CardContent className="px-2 sm:px-6">
                  <div className="h-[220px] sm:h-[300px]">
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
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(220, 15%, 55%)' }} stroke="hsl(225, 20%, 14%)" interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 9, fill: 'hsl(220, 15%, 55%)' }} stroke="hsl(225, 20%, 14%)" width={35} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(225, 30%, 9%)', border: '1px solid hsl(225, 20%, 14%)', borderRadius: '8px', fontSize: '12px', color: 'hsl(40, 20%, 90%)' }}
                            formatter={(value: number, name: string, props: any) => {
                              const rawKey = `_raw_${name}`;
                              const rawVal = props.payload?.[rawKey];
                              const displayVal = chartNormalized && rawVal !== undefined ? rawVal : value;
                              const formatted = typeof displayVal === 'number' ? (displayVal % 1 === 0 ? displayVal.toLocaleString() : displayVal.toFixed(2)) : displayVal;
                              return [formatted, name];
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
                  <CardHeader className="pb-2"><CardTitle className="text-base">{t('dashboard.spendByPlatform')}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(['meta', 'google', 'tiktok'] as const).map(p => {
                        const hasSheet = p === 'meta' ? !!client.meta_sheet_url : p === 'google' ? !!client.google_sheet_url : !!client.tiktok_sheet_url;
                        return (
                          <div key={p} className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-secondary/20">
                            <span className="text-xs font-medium">{p === 'meta' ? 'Meta Ads' : p === 'google' ? 'Google Ads' : 'TikTok Ads'}</span>
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
            <ClientComments clientId={id!} />
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Clock className="h-3.5 w-3.5" /><span>{t('dashboard.lastUpdated')}: {new Date().toLocaleDateString()}</span>
            </div>
          </TabsContent>

          {/* DAILY TABLE TAB */}
          <TabsContent value="daily" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h3 className="text-base sm:text-lg font-semibold">{t('dashboard.dailyReport')}</h3>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={handleSaveColumnsToDb} disabled={savingColumns} className="gap-1.5 text-[10px] sm:text-xs h-7 sm:h-8">
                    {savingColumns ? <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" /> : <Save className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                    {t('common.save')}
                  </Button>
                )}
                <Popover>
                  <PopoverTrigger asChild><Button variant="outline" size="sm" className="gap-1.5 text-[10px] sm:text-xs h-7 sm:h-8"><Settings2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden sm:inline">{t('clients.manageColumns')}</span><span className="sm:hidden">Columns</span></Button></PopoverTrigger>
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
                      {t('dashboard.resetDefaults')}
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
                <thead><tr><th>{t('campaigns.title')}</th><th>{t('common.status')}</th><th>Platform ID</th></tr></thead>
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
                      <div className="space-y-2"><Label>{t('common.title')} *</Label><Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder={t('common.title')} /></div>
                      <div className="space-y-2"><Label>{t('common.description')}</Label><Input value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} placeholder={t('common.description')} /></div>
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
                <Card key={task.id} className="glass-card"><CardContent className="py-3 px-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => handleToggleTaskStatus(task)} className="flex-shrink-0">
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'completed' ? 'bg-success border-success' : task.status === 'in_progress' ? 'border-info' : 'border-muted-foreground/30'}`}>
                        {task.status === 'completed' && <span className="text-white text-xs">✓</span>}
                      </div>
                    </button>
                    <div className="min-w-0"><p className={`text-sm font-medium truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-8 sm:ml-0">
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
            <TabsContent value="connections">
              <GoogleSheetConnection clientId={id!} isAdmin={isAdmin} />
            </TabsContent>
          )}
        </Tabs>
      </motion.div>
      {/* Category change confirmation */}
      <AlertDialog open={!!pendingCategory} onOpenChange={(open) => !open && setPendingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.changeCategoryTitle' as TranslationKey)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clients.changeCategoryDesc' as TranslationKey)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel' as TranslationKey)}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCategoryChange}>{t('common.confirm' as TranslationKey)}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
