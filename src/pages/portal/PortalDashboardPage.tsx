import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertTriangle, Activity, Zap, TrendingUp, Clock, Lightbulb } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PortalDateFilter, { type DateRange } from '@/components/portal/PortalDateFilter';
import type { PortalUser, PortalBranding } from '@/types/portal';

interface Ctx { portalUser: PortalUser | null; branding: PortalBranding | null; isAdmin: boolean; }

export default function PortalDashboardPage() {
  const { portalUser, branding, isAdmin } = useOutletContext<Ctx>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('');
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [launches, setLaunches] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clients, setClients] = useState<{id:string;name:string}[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  const load = useCallback(async () => {
    let clientId = portalUser?.client_id || null;

    if (isAdmin && !clientId) {
      const { data: cl } = await supabase.from('clients').select('id, name').order('name').limit(50);
      setClients(cl || []);
      if (cl && cl.length > 0) {
        clientId = selectedClient || cl[0].id;
        if (!selectedClient) setSelectedClient(clientId);
      }
    }

    if (!clientId) { setLoading(false); return; }

    const { data: c } = await supabase.from('clients').select('name').eq('id', clientId).maybeSingle();
    setClientName(c?.name || '');

    let snapQ = supabase.from('campaign_performance_snapshots' as any).select('*')
      .eq('client_id', clientId).eq('entity_level', 'campaign');
    let launchQ = supabase.from('launch_requests' as any).select('id, client_id, status, execution_status, external_campaign_id, metadata, executed_at, platform')
      .eq('client_id', clientId).not('external_campaign_id', 'is', null);
    let recQ = supabase.from('ai_recommendations' as any).select('id, client_id, priority, status, recommendation_type, title, description, created_at')
      .eq('client_id', clientId);
    let actQ = supabase.from('optimization_actions' as any).select('id, client_id, status, action_type, created_at')
      .eq('client_id', clientId);

    if (dateRange) {
      const from = dateRange.from.toISOString();
      const to = dateRange.to.toISOString();
      snapQ = snapQ.gte('synced_at', from).lte('synced_at', to);
      launchQ = launchQ.gte('executed_at', from).lte('executed_at', to);
      recQ = recQ.gte('created_at', from).lte('created_at', to);
      actQ = actQ.gte('created_at', from).lte('created_at', to);
    }

    const [sRes, lRes, rRes, aRes] = await Promise.all([
      snapQ.order('synced_at', { ascending: false }).limit(200),
      launchQ.order('executed_at', { ascending: false }).limit(50),
      recQ.order('created_at', { ascending: false }).limit(100),
      actQ.order('created_at', { ascending: false }).limit(100),
    ]);

    setSnapshots((sRes.data as any[]) || []);
    setLaunches((lRes.data as any[]) || []);
    setRecs((rRes.data as any[]) || []);
    setActions((aRes.data as any[]) || []);
    setLoading(false);
  }, [portalUser, isAdmin, selectedClient, dateRange]);

  useEffect(() => { load(); }, [load]);

  const latestMap = new Map<string, any>();
  for (const s of snapshots) {
    const key = s.external_campaign_id || s.id;
    const ex = latestMap.get(key);
    if (!ex || new Date(s.synced_at) > new Date(ex.synced_at)) latestMap.set(key, s);
  }
  const latest = Array.from(latestMap.values());

  const totalSpend = latest.reduce((s, snap) => s + Number(snap.spend || 0), 0);
  const totalClicks = latest.reduce((s, snap) => s + Number(snap.clicks || 0), 0);
  const totalLeads = latest.reduce((s, snap) => s + Number(snap.leads || 0), 0);
  const totalRevenue = latest.reduce((s, snap) => s + Number(snap.revenue || 0), 0);

  const activeCampaigns = launches.filter(l => l.metadata?.campaign_status === 'ACTIVE').length;
  const issuesCampaigns = launches.filter(l => ['DISAPPROVED', 'WITH_ISSUES'].includes(l.metadata?.campaign_status)).length;

  const activeRecs = recs.filter(r => ['new', 'reviewed'].includes(r.status));
  const executedActions = actions.filter(a => a.status === 'executed').length;
  const pendingActions = actions.filter(a => ['proposed', 'approved'].includes(a.status)).length;
  const lastSync = snapshots.length > 0 ? snapshots[0].synced_at : null;

  const safeTitle = (r: any) => {
    const t = r.title || '';
    return t
      .replace(/page_id|ad_account_id|adset_id|campaign_id/gi, 'configuration')
      .replace(/fix\s/gi, 'Adjust ')
      .replace(/payload|config field/gi, 'setting');
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const title = branding?.portal_title || 'Performance Portal';

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {clientName ? `${clientName} — ` : ''}Campaign performance overview
          {lastSync && <span className="ml-2 text-[10px]">· Updated: {new Date(lastSync).toLocaleString()}</span>}
        </p>
        {isAdmin && !portalUser && clients.length > 1 && (
          <select className="mt-2 text-xs border rounded px-2 py-1 bg-background text-foreground"
            value={selectedClient || ''} onChange={e => setSelectedClient(e.target.value)}>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* Date filter */}
      <PortalDateFilter value={dateRange} onChange={setDateRange} />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Spend', value: `$${totalSpend.toFixed(0)}` },
          { label: 'Clicks', value: totalClicks.toLocaleString() },
          { label: 'Leads', value: String(totalLeads) },
          { label: 'Revenue', value: `$${totalRevenue.toFixed(0)}` },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4 text-center">
              <p className="text-xl font-bold text-foreground">{latest.length === 0 ? '—' : kpi.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delivery Health */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Delivery Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {launches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaigns launched yet.</p>
          ) : (
            <>
              {activeCampaigns > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{activeCampaigns} campaign{activeCampaigns !== 1 ? 's' : ''} running smoothly</span>
                </div>
              )}
              {issuesCampaigns > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  <span>{issuesCampaigns} campaign{issuesCampaigns !== 1 ? 's' : ''} under review by our team</span>
                </div>
              )}
              {issuesCampaigns === 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>All campaigns healthy — no issues detected</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Optimization Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Optimization Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{recs.length}</p>
              <p className="text-[10px] text-muted-foreground">Total Insights</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-500">{recs.filter(r => ['dismissed', 'converted_to_draft'].includes(r.status)).length}</p>
              <p className="text-[10px] text-muted-foreground">Resolved</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{executedActions}</p>
              <p className="text-[10px] text-muted-foreground">Actions Completed</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-amber-500">{pendingActions}</p>
              <p className="text-[10px] text-muted-foreground">In Progress</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Campaigns */}
      {launches.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> Recent Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {launches.slice(0, 6).map(l => {
              const status = l.metadata?.campaign_status || 'unknown';
              const isActive = status === 'ACTIVE';
              return (
                <div key={l.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                  {isActive ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{l.metadata?.campaign_name || 'Campaign'}</p>
                    <p className="text-[10px] text-muted-foreground">{l.platform} · {l.executed_at ? new Date(l.executed_at).toLocaleDateString() : '—'}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px]">{status.toLowerCase()}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Active Recommendations */}
      {activeRecs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" /> Current Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeRecs.slice(0, 6).map(r => (
              <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30">
                <Badge variant="outline" className={`text-[9px] shrink-0 ${r.priority === 'high' ? 'text-destructive border-destructive/30' : 'text-amber-500 border-amber-500/30'}`}>
                  {r.priority}
                </Badge>
                <span className="text-xs text-foreground flex-1 truncate">{safeTitle(r)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
