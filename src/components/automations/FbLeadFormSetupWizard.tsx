/**
 * Facebook Lead Form — One-Click Setup Wizard (Production)
 *
 * Verify token is per-integration (not per-automation).
 * trigger_config stores only: meta_connection_id, page_id, form_id, page_subscribed,
 * webhook_verified, live_ingestion_active.
 */
import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlatformResource } from '@/hooks/usePlatformResources';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  CheckCircle2, AlertTriangle, XCircle, ExternalLink, Facebook,
  Copy, Loader2, Zap, Radio, Play, RotateCcw, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TriggerConfig {
  meta_connection_id?: string;
  page_id?: string;
  page_name?: string;
  form_id?: string;
  form_name?: string;
  page_subscribed?: boolean;
  webhook_verified?: boolean;
  live_ingestion_active?: boolean;
  form_fields?: Array<{ key: string; label: string; type: string; slug: string }>;
  [key: string]: unknown;
}

interface StepResult {
  step: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  data?: Record<string, unknown>;
}

type Phase = 'idle' | 'running' | 'select_page' | 'select_form' | 'meta_step' | 'done' | 'error';

interface Props {
  automationId: string;
  metaConns: PlatformResource[];
  triggerConfig: TriggerConfig | null;
}

const STEP_LABELS: Record<string, string> = {
  check_meta_connection: 'Checking Meta connection',
  ensure_verify_token: 'Loading integration token',
  load_pages: 'Loading Facebook Pages',
  load_forms: 'Loading Lead Forms',
  subscribe_page: 'Subscribing page to leadgen',
  check_webhook: 'Verifying webhook readiness',
  save_config: 'Saving configuration',
};

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'bhwvnmyvebgnxiisloqu';

async function callSetup(body: Record<string, unknown>) {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error('Not authenticated');
  const resp = await fetch(
    `https://${PROJECT_ID}.supabase.co/functions/v1/facebook-lead-intake-setup`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session.access_token}`,
      },
      body: JSON.stringify(body),
    }
  );
  return resp.json();
}

async function loadIntegrationConfig(connectionId: string): Promise<{ callback_url: string; verify_token: string } | null> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return null;
  try {
    const resp = await fetch(
      `https://${PROJECT_ID}.supabase.co/functions/v1/facebook-lead-intake-setup?action=get-integration-config&connection_id=${connectionId}`,
      { headers: { 'Authorization': `Bearer ${session.session.access_token}` } }
    );
    if (!resp.ok) return null;
    return resp.json();
  } catch {
    return null;
  }
}

