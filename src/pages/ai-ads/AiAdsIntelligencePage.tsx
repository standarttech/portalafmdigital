import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain, Loader2, Search, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  BarChart3, Activity, TrendingUp, Zap, Eye, Clock, Ban, FileStack,
  ArrowLeft, Play, Lightbulb, Target, Shield,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGosAuditLog } from '@/hooks/useGosAuditLog';
import { toast } from 'sonner';

// ── Types ──

interface LaunchRequest {
  id: string; draft_id: string; client_id: string; ad_account_id: string | null;
  requested_by: string; status: string; platform: string;
  execution_status: string; external_campaign_id: string | null; external_ids: any;
  error_message: string | null; metadata: any; created_at: string;
  executed_at: string | null; notes: string;
}

interface Client { id: string; name: string; }

interface Anomaly {
  type: string; severity: 'critical' | 'warning' | 'info';
  title: string; detail: string; launchId: string; campaignId?: string;
}

interface PostLaunchRec {
  type: string; priority: 'high' | 'medium' | 'low';
  title: string; rationale: string; evidence: string; launchId: string;
}

// ── Anomaly detection rules ──

function detectAnomalies(launches: LaunchRequest[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const now = Date.now();

  for (const lr of launches) {
    const meta = lr.metadata || {};
    const metrics = meta.last_sync_metrics;
    const campaignStatus = meta.campaign_status;
    const executedAt = lr.executed_at ? new Date(lr.executed_at).getTime() : 0;
    const hoursSinceLaunch = executedAt ? (now - executedAt) / 3600000 : 0;

    // Launched but zero impressions after 24h
    if (metrics && metrics.impressions === 0 && hoursSinceLaunch > 24) {
      anomalies.push({
        type: 'no_delivery', severity: 'critical',
        title: 'No delivery after 24h',
        detail: `Campaign ${lr.external_campaign_id} has 0 impressions after ${Math.round(hoursSinceLaunch)}h since launch.`,
        launchId: lr.id, campaignId: lr.external_campaign_id || undefined,
      });
    }

    // Spend without results
    if (metrics && metrics.spend > 10 && metrics.leads === 0 && metrics.purchases === 0 && metrics.clicks < 5) {
      anomalies.push({
        type: 'spend_no_results', severity: 'warning',
        title: 'Spend without results',
        detail: `$${metrics.spend.toFixed(2)} spent but no leads, purchases, or meaningful clicks.`,
        launchId: lr.id, campaignId: lr.external_campaign_id || undefined,
      });
    }

    // CTR too low (< 0.5% after meaningful impressions)
    if (metrics && metrics.impressions > 1000 && metrics.ctr > 0 && metrics.ctr < 0.5) {
      anomalies.push({
        type: 'low_ctr', severity: 'warning',
        title: 'CTR below 0.5%',
        detail: `CTR is ${metrics.ctr.toFixed(2)}% with ${metrics.impressions} impressions. May indicate targeting or creative issues.`,
        launchId: lr.id, campaignId: lr.external_campaign_id || undefined,
      });
    }

    // CPC too high (> $10)
    if (metrics && metrics.cpc > 10 && metrics.clicks > 5) {
      anomalies.push({
        type: 'high_cpc', severity: 'warning',
        title: 'CPC above $10',
        detail: `CPC is $${metrics.cpc.toFixed(2)}. Consider reviewing audience, bidding, or creative quality.`,
        launchId: lr.id, campaignId: lr.external_campaign_id || undefined,
      });
    }

    // Partial launch — missing ads
    if (lr.execution_status === 'execution_partial') {
      const adsetCount = lr.external_ids?.adsets ? Object.keys(lr.external_ids.adsets).length : 0;
      const adCount = lr.external_ids?.ads ? Object.keys(lr.external_ids.ads).length : 0;
      if (adsetCount > 0 && adCount === 0) {
        anomalies.push({
          type: 'partial_no_ads', severity: 'critical',
          title: 'Ad sets created but no ads',
          detail: `${adsetCount} ad set(s) exist but 0 ads were created. Likely missing page_id or creative.`,
          launchId: lr.id, campaignId: lr.external_campaign_id || undefined,
        });
      }
    }

    // Campaign status rejected/disapproved by Meta
    if (campaignStatus && ['DISAPPROVED', 'WITH_ISSUES'].includes(campaignStatus)) {
      anomalies.push({
        type: 'platform_rejection', severity: 'critical',
        title: `Campaign ${campaignStatus}`,
        detail: `Meta reports campaign status: ${campaignStatus}. Review ad policies and content.`,
        launchId: lr.id, campaignId: lr.external_campaign_id || undefined,
      });
    }

    // Stale sync (> 24h since last sync for active campaign)
    const lastSync = meta.last_sync_at ? new Date(meta.last_sync_at).getTime() : 0;
    if (lastSync && (now - lastSync) > 24 * 3600000 && campaignStatus === 'ACTIVE') {
      anomalies.push({
        type: 'stale_sync', severity: 'info',
        title: 'Stale performance data',
        detail: `Last synced ${Math.round((now - lastSync) / 3600000)}h ago. Run sync to update.`,
        launchId: lr.id, campaignId: lr.external_campaign_id || undefined,
      });
    }

    // No sync at all
    if (!meta.last_sync_at && lr.external_campaign_id && hoursSinceLaunch > 2) {
      anomalies.push({
        type: 'never_synced', severity: 'info',
        title: 'Never synced',
        detail: `Campaign was launched ${Math.round(hoursSinceLaunch)}h ago but has never been synced.`,
        launchId: lr.id, campaignId: lr.external_campaign_id || undefined,
      });
    }
  }

  return anomalies;
}

// ── Post-launch recommendation generation ──

function generatePostLaunchRecs(launches: LaunchRequest[]): PostLaunchRec[] {
  const recs: PostLaunchRec[] = [];

  for (const lr of launches) {
    const meta = lr.metadata || {};
    const metrics = meta.last_sync_metrics;
    if (!metrics) continue;

    // No delivery check
    if (metrics.impressions === 0 && metrics.spend === 0) {
      recs.push({
        type: 'no_delivery_check', priority: 'high',
        title: 'Investigate zero delivery',
        rationale: 'Campaign has no impressions or spend. May be paused, blocked, or have targeting issues.',
        evidence: 'Impressions: 0, Spend: $0',
        launchId: lr.id,
      });
    }

    // Good CTR + good results → increase budget
    if (metrics.ctr > 1.5 && metrics.leads > 3 && metrics.spend > 5) {
      const cpl = metrics.spend / metrics.leads;
      recs.push({
        type: 'increase_budget', priority: 'medium',
        title: 'Consider increasing budget',
        rationale: `Strong CTR (${metrics.ctr.toFixed(1)}%) and ${metrics.leads} leads at $${cpl.toFixed(2)} CPL.`,
        evidence: `CTR: ${metrics.ctr.toFixed(2)}%, Leads: ${metrics.leads}, CPL: $${cpl.toFixed(2)}`,
        launchId: lr.id,
      });
    }

    // High spend low results → reduce or pause
    if (metrics.spend > 50 && metrics.leads === 0 && metrics.purchases === 0) {
      recs.push({
        type: 'pause_loser', priority: 'high',
        title: 'Consider pausing campaign',
        rationale: `$${metrics.spend.toFixed(2)} spent with zero conversions.`,
        evidence: `Spend: $${metrics.spend.toFixed(2)}, Leads: 0, Purchases: 0`,
        launchId: lr.id,
      });
    }

    // Low CTR → fix creative/targeting
    if (metrics.impressions > 500 && metrics.ctr < 0.5) {
      recs.push({
        type: 'fix_creative_issue', priority: 'medium',
        title: 'Review creative or targeting',
        rationale: `Low CTR (${metrics.ctr.toFixed(2)}%) suggests ad creative or audience mismatch.`,
        evidence: `Impressions: ${metrics.impressions}, CTR: ${metrics.ctr.toFixed(2)}%`,
        launchId: lr.id,
      });
    }

    // Partial launch → relaunch
    if (lr.execution_status === 'execution_partial') {
      recs.push({
        type: 'relaunch_with_changes', priority: 'high',
        title: 'Relaunch with fixes',
        rationale: 'Partial execution — some entities failed to create. Fix issues and relaunch.',
        evidence: `Execution status: ${lr.execution_status}`,
        launchId: lr.id,
      });
    }

    // Platform rejection → investigate
    if (meta.campaign_status && ['DISAPPROVED', 'WITH_ISSUES'].includes(meta.campaign_status)) {
      recs.push({
        type: 'investigate_rejection', priority: 'high',
        title: 'Investigate platform rejection',
        rationale: `Campaign reported as ${meta.campaign_status} by Meta.`,
        evidence: `Platform status: ${meta.campaign_status}`,
        launchId: lr.id,
      });
    }
  }

  return recs;
}

// ── Health helpers ──

type HealthStatus = 'active' | 'paused' | 'no_delivery' | 'spending' | 'partial' | 'failed' | 'stale' | 'unknown';

function getHealthStatus(lr: LaunchRequest): HealthStatus {
  const meta = lr.metadata || {};
  if (lr.execution_status === 'execution_partial') return 'partial';
  if (lr.execution_status === 'execution_failed') return 'failed';
  if (meta.campaign_status === 'ACTIVE') {
    if (meta.last_sync_metrics?.impressions > 0) return meta.last_sync_metrics.spend > 0 ? 'spending' : 'active';
    return 'no_delivery';
  }
  if (meta.campaign_status === 'PAUSED') return 'paused';
  if (!meta.last_sync_at) return 'unknown';
  return 'stale';
}

const healthLabels: Record<HealthStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'text-emerald-400 border-emerald-400/30' },
  paused: { label: 'Paused', color: 'text-muted-foreground border-muted-foreground/30' },
  no_delivery: { label: 'No Delivery', color: 'text-destructive border-destructive/30' },
  spending: { label: 'Spending', color: 'text-emerald-400 border-emerald-400/30' },
  partial: { label: 'Partial Launch', color: 'text-amber-400 border-amber-400/30' },
  failed: { label: 'Failed', color: 'text-destructive border-destructive/30' },
  stale: { label: 'Stale Data', color: 'text-amber-400 border-amber-400/30' },
  unknown: { label: 'Not Synced', color: 'text-muted-foreground border-muted-foreground/30' },
};

