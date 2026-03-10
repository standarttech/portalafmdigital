import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, AlertTriangle, XCircle, ArrowRight, ExternalLink, CheckCircle2, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';

interface IntegrityIssue {
  type: string;
  severity: 'error' | 'warning' | 'info';
  entity: string;
  entityId?: string;
  message: string;
  fix: string;
  link: string;
}

function useIntegrityChecks() {
  return useQuery({
    queryKey: ['gos-integrity-checks'],
    queryFn: async () => {
      const issues: IntegrityIssue[] = [];

      const [
        sessionsRes, instancesRes, formsRes, experimentsRes, tokensRes, routingRes,
      ] = await Promise.all([
        supabase.from('gos_onboarding_sessions').select('id, flow_id, status, clients(name)'),
        supabase.from('gos_integration_instances').select('id, vault_secret_ref, is_active, gos_integrations(name, provider)'),
        supabase.from('gos_forms').select('id, name, submit_action, settings, status'),
        supabase.from('gos_experiments').select('id, name, status, traffic_split, entity_type'),
        supabase.from('gos_onboarding_tokens').select('id, expires_at, revoked_at, session_id'),
        supabase.from('gos_routing_rules').select('id, name, action_type, action_config, is_active, conditions'),
      ]);

      // Check: sessions without valid flow
      const sessions = sessionsRes.data || [];
      const flowIds = new Set(sessions.map(s => s.flow_id));
      if (flowIds.size > 0) {
        const { data: flows } = await supabase.from('gos_onboarding_flows').select('id').in('id', Array.from(flowIds));
        const validFlowIds = new Set((flows || []).map(f => f.id));
        for (const s of sessions) {
          if (s.flow_id && !validFlowIds.has(s.flow_id)) {
            issues.push({
              type: 'orphaned_session',
              severity: 'error',
              entity: `Session for ${(s as any).clients?.name || 'Unknown'}`,
              entityId: s.id,
              message: 'Onboarding session references a deleted flow',
              fix: 'Delete session or re-link to a valid flow',
              link: '/growth-os/onboarding',
            });
          }
        }
      }

      // Check: integration instances missing vault_secret_ref
      for (const inst of (instancesRes.data || [])) {
        if (inst.is_active && !inst.vault_secret_ref) {
          const provider = (inst as any).gos_integrations?.provider?.toLowerCase() || '';
          if (['telegram', 'hubspot', 'crm'].includes(provider)) {
            issues.push({
              type: 'missing_secret',
              severity: 'warning',
              entity: (inst as any).gos_integrations?.name || 'Integration',
              entityId: inst.id,
              message: 'Active integration missing vault secret reference',
              fix: 'Reconnect integration with API key/secret',
              link: '/growth-os/integrations',
            });
          }
        }
      }

      // Check: forms with webhook but missing URL
      for (const form of (formsRes.data || [])) {
        const settings = (form.settings || {}) as Record<string, any>;
        if (form.submit_action === 'webhook' && !settings.webhook_url) {
          issues.push({
            type: 'form_webhook_missing_url',
            severity: 'error',
            entity: form.name,
            entityId: form.id,
            message: 'Form has webhook action but no webhook URL configured',
            fix: 'Configure webhook URL in form settings',
            link: '/growth-os/forms',
          });
        }
        if (form.submit_action === 'crm' && (!settings.crm_pipeline_id || !settings.crm_stage_id)) {
          issues.push({
            type: 'form_crm_missing_config',
            severity: 'error',
            entity: form.name,
            entityId: form.id,
            message: 'Form has CRM action but missing pipeline/stage config',
            fix: 'Select target pipeline and stage in form settings',
            link: '/growth-os/forms',
          });
        }
      }

      // Check: experiments with invalid traffic split
      for (const exp of (experimentsRes.data || [])) {
        if (exp.status === 'running') {
          const split = (exp.traffic_split || {}) as Record<string, number>;
          const values = Object.values(split);
          const total = values.reduce((s, v) => s + v, 0);
          if (values.length < 2) {
            issues.push({
              type: 'experiment_insufficient_variants',
              severity: 'error',
              entity: exp.name,
              entityId: exp.id,
              message: `Running experiment has only ${values.length} variant(s) in traffic split`,
              fix: 'Link at least 2 variants and save traffic split',
              link: '/growth-os/experiments',
            });
          } else if (Math.abs(total - 100) > 2) {
            issues.push({
              type: 'experiment_invalid_split',
              severity: 'warning',
              entity: exp.name,
              entityId: exp.id,
              message: `Traffic split total is ${total}%, expected 100%`,
              fix: 'Adjust traffic split percentages',
              link: '/growth-os/experiments',
            });
          }
        }
      }

      // Check: routing rules with incomplete action_config
      for (const rule of (routingRes.data || [])) {
        if (!rule.is_active) continue;
        const config = (rule.action_config || {}) as Record<string, any>;
        if (rule.action_type === 'assign_user' && !config.user_id) {
          issues.push({ type: 'routing_incomplete', severity: 'warning', entity: rule.name, entityId: rule.id, message: 'Assign user rule missing user_id', fix: 'Select target user', link: '/growth-os/lead-routing' });
        }
        if (rule.action_type === 'assign_pipeline' && !config.pipeline_id) {
          issues.push({ type: 'routing_incomplete', severity: 'warning', entity: rule.name, entityId: rule.id, message: 'Pipeline rule missing pipeline_id', fix: 'Select target pipeline', link: '/growth-os/lead-routing' });
        }
        if (rule.action_type === 'webhook' && !config.url) {
          issues.push({ type: 'routing_incomplete', severity: 'error', entity: rule.name, entityId: rule.id, message: 'Webhook rule missing URL', fix: 'Configure webhook URL', link: '/growth-os/lead-routing' });
        }
        if (rule.action_type === 'tag' && !config.tag) {
          issues.push({ type: 'routing_incomplete', severity: 'warning', entity: rule.name, entityId: rule.id, message: 'Tag rule missing tag name', fix: 'Set tag name', link: '/growth-os/lead-routing' });
        }
        // Conditions check
        const conds = (rule.conditions || []) as any[];
        if (conds.some((c: any) => !c.value)) {
          issues.push({ type: 'routing_empty_condition', severity: 'warning', entity: rule.name, entityId: rule.id, message: 'Rule has condition(s) with empty value', fix: 'Fill in condition values', link: '/growth-os/lead-routing' });
        }
      }

      // Check: expired tokens still active
      const expiredActive = (tokensRes.data || []).filter(
        t => !t.revoked_at && new Date(t.expires_at) < new Date()
      );
      if (expiredActive.length > 10) {
        issues.push({
          type: 'stale_tokens',
          severity: 'info',
          entity: `${expiredActive.length} tokens`,
          message: `${expiredActive.length} expired tokens haven't been revoked`,
          fix: 'Consider revoking old tokens for hygiene',
          link: '/growth-os/onboarding',
        });
      }

      return { issues, checkedAt: new Date().toISOString() };
    },
    staleTime: 60_000,
  });
}

