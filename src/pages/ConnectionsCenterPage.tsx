import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlatformResources, type PlatformResource, type ResourceType } from '@/hooks/usePlatformResources';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Link2, Search, Send, Database, Globe, FileSpreadsheet, Zap, Bot, ShieldCheck,
  ExternalLink, CheckCircle2, XCircle, AlertTriangle, Power, Settings, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<ResourceType, { label: string; icon: typeof Bot; color: string; managePath: string }> = {
  telegram_bot: { label: 'Telegram Bots', icon: Send, color: 'hsl(200,80%,50%)', managePath: '/crm/integrations' },
  external_crm: { label: 'External CRM', icon: Database, color: 'hsl(25,60%,50%)', managePath: '/crm/integrations' },
  platform_ad: { label: 'Ad Platforms', icon: Globe, color: 'hsl(220,70%,50%)', managePath: '/clients' },
  platform_api: { label: 'API Integrations', icon: Zap, color: 'hsl(270,60%,50%)', managePath: '/ai-ads/integrations' },
  sheet_url: { label: 'Sheets / Data', icon: FileSpreadsheet, color: 'hsl(120,60%,40%)', managePath: '/clients' },
  gos_integration: { label: 'Growth OS', icon: Bot, color: 'hsl(160,70%,40%)', managePath: '/growth-os/integrations' },
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  healthy: { label: 'Healthy', className: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10', icon: CheckCircle2 },
  error: { label: 'Error', className: 'text-red-400 border-red-400/30 bg-red-400/10', icon: XCircle },
  inactive: { label: 'Inactive', className: 'text-muted-foreground border-border', icon: Power },
  unconfigured: { label: 'Missing Auth', className: 'text-amber-400 border-amber-400/30 bg-amber-400/10', icon: AlertTriangle },
};

// Which modules commonly use each type
const USAGE_HINTS: Record<ResourceType, string[]> = {
  telegram_bot: ['CRM Notifications', 'Automations', 'Broadcasts'],
  external_crm: ['CRM Sync', 'Analytics'],
  platform_ad: ['Dashboard', 'Reports', 'AI Ads', 'Automations'],
  platform_api: ['AI Ads Creative Studio', 'Content Plans'],
  sheet_url: ['Dashboard Sync', 'Automations', 'Reports'],
  gos_integration: ['Growth OS Sync'],
};

export default function ConnectionsCenterPage() {
  const navigate = useNavigate();
  const { data: resources = [], isLoading } = usePlatformResources();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Link2 className="h-6 w-6 text-primary" /> Connections Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Unified view of all platform connections, integrations, and reusable resources.
        </p>
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
            <p className="text-xs mt-1">Connect services from their respective module pages (CRM, AI Ads, Growth OS).</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => <ResourceRow key={r.id} resource={r} onNavigate={navigate} />)}
        </div>
      )}
    </div>
  );
}

function ResourceRow({ resource: r, onNavigate }: { resource: PlatformResource; onNavigate: (p: string) => void }) {
  const cfg = TYPE_CONFIG[r.type];
  const stCfg = STATUS_CONFIG[r.status];
  const Icon = cfg.icon;
  const StIcon = stCfg.icon;
  const usages = USAGE_HINTS[r.type] || [];

  return (
    <Card className="hover:border-border transition-colors">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cfg.color}15` }}>
          <Icon className="h-4.5 w-4.5" style={{ color: cfg.color }} />
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

        {/* Usages */}
        <div className="hidden md:flex items-center gap-1 flex-shrink-0">
          {usages.slice(0, 3).map(u => (
            <Badge key={u} variant="outline" className="text-[9px] h-4 px-1 border-border/30 text-muted-foreground/70">{u}</Badge>
          ))}
        </div>

        {/* Status */}
        <Badge variant="outline" className={cn('text-[10px] gap-1 flex-shrink-0', stCfg.className)}>
          <StIcon className="h-3 w-3" /> {stCfg.label}
        </Badge>

        {/* Actions */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => onNavigate(cfg.managePath)}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Manage in {cfg.label}</TooltipContent>
        </Tooltip>
      </CardContent>
    </Card>
  );
}
