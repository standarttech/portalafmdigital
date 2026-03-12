import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lightbulb } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOutletContext } from 'react-router-dom';
import type { PortalUser, PortalBranding } from '@/types/portal';

interface Ctx { portalUser: PortalUser | null; branding: PortalBranding | null; isAdmin: boolean; }

/** Transform internal recommendation to client-safe wording */
function clientSafeTitle(title: string): string {
  return title
    .replace(/page_id|ad_account_id|adset_id|campaign_id|ad_set/gi, 'configuration')
    .replace(/\bfix\b/gi, 'Adjust')
    .replace(/payload|config field|metadata/gi, 'setting')
    .replace(/anomaly detected/gi, 'unusual pattern found')
    .replace(/threshold breach/gi, 'performance alert');
}

function clientSafeDescription(desc: string): string {
  if (!desc) return '';
  return desc
    .replace(/page_id|ad_account_id|adset_id|campaign_id/gi, 'configuration')
    .replace(/\bfix\b/gi, 'adjust')
    .replace(/payload|config field|metadata|raw data/gi, 'setting')
    .replace(/debug|stack trace|error code/gi, 'issue')
    .substring(0, 300);
}

export default function PortalRecommendationsPage() {
  const { portalUser, isAdmin } = useOutletContext<Ctx>();
  const [loading, setLoading] = useState(true);
  const [recs, setRecs] = useState<any[]>([]);

  const load = useCallback(async () => {
    const clientId = portalUser?.client_id;
    if (!clientId && !isAdmin) { setLoading(false); return; }

    const q = clientId
      ? supabase.from('ai_recommendations').select('*').eq('client_id', clientId)
      : supabase.from('ai_recommendations').select('*');

    const { data } = await q.order('created_at', { ascending: false }).limit(100);
    setRecs((data as any[]) || []);
    setLoading(false);
  }, [portalUser, isAdmin]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const active = recs.filter(r => ['new', 'reviewed'].includes(r.status));
  const resolved = recs.filter(r => ['dismissed', 'converted_to_draft', 'acted_on'].includes(r.status));

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Recommendations & Insights</h1>
        <p className="text-sm text-muted-foreground">Performance insights and suggested improvements for your campaigns</p>
      </div>

      {recs.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No recommendations yet. Insights will appear as campaigns run and data is analyzed.</CardContent></Card>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Active Insights ({active.length})</h2>
              <div className="space-y-2">
                {active.map(r => (
                  <Card key={r.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{clientSafeTitle(r.title)}</p>
                            <Badge variant="outline" className={`text-[9px] ${r.priority === 'high' ? 'text-destructive border-destructive/30' : 'text-amber-500 border-amber-500/30'}`}>
                              {r.priority}
                            </Badge>
                          </div>
                          {r.description && (
                            <p className="text-xs text-muted-foreground mt-1">{clientSafeDescription(r.description)}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Resolved ({resolved.length})</h2>
              <div className="space-y-2">
                {resolved.slice(0, 10).map(r => (
                  <Card key={r.id} className="opacity-60">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] text-emerald-500 border-emerald-500/30">resolved</Badge>
                        <span className="text-xs text-foreground truncate">{clientSafeTitle(r.title)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
