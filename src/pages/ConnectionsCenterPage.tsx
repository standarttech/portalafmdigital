import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePlatformResources, type PlatformResource, type ResourceType } from '@/hooks/usePlatformResources';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Link2, Search, Send, Database, Globe, FileSpreadsheet, Zap, Bot, ShieldCheck,
  CheckCircle2, XCircle, AlertTriangle, Power, Settings, Eye,
  ArrowRight, RefreshCw, Workflow, ExternalLink,
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

/**
 * Build real usage map from multiple DB sources:
 * 1. automation_steps (bot_profile_id, sheet_url/connection_id references)
 * 2. notification_broadcasts (bot_profile_id)
 * 3. client_report_schedules (telegram_bot_profile_id)
 */
function useResourceUsageMap() {
  const { data: automationSteps = [] } = useQuery({
    queryKey: ['resource-usage-auto-steps'],
    queryFn: async () => {
      const { data } = await supabase
        .from('automation_steps')
        .select('id, automation_id, action_type, config');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: automations = [] } = useQuery({
    queryKey: ['resource-usage-automations'],
    queryFn: async () => {
      const { data } = await supabase.from('automations').select('id, name');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: broadcasts = [] } = useQuery({
    queryKey: ['resource-usage-broadcasts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('notification_broadcasts')
        .select('id, subject, bot_profile_id')
        .not('bot_profile_id', 'is', null);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: reportSchedules = [] } = useQuery({
    queryKey: ['resource-usage-report-schedules'],
    queryFn: async () => {
      const { data } = await supabase
        .from('client_report_schedules')
        .select('id, client_id, report_type, telegram_bot_profile_id')
        .not('telegram_bot_profile_id', 'is', null);
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

    // 1. Automation steps
    automationSteps.forEach(step => {
      const config = step.config as Record<string, unknown> | null;
      const autoName = autoNameMap.get(step.automation_id) || 'Automation';
      const autoLink = `/automations/${step.automation_id}`;

      if (step.action_type === 'send_telegram' && config?.bot_profile_id) {
        addUsage(String(config.bot_profile_id), 'Automations', autoName, autoLink);
      }
      if (step.action_type === 'add_sheets_row') {
        const sheetVal = config?.sheet_url || config?.connection_id;
        if (sheetVal) {
          addUsage(`sheet_url:${String(sheetVal)}`, 'Automations', autoName, autoLink);
        }
      }
    });

    // 2. Notification broadcasts
    broadcasts.forEach(b => {
      if (b.bot_profile_id) {
        addUsage(b.bot_profile_id, 'Broadcasts', b.subject || 'Broadcast', '/broadcasts');
      }
    });

    // 3. Report schedules
    reportSchedules.forEach(rs => {
      if (rs.telegram_bot_profile_id) {
        addUsage(
          rs.telegram_bot_profile_id,
          'Reports',
          `${rs.report_type} report`,
          rs.client_id ? `/clients/${rs.client_id}` : '/reports',
        );
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
  const [detailResource, setDetailResource] = useState<PlatformResource | null>(null);

  const filtered = useMemo(() => {
    return resources.filter(r => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.label.toLowerCase().includes(q) || r.provider.toLowerCase().includes(q) || (r.clientName || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [resources, search, filterType, filterStatus]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" /> Connections Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unified view of all platform connections, integrations, and reusable resources.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
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
      </div>

      {/* Resources List */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Link2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{search || filterType !== 'all' || filterStatus !== 'all' ? 'No matching resources found' : 'No connections configured yet'}</p>
            <p className="text-xs mt-1">Connect services from their respective module pages.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <ResourceRow key={r.id} resource={r} usages={getUsages(r)} onNavigate={navigate} onDetail={setDetailResource} />
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      {detailResource && (
        <ResourceDetailDialog
          resource={detailResource}
          usages={getUsages(detailResource)}
          onClose={() => setDetailResource(null)}
          onNavigate={navigate}
        />
      )}
    </div>
  );
}

function ResourceRow({ resource: r, usages, onNavigate, onDetail }: {
  resource: PlatformResource; usages: UsageRef[];
  onNavigate: (p: string) => void; onDetail: (r: PlatformResource) => void;
}) {
  const cfg = TYPE_CONFIG[r.type];
  const stCfg = STATUS_CONFIG[r.status];
  const Icon = cfg.icon;
  const StIcon = stCfg.icon;

  return (
    <Card className="hover:border-border transition-colors">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cfg.color}15` }}>
          <Icon className="h-4 w-4" style={{ color: cfg.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-foreground text-sm truncate">{r.label}</span>
            {r.hasSecret && (
              <Tooltip>
                <TooltipTrigger><ShieldCheck className="h-3 w-3 text-emerald-400 flex-shrink-0" /></TooltipTrigger>
                <TooltipContent className="text-xs">Secret stored in Vault</TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>{r.provider}</span>
            <span className="opacity-30">•</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">{cfg.label}</Badge>
            {r.clientName && (
              <>
                <span className="opacity-30">•</span>
                <span className="truncate max-w-[120px]">{r.clientName}</span>
              </>
            )}
            {r.isGlobal && (
              <>
                <span className="opacity-30">•</span>
                <span className="text-primary/70">Global</span>
              </>
            )}
          </div>
        </div>

        {/* Real Usages */}
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
            <span className="text-[9px] text-muted-foreground/50">No usages detected</span>
          )}
          {usages.length > 3 && (
            <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">+{usages.length - 3}</Badge>
          )}
        </div>

        {/* Status */}
        <Badge variant="outline" className={cn('text-[10px] gap-1 flex-shrink-0', stCfg.className)}>
          <StIcon className="h-3 w-3" /> {stCfg.label}
        </Badge>

        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onDetail(r); }}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Details & Usage</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {
                e.stopPropagation();
                onNavigate(r.managePath);
              }}>
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Manage in source module</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}

function ResourceDetailDialog({ resource: r, usages, onClose, onNavigate }: {
  resource: PlatformResource;
  usages: UsageRef[];
  onClose: () => void;
  onNavigate: (p: string) => void;
}) {
  const cfg = TYPE_CONFIG[r.type];
  const stCfg = STATUS_CONFIG[r.status];
  const StIcon = stCfg.icon;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <cfg.icon className="h-5 w-5" style={{ color: cfg.color }} />
            {r.label}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {/* Status Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn('gap-1', stCfg.className)}>
              <StIcon className="h-3 w-3" /> {stCfg.label}
            </Badge>
            {r.hasSecret && (
              <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 bg-emerald-400/10 gap-1 text-xs">
                <ShieldCheck className="h-3 w-3" /> Vault
              </Badge>
            )}
            {r.isGlobal && <Badge variant="outline" className="text-xs">Global</Badge>}
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              Managed in source module
            </Badge>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground">{cfg.label}</span></div>
            <div><span className="text-muted-foreground">Provider:</span> <span className="text-foreground">{r.provider}</span></div>
            {r.clientName && <div><span className="text-muted-foreground">Client:</span> <span className="text-foreground">{r.clientName}</span></div>}
            <div><span className="text-muted-foreground">Source:</span> <span className="text-foreground font-mono text-[10px]">{r.sourceTable}</span></div>
            {r.lastSyncAt && <div className="col-span-2"><span className="text-muted-foreground">Last Sync:</span> <span className="text-foreground">{new Date(r.lastSyncAt).toLocaleString()}</span></div>}
            {r.lastError && <div className="col-span-2"><span className="text-muted-foreground">Last Error:</span> <span className="text-red-400">{r.lastError}</span></div>}
          </div>

          {/* Usage */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Used In</div>
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
              <p className="text-xs text-muted-foreground/60">No active usages detected across platform modules.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-border/30">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => {
              onClose();
              onNavigate(r.managePath);
            }}>
              <ExternalLink className="h-3.5 w-3.5" /> Manage
            </Button>
            {(r.type === 'telegram_bot' || r.type === 'external_crm') && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                toast.info('Opening module settings for testing...');
                onClose();
                onNavigate(r.managePath);
              }}>
                <RefreshCw className="h-3.5 w-3.5" /> Test
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
