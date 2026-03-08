import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, TrendingUp, Zap, RefreshCw, Lightbulb, FolderOpen } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOutletContext, Link } from 'react-router-dom';
import PortalDateFilter, { type DateRange } from '@/components/portal/PortalDateFilter';
import type { PortalUser, PortalBranding } from '@/types/portal';

interface Ctx { portalUser: PortalUser | null; branding: PortalBranding | null; isAdmin: boolean; }

export default function PortalReportsPage() {
  const { portalUser, isAdmin } = useOutletContext<Ctx>();
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [launches, setLaunches] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  const load = useCallback(async () => {
    const clientId = portalUser?.client_id;
    if (!clientId && !isAdmin) { setLoading(false); return; }

    const buildQ = (table: string, dateCol: string) => {
      let q = clientId
        ? supabase.from(table as any).select('*').eq('client_id', clientId)
        : supabase.from(table as any).select('*');
      if (dateRange) {
        q = q.gte(dateCol, dateRange.from.toISOString()).lte(dateCol, dateRange.to.toISOString());
      }
      return q;
    };

    const [sRes, lRes, aRes, rRes, fRes] = await Promise.all([
      buildQ('campaign_performance_snapshots', 'synced_at').eq('entity_level', 'campaign').order('synced_at', { ascending: false }).limit(300),
      buildQ('launch_requests', 'executed_at').not('external_campaign_id', 'is', null).order('executed_at', { ascending: false }).limit(50),
      buildQ('optimization_actions', 'created_at').order('created_at', { ascending: false }).limit(100),
      buildQ('ai_recommendations', 'created_at').order('created_at', { ascending: false }).limit(100),
      clientId
        ? supabase.from('client_portal_files' as any).select('*').eq('client_id', clientId).eq('is_visible_in_portal', true).in('file_type', ['report', 'pdf']).order('created_at', { ascending: false }).limit(10)
        : Promise.resolve({ data: [] }),
    ]);

    setSnapshots((sRes.data as any[]) || []);
    setLaunches((lRes.data as any[]) || []);
    setActions((aRes.data as any[]) || []);
    setRecs((rRes.data as any[]) || []);
    setFiles((fRes.data as any[]) || []);
    setLoading(false);
  }, [portalUser, isAdmin, dateRange]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

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
  const avgCTR = latest.length > 0 ? latest.reduce((s, snap) => s + Number(snap.ctr || 0), 0) / latest.length : 0;
  const lastSync = snapshots.length > 0 ? snapshots[0].synced_at : null;
  const executedCount = actions.filter(a => a.status === 'executed').length;
  const totalActions = actions.length;
  const activeRecs = recs.filter(r => ['new', 'reviewed'].includes(r.status));

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Performance summary and activity reports
          {lastSync && <span className="ml-2 text-[10px]">· Data as of: {new Date(lastSync).toLocaleString()}</span>}
        </p>
      </div>

      <PortalDateFilter value={dateRange} onChange={setDateRange} />

      {/* Performance Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {latest.length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaign data available{dateRange ? ' for selected period' : ' yet'}.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="text-center"><p className="text-lg font-bold text-foreground">${totalSpend.toFixed(0)}</p><p className="text-[10px] text-muted-foreground">Total Spend</p></div>
              <div className="text-center"><p className="text-lg font-bold text-foreground">{totalClicks.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Clicks</p></div>
              <div className="text-center"><p className="text-lg font-bold text-foreground">{totalLeads}</p><p className="text-[10px] text-muted-foreground">Leads</p></div>
              <div className="text-center"><p className="text-lg font-bold text-foreground">${totalRevenue.toFixed(0)}</p><p className="text-[10px] text-muted-foreground">Revenue</p></div>
              <div className="text-center"><p className="text-lg font-bold text-foreground">{avgCTR.toFixed(2)}%</p><p className="text-[10px] text-muted-foreground">Avg CTR</p></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Launch Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Launch Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="text-center"><p className="text-lg font-bold text-foreground">{launches.length}</p><p className="text-[10px] text-muted-foreground">Total Launched</p></div>
            <div className="text-center"><p className="text-lg font-bold text-emerald-500">{launches.filter(l => l.metadata?.campaign_status === 'ACTIVE').length}</p><p className="text-[10px] text-muted-foreground">Active</p></div>
            <div className="text-center"><p className="text-lg font-bold text-muted-foreground">{launches.filter(l => l.metadata?.campaign_status === 'PAUSED').length}</p><p className="text-[10px] text-muted-foreground">Paused</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Optimization Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {totalActions === 0 ? (
            <p className="text-sm text-muted-foreground">No optimization actions recorded{dateRange ? ' for selected period' : ' yet'}.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="text-center"><p className="text-lg font-bold text-foreground">{totalActions}</p><p className="text-[10px] text-muted-foreground">Total Actions</p></div>
              <div className="text-center"><p className="text-lg font-bold text-emerald-500">{executedCount}</p><p className="text-[10px] text-muted-foreground">Completed</p></div>
              <div className="text-center"><p className="text-lg font-bold text-amber-500">{totalActions - executedCount}</p><p className="text-[10px] text-muted-foreground">Pending/In Progress</p></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations Summary */}
      {recs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="text-center"><p className="text-lg font-bold text-foreground">{recs.length}</p><p className="text-[10px] text-muted-foreground">Total Insights</p></div>
              <div className="text-center"><p className="text-lg font-bold text-amber-500">{activeRecs.length}</p><p className="text-[10px] text-muted-foreground">Active</p></div>
              <div className="text-center"><p className="text-lg font-bold text-emerald-500">{recs.length - activeRecs.length}</p><p className="text-[10px] text-muted-foreground">Resolved</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shared Reports/Files */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><FolderOpen className="h-4 w-4 text-primary" /> Shared Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {files.slice(0, 5).map((f: any) => (
              <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-foreground flex-1 truncate">{f.title}</span>
                <Badge variant="outline" className="text-[9px]">{f.file_type}</Badge>
                <span className="text-[10px] text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</span>
              </div>
            ))}
            <Link to="/portal/files" className="text-xs text-primary hover:underline">View all shared files →</Link>
          </CardContent>
        </Card>
      )}

      {/* Sync Freshness */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><RefreshCw className="h-4 w-4 text-primary" /> Data Freshness</CardTitle>
        </CardHeader>
        <CardContent>
          {lastSync ? (
            <p className="text-sm text-foreground">Last data sync: <span className="font-medium">{new Date(lastSync).toLocaleString()}</span></p>
          ) : (
            <p className="text-sm text-muted-foreground">No sync data available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
