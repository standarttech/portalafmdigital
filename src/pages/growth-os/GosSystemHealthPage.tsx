import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, HeartPulse, AlertTriangle, CheckCircle2, XCircle,
  Clock, Plug, GitBranch, FormInput, ClipboardCheck, Activity, Shield
} from 'lucide-react';

function useSystemHealth() {
  return useQuery({
    queryKey: ['gos-system-health'],
    queryFn: async () => {
      const d7 = new Date(Date.now() - 7 * 86400000).toISOString();
      const d30 = new Date(Date.now() - 30 * 86400000).toISOString();

      const [
        healthLogsRes, intErrorsRes, routingLogsRes, routingFailRes,
        expiredTokensRes, revokedTokensRes, formFailEventsRes,
        recentAuditRes, intInstancesRes,
      ] = await Promise.all([
        supabase.from('gos_health_check_log').select('id, status, message, checked_at, instance_id')
          .order('checked_at', { ascending: false }).limit(50),
        supabase.from('gos_integration_instances').select('id, error_message, is_active, last_sync_at, gos_integrations(name, provider)')
          .not('error_message', 'is', null),
        supabase.from('gos_routing_log').select('id', { count: 'exact', head: true }).gte('created_at', d7),
        supabase.from('gos_routing_log').select('id, action_taken, lead_source, created_at')
          .like('action_taken', '%failed%').gte('created_at', d30).order('created_at', { ascending: false }).limit(20),
        supabase.from('gos_onboarding_tokens').select('id', { count: 'exact', head: true })
          .lt('expires_at', new Date().toISOString()).is('revoked_at', null),
        supabase.from('gos_onboarding_tokens').select('id', { count: 'exact', head: true })
          .not('revoked_at', 'is', null),
        supabase.from('gos_analytics_events').select('id, entity_id, metadata, created_at')
          .eq('event_type', 'form_submit_failure').gte('created_at', d7).order('created_at', { ascending: false }).limit(30),
        supabase.from('gos_audit_log' as any).select('*').order('created_at', { ascending: false }).limit(30),
        supabase.from('gos_integration_instances').select('id, is_active, error_message, last_sync_at, gos_integrations(name)')
          .eq('is_active', true),
      ]);

      // Health check summary
      const healthLogs = healthLogsRes.data || [];
      const healthOk = healthLogs.filter(l => l.status === 'healthy').length;
      const healthFail = healthLogs.filter(l => l.status === 'failed').length;

      return {
        healthLogs,
        healthOk,
        healthFail,
        lastHealthCheck: healthLogs[0]?.checked_at || null,
        intErrors: intErrorsRes.data || [],
        routingTotal7d: routingLogsRes.count || 0,
        routingFailures: routingFailRes.data || [],
        expiredTokens: expiredTokensRes.count || 0,
        revokedTokens: revokedTokensRes.count || 0,
        formFailEvents: formFailEventsRes.data || [],
        recentAudit: recentAuditRes.data || [],
        activeInstances: intInstancesRes.data || [],
      };
    },
    staleTime: 30_000,
  });
}

function SeverityBadge({ level }: { level: 'ok' | 'warn' | 'error' | 'info' }) {
  const map = {
    ok: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    warn: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    error: 'bg-destructive/10 text-destructive border-destructive/30',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  };
  return <Badge variant="outline" className={`text-[10px] ${map[level]}`}>{level}</Badge>;
}

