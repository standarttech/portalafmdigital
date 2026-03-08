import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, DollarSign, MousePointerClick, Users, Eye, TrendingUp,
  BarChart3, FileText, Table2, Link2, ListTodo, Clock, Target, Plus, Loader2,
  Sheet, RefreshCw, Settings2, ChevronDown, ShoppingBag, ShoppingCart, CreditCard,
  Save, GripVertical, Wallet, History, CalendarClock, CheckCircle2,
  AlertCircle, Zap, Play, PauseCircle, XCircle, MessageSquare, Edit2,
} from 'lucide-react';
import ConversionFunnel from '@/components/client/ConversionFunnel';
import ClientComments from '@/components/client/ClientComments';
import ClientWebhooks from '@/components/client/ClientWebhooks';
import ClientInfoTab from '@/components/client/ClientInfoTab';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import { MetricTooltip } from '@/components/shared/MetricTooltip';
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
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, subDays, formatDistanceToNow } from 'date-fns';
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
interface Campaign { id: string; campaign_name: string; status: string; platform_campaign_id: string; platform?: string; }
interface Task { id: string; title: string; description: string | null; status: string; due_date: string | null; created_at: string; assigned_to: string | null; assignee_name?: string; }
interface ClientTarget { target_cpl: number | null; target_ctr: number | null; target_leads: number | null; target_roas: number | null; }
interface DailyRow {
  date: string; spend: number; impressions: number; link_clicks: number; leads: number;
  add_to_cart: number | null; checkouts: number | null; purchases: number | null; revenue: number | null;
  campaign_id: string;
}
interface BudgetPlan { planned_spend: number; planned_leads: number; month: string; }
interface ClientListItem { id: string; name: string; }
interface ProjectEvent {
  id: string; event_type: string; title: string; description: string | null;
  metadata: any; created_by: string | null; created_at: string;
}
interface StatusHistoryItem {
  id: string; old_status: string | null; new_status: string; changed_at: string; notes: string | null;
}

const CLIENT_STATUSES = [
  { value: 'active', labelKey: 'common.active', icon: CheckCircle2, color: 'text-success border-success/20 bg-success/10' },
  { value: 'onboarding', labelKey: 'clients.onboarding', icon: Zap, color: 'text-info border-info/20 bg-info/10' },
  { value: 'paused', labelKey: 'common.paused', icon: PauseCircle, color: 'text-warning border-warning/20 bg-warning/10' },
  { value: 'stop', labelKey: 'clients.stop', icon: XCircle, color: 'text-destructive border-destructive/20 bg-destructive/10' },
  { value: 'inactive', labelKey: 'common.inactive', icon: AlertCircle, color: 'text-muted-foreground border-border bg-muted/30' },
];