export default function FbLeadFormSetupWizard({ automationId, metaConns, triggerConfig }: Props) {
  const qc = useQueryClient();
  const config = triggerConfig || {};

  const [phase, setPhase] = useState<Phase>('idle');
  const [steps, setSteps] = useState<StepResult[]>([]);
  const [currentStep, setCurrentStep] = useState('');
  const [pages, setPages] = useState<{ id: string; name: string }[]>([]);
  const [forms, setForms] = useState<{ id: string; name: string; status?: string }[]>([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [selectedFormId, setSelectedFormId] = useState('');
  const [selectedConnectionId, setSelectedConnectionId] = useState(
    (config.meta_connection_id as string) || (metaConns.length === 1 ? metaConns[0]?.id : '') || ''
  );
  const [callbackUrl, setCallbackUrl] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const isLive = config.live_ingestion_active === true;
  const isConfigured = config.page_id && config.form_id && config.page_subscribed;

  const totalSteps = 7;
  const completedSteps = steps.filter(s => s.status === 'success').length;
  const progressPct = phase === 'done' ? 100 : phase === 'idle' ? 0 : Math.round((completedSteps / totalSteps) * 100);

  const selectedConn = metaConns.find(c => c.id === selectedConnectionId);

  // Load integration config (verify token) when connection changes
  useEffect(() => {
    if (!selectedConnectionId) return;
    loadIntegrationConfig(selectedConnectionId).then(cfg => {
      if (cfg) {
        setCallbackUrl(cfg.callback_url);
        setVerifyToken(cfg.verify_token);
      }
    });
  }, [selectedConnectionId]);

  const runSetup = useCallback(async (pageId?: string, formId?: string) => {
    setPhase('running');
    setError('');
    setSteps([]);

    const stepsProgress = ['check_meta_connection', 'ensure_verify_token', 'load_pages'];
    if (pageId) stepsProgress.push('load_forms');
    if (formId) stepsProgress.push('subscribe_page', 'check_webhook', 'save_config');

    for (const s of stepsProgress) {
      setCurrentStep(s);
      await new Promise(r => setTimeout(r, 200));
    }

    try {
      const result = await callSetup({
        automation_id: automationId,
        meta_connection_id: selectedConnectionId,
        page_id: pageId,
        form_id: formId,
      });

      if (result.error && !result.steps) {
        setError(result.error);
        setPhase('error');
        return;
      }

      setSteps(result.steps || []);
      if (result.callback_url) setCallbackUrl(result.callback_url);
      if (result.verify_token) setVerifyToken(result.verify_token);

      if (result.needs_selection === 'page') {
        setPages(result.pages || []);
        setPhase('select_page');
      } else if (result.needs_selection === 'form') {
        setForms(result.forms || []);
        setPages(result.pages || []);
        setPhase('select_form');
      } else if (result.manual_meta_step_required && !config.webhook_verified) {
        setPhase('meta_step');
      } else if (result.success) {
        setPhase('done');
        qc.invalidateQueries({ queryKey: ['automation', automationId] });
      } else {
        setError(result.steps?.find((s: StepResult) => s.status === 'error')?.message || 'Setup failed');
        setPhase('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
      setPhase('error');
    }
  }, [automationId, selectedConnectionId, config.webhook_verified, qc]);

  const handlePageSelected = () => {
    if (!selectedPageId) return;
    runSetup(selectedPageId);
  };

  const handleFormSelected = () => {
    if (!selectedFormId || !selectedPageId) return;
    runSetup(selectedPageId, selectedFormId);
  };

  const confirmMetaStep = async () => {
    const newConfig: TriggerConfig = {
      meta_connection_id: config.meta_connection_id,
      page_id: config.page_id,
      page_name: config.page_name,
      form_id: config.form_id,
      form_name: config.form_name,
      page_subscribed: config.page_subscribed,
      webhook_verified: true,
      live_ingestion_active: true,
    };
    const { error: err } = await supabase
      .from('automations')
      .update({ trigger_config: newConfig as unknown as Record<string, never> })
      .eq('id', automationId);
    if (err) {
      toast.error(err.message);
    } else {
      toast.success('Live intake activated');
      setPhase('done');
      qc.invalidateQueries({ queryKey: ['automation', automationId] });
    }
  };

  const sendTestLead = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');
      const resp = await fetch(
        `https://${PROJECT_ID}.supabase.co/functions/v1/facebook-lead-intake-setup?action=test-lead`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ automation_id: automationId }),
        }
      );
      const result = await resp.json();
      setTestResult(result);
      if (result.success) toast.success('Test lead processed successfully');
      else toast.error(result.error || 'Test lead failed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTestLoading(false);
    }
  };

  const resetSetup = async () => {
    const { error: err } = await supabase
      .from('automations')
      .update({ trigger_config: {} as unknown as Record<string, never> })
      .eq('id', automationId);
    if (!err) {
      setPhase('idle');
      setSteps([]);
      setPages([]);
      setForms([]);
      setSelectedPageId('');
      setSelectedFormId('');
      setError('');
      setTestResult(null);
      qc.invalidateQueries({ queryKey: ['automation', automationId] });
      toast.success('Configuration reset');
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  // ── CONFIGURED BUT NOT LIVE ──
  useEffect(() => {
    if (isConfigured && !isLive && phase === 'idle') {
      setPhase('meta_step');
    }
  }, [isConfigured, isLive, phase]);

  // ── LIVE STATE ──
  if (isLive && phase === 'idle') {
    return (
      <Card className="mt-3 border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Facebook className="h-4 w-4 text-[hsl(220,70%,50%)]" />
              <span className="text-sm font-semibold text-foreground">Facebook Lead Intake</span>
              <Badge className="text-[10px] gap-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">
                <Radio className="h-2.5 w-2.5 animate-pulse" /> Live
              </Badge>
            </div>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground gap-1" onClick={resetSetup}>
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded-md bg-muted/20 border border-border/20">
              <span className="text-muted-foreground">Integration</span>
              <p className="font-medium text-foreground truncate">{selectedConn?.label || config.meta_connection_id || '—'}</p>
            </div>
            <div className="p-2 rounded-md bg-muted/20 border border-border/20">
              <span className="text-muted-foreground">Page</span>
              <p className="font-medium text-foreground truncate">{config.page_name || config.page_id}</p>
            </div>
            <div className="p-2 rounded-md bg-muted/20 border border-border/20">
              <span className="text-muted-foreground">Form</span>
              <p className="font-medium text-foreground truncate">{config.form_name || config.form_id}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[10px]">
            {config.page_subscribed && <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 gap-1"><CheckCircle2 className="h-2.5 w-2.5" />Page subscribed</Badge>}
            {config.webhook_verified && <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 gap-1"><CheckCircle2 className="h-2.5 w-2.5" />Webhook verified</Badge>}
          </div>

          <div className="pt-1 border-t border-border/20">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={sendTestLead} disabled={testLoading}>
              {testLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Send Test Lead
            </Button>
            {testResult && (
              <div className={cn('mt-2 p-2 rounded-md text-xs border', testResult.success ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-destructive/5 border-destructive/15 text-destructive')}>
                {testResult.success ? (
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Test lead processed — Run ID: {String(testResult.run_id).slice(0, 8)}…</span>
                ) : (
                  <span className="flex items-center gap-1.5"><XCircle className="h-3 w-3" /> {String(testResult.error || 'Test failed')}</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      'mt-3 border overflow-hidden',
      phase === 'done' ? 'border-emerald-500/30 bg-emerald-500/5' :
      phase === 'error' ? 'border-destructive/30 bg-destructive/5' :
      'border-amber-400/20 bg-amber-400/5'
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Facebook className="h-4 w-4 text-[hsl(220,70%,50%)]" />
            <span className="text-sm font-semibold text-foreground">Facebook Lead Form — Setup</span>
          </div>
          {phase !== 'idle' && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground gap-1"
              onClick={() => { setPhase('idle'); setSteps([]); setError(''); }}>
              <RotateCcw className="h-3 w-3" /> Start over
            </Button>
          )}
        </div>

        {/* ── IDLE ── */}
        {phase === 'idle' && (
          <div className="space-y-3">
            {metaConns.length === 0 && (
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-400/5 border border-amber-400/20 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">No Meta integration found</p>
                  <p className="text-muted-foreground mt-0.5">
                    Connect a Meta account in <a href="/ai-ads/integrations" className="text-primary underline">AI Ads Integrations</a> first.
                  </p>
                </div>
              </div>
            )}

            {/* Meta Integration selector */}
            {metaConns.length >= 1 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">Meta Integration</p>
                {metaConns.length === 1 ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-md bg-muted/20 border border-border/20">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Using: <strong className="text-foreground">{metaConns[0].label}</strong></span>
                  </div>
                ) : (
                  <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select Meta integration..." />
                    </SelectTrigger>
                    <SelectContent>
                      {metaConns.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <span>{c.label}</span>
                            {c.clientName && <span className="text-[10px] text-muted-foreground">({c.clientName})</span>}
                            <Badge variant="outline" className={cn('text-[8px] h-3.5 px-1',
                              c.status === 'healthy' ? 'text-emerald-400 border-emerald-400/30' : 'text-amber-400 border-amber-400/30'
                            )}>{c.type}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Show integration's verify token & callback URL */}
                {selectedConnectionId && verifyToken && (
                  <div className="p-2.5 rounded-md bg-muted/10 border border-border/20 space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Info className="h-3 w-3" />
                      <span>This token belongs to the selected Meta app and does not change per automation.</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground">Callback URL</span>
                        <button onClick={() => copyText(callbackUrl, 'Callback URL')} className="text-[9px] text-primary hover:underline flex items-center gap-0.5">
                          <Copy className="h-2.5 w-2.5" /> Copy
                        </button>
                      </div>
                      <code className="block text-[9px] font-mono bg-muted/20 rounded px-1.5 py-1 truncate text-foreground">{callbackUrl}</code>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground">Verify Token</span>
                        <button onClick={() => copyText(verifyToken, 'Verify Token')} className="text-[9px] text-primary hover:underline flex items-center gap-0.5">
                          <Copy className="h-2.5 w-2.5" /> Copy
                        </button>
                      </div>
                      <code className="block text-[9px] font-mono bg-muted/20 rounded px-1.5 py-1 truncate text-foreground">{verifyToken}</code>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full h-11 gap-2 bg-[hsl(220,70%,50%)] hover:bg-[hsl(220,70%,45%)] text-white font-medium"
              onClick={() => runSetup()}
              disabled={metaConns.length === 0 || !selectedConnectionId}
            >
              <Zap className="h-4 w-4" />
              Setup Facebook Lead Intake
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Page selection → form selection → subscription → webhook config
            </p>
          </div>
        )}

        {/* ── RUNNING ── */}
        {phase === 'running' && (
          <div className="space-y-3">
            <Progress value={progressPct} className="h-1.5" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>{STEP_LABELS[currentStep] || currentStep}…</span>
            </div>
          </div>
        )}

        {/* ── SELECT PAGE ── */}
        {phase === 'select_page' && (
          <div className="space-y-3">
            <StepsLog steps={steps} show={showSteps} onToggle={() => setShowSteps(!showSteps)} />
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Select Facebook Page</p>
              {pages.length > 0 ? (
                <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select a page..." /></SelectTrigger>
                  <SelectContent>
                    {pages.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} <span className="text-muted-foreground">({p.id})</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">No pages found. Your Meta token may lack page permissions.</p>
              )}
              <Button size="sm" className="h-8 text-xs gap-1.5" disabled={!selectedPageId} onClick={handlePageSelected}>
                Continue with selected page
              </Button>
            </div>
          </div>
        )}

        {/* ── SELECT FORM ── */}
        {phase === 'select_form' && (
          <div className="space-y-3">
            <StepsLog steps={steps} show={showSteps} onToggle={() => setShowSteps(!showSteps)} />
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Select Lead Form</p>
              {forms.length > 0 ? (
                <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select a form..." /></SelectTrigger>
                  <SelectContent>
                    {forms.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} <span className="text-muted-foreground">({f.id})</span>
                        {f.status && <Badge variant="outline" className="ml-1 text-[8px] h-3.5">{f.status}</Badge>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">No forms found. The token may lack leads_retrieval scope.</p>
              )}
              <Button size="sm" className="h-8 text-xs gap-1.5" disabled={!selectedFormId} onClick={handleFormSelected}>
                Continue — subscribe & configure
              </Button>
            </div>
          </div>
        )}

        {/* ── MANUAL META STEP ── */}
        {phase === 'meta_step' && (
          <div className="space-y-3">
            <StepsLog steps={steps} show={showSteps} onToggle={() => setShowSteps(!showSteps)} />

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
              <p className="text-xs font-semibold text-foreground">Final Step: Configure Webhook in Meta</p>
              <p className="text-[11px] text-muted-foreground">
                В Meta Developer Console вставьте Callback URL и Verify Token, затем нажмите <strong>Verify and save</strong>.
              </p>

              <div className="space-y-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground">Callback URL</span>
                  <div className="flex items-center gap-1.5">
                    <code className="flex-1 text-[10px] font-mono bg-muted/30 border border-border/30 rounded px-2 py-1.5 truncate text-foreground">
                      {callbackUrl || `https://${PROJECT_ID}.supabase.co/functions/v1/fb-leadgen-webhook`}
                    </code>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1"
                      onClick={() => copyText(callbackUrl || `https://${PROJECT_ID}.supabase.co/functions/v1/fb-leadgen-webhook`, 'Callback URL')}>
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground">Verify Token</span>
                  <div className="flex items-center gap-1.5">
                    <code className="flex-1 text-[10px] font-mono bg-muted/30 border border-border/30 rounded px-2 py-1.5 truncate text-foreground">
                      {verifyToken || '(loading…)'}
                    </code>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" disabled={!verifyToken}
                      onClick={() => copyText(verifyToken, 'Verify Token')}>
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/10 rounded p-1.5">
                  <Info className="h-3 w-3 flex-shrink-0" />
                  <span>This token is tied to the selected Meta integration. It stays the same across all automations using this integration.</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
                  <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" /> Open Meta Developer Console
                  </a>
                </Button>
                <Button size="sm" className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmMetaStep}>
                  <CheckCircle2 className="h-3 w-3" /> I completed Meta step
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {phase === 'done' && (
          <div className="space-y-3">
            <StepsLog steps={steps} show={showSteps} onToggle={() => setShowSteps(!showSteps)} />
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">Setup complete — live intake activated. Facebook leads will be processed automatically.</span>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={sendTestLead} disabled={testLoading}>
              {testLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Send Test Lead
            </Button>
            {testResult && (
              <div className={cn('p-2 rounded-md text-xs border', testResult.success ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-destructive/5 border-destructive/15 text-destructive')}>
                {testResult.success ? (
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Test lead processed — Run: {String(testResult.run_id).slice(0, 8)}…</span>
                ) : (
                  <span className="flex items-center gap-1.5"><XCircle className="h-3 w-3" /> {String(testResult.error || 'Test failed')}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ERROR ── */}
        {phase === 'error' && (
          <div className="space-y-3">
            <StepsLog steps={steps} show={showSteps} onToggle={() => setShowSteps(!showSteps)} />
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/15 text-xs">
              <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Setup failed</p>
                <p className="text-muted-foreground mt-0.5">{error}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => runSetup()}>
              <RotateCcw className="h-3 w-3" /> Retry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StepsLog({ steps, show, onToggle }: { steps: StepResult[]; show: boolean; onToggle: () => void }) {
  if (steps.length === 0) return null;
  return (
    <div>
      <button onClick={onToggle} className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
        {show ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {steps.filter(s => s.status === 'success').length}/{steps.length} steps completed
      </button>
      {show && (
        <div className="mt-1.5 space-y-0.5">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              {s.status === 'success' ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
              ) : s.status === 'error' ? (
                <XCircle className="h-3 w-3 text-destructive flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0" />
              )}
              <span className={cn(
                s.status === 'success' ? 'text-emerald-400/80' : s.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {STEP_LABELS[s.step] || s.step}: {s.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
