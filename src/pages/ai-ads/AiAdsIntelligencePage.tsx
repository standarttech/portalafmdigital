import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain, Loader2, Search, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  BarChart3, Activity, TrendingUp, Zap, Eye, Clock, Ban, FileStack,
  ArrowLeft, Play, Lightbulb, Target, Shield, Copy, Rocket,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGosAuditLog } from '@/hooks/useGosAuditLog';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';

// ── Types ──

interface LaunchRequest {
  id: string; draft_id: string; client_id: string; ad_account_id: string | null;
  requested_by: string; status: string; platform: string;
  execution_status: string; external_campaign_id: string | null; external_ids: any;
  error_message: string | null; metadata: any; created_at: string;
  executed_at: string | null; notes: string;
}

interface Snapshot {
  id: string; client_id: string; launch_request_id: string | null;
  platform: string; entity_level: string; external_campaign_id: string | null;
  external_adset_id: string | null; external_ad_id: string | null;
  entity_name: string | null; entity_status: string | null;
  spend: number; impressions: number; clicks: number; ctr: number; cpc: number;
  leads: number; purchases: number; revenue: number;
  date_window_start: string | null; date_window_end: string | null;
  synced_at: string; created_at: string;
}

interface Recommendation {
  id: string; title: string; description: string; recommendation_type: string;
  priority: string; status: string; client_id: string; metadata: any; created_at: string;
}

interface Client { id: string; name: string; }

interface Anomaly {
  type: string; severity: 'critical' | 'warning' | 'info';
  title: string; detail: string; launchId: string; campaignId?: string;
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

    if (metrics && metrics.impressions === 0 && hoursSinceLaunch > 24) {
      anomalies.push({ type: 'no_delivery', severity: 'critical', title: 'No delivery after 24h',
        detail: `Campaign ${lr.external_campaign_id} has 0 impressions after ${Math.round(hoursSinceLaunch)}h since launch.`,
        launchId: lr.id, campaignId: lr.external_campaign_id || undefined });
    }
    if (metrics && metrics.spend > 10 && metrics.leads === 0 && metrics.purchases === 0 && metrics.clicks < 5) {
      anomalies.push({ type: 'spend_no_results', severity: 'warning', title: 'Spend without results',
        detail: `$${metrics.spend.toFixed(2)} spent but no leads, purchases, or meaningful clicks.`,
        launchId: lr.id, campaignId: lr.external_campaign_id || undefined });
    }
    if (metrics && metrics.impressions > 1000 && metrics.ctr > 0 && metrics.ctr < 0.5) {
      anomalies.push({ type: 'low_ctr', severity: 'warning', title: 'CTR below 0.5%',
        detail: `CTR is ${metrics.ctr.toFixed(2)}% with ${metrics.impressions} impressions.`,
        launchId: lr.id, campaignId: lr.external_campaign_id || undefined });
    }
    if (metrics && metrics.cpc > 10 && metrics.clicks > 5) {
      anomalies.push({ type: 'high_cpc', severity: 'warning', title: 'CPC above $10',
        detail: `CPC is $${metrics.cpc.toFixed(2)}. Review audience or creative.`,
        launchId: lr.id, campaignId: lr.external_campaign_id || undefined });
    }
    if (lr.execution_status === 'execution_partial') {
      const adsetCount = lr.external_ids?.adsets ? Object.keys(lr.external_ids.adsets).length : 0;
      const adCount = lr.external_ids?.ads ? Object.keys(lr.external_ids.ads).length : 0;
      if (adsetCount > 0 && adCount === 0) {
        anomalies.push({ type: 'partial_no_ads', severity: 'critical', title: 'Ad sets created but no ads',
          detail: `${adsetCount} ad set(s) exist but 0 ads were created.`,
          launchId: lr.id, campaignId: lr.external_campaign_id || undefined });
      }
    }
    if (campaignStatus && ['DISAPPROVED', 'WITH_ISSUES'].includes(campaignStatus)) {
      anomalies.push({ type: 'platform_rejection', severity: 'critical', title: `Campaign ${campaignStatus}`,
        detail: `Meta reports campaign status: ${campaignStatus}.`,
        launchId: lr.id, campaignId: lr.external_campaign_id || undefined });
    }
    const lastSync = meta.last_sync_at ? new Date(meta.last_sync_at).getTime() : 0;
    if (lastSync && (now - lastSync) > 24 * 3600000 && campaignStatus === 'ACTIVE') {
      anomalies.push({ type: 'stale_sync', severity: 'info', title: 'Stale performance data',
        detail: `Last synced ${Math.round((now - lastSync) / 3600000)}h ago.`,
        launchId: lr.id, campaignId: lr.external_campaign_id || undefined });
    }
    if (!meta.last_sync_at && lr.external_campaign_id && hoursSinceLaunch > 2) {
      anomalies.push({ type: 'never_synced', severity: 'info', title: 'Never synced',
        detail: `Campaign launched ${Math.round(hoursSinceLaunch)}h ago but never synced.`,
        launchId: lr.id, campaignId: lr.external_campaign_id || undefined });
    }
  }
  return anomalies;
}