const severityColors: Record<string, string> = {
  critical: 'text-destructive border-destructive/30 bg-destructive/5',
  warning: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  info: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
};

const recPriorityColors: Record<string, string> = {
  high: 'text-destructive border-destructive/30',
  medium: 'text-amber-400 border-amber-400/30',
  low: 'text-muted-foreground border-muted-foreground/30',
};

// ── Main Page ──

export default function AiAdsIntelligencePage() {
  const { user } = useAuth();
  const { logGosAction } = useGosAuditLog();
  const [launches, setLaunches] = useState<LaunchRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [filterHealth, setFilterHealth] = useState('all');
  const [selectedLaunch, setSelectedLaunch] = useState<LaunchRequest | null>(null);
  const [activeTab, setActiveTab] = useState('health');

  const load = useCallback(async () => {
    const [lRes, cRes] = await Promise.all([
      supabase.from('launch_requests' as any).select('*')
        .in('status', ['completed', 'failed'])
        .not('external_campaign_id', 'is', null)
        .order('executed_at', { ascending: false }).limit(200),
      supabase.from('clients').select('id, name').order('name'),
    ]);
    setLaunches((lRes.data as any[]) || []);
    setClients(cRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || 'Unknown';

  const syncAll = async () => {
    setSyncing(true);
    logGosAction('sync_start', 'launched_campaigns', undefined, 'Sync all launched campaigns');
    try {
      const { data, error } = await supabase.functions.invoke('sync-launched-campaigns', {
        body: filterClient !== 'all' ? { client_id: filterClient } : {},
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      logGosAction('sync_complete', 'launched_campaigns', undefined, `Synced ${data.synced}/${data.total}`, { metadata: { synced: data.synced, failed: data.failed } });
      toast.success(`Synced ${data.synced} of ${data.total} campaigns${data.failed ? ` (${data.failed} failed)` : ''}`);
      await load();
    } catch (e: any) {
      logGosAction('sync_failed', 'launched_campaigns', undefined, e.message);
      toast.error('Sync failed: ' + e.message);
    } finally { setSyncing(false); }
  };

  const syncOne = async (lrId: string) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-launched-campaigns', {
        body: { launch_request_id: lrId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success('Campaign synced');
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setSyncing(false); }
  };

  const filtered = launches.filter(lr => {
    if (filterClient !== 'all' && lr.client_id !== filterClient) return false;
    if (filterHealth !== 'all' && getHealthStatus(lr) !== filterHealth) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!lr.id.includes(s) && !(lr.external_campaign_id || '').includes(s) && !clientName(lr.client_id).toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const anomalies = detectAnomalies(filtered);
  const recommendations = generatePostLaunchRecs(filtered);

  // Health counts
  const healthCounts: Record<string, number> = {};
  filtered.forEach(lr => { const h = getHealthStatus(lr); healthCounts[h] = (healthCounts[h] || 0) + 1; });

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const warningCount = anomalies.filter(a => a.severity === 'warning').length;
  const syncedCount = filtered.filter(lr => lr.metadata?.last_sync_at).length;
  const notSyncedCount = filtered.length - syncedCount;

  if (selectedLaunch) {
    return <CampaignDetail lr={selectedLaunch} clientName={clientName(selectedLaunch.client_id)}
      anomalies={anomalies.filter(a => a.launchId === selectedLaunch.id)}
      recs={recommendations.filter(r => r.launchId === selectedLaunch.id)}
      onBack={() => setSelectedLaunch(null)} onSync={() => syncOne(selectedLaunch.id)} syncing={syncing} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-cyan-400" /> Post-Launch Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Campaign health, performance sync, anomaly detection, and optimization insights</p>
        </div>
        <Button size="sm" className="gap-2" onClick={syncAll} disabled={syncing || launches.length === 0}>
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync All
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
          <p className="text-xs text-muted-foreground">Launched</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{syncedCount}</p>
          <p className="text-xs text-muted-foreground">Synced</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{notSyncedCount}</p>
          <p className="text-xs text-muted-foreground">Not Synced</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-destructive">{criticalCount}</p>
          <p className="text-xs text-muted-foreground">Critical Issues</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{warningCount}</p>
          <p className="text-xs text-muted-foreground">Warnings</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-cyan-400">{recommendations.length}</p>
          <p className="text-xs text-muted-foreground">Recommendations</p>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="health" className="gap-1.5 text-xs"><Activity className="h-3.5 w-3.5" /> Campaign Health ({filtered.length})</TabsTrigger>
          <TabsTrigger value="anomalies" className="gap-1.5 text-xs"><AlertTriangle className="h-3.5 w-3.5" /> Anomalies ({anomalies.length})</TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-1.5 text-xs"><Lightbulb className="h-3.5 w-3.5" /> Recommendations ({recommendations.length})</TabsTrigger>
        </TabsList>

        {/* Health Tab */}
        <TabsContent value="health">
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterHealth} onValueChange={setFilterHealth}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Health</SelectItem>
                  {Object.entries(healthLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Health breakdown bar */}
            {Object.keys(healthCounts).length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {Object.entries(healthCounts).map(([h, count]) => (
                  <Badge key={h} variant="outline" className={`gap-1 text-xs ${healthLabels[h as HealthStatus]?.color || ''}`}>
                    {healthLabels[h as HealthStatus]?.label || h}: {count}
                  </Badge>
                ))}
              </div>
            )}

            {filtered.length === 0 ? (
              <Card><CardContent className="py-16 text-center">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Launched Campaigns</h3>
                <p className="text-sm text-muted-foreground">Execute a campaign draft to see post-launch intelligence here.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {filtered.map(lr => {
                  const health = getHealthStatus(lr);
                  const hc = healthLabels[health];
                  const meta = lr.metadata || {};
                  const metrics = meta.last_sync_metrics;
                  const hasCritical = anomalies.some(a => a.launchId === lr.id && a.severity === 'critical');
                  const recCount = recommendations.filter(r => r.launchId === lr.id).length;

                  return (
                    <Card key={lr.id} className={`hover:border-primary/20 transition-colors cursor-pointer ${hasCritical ? 'border-destructive/20' : ''}`}
                      onClick={() => setSelectedLaunch(lr)}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-sm text-foreground">#{lr.id.slice(0, 8)}</span>
                              <Badge variant="outline" className={`gap-1 text-[10px] ${hc.color}`}>{hc.label}</Badge>
                              <Badge variant="secondary" className="text-[10px]">{lr.platform}</Badge>
                              {hasCritical && <Badge variant="destructive" className="text-[9px]">⚠ Issues</Badge>}
                              {recCount > 0 && <Badge variant="outline" className="text-[9px] text-cyan-400 border-cyan-400/30">{recCount} recs</Badge>}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{clientName(lr.client_id)}</span>
                              {lr.external_campaign_id && <span className="font-mono text-emerald-400">#{lr.external_campaign_id}</span>}
                              {lr.executed_at && <span>Launched {new Date(lr.executed_at).toLocaleDateString()}</span>}
                            </div>
                            {metrics && (
                              <div className="flex items-center gap-4 mt-2 text-xs">
                                <span className="text-foreground"><span className="text-muted-foreground">Spend:</span> ${metrics.spend?.toFixed(2) || '0'}</span>
                                <span className="text-foreground"><span className="text-muted-foreground">Impr:</span> {metrics.impressions?.toLocaleString() || '0'}</span>
                                <span className="text-foreground"><span className="text-muted-foreground">Clicks:</span> {metrics.clicks || '0'}</span>
                                <span className="text-foreground"><span className="text-muted-foreground">CTR:</span> {metrics.ctr?.toFixed(2) || '0'}%</span>
                                {metrics.leads > 0 && <span className="text-emerald-400">Leads: {metrics.leads}</span>}
                                {metrics.purchases > 0 && <span className="text-emerald-400">Purchases: {metrics.purchases}</span>}
                              </div>
                            )}
                            {!meta.last_sync_at && (
                              <p className="text-[10px] text-muted-foreground mt-1">Not synced yet — click Sync to fetch metrics</p>
                            )}
                            {meta.last_sync_at && (
                              <p className="text-[10px] text-muted-foreground/60 mt-1">Synced {new Date(meta.last_sync_at).toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Anomalies Tab */}
        <TabsContent value="anomalies">
          {anomalies.length === 0 ? (
            <Card><CardContent className="py-16 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-400/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Anomalies Detected</h3>
              <p className="text-sm text-muted-foreground">All launched campaigns look healthy. Sync regularly to keep anomaly detection current.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {anomalies.sort((a, b) => {
                const order = { critical: 0, warning: 1, info: 2 };
                return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
              }).map((a, i) => (
                <Card key={i} className={`${severityColors[a.severity]} border`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${a.severity === 'critical' ? 'text-destructive' : a.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{a.title}</span>
                        <Badge variant="outline" className={`text-[9px] ${a.severity === 'critical' ? 'text-destructive border-destructive/30' : a.severity === 'warning' ? 'text-amber-400 border-amber-400/30' : 'text-blue-400 border-blue-400/30'}`}>{a.severity}</Badge>
                        <Badge variant="secondary" className="text-[9px]">{a.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{a.detail}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">Launch #{a.launchId.slice(0, 8)}{a.campaignId ? ` · Campaign ${a.campaignId}` : ''}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => {
                      const lr = launches.find(l => l.id === a.launchId);
                      if (lr) setSelectedLaunch(lr);
                    }}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations">
          {recommendations.length === 0 ? (
            <Card><CardContent className="py-16 text-center">
              <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Recommendations Yet</h3>
              <p className="text-sm text-muted-foreground">Sync campaign metrics to generate data-driven recommendations.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {recommendations.sort((a, b) => {
                const order = { high: 0, medium: 1, low: 2 };
                return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
              }).map((r, i) => (
                <Card key={i}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <Lightbulb className={`h-4 w-4 mt-0.5 shrink-0 ${r.priority === 'high' ? 'text-destructive' : r.priority === 'medium' ? 'text-amber-400' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{r.title}</span>
                        <Badge variant="outline" className={`text-[9px] ${recPriorityColors[r.priority]}`}>{r.priority}</Badge>
                        <Badge variant="secondary" className="text-[9px]">{r.type.replace(/_/g, ' ')}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{r.rationale}</p>
                      <p className="text-[10px] text-foreground/60 mt-0.5">Evidence: {r.evidence}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">Launch #{r.launchId.slice(0, 8)}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => {
                      const lr = launches.find(l => l.id === r.launchId);
                      if (lr) setSelectedLaunch(lr);
                    }}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Campaign Detail Panel ──

function CampaignDetail({ lr, clientName, anomalies, recs, onBack, onSync, syncing }: {
  lr: LaunchRequest; clientName: string; anomalies: Anomaly[]; recs: PostLaunchRec[];
  onBack: () => void; onSync: () => void; syncing: boolean;
}) {
  const { user } = useAuth();
  const { logGosAction } = useGosAuditLog();
  const [creatingReview, setCreatingReview] = useState(false);

  const meta = lr.metadata || {};
  const metrics = meta.last_sync_metrics;
  const health = getHealthStatus(lr);
  const hc = healthLabels[health];

  const createOptimizationReview = async () => {
    if (!user || creatingReview) return;
    setCreatingReview(true);
    try {
      // Check existing
      const { data: existing } = await supabase.from('ai_campaign_sessions' as any)
        .select('id')
        .eq('client_id', lr.client_id)
        .eq('session_type', 'optimization_review')
        .filter('metadata->>source_launch_request_id', 'eq', lr.id)
        .limit(1);
      if (existing && existing.length > 0) {
        toast.info('Optimization review already exists for this campaign');
        setCreatingReview(false);
        return;
      }

      const metricsStr = metrics
        ? `Spend: $${metrics.spend}, Impressions: ${metrics.impressions}, Clicks: ${metrics.clicks}, CTR: ${metrics.ctr?.toFixed(2)}%, CPC: $${metrics.cpc?.toFixed(2)}, Leads: ${metrics.leads}, Purchases: ${metrics.purchases}`
        : 'No performance data synced yet.';

      const anomalyStr = anomalies.length > 0
        ? '\n\nDetected issues:\n' + anomalies.map(a => `- [${a.severity}] ${a.title}: ${a.detail}`).join('\n')
        : '';

      const recStr = recs.length > 0
        ? '\n\nPre-generated recommendations:\n' + recs.map(r => `- [${r.priority}] ${r.title}: ${r.rationale}`).join('\n')
        : '';

      const prompt = `Post-launch optimization review for campaign (${lr.platform}).
External Campaign ID: ${lr.external_campaign_id || 'N/A'}
Execution status: ${lr.execution_status}
Campaign health: ${health}
Platform status: ${meta.campaign_status || 'unknown'}

Performance metrics (last 7 days):
${metricsStr}
${anomalyStr}
${recStr}

Analyze the campaign performance, validate the detected issues, and provide specific, actionable optimization recommendations. Consider budget adjustments, targeting changes, creative improvements, and structural modifications.`;

      const { data: sess, error } = await supabase.from('ai_campaign_sessions' as any).insert({
        client_id: lr.client_id,
        title: `Post-Launch Review: Campaign #${lr.external_campaign_id || lr.id.slice(0, 8)}`,
        created_by: user.id,
        session_type: 'optimization_review',
        metadata: {
          source_launch_request_id: lr.id,
          external_campaign_id: lr.external_campaign_id,
          external_ids: lr.external_ids,
          platform: lr.platform,
          performance_metrics: metrics,
          anomaly_count: anomalies.length,
          health_status: health,
        },
      }).select().single();
      if (error) throw error;

      await supabase.from('ai_analysis_runs' as any).insert({
        session_id: (sess as any).id,
        client_id: lr.client_id,
        created_by: user.id,
        prompt,
        analysis_type: 'optimization_review',
        status: 'queued',
      });

      logGosAction('create_optimization_review', 'launch_request', lr.id, `Data-aware review for #${lr.id.slice(0, 8)}`, {
        clientId: lr.client_id,
        metadata: { sessionId: (sess as any).id, hasMetrics: !!metrics, anomalyCount: anomalies.length },
      });
      toast.success('Optimization review created with performance data — go to AI Analysis to run it');
    } catch (e: any) { toast.error(e.message); } finally { setCreatingReview(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg text-foreground">Campaign #{lr.external_campaign_id || lr.id.slice(0, 8)}</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{clientName}</span><span>·</span><span>{lr.platform}</span>
            {lr.executed_at && <><span>·</span><span>Launched {new Date(lr.executed_at).toLocaleString()}</span></>}
          </div>
        </div>
        <Badge variant="outline" className={`gap-1 ${hc.color}`}>{hc.label}</Badge>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onSync} disabled={syncing}>
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Sync
        </Button>
      </div>

      {/* Metrics card */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-cyan-400" /> Performance Metrics</CardTitle></CardHeader>
        <CardContent>
          {!metrics ? (
            <div className="py-6 text-center">
              <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No performance data synced yet. Click Sync to fetch metrics from Meta.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Spend', value: `$${metrics.spend?.toFixed(2)}`, icon: Target },
                { label: 'Impressions', value: metrics.impressions?.toLocaleString(), icon: Eye },
                { label: 'Clicks', value: metrics.clicks?.toLocaleString(), icon: Zap },
                { label: 'CTR', value: `${metrics.ctr?.toFixed(2)}%`, icon: TrendingUp },
                { label: 'CPC', value: `$${metrics.cpc?.toFixed(2)}`, icon: Target },
                { label: 'Leads', value: metrics.leads, icon: CheckCircle2 },
                { label: 'Purchases', value: metrics.purchases, icon: CheckCircle2 },
                { label: 'Revenue', value: `$${metrics.revenue?.toFixed(2)}`, icon: TrendingUp },
              ].map((m, i) => (
                <div key={i} className="text-center">
                  <p className="text-lg font-bold text-foreground">{m.value}</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
          )}
          {meta.last_sync_at && (
            <p className="text-[10px] text-muted-foreground/60 mt-3 text-right">Last synced: {new Date(meta.last_sync_at).toLocaleString()}</p>
          )}
        </CardContent>
      </Card>

      {/* Entity statuses */}
      {(meta.campaign_status || meta.adset_statuses || meta.ad_statuses) && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-blue-400" /> Entity Statuses</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {meta.campaign_status && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-xs text-muted-foreground">Campaign:</span>
                <Badge variant="secondary" className="text-[9px]">{meta.campaign_status}</Badge>
                <span className="text-[10px] font-mono text-emerald-400">{lr.external_campaign_id}</span>
              </div>
            )}
            {meta.adset_statuses && Object.entries(meta.adset_statuses).map(([id, status]) => (
              <div key={id} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                <span className="text-xs text-muted-foreground">Ad Set:</span>
                <Badge variant="secondary" className="text-[9px]">{String(status)}</Badge>
                <span className="text-[10px] font-mono text-blue-400">{id}</span>
              </div>
            ))}
            {meta.ad_statuses && Object.entries(meta.ad_statuses).map(([id, status]) => (
              <div key={id} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-violet-400 shrink-0" />
                <span className="text-xs text-muted-foreground">Ad:</span>
                <Badge variant="secondary" className="text-[9px]">{String(status)}</Badge>
                <span className="text-[10px] font-mono text-violet-400">{id}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <Card className="border-destructive/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" /> Detected Issues ({anomalies.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {anomalies.map((a, i) => (
              <div key={i} className={`p-2 rounded-lg border ${severityColors[a.severity]}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">{a.title}</span>
                  <Badge variant="outline" className="text-[9px]">{a.severity}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{a.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-400" /> Recommendations ({recs.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recs.map((r, i) => (
              <div key={i} className="p-2 rounded-lg border border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">{r.title}</span>
                  <Badge variant="outline" className={`text-[9px] ${recPriorityColors[r.priority]}`}>{r.priority}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{r.rationale}</p>
                <p className="text-[10px] text-foreground/50 mt-0.5">Evidence: {r.evidence}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className="border-cyan-400/20">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-cyan-400" /> Optimization Actions</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={createOptimizationReview} disabled={creatingReview}>
            {creatingReview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            Create AI Optimization Review
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onSync} disabled={syncing}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Metrics
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
