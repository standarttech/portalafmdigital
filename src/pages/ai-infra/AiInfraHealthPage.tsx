import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HeartPulse, Loader2, CheckCircle2, XCircle, AlertTriangle, Wifi } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Provider { id: string; name: string; slug: string; provider_type: string; is_active: boolean; }
interface HealthCheck { id: string; provider_id: string; status: string; checked_at: string; latency_ms: number | null; error_message: string | null; }

const statusColors: Record<string, string> = {
  healthy: 'text-emerald-400', degraded: 'text-amber-400', unhealthy: 'text-destructive', unknown: 'text-muted-foreground',
};
const statusIcons: Record<string, React.ReactNode> = {
  healthy: <CheckCircle2 className="h-5 w-5" />, degraded: <AlertTriangle className="h-5 w-5" />,
  unhealthy: <XCircle className="h-5 w-5" />, unknown: <Wifi className="h-5 w-5" />,
};

export default function AiInfraHealthPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [checks, setChecks] = useState<Record<string, HealthCheck | null>>({});
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: prov } = await supabase.from('ai_providers' as any).select('id, name, slug, provider_type, is_active').order('name');
    const provList = (prov as any[]) || [];
    setProviders(provList);

    // Get latest health check per provider
    const checksMap: Record<string, HealthCheck | null> = {};
    for (const p of provList) {
      const { data } = await supabase.from('ai_provider_health_checks' as any).select('*').eq('provider_id', p.id).order('checked_at', { ascending: false }).limit(1).maybeSingle();
      checksMap[p.id] = data as any;
    }
    setChecks(checksMap);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runCheck = async (providerId: string) => {
    setTesting(providerId);
    try {
      const { data, error } = await supabase.functions.invoke('ai-provider-health', { body: { provider_id: providerId } });
      if (error) throw error;
      toast.success(`Health check: ${data?.status} (${data?.latency_ms}ms)`);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setTesting(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <HeartPulse className="h-6 w-6 text-[hsl(200,70%,55%)]" /> Provider Health
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Connectivity and latency monitoring for AI providers</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : providers.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <HeartPulse className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Providers</h3>
          <p className="text-sm text-muted-foreground">Add providers first to monitor their health.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {providers.map(p => {
            const hc = checks[p.id];
            const status = hc?.status || 'unknown';
            return (
              <Card key={p.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{p.name}</CardTitle>
                    <div className={statusColors[status]}>{statusIcons[status]}</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{p.provider_type}</Badge>
                    <Badge variant={status === 'healthy' ? 'default' : 'secondary'} className={`text-[10px] ${statusColors[status]}`}>{status}</Badge>
                  </div>
                  {hc && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {hc.latency_ms != null && <p>Latency: <span className="font-mono text-foreground">{hc.latency_ms}ms</span></p>}
                      <p>Last check: {new Date(hc.checked_at).toLocaleString()}</p>
                      {hc.error_message && <p className="text-destructive">{hc.error_message}</p>}
                    </div>
                  )}
                  {!hc && <p className="text-xs text-muted-foreground">No health checks recorded yet</p>}
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => runCheck(p.id)} disabled={testing === p.id}>
                    {testing === p.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <HeartPulse className="h-3 w-3 mr-1" />} Run Health Check
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
