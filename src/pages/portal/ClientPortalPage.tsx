import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3, Loader2, Activity, CheckCircle2, AlertTriangle,
  TrendingUp, Zap, Users, Shield, Clock,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Client { id: string; name: string; }

export default function ClientPortalPage() {
  const { user, agencyRole } = useAuth();
  const isClient = agencyRole === 'Client';
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
      supabase.from('campaign_performance_snapshots' as any).select('*').eq('entity_level', 'campaign').order('synced_at', { ascending: false }).limit(500),
      supabase.from('ai_recommendations' as any).select('id, client_id, priority, status, recommendation_type, title, created_at')
        .order('created_at', { ascending: false }).limit(200),
      supabase.from('optimization_actions' as any).select('id, client_id, status, action_type, created_at')
        .order('created_at', { ascending: false }).limit(200),
    ]);
    const clientList = cRes.data || [];
    setClients(clientList);
    setLaunches((lRes.data as any[]) || []);
    setSnapshots((sRes.data as any[]) || []);
    setRecs((rRes.data as any[]) || []);
    setActions((aRes.data as any[]) || []);
    // Auto-select for client role
    if (isClient && clientList.length === 1) setSelectedClient(clientList[0].id);
    setLoading(false);
  }, [isClient]);

  useEffect(() => { load(); }, [load]);

  const sc = selectedClient;
  const fLaunches = sc === 'all' ? launches : launches.filter(l => l.client_id === sc);
  const fSnapshots = sc === 'all' ? snapshots : snapshots.filter(s => s.client_id === sc);
  const fRecs = sc === 'all' ? recs : recs.filter(r => r.client_id === sc);
  const fActions = sc === 'all' ? actions : actions.filter(a => a.client_id === sc);

  // Deduplicate snapshots
  const latestPerCampaign = new Map<string, any>();
  for (const s of fSnapshots) {
    const key = s.external_campaign_id || s.id;
    const existing = latestPerCampaign.get(key);
    if (!existing || new Date(s.synced_at) > new Date(existing.synced_at)) latestPerCampaign.set(key, s);
  }
  const latest = Array.from(latestPerCampaign.values());

  const totalSpend = latest.reduce((s, snap) => s + Number(snap.spend || 0), 0);
  const totalImpressions = latest.reduce((s, snap) => s + Number(snap.impressions || 0), 0);
  const totalClicks = latest.reduce((s, snap) => s + Number(snap.clicks || 0), 0);
  const totalLeads = latest.reduce((s, snap) => s + Number(snap.leads || 0), 0);
  const totalPurchases = latest.reduce((s, snap) => s + Number(snap.purchases || 0), 0);
  const totalRevenue = latest.reduce((s, snap) => s + Number(snap.revenue || 0), 0);

  const activeCampaigns = fLaunches.filter(l => l.metadata?.campaign_status === 'ACTIVE').length;
  const pausedCampaigns = fLaunches.filter(l => l.metadata?.campaign_status === 'PAUSED').length;
  const issuesCampaigns = fLaunches.filter(l => ['DISAPPROVED', 'WITH_ISSUES'].includes(l.metadata?.campaign_status)).length;

  const activeRecs = fRecs.filter(r => ['new', 'reviewed'].includes(r.status));
  const highPriorityRecs = activeRecs.filter(r => r.priority === 'high');
  const executedActions = fActions.filter(a => a.status === 'executed').length;
  const pendingActions = fActions.filter(a => ['proposed', 'approved'].includes(a.status)).length;

  const lastSync = fSnapshots.length > 0 ? fSnapshots[0].synced_at : null;
  const clientName = (id: string) => clients.find(c => c.id === id)?.name || 'All Accounts';

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Performance Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Campaign performance overview and optimization progress
            {lastSync && <span className="ml-2 text-[10px]">· Last updated: {new Date(lastSync).toLocaleString()}</span>}
          </p>
        </div>
        {!isClient && (
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Spend', value: `$${totalSpend.toFixed(2)}`, color: 'text-foreground' },
          { label: 'Impressions', value: totalImpressions.toLocaleString(), color: 'text-foreground' },
          { label: 'Clicks', value: totalClicks.toLocaleString(), color: 'text-foreground' },
          { label: 'Leads', value: String(totalLeads), color: 'text-emerald-400' },
          { label: 'Purchases', value: String(totalPurchases), color: 'text-foreground' },
          { label: 'Revenue', value: `$${totalRevenue.toFixed(2)}`, color: 'text-emerald-400' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-xl font-bold ${kpi.color}`}>{latest.length === 0 ? '—' : kpi.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign Activity */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-400" /> Campaign Status</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center"><p className="text-2xl font-bold text-foreground">{fLaunches.length}</p><p className="text-xs text-muted-foreground">Total Campaigns</p></div>
            <div className="text-center"><p className="text-2xl font-bold text-emerald-400">{activeCampaigns}</p><p className="text-xs text-muted-foreground">Active</p></div>
            <div className="text-center"><p className="text-2xl font-bold text-muted-foreground">{pausedCampaigns}</p><p className="text-xs text-muted-foreground">Paused</p></div>
            <div className="text-center"><p className="text-2xl font-bold text-destructive">{issuesCampaigns}</p><p className="text-xs text-muted-foreground">Needs Attention</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Health */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Delivery Health</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {fLaunches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaigns launched yet. Metrics will appear after campaigns are active and synced.</p>
          ) : (
            <>
              {activeCampaigns > 0 && (
                <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{activeCampaigns} campaign{activeCampaigns !== 1 ? 's' : ''} delivering normally</span></div>
              )}
              {issuesCampaigns > 0 && (
                <div className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  <span>{issuesCampaigns} campaign{issuesCampaigns !== 1 ? 's' : ''} flagged by platform — under review</span></div>
              )}
              {highPriorityRecs.length > 0 && (
                <div className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>{highPriorityRecs.length} high-priority optimization{highPriorityRecs.length !== 1 ? 's' : ''} in progress</span></div>
              )}
              {issuesCampaigns === 0 && highPriorityRecs.length === 0 && (
                <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>All campaigns healthy — no critical issues detected</span></div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Optimization Progress */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-cyan-400" /> Optimization Progress</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center"><p className="text-xl font-bold text-foreground">{fRecs.length}</p><p className="text-[10px] text-muted-foreground">Total Recommendations</p></div>
            <div className="text-center"><p className="text-xl font-bold text-emerald-400">{fRecs.filter(r => ['dismissed', 'converted_to_draft'].includes(r.status)).length}</p><p className="text-[10px] text-muted-foreground">Resolved</p></div>
            <div className="text-center"><p className="text-xl font-bold text-foreground">{executedActions}</p><p className="text-[10px] text-muted-foreground">Actions Completed</p></div>
            <div className="text-center"><p className="text-xl font-bold text-amber-400">{pendingActions}</p><p className="text-[10px] text-muted-foreground">In Progress</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Launched Campaigns */}
      {fLaunches.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-400" /> Recent Campaigns</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {fLaunches.slice(0, 8).map(l => {
              const status = l.metadata?.campaign_status || 'unknown';
              const isActive = status === 'ACTIVE';
              const hasIssue = ['DISAPPROVED', 'WITH_ISSUES'].includes(status);
              return (
                <div key={l.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20">
                  {isActive ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> :
                   hasIssue ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" /> :
                   <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{l.metadata?.campaign_name || l.external_campaign_id || 'Campaign'}</p>
                    <p className="text-[10px] text-muted-foreground">{l.platform} · Launched {l.executed_at ? new Date(l.executed_at).toLocaleDateString() : '—'}</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] ${isActive ? 'text-emerald-400 border-emerald-400/30' : hasIssue ? 'text-destructive border-destructive/30' : 'text-muted-foreground'}`}>{status.toLowerCase()}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Active Recommendations (client-safe) */}
      {activeRecs.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-amber-400" /> Active Recommendations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {activeRecs.slice(0, 8).map(r => (
              <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/20">
                <Badge variant="outline" className={`text-[9px] shrink-0 ${r.priority === 'high' ? 'text-destructive border-destructive/30' : 'text-amber-400 border-amber-400/30'}`}>{r.priority}</Badge>
                <span className="text-xs text-foreground flex-1 truncate">{r.title}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Navigation hint */}
      <Card className="border-muted-foreground/10">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground text-center">
            For detailed reports, exports, and personalized access, visit the <a href="/portal" className="text-primary hover:underline">Client Portal</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