export default function GosSystemHealthPage() {
  const { data, isLoading } = useSystemHealth();

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;

  const criticalIssues: { label: string; count: number; severity: 'ok' | 'warn' | 'error'; icon: React.ReactNode; link?: string }[] = [
    { label: 'Integrations with errors', count: data.intErrors.length, severity: data.intErrors.length > 0 ? 'error' : 'ok', icon: <Plug className="h-3.5 w-3.5" />, link: '/growth-os/integrations' },
    { label: 'Health check failures (recent)', count: data.healthFail, severity: data.healthFail > 0 ? 'warn' : 'ok', icon: <HeartPulse className="h-3.5 w-3.5" /> },
    { label: 'Routing failures (30d)', count: data.routingFailures.length, severity: data.routingFailures.length > 0 ? 'warn' : 'ok', icon: <GitBranch className="h-3.5 w-3.5" />, link: '/growth-os/lead-routing' },
    { label: 'Form submit failures (7d)', count: data.formFailEvents.length, severity: data.formFailEvents.length > 0 ? 'warn' : 'ok', icon: <FormInput className="h-3.5 w-3.5" />, link: '/growth-os/forms' },
    { label: 'Expired tokens (not revoked)', count: data.expiredTokens, severity: data.expiredTokens > 5 ? 'warn' : 'ok', icon: <Clock className="h-3.5 w-3.5" />, link: '/growth-os/onboarding' },
    { label: 'Revoked tokens', count: data.revokedTokens, severity: 'info' as any, icon: <Shield className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">System Health</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Operational status and error monitoring for Growth OS</p>
      </div>

      {/* Status Overview */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {criticalIssues.map(item => (
          <Card key={item.label} className={`${item.severity === 'error' ? 'border-destructive/30' : item.severity === 'warn' ? 'border-amber-500/30' : ''}`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1.5">
                {item.severity === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> :
                 item.severity === 'error' ? <XCircle className="h-3.5 w-3.5 text-destructive" /> :
                 <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                <span className="text-lg font-bold text-foreground">{item.count}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="health">
        <TabsList>
          <TabsTrigger value="health">Health Checks</TabsTrigger>
          <TabsTrigger value="errors">Errors ({data.intErrors.length + data.routingFailures.length})</TabsTrigger>
          <TabsTrigger value="audit">Audit Log ({data.recentAudit.length})</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
        </TabsList>

        {/* Health Checks Tab */}
        <TabsContent value="health" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Last check: {data.lastHealthCheck ? new Date(data.lastHealthCheck).toLocaleString() : 'Never'}
            </p>
            <div className="flex gap-2 text-xs">
              <span className="text-emerald-400">{data.healthOk} healthy</span>
              <span className="text-destructive">{data.healthFail} failed</span>
            </div>
          </div>
          {data.healthLogs.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-8 text-center text-xs text-muted-foreground">No health check logs yet. The scheduled health check runs periodically.</CardContent></Card>
          ) : (
            <div className="space-y-1">
              {data.healthLogs.map(log => (
                <Card key={log.id}>
                  <CardContent className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {log.status === 'healthy' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                      <SeverityBadge level={log.status === 'healthy' ? 'ok' : 'error'} />
                      <span className="text-foreground">{log.message || '—'}</span>
                    </div>
                    <span className="text-muted-foreground">{new Date(log.checked_at).toLocaleString()}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Active Instances Status */}
          <h3 className="text-sm font-semibold text-foreground pt-2">Active Integrations Status</h3>
          {data.activeInstances.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active integrations</p>
          ) : (
            <div className="space-y-1">
              {data.activeInstances.map((inst: any) => (
                <Card key={inst.id}>
                  <CardContent className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {inst.error_message ? <XCircle className="h-3.5 w-3.5 text-destructive" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                      <span className="text-foreground">{inst.gos_integrations?.name || 'Integration'}</span>
                      {inst.error_message && <span className="text-destructive truncate max-w-[200px]">{inst.error_message}</span>}
                    </div>
                    <span className="text-muted-foreground">{inst.last_sync_at ? new Date(inst.last_sync_at).toLocaleString() : 'Never synced'}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="mt-4 space-y-4">
          {data.intErrors.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Plug className="h-4 w-4" /> Integration Errors</h3>
              <div className="space-y-1">
                {data.intErrors.map((inst: any) => (
                  <Card key={inst.id} className="border-destructive/20">
                    <CardContent className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                        <span className="text-foreground font-medium">{inst.gos_integrations?.name || 'Integration'}</span>
                        <span className="text-destructive truncate">{inst.error_message}</span>
                      </div>
                      <SeverityBadge level="error" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {data.routingFailures.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><GitBranch className="h-4 w-4" /> Routing Failures (30d)</h3>
              <div className="space-y-1">
                {data.routingFailures.map((log: any) => (
                  <Card key={log.id}>
                    <CardContent className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-foreground">{log.lead_source || '—'}</span>
                        <Badge variant="outline" className="text-[10px]">{log.action_taken}</Badge>
                      </div>
                      <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {data.formFailEvents.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><FormInput className="h-4 w-4" /> Form Submit Failures (7d)</h3>
              <div className="space-y-1">
                {data.formFailEvents.map((ev: any) => (
                  <Card key={ev.id}>
                    <CardContent className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                        <span className="text-foreground">{ev.entity_id?.slice(0, 8) || '—'}</span>
                        <span className="text-muted-foreground truncate max-w-[200px]">{(ev.metadata as any)?.error || 'Unknown error'}</span>
                      </div>
                      <span className="text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {data.intErrors.length === 0 && data.routingFailures.length === 0 && data.formFailEvents.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No errors detected</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="mt-4">
          {data.recentAudit.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-8 text-center text-xs text-muted-foreground">No audit events yet. Actions will appear here as you use Growth OS.</CardContent></Card>
          ) : (
            <div className="space-y-1">
              {data.recentAudit.map((entry: any) => (
                <Card key={entry.id}>
                  <CardContent className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <Badge variant="outline" className="text-[10px]">{entry.action_type}</Badge>
                      <span className="text-foreground font-medium">{entry.entity_type}</span>
                      {entry.entity_name && <span className="text-muted-foreground truncate max-w-[150px]">{entry.entity_name}</span>}
                      {entry.actor_role && <span className="text-[10px] text-muted-foreground/60">{entry.actor_role}</span>}
                    </div>
                    <span className="text-muted-foreground flex-shrink-0">{new Date(entry.created_at).toLocaleString()}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><HeartPulse className="h-4 w-4" /> scheduled-gos-health</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Last Run</p>
                  <p className="font-medium text-foreground">{data.lastHealthCheck ? new Date(data.lastHealthCheck).toLocaleString() : 'Never'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Checks</p>
                  <p className="font-medium text-foreground">{data.healthLogs.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Healthy</p>
                  <p className="font-medium text-emerald-400">{data.healthOk}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Failed</p>
                  <p className="font-medium text-destructive">{data.healthFail}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><GitBranch className="h-4 w-4" /> Lead Routing Execution</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Routed (7d)</p>
                  <p className="font-medium text-foreground">{data.routingTotal7d}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Failures (30d)</p>
                  <p className="font-medium text-destructive">{data.routingFailures.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{data.routingFailures.length === 0 ?
                    <span className="text-emerald-400">Healthy</span> :
                    <span className="text-amber-400">Degraded</span>
                  }</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Onboarding Tokens</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Expired (not revoked)</p>
                  <p className="font-medium text-foreground">{data.expiredTokens}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Revoked</p>
                  <p className="font-medium text-foreground">{data.revokedTokens}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
