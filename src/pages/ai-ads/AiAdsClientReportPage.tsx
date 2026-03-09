import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3, Loader2, Activity, CheckCircle2, AlertTriangle, Clock,
  TrendingUp, Zap, RefreshCw, Users,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Client { id: string; name: string; }

interface LaunchSummary {
  total: number; active: number; paused: number; issues: number;
  totalSpend: number; totalImpressions: number; totalClicks: number;
  totalLeads: number; totalPurchases: number; totalRevenue: number;
}

interface RecSummary { total: number; high: number; medium: number; resolved: number; }
interface ActionSummary { total: number; executed: number; pending: number; failed: number; }

export default function AiAdsClientReportPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('all');
  const [loading, setLoading] = useState(true);
  const [launches, setLaunches] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);

  const load = useCallback(async () => {
    const [cRes, lRes, sRes, rRes, aRes] = await Promise.all([
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('launch_requests' as any).select('id, client_id, status, execution_status, external_campaign_id, metadata, executed_at, platform')
        .in('status', ['completed', 'failed']).not('external_campaign_id', 'is', null).order('executed_at', { ascending: false }).limit(200),
      supabase.from('campaign_performance_snapshots').select('*').eq('entity_level', 'campaign').order('synced_at', { ascending: false }).limit(500),
      supabase.from('ai_recommendations').select('id, client_id, priority, status, recommendation_type, title, created_at')
        .order('created_at', { ascending: false }).limit(200),
      supabase.from('optimization_actions' as any).select('id, client_id, status, action_type, created_at')
        .order('created_at', { ascending: false }).limit(200),
    ]);
    setClients(cRes.data || []);
    setLaunches((lRes.data as any[]) || []);
    setSnapshots((sRes.data as any[]) || []);
    setRecs((rRes.data as any[]) || []);
    setActions((aRes.data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const fLaunches = selectedClient === 'all' ? launches : launches.filter(l => l.client_id === selectedClient);
  const fSnapshots = selectedClient === 'all' ? snapshots : snapshots.filter(s => s.client_id === selectedClient);
  const fRecs = selectedClient === 'all' ? recs : recs.filter(r => r.client_id === selectedClient);
  const fActions = selectedClient === 'all' ? actions : actions.filter(a => a.client_id === selectedClient);

  // Deduplicate snapshots for aggregation
  const latestPerCampaign = new Map<string, any>();
  for (const s of fSnapshots) {
    const key = s.external_campaign_id || s.id;
    const existing = latestPerCampaign.get(key);
    if (!existing || new Date(s.synced_at) > new Date(existing.synced_at)) latestPerCampaign.set(key, s);
  }
  const latest = Array.from(latestPerCampaign.values());

  const launchSummary: LaunchSummary = {
    total: fLaunches.length,
    active: fLaunches.filter(l => l.metadata?.campaign_status === 'ACTIVE').length,
    paused: fLaunches.filter(l => l.metadata?.campaign_status === 'PAUSED').length,
    issues: fLaunches.filter(l => ['DISAPPROVED', 'WITH_ISSUES'].includes(l.metadata?.campaign_status)).length,
    totalSpend: latest.reduce((s, snap) => s + Number(snap.spend || 0), 0),
    totalImpressions: latest.reduce((s, snap) => s + Number(snap.impressions || 0), 0),
    totalClicks: latest.reduce((s, snap) => s + Number(snap.clicks || 0), 0),
    totalLeads: latest.reduce((s, snap) => s + Number(snap.leads || 0), 0),
    totalPurchases: latest.reduce((s, snap) => s + Number(snap.purchases || 0), 0),
    totalRevenue: latest.reduce((s, snap) => s + Number(snap.revenue || 0), 0),
  };

  const recSummary: RecSummary = {
    total: fRecs.length,
    high: fRecs.filter(r => r.priority === 'high' && ['new', 'reviewed'].includes(r.status)).length,
    medium: fRecs.filter(r => r.priority === 'medium' && ['new', 'reviewed'].includes(r.status)).length,
    resolved: fRecs.filter(r => ['dismissed', 'converted_to_draft'].includes(r.status)).length,
  };

  const actionSummary: ActionSummary = {
    total: fActions.length,
    executed: fActions.filter(a => a.status === 'executed').length,
    pending: fActions.filter(a => ['proposed', 'approved'].includes(a.status)).length,
    failed: fActions.filter(a => a.status === 'failed').length,
  };

  const lastSync = fSnapshots.length > 0 ? fSnapshots[0].synced_at : null;
  const clientName = (id: string) => clients.find(c => c.id === id)?.name || 'All Clients';

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-cyan-400" /> Performance Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Client-facing campaign performance summary</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {lastSync && <span className="text-[10px] text-muted-foreground">Updated: {new Date(lastSync).toLocaleString()}</span>}
        </div>
      </div>

      <Card className="border-blue-400/10">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            This is a <strong className="text-foreground">client-safe performance summary</strong>. It provides a high-level overview of campaign
            activity, delivery health, and optimization progress without exposing internal tooling or raw error data.
            This view serves as the foundation for a future client portal.
          </p>
        </CardContent>
      </Card>

      {/* Campaign Activity */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-400" /> Campaign Activity</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{launchSummary.total}</p>
              <p className="text-xs text-muted-foreground">Campaigns Launched</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">{launchSummary.active}</p>
              <p className="text-xs text-muted-foreground">Currently Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-muted-foreground">{launchSummary.paused}</p>
              <p className="text-xs text-muted-foreground">Paused</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{launchSummary.issues}</p>
              <p className="text-xs text-muted-foreground">Needs Attention</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-400" /> Key Performance Metrics</CardTitle></CardHeader>
        <CardContent>
          {latest.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No performance data available yet. Metrics will appear after campaigns are synced.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center"><p className="text-xl font-bold text-foreground">${launchSummary.totalSpend.toFixed(2)}</p><p className="text-[10px] text-muted-foreground">Total Spend</p></div>
              <div className="text-center"><p className="text-xl font-bold text-foreground">{launchSummary.totalImpressions.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Impressions</p></div>
              <div className="text-center"><p className="text-xl font-bold text-foreground">{launchSummary.totalClicks.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Clicks</p></div>
              <div className="text-center"><p className="text-xl font-bold text-emerald-400">{launchSummary.totalLeads}</p><p className="text-[10px] text-muted-foreground">Leads</p></div>
              <div className="text-center"><p className="text-xl font-bold text-foreground">{launchSummary.totalPurchases}</p><p className="text-[10px] text-muted-foreground">Purchases</p></div>
              <div className="text-center"><p className="text-xl font-bold text-emerald-400">${launchSummary.totalRevenue.toFixed(2)}</p><p className="text-[10px] text-muted-foreground">Revenue</p></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Health */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Delivery Health Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {launchSummary.active > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-foreground">{launchSummary.active} campaign{launchSummary.active !== 1 ? 's' : ''} delivering normally</span>
              </div>
            )}
            {launchSummary.issues > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-foreground">{launchSummary.issues} campaign{launchSummary.issues !== 1 ? 's' : ''} flagged by platform — under review</span>
              </div>
            )}
            {recSummary.high > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-foreground">{recSummary.high} high-priority optimization{recSummary.high !== 1 ? 's' : ''} in progress</span>
              </div>
            )}
            {launchSummary.total === 0 && (
              <p className="text-sm text-muted-foreground">No campaigns launched yet.</p>
            )}
            {launchSummary.total > 0 && launchSummary.issues === 0 && recSummary.high === 0 && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-foreground">All campaigns are healthy — no critical issues detected</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Optimization Progress */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-cyan-400" /> Optimization Activity</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center"><p className="text-xl font-bold text-foreground">{recSummary.total}</p><p className="text-[10px] text-muted-foreground">Recommendations</p></div>
            <div className="text-center"><p className="text-xl font-bold text-emerald-400">{recSummary.resolved}</p><p className="text-[10px] text-muted-foreground">Resolved</p></div>
            <div className="text-center"><p className="text-xl font-bold text-foreground">{actionSummary.executed}</p><p className="text-[10px] text-muted-foreground">Actions Taken</p></div>
            <div className="text-center"><p className="text-xl font-bold text-amber-400">{actionSummary.pending}</p><p className="text-[10px] text-muted-foreground">In Progress</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Recommendations (client-safe) */}
      {fRecs.filter(r => ['new', 'reviewed'].includes(r.status)).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-amber-400" /> Active Recommendations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {fRecs.filter(r => ['new', 'reviewed'].includes(r.status)).slice(0, 8).map(r => (
              <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/20">
                <Badge variant="outline" className={`text-[9px] shrink-0 ${r.priority === 'high' ? 'text-destructive border-destructive/30' : 'text-amber-400 border-amber-400/30'}`}>{r.priority}</Badge>
                <span className="text-xs text-foreground flex-1 truncate">{r.title}</span>
                <Badge variant="secondary" className="text-[9px]">{r.recommendation_type.replace(/_/g, ' ')}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
