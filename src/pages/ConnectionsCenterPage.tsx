/**
 * Connections Center — Unified Platform Control Tower (Production)
 *
 * Real operational hub: filters, search, usage detection, warnings, deep-link management.
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePlatformResources, type PlatformResource, type ResourceType, type ResourceStatus } from '@/hooks/usePlatformResources';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Link2, Search, Send, Database, Globe, FileSpreadsheet, Zap, Bot, ShieldCheck,
  CheckCircle2, XCircle, AlertTriangle, Power, Settings, ExternalLink,
  ArrowRight, RefreshCw, Workflow, Users, Copy, TriangleAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<ResourceType, { label: string; icon: typeof Bot; color: string }> = {
  telegram_bot: { label: 'Telegram Bots', icon: Send, color: 'hsl(200,80%,50%)' },
  external_crm: { label: 'External CRM', icon: Database, color: 'hsl(25,60%,50%)' },
  platform_ad: { label: 'Ad Platforms', icon: Globe, color: 'hsl(220,70%,50%)' },
  platform_api: { label: 'API Integrations', icon: Zap, color: 'hsl(270,60%,50%)' },
  sheet_url: { label: 'Sheets / Data', icon: FileSpreadsheet, color: 'hsl(120,60%,40%)' },
  gos_integration: { label: 'Growth OS', icon: Bot, color: 'hsl(160,70%,40%)' },
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  healthy: { label: 'Healthy', className: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10', icon: CheckCircle2 },
  error: { label: 'Error', className: 'text-red-400 border-red-400/30 bg-red-400/10', icon: XCircle },
  inactive: { label: 'Inactive', className: 'text-muted-foreground border-border', icon: Power },
  unconfigured: { label: 'Missing Auth', className: 'text-amber-400 border-amber-400/30 bg-amber-400/10', icon: AlertTriangle },
};

interface UsageRef { module: string; label: string; link: string }

function useResourceUsageMap() {
  const { data: automationSteps = [] } = useQuery({
    queryKey: ['resource-usage-auto-steps'],
    queryFn: async () => {
      const { data } = await supabase.from('automation_steps').select('id, automation_id, action_type, config');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: automations = [] } = useQuery({
    queryKey: ['resource-usage-automations'],
    queryFn: async () => {
      const { data } = await supabase.from('automations').select('id, name, trigger_type, trigger_config');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: broadcasts = [] } = useQuery({
    queryKey: ['resource-usage-broadcasts'],
    queryFn: async () => {
      const { data } = await supabase.from('notification_broadcasts').select('id, subject, bot_profile_id').not('bot_profile_id', 'is', null);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: reportSchedules = [] } = useQuery({
    queryKey: ['resource-usage-report-schedules'],
    queryFn: async () => {
      const { data } = await supabase.from('client_report_schedules').select('id, client_id, report_type, telegram_bot_profile_id').not('telegram_bot_profile_id', 'is', null);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    const usageMap = new Map<string, UsageRef[]>();
    const autoNameMap = new Map<string, string>();
    automations.forEach(a => autoNameMap.set(a.id, a.name));

    const addUsage = (resourceId: string, module: string, label: string, link: string) => {
      const existing = usageMap.get(resourceId) || [];
      if (!existing.find(e => e.label === label && e.module === module)) {
        existing.push({ module, label, link });
        usageMap.set(resourceId, existing);
      }
    };

    automationSteps.forEach(step => {
      const config = step.config as Record<string, unknown> | null;
      const autoName = autoNameMap.get(step.automation_id) || 'Automation';
      const autoLink = `/automations/${step.automation_id}`;
      if (step.action_type === 'send_telegram' && config?.bot_profile_id) {
        addUsage(String(config.bot_profile_id), 'Automations', autoName, autoLink);
      }
      if (step.action_type === 'add_sheets_row') {
        const sheetVal = config?.sheet_url || config?.connection_id;
        if (sheetVal) addUsage(`sheet_url:${String(sheetVal)}`, 'Automations', autoName, autoLink);
      }
    });

    automations.forEach(a => {
      if (a.trigger_type === 'fb_lead_form') {
        const tc = a.trigger_config as Record<string, unknown> | null;
        if (tc?.meta_connection_id) {
          addUsage(String(tc.meta_connection_id), 'Automations', a.name + ' (trigger)', `/automations/${a.id}`);
        }
      }
    });

    broadcasts.forEach(b => {
      if (b.bot_profile_id) addUsage(b.bot_profile_id, 'Broadcasts', b.subject || 'Broadcast', '/broadcasts');
    });

    reportSchedules.forEach(rs => {
      if (rs.telegram_bot_profile_id) {
        addUsage(rs.telegram_bot_profile_id, 'Reports', `${rs.report_type} report`, rs.client_id ? `/clients/${rs.client_id}` : '/reports');
      }
    });

    return usageMap;
  }, [automationSteps, automations, broadcasts, reportSchedules]);
}

export default function ConnectionsCenterPage() {
  const navigate = useNavigate();
  const { data: resources = [], isLoading, refetch } = usePlatformResources();
  const usageMap = useResourceUsageMap();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [detailResource, setDetailResource] = useState<PlatformResource | null>(null);

  const clients = useMemo(() => {
    const map = new Map<string, string>();
    resources.forEach(r => { if (r.clientId && r.clientName) map.set(r.clientId, r.clientName); });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [resources]);

  const filtered = useMemo(() => {
    return resources.filter(r => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterClient !== 'all') {
        if (filterClient === 'global') { if (!r.isGlobal) return false; }
        else { if (r.clientId !== filterClient && !r.isGlobal) return false; }
      }
      if (search) {
        const q = search.toLowerCase();
        return r.label.toLowerCase().includes(q) || r.provider.toLowerCase().includes(q) || (r.clientName || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [resources, search, filterType, filterStatus, filterClient]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: resources.length };
    resources.forEach(r => { c[r.type] = (c[r.type] || 0) + 1; c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [resources]);

  const getUsages = (r: PlatformResource): UsageRef[] => {
    const directUsages = usageMap.get(r.id) || [];
    if (r.type === 'sheet_url' && r.meta?.url) {
      const urlUsages = usageMap.get(`sheet_url:${String(r.meta.url)}`) || [];
      return [...directUsages, ...urlUsages];
    }
    return directUsages;
  };

  // Count warnings: broken/inactive resources that have active usages
  const warningCount = useMemo(() => {
    return resources.filter(r => (r.status === 'error' || r.status === 'inactive' || r.status === 'unconfigured') && getUsages(r).length > 0).length;
  }, [resources, usageMap]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" /> Connections Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform-wide control tower for all connections, integrations, and reusable resources.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {warningCount > 0 && (
            <Badge variant="outline" className="text-amber-400 border-amber-400/30 bg-amber-400/10 gap-1 cursor-pointer"
              onClick={() => setFilterStatus('error')}>
              <TriangleAlert className="h-3 w-3" /> {warningCount} broken but used
            </Badge>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { refetch(); toast.success('Refreshed'); }}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {(Object.entries(TYPE_CONFIG) as [ResourceType, typeof TYPE_CONFIG[ResourceType]][]).map(([type, cfg]) => {
          const count = counts[type] || 0;
          const Icon = cfg.icon;
          return (
            <Card key={type} className={cn('cursor-pointer transition-all hover:border-primary/30', filterType === type && 'border-primary/50 bg-primary/5')}
              onClick={() => setFilterType(filterType === type ? 'all' : type)}>
              <CardContent className="p-3 flex items-center gap-2.5">
                <Icon className="h-4 w-4 flex-shrink-0" style={{ color: cfg.color }} />
                <div>
                  <div className="text-lg font-bold text-foreground leading-none">{count}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{cfg.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search connections..." className="pl-8 h-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="healthy">Healthy ({counts.healthy || 0})</SelectItem>
            <SelectItem value="error">Error ({counts.error || 0})</SelectItem>
            <SelectItem value="inactive">Inactive ({counts.inactive || 0})</SelectItem>
            <SelectItem value="unconfigured">Missing Auth ({counts.unconfigured || 0})</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Client" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            <SelectItem value="global">Global only</SelectItem>
            {clients.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Resources List */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Link2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{search || filterType !== 'all' || filterStatus !== 'all' ? 'No matching resources found' : 'No connections configured yet'}</p>
            <p className="text-xs mt-2">Connect services from their module pages:</p>
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => navigate('/crm/integrations')}>
                <Send className="h-3 w-3" /> CRM / Bots
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => navigate('/ai-ads/integrations')}>
                <Globe className="h-3 w-3" /> Ad Platforms
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => navigate('/growth-os/integrations')}>
                <Zap className="h-3 w-3" /> Growth OS
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const usages = getUsages(r);
            const isBrokenButUsed = (r.status === 'error' || r.status === 'inactive' || r.status === 'unconfigured') && usages.length > 0;
            return <ResourceRow key={r.id} resource={r} usages={usages} isBrokenButUsed={isBrokenButUsed} onNavigate={navigate} onDetail={setDetailResource} />;
          })}
        </div>
      )}

      {detailResource && (
        <ResourceDetailDialog resource={detailResource} usages={getUsages(detailResource)} onClose={() => setDetailResource(null)} onNavigate={navigate} />
      )}
    </div>
  );
}

