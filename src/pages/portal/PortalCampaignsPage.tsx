import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, Clock, AlertTriangle, Megaphone } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOutletContext } from 'react-router-dom';
import type { PortalUser, PortalBranding } from '@/types/portal';

interface Ctx { portalUser: PortalUser | null; branding: PortalBranding | null; isAdmin: boolean; }

export default function PortalCampaignsPage() {
  const { portalUser, isAdmin } = useOutletContext<Ctx>();
  const [loading, setLoading] = useState(true);
  const [launches, setLaunches] = useState<any[]>([]);
  const [snapMap, setSnapMap] = useState<Map<string, any>>(new Map());

  const load = useCallback(async () => {
    const clientId = portalUser?.client_id;
    if (!clientId && !isAdmin) { setLoading(false); return; }

    const filter = clientId
      ? supabase.from('launch_requests' as any).select('*').eq('client_id', clientId)
      : supabase.from('launch_requests' as any).select('*');

    const { data: lr } = await filter.not('external_campaign_id', 'is', null)
      .order('executed_at', { ascending: false }).limit(100);

    setLaunches((lr as any[]) || []);

    // Get snapshots for these campaigns
    const campaignIds = ((lr as any[]) || []).map((l: any) => l.external_campaign_id).filter(Boolean);
    if (campaignIds.length > 0) {
      const snapFilter = clientId
        ? supabase.from('campaign_performance_snapshots').select('*').eq('client_id', clientId).in('external_campaign_id', campaignIds)
        : supabase.from('campaign_performance_snapshots').select('*').in('external_campaign_id', campaignIds);
      const { data: snaps } = await snapFilter.order('synced_at', { ascending: false }).limit(500);
      const m = new Map<string, any>();
      for (const s of ((snaps as any[]) || [])) {
        if (!m.has(s.external_campaign_id)) m.set(s.external_campaign_id, s);
      }
      setSnapMap(m);
    }

    setLoading(false);
  }, [portalUser, isAdmin]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Campaigns</h1>
        <p className="text-sm text-muted-foreground">Your active and recent advertising campaigns</p>
      </div>

      {launches.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No campaigns launched yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {launches.map(l => {
            const status = l.metadata?.campaign_status || 'unknown';
            const isActive = status === 'ACTIVE';
            const hasIssue = ['DISAPPROVED', 'WITH_ISSUES'].includes(status);
            const snap = snapMap.get(l.external_campaign_id);

            return (
              <Card key={l.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isActive ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> :
                       hasIssue ? <AlertTriangle className="h-5 w-5 text-destructive" /> :
                       <Clock className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{l.metadata?.campaign_name || 'Campaign'}</p>
                        <Badge variant="outline" className="text-[9px] shrink-0">{status.toLowerCase()}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{l.platform} · Launched {l.executed_at ? new Date(l.executed_at).toLocaleDateString() : '—'}</p>
                      {snap && (
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Spend: <span className="text-foreground font-medium">${Number(snap.spend || 0).toFixed(0)}</span></span>
                          <span>Clicks: <span className="text-foreground font-medium">{snap.clicks || 0}</span></span>
                          <span>Leads: <span className="text-foreground font-medium">{snap.leads || 0}</span></span>
                          {Number(snap.revenue) > 0 && <span>Revenue: <span className="text-foreground font-medium">${Number(snap.revenue).toFixed(0)}</span></span>}
                        </div>
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
  );
}