// ── Health helpers ──

type HealthStatus = 'active' | 'paused' | 'no_delivery' | 'spending' | 'partial' | 'failed' | 'stale' | 'unknown';

function getHealthStatus(lr: LaunchRequest): HealthStatus {
  const meta = lr.metadata || {};
  const metrics = meta.last_sync_metrics;
  if (lr.execution_status === 'execution_partial') return 'partial';
  if (lr.execution_status === 'execution_failed') return 'failed';
  if (!meta.last_sync_at) return 'unknown';
  if (meta.campaign_status === 'ACTIVE') {
    if (metrics && metrics.impressions > 0) return metrics.spend > 0 ? 'spending' : 'active';
    return 'no_delivery';
  }
  if (meta.campaign_status === 'PAUSED') return 'paused';
  const lastSync = new Date(meta.last_sync_at).getTime();
  if ((Date.now() - lastSync) > 48 * 3600000) return 'stale';
  return 'unknown';
}

function getHealthScore(lr: LaunchRequest, anomalies: Anomaly[]): { score: number; label: string; reasons: string[] } {
  const lrAnomalies = anomalies.filter(a => a.launchId === lr.id);
  const critical = lrAnomalies.filter(a => a.severity === 'critical').length;
  const warnings = lrAnomalies.filter(a => a.severity === 'warning').length;
  const health = getHealthStatus(lr);
  const reasons: string[] = [];
  let score = 100;

  if (health === 'failed') { score -= 50; reasons.push('Execution failed'); }
  if (health === 'partial') { score -= 30; reasons.push('Partial execution'); }
  if (health === 'no_delivery') { score -= 40; reasons.push('No delivery'); }
  if (health === 'stale') { score -= 10; reasons.push('Stale data'); }
  score -= critical * 20;
  score -= warnings * 10;
  if (critical > 0) reasons.push(`${critical} critical issue(s)`);
  if (warnings > 0) reasons.push(`${warnings} warning(s)`);

  score = Math.max(0, Math.min(100, score));
  const label = score >= 80 ? 'healthy' : score >= 50 ? 'needs_attention' : 'critical';
  return { score, label, reasons };
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

const scoreColors: Record<string, string> = {
  healthy: 'text-emerald-400',
  needs_attention: 'text-amber-400',
  critical: 'text-destructive',
};

// ── Main Page ──

export default function AiAdsIntelligencePage() {
  const { user } = useAuth();
  const { logGosAction } = useGosAuditLog();
  const { language } = useLanguage();
  const isRu = language === 'ru';
  const [launches, setLaunches] = useState<LaunchRequest[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [optRecs, setOptRecs] = useState<Recommendation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [filterHealth, setFilterHealth] = useState('all');
  const [selectedLaunch, setSelectedLaunch] = useState<LaunchRequest | null>(null);
  const [activeTab, setActiveTab] = useState('health');

  const load = useCallback(async () => {
    const [lRes, cRes, sRes, rRes] = await Promise.all([
      supabase.from('launch_requests' as any).select('*')
        .in('status', ['completed', 'failed'])
        .not('external_campaign_id', 'is', null)
        .order('executed_at', { ascending: false }).limit(200),
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('campaign_performance_snapshots').select('*')
        .eq('entity_level', 'campaign')
        .order('synced_at', { ascending: false }).limit(500),
      supabase.from('ai_recommendations').select('*')
        .in('status', ['new', 'reviewed'])
        .order('created_at', { ascending: false }).limit(200),
    ]);
    setLaunches((lRes.data as any[]) || []);
    setClients(cRes.data || []);
    setSnapshots((sRes.data as any[]) || []);
    setOptRecs((rRes.data as any[]) || []);
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
      const { data, error } = await supabase.functions.invoke('sync-launched-campaigns', { body: { launch_request_id: lrId } });
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

  const healthCounts: Record<string, number> = {};
  filtered.forEach(lr => { const h = getHealthStatus(lr); healthCounts[h] = (healthCounts[h] || 0) + 1; });

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const warningCount = anomalies.filter(a => a.severity === 'warning').length;
  const syncedCount = filtered.filter(lr => lr.metadata?.last_sync_at).length;
  const notSyncedCount = filtered.length - syncedCount;
  const autoRecCount = optRecs.filter(r => r.metadata?.source === 'auto_sync').length;

  // Last sync time from snapshots
  const lastSyncTime = snapshots.length > 0 ? snapshots[0].synced_at : null;

  if (selectedLaunch) {
    return <CampaignDetail lr={selectedLaunch} clientName={clientName(selectedLaunch.client_id)}
      anomalies={anomalies.filter(a => a.launchId === selectedLaunch.id)}
      snapshots={snapshots.filter(s => s.launch_request_id === selectedLaunch.id)}
      onBack={() => setSelectedLaunch(null)} onSync={() => syncOne(selectedLaunch.id)} syncing={syncing} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-cyan-400" /> {isRu ? 'Пост-запуск аналитика' : 'Post-Launch Intelligence'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{isRu ? 'Мониторинг здоровья кампаний, метрики, обнаружение аномалий' : 'Campaign health, performance metrics, anomaly detection, optimization queue'}</p>
        </div>
        <div className="flex items-center gap-2">
          {lastSyncTime && <span className="text-[10px] text-muted-foreground">Last sync: {new Date(lastSyncTime).toLocaleString()}</span>}
          <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-400/30">Hourly auto-sync enabled</Badge>
          <Button size="sm" className="gap-2" onClick={syncAll} disabled={syncing || launches.length === 0}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync Now
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
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
          <p className="text-xs text-muted-foreground">Critical</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{warningCount}</p>
          <p className="text-xs text-muted-foreground">Warnings</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-cyan-400">{autoRecCount}</p>
          <p className="text-xs text-muted-foreground">Auto Recs</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{snapshots.length}</p>
          <p className="text-xs text-muted-foreground">Snapshots</p>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="health" className="gap-1.5 text-xs"><Activity className="h-3.5 w-3.5" /> Health ({filtered.length})</TabsTrigger>
          <TabsTrigger value="anomalies" className="gap-1.5 text-xs"><AlertTriangle className="h-3.5 w-3.5" /> Anomalies ({anomalies.length})</TabsTrigger>
          <TabsTrigger value="queue" className="gap-1.5 text-xs"><Lightbulb className="h-3.5 w-3.5" /> Optimization Queue ({optRecs.length})</TabsTrigger>
          <TabsTrigger value="metrics" className="gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" /> Metrics ({snapshots.length})</TabsTrigger>
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
                {filtered.sort((a, b) => {
                  const sa = getHealthScore(a, anomalies).score;
                  const sb = getHealthScore(b, anomalies).score;
                  return sa - sb; // worst first
                }).map(lr => {
                  const health = getHealthStatus(lr);
                  const hc = healthLabels[health];
                  const meta = lr.metadata || {};
                  const metrics = meta.last_sync_metrics;
                  const hs = getHealthScore(lr, anomalies);

                  return (
                    <Card key={lr.id} className={`hover:border-primary/20 transition-colors cursor-pointer ${hs.label === 'critical' ? 'border-destructive/20' : ''}`}
                      onClick={() => setSelectedLaunch(lr)}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`text-lg font-bold w-10 text-center ${scoreColors[hs.label]}`}>{hs.score}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-sm text-foreground">#{lr.id.slice(0, 8)}</span>
                              <Badge variant="outline" className={`gap-1 text-[10px] ${hc.color}`}>{hc.label}</Badge>
                              <Badge variant="secondary" className="text-[10px]">{lr.platform}</Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{clientName(lr.client_id)}</span>
                              {lr.external_campaign_id && <span className="font-mono text-emerald-400">#{lr.external_campaign_id}</span>}
                              {lr.executed_at && <span>Launched {new Date(lr.executed_at).toLocaleDateString()}</span>}
                            </div>
                            {metrics && (
                              <div className="flex items-center gap-4 mt-2 text-xs">
                                <span><span className="text-muted-foreground">Spend:</span> ${metrics.spend?.toFixed(2) || '0'}</span>
                                <span><span className="text-muted-foreground">Impr:</span> {metrics.impressions?.toLocaleString() || '0'}</span>
                                <span><span className="text-muted-foreground">CTR:</span> {metrics.ctr?.toFixed(2) || '0'}%</span>
                                {metrics.leads > 0 && <span className="text-emerald-400">Leads: {metrics.leads}</span>}
                              </div>
                            )}
                            {hs.reasons.length > 0 && <p className="text-[10px] text-muted-foreground mt-1">{hs.reasons.join(' · ')}</p>}
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
              <p className="text-sm text-muted-foreground">All campaigns look healthy.</p>
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
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{a.detail}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">Launch #{a.launchId.slice(0, 8)}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => {
                      const lr = launches.find(l => l.id === a.launchId);
                      if (lr) setSelectedLaunch(lr);
                    }}><Eye className="h-3.5 w-3.5" /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Optimization Queue Tab */}
        <TabsContent value="queue">
          <OptimizationQueue recs={optRecs} clients={clients} clientName={clientName} onRefresh={load} />
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics">
          <MetricsExplorer snapshots={snapshots} clients={clients} clientName={clientName} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Optimization Queue ──

function OptimizationQueue({ recs, clients, clientName, onRefresh }: {
  recs: Recommendation[]; clients: Client[]; clientName: (id: string) => string; onRefresh: () => void;
}) {
  const { user } = useAuth();
  const { logGosAction } = useGosAuditLog();
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const filtered = recs.filter(r => {
    if (filterType !== 'all' && r.recommendation_type !== filterType) return false;
    if (filterPriority !== 'all' && r.priority !== filterPriority) return false;
    return true;
  }).sort((a, b) => {
    const po = { high: 0, medium: 1, low: 2 };
    return (po[a.priority as keyof typeof po] ?? 2) - (po[b.priority as keyof typeof po] ?? 2);
  });

  const updateStatus = async (rec: Recommendation, newStatus: string) => {
    const { error } = await supabase.from('ai_recommendations')
      .update({ status: newStatus, acted_on_at: new Date().toISOString() }).eq('id', rec.id);
    if (error) { toast.error('Update failed'); return; }
    logGosAction(newStatus, 'ai_recommendation', rec.id, rec.title, { clientId: rec.client_id });
    toast.success(`Recommendation ${newStatus.replace(/_/g, ' ')}`);
    onRefresh();
  };

  const duplicateToDraft = async (rec: Recommendation) => {
    if (!user) return;
    const campaignName = `${rec.title.slice(0, 80)}`;
    const { data, error } = await supabase.from('campaign_drafts' as any).insert({
      client_id: rec.client_id, created_by: user.id,
      name: campaignName, campaign_name: campaignName,
      draft_type: rec.recommendation_type,
      source_type: 'recommendation', source_entity_id: rec.id,
      recommendation_id: rec.id,
      notes: `${rec.description}\n\nSource: Auto-generated recommendation (${rec.recommendation_type})`,
      metadata: { source: 'optimization_queue', recommendation_id: rec.id },
    }).select().single();
    if (error) { toast.error('Failed to create draft'); return; }
    const draftId = (data as any).id;
    await supabase.from('campaign_draft_items' as any).insert([
      { draft_id: draftId, item_type: 'adset', name: 'Ad Set 1', sort_order: 0, config: { geo: '', age_min: 18, age_max: 65, gender: 'all', interests: '', placements: 'automatic', daily_budget: 0, optimization_goal: '' } },
    ]);
    const { data: adsetData } = await supabase.from('campaign_draft_items' as any).select('id').eq('draft_id', draftId).eq('item_type', 'adset').limit(1).single();
    if (adsetData) {
      await supabase.from('campaign_draft_items' as any).insert({
        draft_id: draftId, item_type: 'ad', name: 'Ad 1', sort_order: 0,
        parent_item_id: (adsetData as any).id,
        config: { primary_text: '', headline: '', cta: 'LEARN_MORE', destination_url: '', creative_ref: '' },
      });
    }
    await updateStatus(rec, 'converted_to_draft');
    logGosAction('relaunch_from_rec', 'campaign_draft', draftId, campaignName, { clientId: rec.client_id });
    toast.success('Draft created from recommendation');
  };

  const recTypes = ['no_delivery_check', 'pause_loser', 'increase_budget', 'fix_creative_issue', 'high_cpc_alert', 'investigate_rejection', 'relaunch_with_changes', 'duplicate_winner'];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {recTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-32"><SelectValue placeholder="All Priorities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs text-muted-foreground">{filtered.length} actionable</Badge>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Optimization Queue Empty</h3>
          <p className="text-sm text-muted-foreground">Sync campaign metrics to auto-generate optimization recommendations.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <Card key={r.id} className="hover:border-primary/20 transition-colors">
              <CardContent className="p-4 flex items-start gap-3">
                <Lightbulb className={`h-4 w-4 mt-0.5 shrink-0 ${r.priority === 'high' ? 'text-destructive' : r.priority === 'medium' ? 'text-amber-400' : 'text-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{r.title}</span>
                    <Badge variant="outline" className={`text-[9px] ${r.priority === 'high' ? 'text-destructive border-destructive/30' : r.priority === 'medium' ? 'text-amber-400 border-amber-400/30' : 'text-muted-foreground border-muted-foreground/30'}`}>{r.priority}</Badge>
                    <Badge variant="secondary" className="text-[9px]">{r.recommendation_type.replace(/_/g, ' ')}</Badge>
                    {r.metadata?.source === 'auto_sync' && <Badge variant="outline" className="text-[9px] text-cyan-400 border-cyan-400/30">auto</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span>{clientName(r.client_id)}</span>
                    <span>·</span>
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    {r.metadata?.external_campaign_id && <><span>·</span><span className="font-mono text-emerald-400">{r.metadata.external_campaign_id}</span></>}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {
                    window.location.href = '/ai-ads/optimization';
                  }}>
                    <Zap className="h-3 w-3 mr-1" /> Propose Action
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => duplicateToDraft(r)}>
                    <FileStack className="h-3 w-3 mr-1" /> New Draft
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => updateStatus(r, 'reviewed')}>
                    <Eye className="h-3 w-3 mr-1" /> Mark Reviewed
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground" onClick={() => updateStatus(r, 'dismissed')}>
                    <XCircle className="h-3 w-3 mr-1" /> Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Metrics Explorer ──

function MetricsExplorer({ snapshots, clients, clientName }: {
  snapshots: Snapshot[]; clients: Client[]; clientName: (id: string) => string;
}) {
  const [filterClient, setFilterClient] = useState('all');

  const filtered = snapshots.filter(s => filterClient === 'all' || s.client_id === filterClient);

  // Deduplicate: use only the latest snapshot per external_campaign_id to avoid double-counting
  const latestPerCampaign = new Map<string, Snapshot>();
  for (const s of filtered) {
    const key = s.external_campaign_id || s.id;
    const existing = latestPerCampaign.get(key);
    if (!existing || new Date(s.synced_at) > new Date(existing.synced_at)) {
      latestPerCampaign.set(key, s);
    }
  }
  const latestSnapshots = Array.from(latestPerCampaign.values());

  const totalSpend = latestSnapshots.reduce((sum, s) => sum + Number(s.spend), 0);
  const totalImpressions = latestSnapshots.reduce((sum, s) => sum + Number(s.impressions), 0);
  const totalClicks = latestSnapshots.reduce((sum, s) => sum + Number(s.clicks), 0);
  const totalLeads = latestSnapshots.reduce((sum, s) => sum + Number(s.leads), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs text-muted-foreground">{latestSnapshots.length} campaigns · {filtered.length} snapshots</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-foreground">${totalSpend.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Total Spend</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-foreground">{totalImpressions.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Impressions</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-foreground">{totalClicks.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Clicks</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xl font-bold text-foreground">{totalLeads}</p>
          <p className="text-xs text-muted-foreground">Total Leads</p>
        </CardContent></Card>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Performance Snapshots</h3>
          <p className="text-sm text-muted-foreground">Sync campaigns to store performance snapshots here.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <Card key={s.id}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-semibold text-foreground">{s.entity_name || s.external_campaign_id || 'Unknown'}</span>
                      <Badge variant="secondary" className="text-[9px]">{s.entity_status || 'unknown'}</Badge>
                      <Badge variant="outline" className="text-[9px] text-muted-foreground">{s.platform}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span><span className="text-muted-foreground">Spend:</span> ${Number(s.spend).toFixed(2)}</span>
                      <span><span className="text-muted-foreground">Impr:</span> {Number(s.impressions).toLocaleString()}</span>
                      <span><span className="text-muted-foreground">Clicks:</span> {Number(s.clicks).toLocaleString()}</span>
                      <span><span className="text-muted-foreground">CTR:</span> {Number(s.ctr).toFixed(2)}%</span>
                      {Number(s.leads) > 0 && <span className="text-emerald-400">Leads: {s.leads}</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {clientName(s.client_id)} · Synced {new Date(s.synced_at).toLocaleString()}
                      {s.date_window_start && ` · Window: ${s.date_window_start} → ${s.date_window_end}`}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Campaign Detail Panel ──

function CampaignDetail({ lr, clientName, anomalies, snapshots, onBack, onSync, syncing }: {
  lr: LaunchRequest; clientName: string; anomalies: Anomaly[]; snapshots: Snapshot[];
  onBack: () => void; onSync: () => void; syncing: boolean;
}) {
  const { user } = useAuth();
  const { logGosAction } = useGosAuditLog();
  const [creatingReview, setCreatingReview] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const meta = lr.metadata || {};
  const metrics = meta.last_sync_metrics;
  const health = getHealthStatus(lr);
  const hc = healthLabels[health];
  const hs = getHealthScore(lr, anomalies);

  const createOptimizationReview = async () => {
    if (!user || creatingReview) return;
    setCreatingReview(true);
    try {
      const { data: existing } = await supabase.from('ai_campaign_sessions' as any)
        .select('id').eq('client_id', lr.client_id)
        .eq('session_type', 'optimization_review')
        .filter('metadata->>source_launch_request_id', 'eq', lr.id).limit(1);
      if (existing && existing.length > 0) {
        toast.info('Optimization review already exists');
        setCreatingReview(false);
        return;
      }

      const metricsStr = metrics
        ? `Spend: $${metrics.spend}, Impressions: ${metrics.impressions}, Clicks: ${metrics.clicks}, CTR: ${metrics.ctr?.toFixed?.(2) || metrics.ctr}%, CPC: $${metrics.cpc?.toFixed?.(2) || metrics.cpc}, Leads: ${metrics.leads}, Purchases: ${metrics.purchases}`
        : 'No performance data synced yet.';
      const anomalyStr = anomalies.length > 0
        ? '\n\nDetected issues:\n' + anomalies.map(a => `- [${a.severity}] ${a.title}: ${a.detail}`).join('\n') : '';

      const prompt = `Post-launch optimization review for campaign (${lr.platform}).
External Campaign ID: ${lr.external_campaign_id || 'N/A'}
Execution status: ${lr.execution_status}
Campaign health: ${health} (score: ${hs.score}/100)
Platform status: ${meta.campaign_status || 'unknown'}

Performance metrics (last 7 days):
${metricsStr}
${anomalyStr}

Analyze performance, validate issues, provide specific actionable optimization recommendations.`;

      const { data: sess, error } = await supabase.from('ai_campaign_sessions' as any).insert({
        client_id: lr.client_id, title: `Post-Launch Review: Campaign #${lr.external_campaign_id || lr.id.slice(0, 8)}`,
        created_by: user.id, session_type: 'optimization_review',
        metadata: { source_launch_request_id: lr.id, external_campaign_id: lr.external_campaign_id, platform: lr.platform, performance_metrics: metrics, health_score: hs.score },
      }).select().single();
      if (error) throw error;

      await supabase.from('ai_analysis_runs' as any).insert({
        session_id: (sess as any).id, client_id: lr.client_id, created_by: user.id,
        prompt, analysis_type: 'optimization_review', status: 'queued',
      });
      logGosAction('create_optimization_review', 'launch_request', lr.id, `Data-aware review`, { clientId: lr.client_id });
      toast.success('Optimization review created — go to AI Analysis to run it');
    } catch (e: any) { toast.error(e.message); } finally { setCreatingReview(false); }
  };

  const duplicateDraft = async () => {
    if (!user || duplicating) return;
    setDuplicating(true);
    try {
      const { data: origDraft } = await supabase.from('campaign_drafts' as any)
        .select('*').eq('id', lr.draft_id).single();
      if (!origDraft) throw new Error('Original draft not found');

      const od = origDraft as any;
      const newName = `[Relaunch] ${od.campaign_name || od.name}`;
      const { data: newDraft, error } = await supabase.from('campaign_drafts' as any).insert({
        client_id: od.client_id, created_by: user.id,
        name: newName, campaign_name: newName,
        objective: od.objective, platform: od.platform,
        ad_account_id: od.ad_account_id, bid_strategy: od.bid_strategy,
        budget_mode: od.budget_mode, buying_type: od.buying_type,
        total_budget: od.total_budget, draft_type: 'relaunch',
        source_type: 'relaunch', source_entity_id: lr.id,
        notes: `Relaunched from Launch #${lr.id.slice(0, 8)}. Original: ${od.name}`,
        metadata: { source: 'relaunch', original_draft_id: lr.draft_id, original_launch_id: lr.id },
      }).select().single();
      if (error) throw error;
      const newDraftId = (newDraft as any).id;

      // Copy draft items
      const { data: origItems } = await supabase.from('campaign_draft_items' as any)
        .select('*').eq('draft_id', lr.draft_id).order('sort_order');
      if (origItems && origItems.length > 0) {
        const idMap: Record<string, string> = {};
        for (const item of origItems as any[]) {
          const { data: newItem } = await supabase.from('campaign_draft_items' as any).insert({
            draft_id: newDraftId, item_type: item.item_type, name: item.name,
            sort_order: item.sort_order, config: item.config,
            parent_item_id: item.parent_item_id ? idMap[item.parent_item_id] || null : null,
          }).select().single();
          if (newItem) idMap[item.id] = (newItem as any).id;
        }
      }

      logGosAction('duplicate_draft', 'campaign_draft', newDraftId, newName, { clientId: od.client_id, metadata: { original: lr.draft_id } });
      toast.success('Draft duplicated — edit in Campaign Drafts');
    } catch (e: any) { toast.error(e.message); } finally { setDuplicating(false); }
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
        <div className={`text-2xl font-bold ${scoreColors[hs.label]}`}>{hs.score}</div>
        <Badge variant="outline" className={`gap-1 ${hc.color}`}>{hc.label}</Badge>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onSync} disabled={syncing}>
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Sync
        </Button>
      </div>

      {/* Metrics from dedicated table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-cyan-400" /> Performance Metrics</CardTitle></CardHeader>
        <CardContent>
          {!metrics ? (
            <div className="py-6 text-center">
              <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No performance data yet. Click Sync to fetch metrics.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Spend', value: `$${metrics.spend?.toFixed(2)}` },
                { label: 'Impressions', value: metrics.impressions?.toLocaleString() },
                { label: 'Clicks', value: metrics.clicks?.toLocaleString() },
                { label: 'CTR', value: `${metrics.ctr?.toFixed(2)}%` },
                { label: 'CPC', value: `$${metrics.cpc?.toFixed(2)}` },
                { label: 'Leads', value: metrics.leads },
                { label: 'Purchases', value: metrics.purchases },
                { label: 'Revenue', value: `$${metrics.revenue?.toFixed(2)}` },
              ].map((m, i) => (
                <div key={i} className="text-center">
                  <p className="text-lg font-bold text-foreground">{m.value}</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
          )}
          {meta.last_sync_at && <p className="text-[10px] text-muted-foreground/60 mt-3 text-right">Synced: {new Date(meta.last_sync_at).toLocaleString()}</p>}
        </CardContent>
      </Card>

      {/* Snapshot history */}
      {snapshots.length > 1 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-blue-400" /> Sync History ({snapshots.length} snapshots)</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {snapshots.slice(0, 10).map(s => (
              <div key={s.id} className="flex items-center gap-3 text-xs p-1.5 rounded hover:bg-muted/20">
                <span className="text-muted-foreground w-32">{new Date(s.synced_at).toLocaleString()}</span>
                <span>${Number(s.spend).toFixed(2)}</span>
                <span>{Number(s.impressions).toLocaleString()} impr</span>
                <span>{Number(s.clicks)} clicks</span>
                <Badge variant="secondary" className="text-[9px]">{s.entity_status || 'unknown'}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
                <span className="text-xs font-semibold text-foreground">{a.title}</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">{a.detail}</p>
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
            {creatingReview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />} AI Review
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={duplicateDraft} disabled={duplicating}>
            {duplicating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />} Duplicate & Relaunch
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onSync} disabled={syncing}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Metrics
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