const statusStyles: Record<string, string> = {
  active: 'bg-success/15 text-success border-success/20', 
  paused: 'bg-warning/15 text-warning border-warning/20',
  inactive: 'bg-muted text-muted-foreground border-border', 
  archived: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-warning/15 text-warning border-warning/20', 
  in_progress: 'bg-info/15 text-info border-info/20',
  completed: 'bg-success/15 text-success border-success/20',
  onboarding: 'bg-info/15 text-info border-info/20',
  stop: 'bg-destructive/15 text-destructive border-destructive/20',
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
  const [googleTrackingEnabled, setGoogleTrackingEnabled] = useState(true);
  const [metaAccounts, setMetaAccounts] = useState<{ id: string; platform_account_id: string; account_name: string | null; is_active: boolean }[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<{ id: string; name: string; status?: string; currency?: string }[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [addingAccounts, setAddingAccounts] = useState(false);
  const [metaAutoSync, setMetaAutoSync] = useState(true);

  useEffect(() => {
    supabase.from('clients').select('auto_sync_enabled').eq('id', clientId).single().then(({ data }) => {
      if (data?.auto_sync_enabled) setAutoSync(data.auto_sync_enabled);
    });
    // Load google tracking pref from platform_settings
    supabase.from('platform_settings').select('value').eq('key', `google_tracking_${clientId}`).maybeSingle().then(({ data }) => {
      if (data?.value !== null && data?.value !== undefined) setGoogleTrackingEnabled((data.value as any)?.enabled !== false);
    });
    // Load meta auto-sync pref
    supabase.from('platform_settings').select('value').eq('key', `meta_auto_sync_${clientId}`).maybeSingle().then(({ data }) => {
      if (data?.value !== null && data?.value !== undefined) setMetaAutoSync((data.value as any)?.enabled !== false);
    });
    loadLinkedAccounts();
  }, [clientId]);

  const loadLinkedAccounts = async () => {
    const { data } = await supabase
      .from('ad_accounts')
      .select('id, platform_account_id, account_name, is_active')
      .eq('client_id', clientId);
    setMetaAccounts(data || []);
  };

  const fetchAvailableAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-meta-ads', {
        body: { action: 'list_accounts' },
      });
      if (error) throw error;
      setAvailableAccounts(data.accounts || []);
    } catch (err) {
      toast.error('Не удалось загрузить рекламные кабинеты');
    }
    setLoadingAccounts(false);
  };

  const toggleAccountSelection = (accId: string) => {
    setSelectedIds(prev => prev.includes(accId) ? prev.filter(id => id !== accId) : [...prev, accId]);
  };

  const addSelectedAccounts = async () => {
    if (selectedIds.length === 0) return;
    setAddingAccounts(true);
    // Ensure platform_connection exists
    let { data: conn } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('client_id', clientId)
      .eq('platform', 'meta')
      .maybeSingle();
    if (!conn) {
      const { data: newConn } = await supabase
        .from('platform_connections')
        .insert({ client_id: clientId, platform: 'meta' as any, account_name: 'Meta Ads API' })
        .select('id')
        .single();
      conn = newConn;
    }
    if (conn) {
      for (const accId of selectedIds) {
        const acc = availableAccounts.find(a => a.id === accId);
        await supabase.from('ad_accounts').insert({
          client_id: clientId,
          connection_id: conn.id,
          platform_account_id: accId,
          account_name: acc?.name || accId,
        });
      }
      toast.success(`Добавлено ${selectedIds.length} кабинет(ов)`);
      setSelectedIds([]);
      loadLinkedAccounts();
    }
    setAddingAccounts(false);
  };

  const removeMetaAccount = async (id: string) => {
    await supabase.from('ad_accounts').delete().eq('id', id);
    toast.success('Кабинет удалён');
    loadLinkedAccounts();
  };

  const syncNow = async () => {
    toast.info('Синхронизация запущена...');
    const { data, error } = await supabase.functions.invoke('sync-meta-ads', {
      body: { action: 'sync', client_id: clientId },
    });
    if (error) {
      toast.error('Ошибка синхронизации');
    } else {
      toast.success(`Синхронизировано: ${data.synced} записей`);
      if (data.errors?.length) toast.warning(data.errors.join('\n'));
    }
  };

  const handleToggleAutoSync = async (enabled: boolean) => {
    setAutoSync(enabled);
    await supabase.from('clients').update({ auto_sync_enabled: enabled } as any).eq('id', clientId);
    toast.success(enabled ? t('clients.autoSyncEnabled') : t('clients.autoSyncDisabled'));
  };

  const handleToggleGoogleTracking = async (enabled: boolean) => {
    setGoogleTrackingEnabled(enabled);
    await supabase.from('platform_settings').upsert({
      key: `google_tracking_${clientId}`,
      value: { enabled } as any,
      updated_by: null,
    }, { onConflict: 'key' });
    toast.success(enabled ? 'Google Sheets отслеживание включено' : 'Google Sheets отслеживание отключено');
  };

  const filteredAvailable = availableAccounts
    .filter(a => !metaAccounts.some(m => m.platform_account_id === a.id))
    .filter(a => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.id.includes(q);
    });

  const hasMetaAccounts = metaAccounts.length > 0;

  return (
    <div className="space-y-6">
      {/* Meta Ads API Direct — PRIMARY */}
      <Card className="glass-card max-w-2xl border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" /> Meta Ads API — Прямое подключение
            </CardTitle>
            {hasMetaAccounts && <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">Основной источник</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Подключите рекламные кабинеты Meta напрямую. Данные синхронизируются автоматически каждый час. Этот источник имеет приоритет над Google Sheets.
          </p>

          {/* Linked accounts */}
          {metaAccounts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Подключённые кабинеты ({metaAccounts.length})</p>
              {metaAccounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between rounded-lg border border-border/50 p-2.5 bg-secondary/20">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{acc.account_name || acc.platform_account_id}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">ID: {acc.platform_account_id}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge variant={acc.is_active ? 'default' : 'secondary'} className="text-[9px] h-5">
                      {acc.is_active ? 'Активен' : 'Неактивен'}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeMetaAccount(acc.id)}>
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={syncNow}>
                  <RefreshCw className="h-3.5 w-3.5" /> Синхронизировать сейчас
                </Button>
              </div>
              {/* Meta Auto-sync toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3 bg-secondary/10">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 text-primary" />
                    Автосинхронизация Meta
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Данные подтягиваются каждый час за последние 3 дня (покрывает окно атрибуции Facebook). 
                    Ручной синк — за 30 дней.
                  </p>
                </div>
                <Switch checked={metaAutoSync} onCheckedChange={async (enabled) => {
                  setMetaAutoSync(enabled);
                  await supabase.from('platform_settings').upsert({
                    key: `meta_auto_sync_${clientId}`,
                    value: { enabled } as any,
                    updated_by: null,
                  }, { onConflict: 'key' });
                  toast.success(enabled ? 'Автосинхронизация Meta включена' : 'Автосинхронизация Meta отключена');
                }} className="flex-shrink-0" />
              </div>
            </div>
          )}

          {/* Add accounts — multi-select with search */}
          <div className="space-y-3 border-t border-border/50 pt-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Добавить кабинеты</p>
            {availableAccounts.length === 0 ? (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={fetchAvailableAccounts} disabled={loadingAccounts}>
                {loadingAccounts ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Загрузить список кабинетов
              </Button>
            ) : (
              <div className="space-y-2">
                {/* Search */}
                <Input
                  placeholder="Поиск по ID или названию..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-8 text-xs"
                />
                {/* List with checkboxes */}
                <div className="max-h-[240px] overflow-y-auto space-y-1 border border-border/50 rounded-lg p-2 bg-secondary/10">
                  {filteredAvailable.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {searchQuery ? 'Нет результатов' : 'Все кабинеты уже подключены'}
                    </p>
                  ) : (
                    filteredAvailable.map(a => (
                      <label key={a.id} className="flex items-center gap-2.5 p-2 rounded-md hover:bg-secondary/50 cursor-pointer transition-colors">
                        <Checkbox
                          checked={selectedIds.includes(a.id)}
                          onCheckedChange={() => toggleAccountSelection(a.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">ID: {a.id}</p>
                        </div>
                        {a.status && (
                          <Badge variant="outline" className={`text-[9px] flex-shrink-0 ${a.status === 'active' ? 'border-success/30 text-success' : 'border-muted text-muted-foreground'}`}>
                            {a.status}
                          </Badge>
                        )}
                      </label>
                    ))
                  )}
                </div>
                {selectedIds.length > 0 && (
                  <Button size="sm" onClick={addSelectedAccounts} disabled={addingAccounts} className="gap-1.5 w-full">
                    {addingAccounts ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Добавить выбранные ({selectedIds.length})
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={fetchAvailableAccounts} disabled={loadingAccounts}>
                  <RefreshCw className="h-3 w-3 mr-1.5" /> Обновить список
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Google Sheets — Secondary */}
      <Card className={`glass-card max-w-2xl transition-opacity ${!googleTrackingEnabled ? 'opacity-50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sheet className="h-5 w-5 text-primary" />{t('dashboard.dataSources')} — Google Sheets
            </CardTitle>
            <div className="flex items-center gap-2">
              {!googleTrackingEnabled && <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">Отключено</Badge>}
              {hasMetaAccounts && googleTrackingEnabled && <Badge variant="outline" className="text-[10px] border-warning/30 text-warning">Вторичный</Badge>}
              <Switch checked={googleTrackingEnabled} onCheckedChange={handleToggleGoogleTracking} />
            </div>
          </div>
        </CardHeader>
        {googleTrackingEnabled && (
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('clients.syncSheetDesc')}</p>
            <PlatformSheetRow clientId={clientId} platform="meta" label="Meta Ads" fieldName="meta_sheet_url" isAdmin={isAdmin} />
            <PlatformSheetRow clientId={clientId} platform="google" label="Google Ads" fieldName="google_sheet_url" isAdmin={isAdmin} />
            <PlatformSheetRow clientId={clientId} platform="tiktok" label="TikTok Ads" fieldName="tiktok_sheet_url" isAdmin={isAdmin} />
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="min-w-0 flex-1 mr-3"><p className="text-sm font-medium">{t('clients.autoSync')}</p><p className="text-xs text-muted-foreground">{t('clients.autoSyncDesc')}</p></div>
              <Switch checked={autoSync} onCheckedChange={handleToggleAutoSync} className="flex-shrink-0" />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
// Campaigns Breakdown Tab with drill-down navigation and date filtering
function CampaignsBreakdownTab({ clientId, dateFrom, dateTo }: { clientId: string; dateFrom?: string; dateTo?: string }) {
  const { formatCurrency, formatNumber } = useLanguage();
  // Breadcrumb-style navigation: [{level, id, name}]
  const [breadcrumb, setBreadcrumb] = useState<{ level: 'campaign' | 'adset' | 'ad'; platformId?: string; name?: string }[]>([
    { level: 'campaign' },
  ]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string>('spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const current = breadcrumb[breadcrumb.length - 1];

  useEffect(() => {
    loadData();
  }, [clientId, breadcrumb, dateFrom, dateTo]);

  const loadData = async () => {
    setLoading(true);
    const level = current.level;

    if (level === 'campaign') {
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, campaign_name, status, platform_campaign_id')
        .eq('client_id', clientId);

      // Filter out Google Sheets-synced campaigns (they have "sheets-" prefix)
      const realCampaigns = (campaigns || []).filter(c => !c.platform_campaign_id.startsWith('sheets-'));
      if (!realCampaigns.length) { setData([]); setLoading(false); return; }

      let query = supabase
        .from('daily_metrics')
        .select('campaign_id, spend, impressions, link_clicks, leads, purchases, revenue, add_to_cart, checkouts, date')
        .eq('client_id', clientId);

      if (dateFrom) query = query.gte('date', dateFrom);
      if (dateTo) query = query.lte('date', dateTo);

      const { data: metrics } = await query;

      const agg: Record<string, any> = {};
      realCampaigns.forEach(c => {
        agg[c.id] = {
          id: c.id,
          name: c.campaign_name,
          status: c.status,
          platform_id: c.platform_campaign_id,
          spend: 0, impressions: 0, clicks: 0, leads: 0, purchases: 0, revenue: 0, addToCart: 0, checkouts: 0,
        };
      });
      (metrics || []).forEach(m => {
        const a = agg[m.campaign_id];
        if (!a) return;
        a.spend += Number(m.spend);
        a.impressions += m.impressions;
        a.clicks += m.link_clicks;
        a.leads += m.leads;
        a.purchases += (m.purchases || 0);
        a.revenue += Number(m.revenue || 0);
        a.addToCart += (m.add_to_cart || 0);
        a.checkouts += (m.checkouts || 0);
      });
      // Only show campaigns that have data in this date range
      setData(Object.values(agg).filter(a => a.spend > 0 || a.impressions > 0 || a.leads > 0));
    } else {
      // adset or ad — filter by parent
      let query = supabase
        .from('ad_level_metrics')
        .select('platform_id, name, spend, impressions, link_clicks, leads, purchases, revenue, add_to_cart, checkouts, status, parent_platform_id, date')
        .eq('client_id', clientId)
        .eq('level', level);

      if (current.platformId) {
        query = query.eq('parent_platform_id', current.platformId);
      }
      if (dateFrom) query = query.gte('date', dateFrom);
      if (dateTo) query = query.lte('date', dateTo);

      const { data: rows } = await query;

      const agg: Record<string, any> = {};
      (rows || []).forEach(r => {
        if (!agg[r.platform_id]) {
          agg[r.platform_id] = {
            name: r.name,
            platform_id: r.platform_id,
            status: r.status,
            spend: 0, impressions: 0, clicks: 0, leads: 0, purchases: 0, revenue: 0, addToCart: 0, checkouts: 0,
          };
        }
        const a = agg[r.platform_id];
        a.spend += Number(r.spend);
        a.impressions += r.impressions;
        a.clicks += r.link_clicks;
        a.leads += r.leads;
        a.purchases += r.purchases;
        a.revenue += Number(r.revenue);
        a.addToCart += r.add_to_cart;
        a.checkouts += r.checkouts;
      });
      setData(Object.values(agg));
    }
    setLoading(false);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const drillDown = (row: any) => {
    if (current.level === 'campaign') {
      setBreadcrumb(prev => [...prev, { level: 'adset', platformId: row.platform_id, name: row.name }]);
    } else if (current.level === 'adset') {
      setBreadcrumb(prev => [...prev, { level: 'ad', platformId: row.platform_id, name: row.name }]);
    }
  };

  const navigateTo = (index: number) => {
    setBreadcrumb(prev => prev.slice(0, index + 1));
  };

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [data, sortKey, sortDir]);

  const cols = [
    { key: 'name', label: 'Название', right: false },
    { key: 'spend', label: 'Расход', right: true },
    { key: 'impressions', label: 'Показы', right: true },
    { key: 'clicks', label: 'Клики', right: true },
    { key: 'cpc', label: 'CPC', right: true },
    { key: 'ctr', label: 'CTR', right: true },
    { key: 'leads', label: 'Лиды', right: true },
    { key: 'cpl', label: 'CPL', right: true },
    { key: 'purchases', label: 'Продажи', right: true },
    { key: 'revenue', label: 'Выручка', right: true },
  ];

  const formatVal = (key: string, row: any) => {
    if (key === 'name') return row.name;
    if (key === 'spend' || key === 'revenue') return formatCurrency(row[key] || 0);
    if (key === 'cpc') {
      const clicks = row.clicks || 0;
      return clicks > 0 ? formatCurrency(row.spend / clicks) : '—';
    }
    if (key === 'ctr') {
      const imp = row.impressions || 0;
      return imp > 0 ? ((row.clicks / imp) * 100).toFixed(2) + '%' : '—';
    }
    if (key === 'cpl') {
      const leads = row.leads || 0;
      return leads > 0 ? formatCurrency(row.spend / leads) : '—';
    }
    return formatNumber(row[key] || 0);
  };

  const canDrillDown = current.level !== 'ad';
  const levelLabels: Record<string, string> = { campaign: 'Кампании', adset: 'Группы', ad: 'Объявления' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-sm">
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground">/</span>}
              <button
                onClick={() => navigateTo(i)}
                className={`hover:underline transition-colors ${i === breadcrumb.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {b.name || levelLabels[b.level]}
              </button>
            </span>
          ))}
        </div>
        {dateFrom && dateTo && (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            {dateFrom} → {dateTo}
          </Badge>
        )}
      </div>

      <Card className="glass-card overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Play className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {current.level === 'campaign'
                  ? 'Нет данных за выбранный период. Подключите Meta Ads кабинет и запустите синхронизацию.'
                  : 'Нет данных на этом уровне за выбранный период.'}
              </p>
              {current.level !== 'campaign' && (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigateTo(breadcrumb.length - 2)}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Назад
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px]">
              <table className="spreadsheet-table">
                <thead>
                  <tr>
                    {cols.map(col => (
                      <th key={col.key} className={`${col.right ? 'text-right' : ''} cursor-pointer select-none hover:bg-secondary/50`}
                        onClick={() => handleSort(col.key)}>
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key && <span className="text-[9px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, i) => (
                    <tr key={i}
                      className={canDrillDown ? 'cursor-pointer hover:bg-primary/5 transition-colors' : ''}
                      onClick={() => canDrillDown && drillDown(row)}
                    >
                      {cols.map(col => (
                        <td key={col.key} className={`${col.right ? 'text-right' : ''} ${col.key === 'name' ? 'font-medium text-foreground max-w-[300px] truncate' : 'text-muted-foreground'}`}>
                          {col.key === 'name' && canDrillDown ? (
                            <span className="inline-flex items-center gap-1.5 group">
                              <span className="truncate">{row.name}</span>
                              <ChevronDown className="h-3 w-3 -rotate-90 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </span>
                          ) : formatVal(col.key, row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                {/* Summary row */}
                <tfoot>
                  <tr className="bg-secondary/30 font-semibold">
                    {cols.map(col => {
                      if (col.key === 'name') return <td key={col.key} className="text-foreground">Итого ({sorted.length})</td>;
                      const totalRow = {
                        spend: sorted.reduce((s, r) => s + (r.spend || 0), 0),
                        impressions: sorted.reduce((s, r) => s + (r.impressions || 0), 0),
                        clicks: sorted.reduce((s, r) => s + (r.clicks || 0), 0),
                        leads: sorted.reduce((s, r) => s + (r.leads || 0), 0),
                        purchases: sorted.reduce((s, r) => s + (r.purchases || 0), 0),
                        revenue: sorted.reduce((s, r) => s + (r.revenue || 0), 0),
                        addToCart: sorted.reduce((s, r) => s + (r.addToCart || 0), 0),
                        checkouts: sorted.reduce((s, r) => s + (r.checkouts || 0), 0),
                      };
                      return <td key={col.key} className="text-right text-foreground">{formatVal(col.key, totalRow)}</td>;
                    })}
                  </tr>
                </tfoot>
              </table>
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
  const { user, effectiveRole, simulatedUser } = useAuth();
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [targets, setTargets] = useState<ClientTarget | null>(null);
  const [savingTargets, setSavingTargets] = useState(false);
  const [targetCpl, setTargetCpl] = useState('');
  const [targetCtr, setTargetCtr] = useState('');
  const [targetLeads, setTargetLeads] = useState('');
  const [targetRoas, setTargetRoas] = useState('');
  const [dailyMetrics, setDailyMetrics] = useState<DailyRow[]>([]);
  const [campaignPlatformMap, setCampaignPlatformMap] = useState<Record<string, string>>({});
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan | null>(null);
  const [allClients, setAllClients] = useState<ClientListItem[]>([]);
  const [platformFilter, setPlatformFilter] = useState<PlatformKey>('all');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [savingColumns, setSavingColumns] = useState(false);
  const [projectEvents, setProjectEvents] = useState<ProjectEvent[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [newEventNote, setNewEventNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  // Unified DateRangePicker state
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [comparison, setComparison] = useState<Comparison>('none');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [compareEnabled, setCompareEnabled] = useState(false);

  // Chart normalization
  const [chartNormalized, setChartNormalized] = useState(true);

  const isAgency = effectiveRole === 'AgencyAdmin' || effectiveRole === 'MediaBuyer';
  const isAdmin = effectiveRole === 'AgencyAdmin';

  const targetUserId = simulatedUser ? simulatedUser.userId : user?.id;

  const category: ClientCategory = useMemo(() => toClientCategory(client?.category), [client?.category]);

  // Selectable chart lines
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

  const defaultChartKeys = useMemo(() => {
    return (CATEGORY_CHART_METRICS[category] || CATEGORY_CHART_METRICS.other).map(m => m.key);
  }, [category]);

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
    let metrics = dailyMetrics;
    // Apply date filter
    if (customDateRange) {
      const from = format(customDateRange.from, 'yyyy-MM-dd');
      const to = format(customDateRange.to, 'yyyy-MM-dd');
      metrics = metrics.filter(m => m.date >= from && m.date <= to);
    }
    // Apply platform filter
    if (platformFilter !== 'all' && Object.keys(campaignPlatformMap).length > 0) {
      metrics = metrics.filter(m => campaignPlatformMap[m.campaign_id] === platformFilter);
    }
    return metrics;
  }, [dailyMetrics, customDateRange, platformFilter, campaignPlatformMap]);

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


  // Chart data — use percentage-of-max normalization so all metrics fill chart proportionally
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
      // Find max value for each metric across all days
      const maxVals: Record<string, number> = {};
      ALL_CHART_OPTIONS.forEach(m => {
        maxVals[m.key] = Math.max(...raw.map(d => Math.abs(d[m.key] as number)), 1);
      });
      return raw.map(d => {
        const norm: Record<string, any> = { date: d.date };
        ALL_CHART_OPTIONS.forEach(m => {
          norm[m.key] = Math.round((d[m.key] as number) / maxVals[m.key] * 100);
          norm[`_raw_${m.key}`] = d[`_raw_${m.key}`];
        });
        return norm;
      });
    }
    return raw;
  }, [dailyTableData, chartNormalized, ALL_CHART_OPTIONS]);

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

    if (!isAdmin && targetUserId) {
      const { data: access } = await supabase
        .from('client_users')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('client_id', id)
        .maybeSingle();

      if (!access) {
        toast.error(t('common.accessDenied' as TranslationKey));
        navigate('/clients');
        return;
      }
    }

    const { data, error } = await supabase
      .from('clients')
      .select('id, name, status, currency, timezone, notes, category, visible_columns, google_sheet_url, meta_sheet_url, tiktok_sheet_url')
      .eq('id', id)
      .single();

    if (error || !data) {
      navigate('/clients');
      return;
    }

    setClient({
      ...data,
      google_sheet_url: (data as any).google_sheet_url || null,
      meta_sheet_url: (data as any).meta_sheet_url || null,
      tiktok_sheet_url: (data as any).tiktok_sheet_url || null,
      visible_columns: data.visible_columns ? (Array.isArray(data.visible_columns) ? data.visible_columns : JSON.parse(data.visible_columns as any)) : null,
    } as ClientData);
    setLoading(false);
  }, [id, isAdmin, navigate, t, targetUserId]);

  const fetchDailyMetrics = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from('daily_metrics')
      .select('date, spend, impressions, link_clicks, leads, add_to_cart, checkouts, purchases, revenue, campaign_id')
      .eq('client_id', id).order('date', { ascending: true });
    if (data) setDailyMetrics(data as DailyRow[]);
  }, [id]);

  const fetchCampaigns = useCallback(async () => {
    if (!id) return;
    // Fetch campaigns with their ad_account platform info to enable platform filtering
    const { data } = await supabase
      .from('campaigns')
      .select('id, campaign_name, status, platform_campaign_id, ad_accounts(platform_connections(platform))')
      .eq('client_id', id)
      .order('campaign_name');
    if (data) {
      setCampaigns(data as any);
      // Build campaign_id -> platform map
      const map: Record<string, string> = {};
      (data as any[]).forEach((c: any) => {
        const platform = c.ad_accounts?.platform_connections?.platform;
        if (platform) map[c.id] = platform;
      });
      setCampaignPlatformMap(map);
    }
  }, [id]);

  const fetchTasks = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from('tasks').select('id, title, description, status, due_date, created_at, assigned_to').eq('client_id', id).order('created_at', { ascending: false });
    if (data) setTasks(data as Task[]);
  }, [id]);

  const fetchTargets = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from('client_targets').select('target_cpl, target_ctr, target_leads, target_roas').eq('id', id).maybeSingle();
    if (data) { setTargets(data); setTargetCpl(data.target_cpl?.toString() || ''); setTargetCtr(data.target_ctr?.toString() || ''); setTargetLeads(data.target_leads?.toString() || ''); }
  }, [id]);

  const fetchBudgetPlan = useCallback(async () => {
    if (!id) return;
    // Always fetch the plan for the current calendar month — fixed, not dynamic
    const currentMonth = format(new Date(), 'yyyy-MM-01');
    const { data } = await supabase.from('budget_plans')
      .select('planned_spend, planned_leads, month')
      .eq('client_id', id)
      .eq('month', currentMonth)
      .maybeSingle();
    if (data) setBudgetPlan(data as BudgetPlan);
  }, [id]);

  const [allClientsLoaded, setAllClientsLoaded] = useState(false);
  const fetchAllClients = useCallback(async () => {
    if (isAdmin) {
      const { data } = await supabase.from('clients').select('id, name').order('name');
      setAllClients(data || []);
      setAllClientsLoaded(true);
      return;
    }

    if (!targetUserId) {
      setAllClients([]);
      setAllClientsLoaded(true);
      return;
    }

    const { data: assignments } = await supabase
      .from('client_users')
      .select('client_id')
      .eq('user_id', targetUserId);

    const scopedClientIds = (assignments || []).map((a) => a.client_id);
    if (scopedClientIds.length === 0) {
      setAllClients([]);
      setAllClientsLoaded(true);
      return;
    }

    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .in('id', scopedClientIds)
      .order('name');

    setAllClients(data || []);
    setAllClientsLoaded(true);
  }, [isAdmin, targetUserId]);

  const fetchProjectHistory = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from('project_events').select('*').eq('client_id', id).order('created_at', { ascending: false });
    setProjectEvents(data || []);
  }, [id]);

  const fetchStatusHistory = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from('client_status_history').select('*').eq('client_id', id).order('changed_at', { ascending: false });
    setStatusHistory(data || []);
  }, [id]);

  useEffect(() => { fetchClient(); fetchDailyMetrics(); fetchCampaigns(); fetchTasks(); fetchTargets(); fetchAllClients(); fetchBudgetPlan(); fetchProjectHistory(); fetchStatusHistory(); }, [fetchClient, fetchDailyMetrics, fetchCampaigns, fetchTasks, fetchTargets, fetchAllClients, fetchBudgetPlan, fetchProjectHistory, fetchStatusHistory]);

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

      {/* Budget Progress Bar */}
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
                    <p className="text-xs text-muted-foreground">{t('budget.monthlyBudget' as TranslationKey)}</p>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(budgetPlan.planned_spend)}</p>
                   </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t('budget.spent' as TranslationKey)}: <span className="text-foreground font-medium">{formatCurrency(totals.spend)}</span></span>
                    <span className={`font-semibold ${totals.spend / budgetPlan.planned_spend > 0.9 ? 'text-destructive' : totals.spend / budgetPlan.planned_spend > 0.7 ? 'text-warning' : 'text-success'}`}>
                      {Math.min(100, Math.round((totals.spend / budgetPlan.planned_spend) * 100))}%
                    </span>
                  </div>
                  <div className="relative h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className={`absolute left-0 top-0 h-full rounded-full ${
                        totals.spend / budgetPlan.planned_spend > 0.9
                          ? 'bg-destructive'
                          : totals.spend / budgetPlan.planned_spend > 0.7
                          ? 'bg-warning'
                          : 'bg-primary'
                      }`}
                      initial={{ width: '0%' }}
                      animate={{ width: `${Math.min(100, (totals.spend / budgetPlan.planned_spend) * 100)}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>$0</span>
                    <span className="text-muted-foreground/60">
                      {formatCurrency(Math.max(0, budgetPlan.planned_spend - totals.spend))} {t('budget.remaining' as TranslationKey)}
                    </span>
                    <span>{formatCurrency(budgetPlan.planned_spend)}</span>
                  </div>
                </div>
                {budgetPlan.planned_leads > 0 && (
                  <div className="flex-shrink-0 text-right sm:text-left">
                    <p className="text-xs text-muted-foreground">{t('budget.leadGoal' as TranslationKey)}</p>
                    <p className="text-sm font-semibold text-foreground">
                      <span className={totals.leads >= budgetPlan.planned_leads ? 'text-success' : 'text-foreground'}>{totals.leads}</span>
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
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm flex-shrink-0"><BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span>{t('dashboard.overview')}</span></TabsTrigger>
            <TabsTrigger value="info" className="gap-1.5 text-xs sm:text-sm flex-shrink-0"><Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span>{t('clients.info' as TranslationKey)}</span></TabsTrigger>
            <TabsTrigger value="daily" className="gap-1.5 text-xs sm:text-sm flex-shrink-0"><Table2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />{t('dashboard.daily')}</TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-1.5 text-xs sm:text-sm flex-shrink-0"><Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span>Кампании</span></TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5 text-xs sm:text-sm flex-shrink-0"><ListTodo className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span>{t('tasks.title')}</span></TabsTrigger>
            {isAdmin && <TabsTrigger value="targets" className="gap-1.5 text-xs sm:text-sm flex-shrink-0"><TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span>{t('targets.title')}</span></TabsTrigger>}
            <TabsTrigger value="reports" className="gap-1.5 text-xs sm:text-sm flex-shrink-0"><FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span>{t('nav.reports')}</span></TabsTrigger>
            {isAdmin && <TabsTrigger value="connections" className="gap-1.5 text-xs sm:text-sm flex-shrink-0"><Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span>{t('clients.connections')}</span></TabsTrigger>}
            {isAdmin && <TabsTrigger value="webhooks" className="gap-1.5 text-xs sm:text-sm flex-shrink-0"><Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span>Webhooks</span></TabsTrigger>}
            {isAgency && <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm flex-shrink-0"><History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />{t('clients.history' as TranslationKey)}</TabsTrigger>}
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              <Card className="glass-card lg:col-span-2">
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <CardTitle className="text-sm sm:text-base">{t('dashboard.performance')}</CardTitle>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      {ALL_CHART_OPTIONS.map(m => (
                        <button key={m.key} onClick={() => toggleChartLine(m.key)}
                          className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded transition-opacity ${activeChartLines.includes(m.key) ? 'opacity-100' : 'opacity-30'}`}>
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                          {t(m.labelKey as TranslationKey)}
                        </button>
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
                            {activeChartMetrics.map(m => (
                              <linearGradient key={m.gradientId} id={m.gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={m.color} stopOpacity={0.3} /><stop offset="95%" stopColor={m.color} stopOpacity={0} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" width={35} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px', color: 'hsl(var(--foreground))' }}
                            formatter={(value: number, name: string, props: any) => {
                              const rawKey = `_raw_${name}`;
                              const rawVal = props.payload?.[rawKey];
                              const displayVal = chartNormalized && rawVal !== undefined ? rawVal : value;
                              const formatted = typeof displayVal === 'number' ? (displayVal % 1 === 0 ? displayVal.toLocaleString() : displayVal.toFixed(2)) : displayVal;
                              const label = ALL_CHART_OPTIONS.find(o => o.key === name)?.labelKey;
                              return [formatted, label ? t(label as TranslationKey) : name];
                            }}
                          />
                          {activeChartMetrics.map(m => (
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

          {/* CLIENT INFO TAB */}
          <TabsContent value="info" className="space-y-4">
            <ClientInfoTab clientId={id!} isAdmin={isAdmin} />
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
            <CampaignsBreakdownTab
              clientId={id!}
              dateFrom={customDateRange ? format(customDateRange.from, 'yyyy-MM-dd') : undefined}
              dateTo={customDateRange ? format(customDateRange.to, 'yyyy-MM-dd') : undefined}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t('history.title' as TranslationKey)}</h3>
            </div>
            {/* Status History */}
            {statusHistory.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('history.statusChanges' as TranslationKey)}</h4>
                {statusHistory.map(sh => (
                  <Card key={sh.id} className="glass-card">
                    <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <CalendarClock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="text-sm">
                            <span className="text-muted-foreground">{sh.old_status || '—'}</span>
                            <span className="mx-2">→</span>
                            <Badge variant="outline" className={`text-[10px] ${statusStyles[sh.new_status] || ''}`}>{sh.new_status}</Badge>
                          </p>
                          {sh.notes && <p className="text-xs text-muted-foreground mt-0.5">{sh.notes}</p>}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{format(new Date(sh.changed_at), 'dd.MM.yyyy HH:mm')}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {/* Project Events */}
            {projectEvents.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('history.eventsNotes' as TranslationKey)}</h4>
                {projectEvents.map(ev => (
                  <Card key={ev.id} className="glass-card">
                    <CardContent className="py-3 px-4 flex items-start gap-3">
                      <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{ev.title}</p>
                        {ev.description && <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{format(new Date(ev.created_at), 'dd.MM.yyyy')}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {statusHistory.length === 0 && projectEvents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <History className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">{t('history.noHistoryYet' as TranslationKey)}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('history.noHistoryDesc' as TranslationKey)}</p>
              </div>
            )}
            {/* Add note */}
            {isAgency && (
              <Card className="glass-card">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-medium">{t('history.addNote' as TranslationKey)}</h4>
                  <Textarea value={newEventNote} onChange={e => setNewEventNote(e.target.value)} placeholder={t('history.notePlaceholder' as TranslationKey)} className="text-sm" rows={3} />
                  <Button size="sm" disabled={addingNote || !newEventNote.trim()} onClick={async () => {
                    if (!id || !newEventNote.trim()) return;
                    setAddingNote(true);
                    await supabase.from('project_events').insert({ client_id: id, title: newEventNote.trim(), event_type: 'note', created_by: user?.id });
                    setNewEventNote('');
                    setAddingNote(false);
                    // refresh
                    const { data } = await supabase.from('project_events').select('*').eq('client_id', id).order('created_at', { ascending: false });
                    setProjectEvents(data || []);
                    toast.success(t('history.noteAdded' as TranslationKey));
                  }}>
                    {addingNote ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {t('common.add')}
                  </Button>
                </CardContent>
              </Card>
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

          {/* TARGETS TAB — redesigned with progress bars */}
          {isAdmin && (
            <TabsContent value="targets" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                {[
                  { key: 'cpl', label: t('targets.cpl'), unit: '$', value: targetCpl, setter: setTargetCpl, actual: totals.cpl, type: 'number', step: '0.01', lowerIsBetter: true },
                  { key: 'ctr', label: t('targets.ctr'), unit: '%', value: targetCtr, setter: setTargetCtr, actual: totals.ctr, type: 'number', step: '0.01', lowerIsBetter: false },
                  { key: 'leads', label: t('targets.leads'), unit: '', value: targetLeads, setter: setTargetLeads, actual: totals.leads, type: 'number', step: '1', lowerIsBetter: false },
                  { key: 'roas', label: t('targets.roas'), unit: 'x', value: targetRoas, setter: setTargetRoas, actual: totals.roas, type: 'number', step: '0.01', lowerIsBetter: false },
                ].map(f => {
                  const targetNum = parseFloat(f.value) || 0;
                  const actualNum = f.actual || 0;
                  let pct = targetNum > 0 ? Math.min(100, Math.round((actualNum / targetNum) * 100)) : 0;
                  if (f.lowerIsBetter && targetNum > 0) pct = actualNum <= targetNum ? 100 : Math.max(0, Math.round((targetNum / actualNum) * 100));
                  const isGood = f.lowerIsBetter ? actualNum <= targetNum && targetNum > 0 : pct >= 80;
                  const barColor = !targetNum ? 'bg-muted' : isGood ? 'bg-success' : pct >= 60 ? 'bg-warning' : 'bg-destructive';
                  return (
                    <Card key={f.key} className="glass-card">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">{f.label}</Label>
                          {targetNum > 0 && (
                            <Badge variant="outline" className={`text-[10px] ${isGood ? 'border-success/30 text-success' : 'border-warning/30 text-warning'}`}>
                              {pct}%
                            </Badge>
                          )}
                        </div>
                        <Input type={f.type} step={f.step} value={f.value} onChange={e => f.setter(e.target.value)} placeholder={`Target ${f.label}`} className="h-8 text-sm" />
                        {targetNum > 0 && (
                          <div className="space-y-1">
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Actual: {typeof actualNum === 'number' ? actualNum.toFixed(2) : actualNum}{f.unit}</span>
                              <span>Target: {targetNum}{f.unit}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <Button onClick={handleSaveTargets} disabled={savingTargets} className="gap-2">
                {savingTargets ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('common.save')}
              </Button>
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
          {isAdmin && (
            <TabsContent value="connections">
              <GoogleSheetConnection clientId={id!} isAdmin={isAdmin} />
            </TabsContent>
          )}

          {/* WEBHOOKS TAB */}
          {isAdmin && (
            <TabsContent value="webhooks">
              <ClientWebhooks clientId={id!} />
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