// Admin safety tools
function AdminTools() {
  const [testing, setTesting] = useState('');

  const testHealthEndpoint = async () => {
    setTesting('health');
    try {
      const { data: session } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/scheduled-gos-health`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.session?.access_token}` },
      });
      const result = await res.json();
      toast.success(`Health check: ${result.checked || 0} checked, ${result.healthy || 0} healthy, ${result.failed || 0} failed`);
    } catch {
      toast.error('Health endpoint test failed');
    } finally { setTesting(''); }
  };

  const testOnboardingToken = async () => {
    setTesting('token');
    const token = prompt('Enter onboarding token to validate:');
    if (!token) { setTesting(''); return; }
    try {
      const { data } = await supabase.rpc('validate_onboarding_token', { p_token: token });
      const result = data as any;
      if (result?.error) {
        toast.error(`Token invalid: ${result.error}`);
      } else {
        toast.success(`Token valid. Session: ${result.session_id?.slice(0, 8)}... Expires: ${new Date(result.expires_at).toLocaleString()}`);
      }
    } catch {
      toast.error('Token validation failed');
    } finally { setTesting(''); }
  };

  const testIntegrationHealth = async () => {
    setTesting('integration');
    const { data: instances } = await supabase.from('gos_integration_instances').select('id, gos_integrations(name)').eq('is_active', true).limit(5);
    if (!instances?.length) { toast.info('No active integrations to test'); setTesting(''); return; }
    let results: string[] = [];
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const { data: session } = await supabase.auth.getSession();
    for (const inst of instances) {
      try {
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/gos-test-connection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.session?.access_token}` },
          body: JSON.stringify({ instance_id: inst.id }),
        });
        const r = await res.json();
        results.push(`${(inst as any).gos_integrations?.name}: ${r.status}`);
      } catch {
        results.push(`${(inst as any).gos_integrations?.name}: error`);
      }
    }
    toast.success(results.join(' | '));
    setTesting('');
  };

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Wrench className="h-4 w-4" /> Admin Safety Tools</h3>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={testHealthEndpoint} disabled={!!testing} className="text-xs gap-1.5">
            {testing === 'health' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Test Health Endpoint
          </Button>
          <Button size="sm" variant="outline" onClick={testOnboardingToken} disabled={!!testing} className="text-xs gap-1.5">
            {testing === 'token' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Validate Token
          </Button>
          <Button size="sm" variant="outline" onClick={testIntegrationHealth} disabled={!!testing} className="text-xs gap-1.5">
            {testing === 'integration' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Test All Integrations
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GosIntegrityChecksPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useIntegrityChecks();

  const errors = data?.issues.filter(i => i.severity === 'error') ?? [];
  const warnings = data?.issues.filter(i => i.severity === 'warning') ?? [];
  const infos = data?.issues.filter(i => i.severity === 'info') ?? [];

  const severityIcon = (s: string) => {
    if (s === 'error') return <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />;
    if (s === 'warning') return <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />;
    return <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />;
  };

  const severityBadgeClass = (s: string) => {
    if (s === 'error') return 'bg-destructive/10 text-destructive border-destructive/30';
    if (s === 'warning') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Integrity Checks</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Data validation and configuration health for Growth OS</p>
      </div>

      {/* Summary */}
      {isLoading ? (
        <div className="grid gap-3 grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-3 text-center"><Skeleton className="h-8 w-12 mx-auto mb-1" /><Skeleton className="h-3 w-16 mx-auto" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-3">
            <Card className={errors.length > 0 ? 'border-destructive/30' : ''}>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{errors.length}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </CardContent>
            </Card>
            <Card className={warnings.length > 0 ? 'border-amber-500/30' : ''}>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">{warnings.length}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">{infos.length}</p>
                <p className="text-xs text-muted-foreground">Info</p>
              </CardContent>
            </Card>
          </div>

          {data && data.issues.length === 0 ? (
            <Card className="border-emerald-500/20">
              <CardContent className="py-12 text-center">
                <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">All checks passed</p>
                <p className="text-xs text-muted-foreground mt-1">No integrity issues detected</p>
                <p className="text-[10px] text-muted-foreground/60 mt-2">Checked at {new Date(data.checkedAt).toLocaleString()}</p>
              </CardContent>
            </Card>
          ) : data ? (
            <div className="space-y-2">
              {data.issues.map((issue, i) => (
                <Card key={i} className={`${issue.severity === 'error' ? 'border-destructive/20' : issue.severity === 'warning' ? 'border-amber-500/20' : ''}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {severityIcon(issue.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className={`text-[10px] ${severityBadgeClass(issue.severity)}`}>{issue.severity}</Badge>
                          <Badge variant="outline" className="text-[10px]">{issue.type}</Badge>
                          <span className="text-xs font-medium text-foreground truncate">{issue.entity}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{issue.message}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">Fix: {issue.fix}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0"
                        onClick={() => navigate(issue.link)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </>
      )}

      {/* Admin Safety Tools */}
      <AdminTools />
    </div>
  );
}