function ResourceRow({ resource: r, usages, isBrokenButUsed, onNavigate, onDetail }: {
  resource: PlatformResource; usages: UsageRef[]; isBrokenButUsed: boolean;
  onNavigate: (p: string) => void; onDetail: (r: PlatformResource) => void;
}) {
  const cfg = TYPE_CONFIG[r.type];
  const stCfg = STATUS_CONFIG[r.status];
  const Icon = cfg.icon;
  const StIcon = stCfg.icon;

  return (
    <Card className={cn(
      'hover:border-border transition-colors cursor-pointer',
      isBrokenButUsed && 'border-amber-400/30 bg-amber-400/5'
    )} onClick={() => onDetail(r)}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cfg.color}15` }}>
          <Icon className="h-4 w-4" style={{ color: cfg.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-foreground text-sm truncate">{r.label}</span>
            {r.hasSecret && (
              <Tooltip><TooltipTrigger><ShieldCheck className="h-3 w-3 text-emerald-400 flex-shrink-0" /></TooltipTrigger>
                <TooltipContent className="text-xs">Secret in Vault</TooltipContent></Tooltip>
            )}
            {isBrokenButUsed && (
              <Tooltip><TooltipTrigger><TriangleAlert className="h-3 w-3 text-amber-400 flex-shrink-0" /></TooltipTrigger>
                <TooltipContent className="text-xs">⚠️ Broken/inactive but used in {usages.length} place(s). Fix required.</TooltipContent></Tooltip>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>{r.provider}</span>
            <span className="opacity-30">•</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">{cfg.label}</Badge>
            {r.clientName && (<><span className="opacity-30">•</span><span className="truncate max-w-[120px]">{r.clientName}</span></>)}
            {r.isGlobal && (<><span className="opacity-30">•</span><span className="text-primary/70">Global</span></>)}
          </div>
        </div>

        {/* Usages */}
        <div className="hidden md:flex items-center gap-1 flex-shrink-0">
          {usages.length > 0 ? (
            usages.slice(0, 3).map((u, i) => (
              <Tooltip key={i}>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary/20 text-primary/70 cursor-pointer hover:bg-primary/5"
                    onClick={(e) => { e.stopPropagation(); onNavigate(u.link); }}>
                    <Workflow className="h-2.5 w-2.5 mr-0.5" />{u.module}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Used in: {u.label}</TooltipContent>
              </Tooltip>
            ))
          ) : (
            <span className="text-[9px] text-muted-foreground/50">Unused</span>
          )}
          {usages.length > 3 && <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">+{usages.length - 3}</Badge>}
        </div>

        <Badge variant="outline" className={cn('text-[10px] gap-1 flex-shrink-0', stCfg.className)}>
          <StIcon className="h-3 w-3" /> {stCfg.label}
        </Badge>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={(e) => { e.stopPropagation(); onNavigate(r.managePath); }}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Manage in source module</TooltipContent>
        </Tooltip>
      </CardContent>
    </Card>
  );
}

function ResourceDetailDialog({ resource: r, usages, onClose, onNavigate }: {
  resource: PlatformResource; usages: UsageRef[]; onClose: () => void; onNavigate: (p: string) => void;
}) {
  const cfg = TYPE_CONFIG[r.type];
  const stCfg = STATUS_CONFIG[r.status];
  const StIcon = stCfg.icon;
  const isBrokenButUsed = (r.status === 'error' || r.status === 'inactive' || r.status === 'unconfigured') && usages.length > 0;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <cfg.icon className="h-5 w-5" style={{ color: cfg.color }} />
            {r.label}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 text-sm pr-2">
            {/* Warning banner */}
            {isBrokenButUsed && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-xs">
                <TriangleAlert className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-400">This resource is broken but actively used in {usages.length} place(s).</p>
                  <p className="text-muted-foreground mt-0.5">Fix the connection to restore functionality.</p>
                </div>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn('gap-1', stCfg.className)}><StIcon className="h-3 w-3" /> {stCfg.label}</Badge>
              {r.hasSecret && <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 bg-emerald-400/10 gap-1 text-xs"><ShieldCheck className="h-3 w-3" /> Vault</Badge>}
              {r.isGlobal && <Badge variant="outline" className="text-xs">Global</Badge>}
              <Badge variant="outline" className="text-[10px] text-muted-foreground">Managed in source module</Badge>
            </div>

            {/* Info */}
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
              <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground">{cfg.label}</span></div>
              <div><span className="text-muted-foreground">Provider:</span> <span className="text-foreground">{r.provider}</span></div>
              {r.clientName && <div><span className="text-muted-foreground">Client:</span> <span className="text-foreground">{r.clientName}</span></div>}
              <div><span className="text-muted-foreground">Source:</span> <span className="text-foreground font-mono text-[10px]">{r.sourceTable}</span></div>
              {r.lastSyncAt && <div className="col-span-2"><span className="text-muted-foreground">Last Sync:</span> <span className="text-foreground">{new Date(r.lastSyncAt).toLocaleString()}</span></div>}
            </div>

            {r.lastError && (
              <div className="p-2 rounded-lg bg-red-400/5 border border-red-400/20 text-xs">
                <span className="text-red-400 font-medium">Error: </span>
                <span className="text-muted-foreground">{r.lastError}</span>
              </div>
            )}

            {r.type === 'sheet_url' && r.meta?.url && (
              <div className="p-2 rounded-lg bg-muted/20 border border-border/30 text-xs">
                <span className="text-muted-foreground">URL: </span>
                <code className="text-foreground text-[10px] font-mono break-all">{String(r.meta.url)}</code>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-1 inline-flex" onClick={() => {
                  navigator.clipboard.writeText(String(r.meta.url)); toast.success('Copied');
                }}><Copy className="h-2.5 w-2.5" /></Button>
              </div>
            )}

            <Separator />

            {/* Usage */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Used In ({usages.length})</div>
              {usages.length > 0 ? (
                <div className="space-y-1.5">
                  {usages.map((u, i) => (
                    <button key={i} onClick={() => { onClose(); onNavigate(u.link); }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/30 hover:border-primary/30 transition-colors text-left">
                      <Workflow className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-foreground">{u.label}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{u.module}</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground/60 p-2 rounded-lg bg-muted/10 border border-border/20">
                  No active usages detected. Available for Automations, Broadcasts, Reports.
                </div>
              )}
            </div>

            <Separator />

            {/* Actions — type-specific */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { onClose(); onNavigate(r.managePath); }}>
                  <ExternalLink className="h-3.5 w-3.5" /> Manage in Source
                </Button>

                {r.type === 'telegram_bot' && (
                  <>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { onClose(); onNavigate('/crm/integrations'); }}>
                      <Settings className="h-3.5 w-3.5" /> Bot Settings
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { onClose(); onNavigate('/automations'); }}>
                      <Workflow className="h-3.5 w-3.5" /> Use in Automation
                    </Button>
                  </>
                )}

                {r.type === 'external_crm' && (
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { onClose(); onNavigate('/crm/integrations'); }}>
                    <RefreshCw className="h-3.5 w-3.5" /> Sync Settings
                  </Button>
                )}

                {r.type === 'platform_ad' && r.status === 'unconfigured' && (
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs text-amber-400 border-amber-400/30" onClick={() => { onClose(); onNavigate(r.managePath); }}>
                    <AlertTriangle className="h-3.5 w-3.5" /> Configure Auth
                  </Button>
                )}
                {r.type === 'platform_ad' && r.status === 'error' && (
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs text-red-400 border-red-400/30" onClick={() => { onClose(); onNavigate(r.managePath); }}>
                    <RefreshCw className="h-3.5 w-3.5" /> Reconnect
                  </Button>
                )}

                {r.type === 'sheet_url' && r.meta?.url && (
                  <>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
                      navigator.clipboard.writeText(String(r.meta.url)); toast.success('URL copied');
                    }}>
                      <Copy className="h-3.5 w-3.5" /> Copy URL
                    </Button>
                    {r.clientId && (
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { onClose(); onNavigate(`/clients/${r.clientId}`); }}>
                        <Users className="h-3.5 w-3.5" /> Client Settings
                      </Button>
                    )}
                  </>
                )}

                {r.type === 'gos_integration' && (
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { onClose(); onNavigate('/growth-os/integrations'); }}>
                    <Settings className="h-3.5 w-3.5" /> Integration Settings
                  </Button>
                )}

                {r.type === 'platform_api' && (
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { onClose(); onNavigate('/ai-ads/integrations'); }}>
                    <Settings className="h-3.5 w-3.5" /> API Settings
                  </Button>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
