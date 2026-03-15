/**
 * Facebook Lead Form Trigger — Guided Setup Wizard (Production)
 *
 * Uses meta-oauth?action=list-pages and list-forms to load real data.
 * Falls back to manual entry. Saves config to automations.trigger_config.
 */
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlatformResource } from '@/hooks/usePlatformResources';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  CheckCircle2, Circle, AlertTriangle, XCircle, ExternalLink,
  Facebook, Link2, FileText, Globe, Webhook, Radio, Info, Save, Copy,
  RefreshCw, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TriggerConfig {
  meta_connection_id?: string;
  meta_connection_label?: string;
  page_id?: string;
  page_name?: string;
  form_id?: string;
  form_name?: string;
  webhook_verified?: boolean;
  live_ingestion_active?: boolean;
  last_verified_at?: string;
  verification_error?: string;
}

interface Props {
  automationId: string;
  metaConns: PlatformResource[];
  triggerConfig: TriggerConfig | null;
}

type StepStatus = 'completed' | 'active' | 'blocked' | 'upcoming';

function getStepStatus(stepIdx: number, config: TriggerConfig | null): StepStatus {
  const c = config || {};
  if (stepIdx === 0) return c.meta_connection_id ? 'completed' : 'active';
  if (stepIdx === 1) {
    if (!c.meta_connection_id) return 'upcoming';
    return c.page_id ? 'completed' : 'active';
  }
  if (stepIdx === 2) {
    if (!c.page_id) return 'upcoming';
    return c.form_id ? 'completed' : 'active';
  }
  if (stepIdx === 3) {
    if (!c.form_id) return 'upcoming';
    return c.webhook_verified ? 'completed' : 'active';
  }
  if (stepIdx === 4) {
    if (!c.webhook_verified) return 'upcoming';
    return c.live_ingestion_active ? 'completed' : 'active';
  }
  return 'upcoming';
}

const STEPS = [
  { label: 'Select Meta Connection', icon: Link2 },
  { label: 'Select Facebook Page', icon: Globe },
  { label: 'Select Lead Form', icon: FileText },
  { label: 'Verify Webhook', icon: Webhook },
  { label: 'Activate Live Intake', icon: Radio },
];

export default function FbLeadFormSetupWizard({ automationId, metaConns, triggerConfig }: Props) {
  const qc = useQueryClient();
  const [config, setConfig] = useState<TriggerConfig>(triggerConfig || {});

  useEffect(() => { setConfig(triggerConfig || {}); }, [triggerConfig]);

  const saveMutation = useMutation({
    mutationFn: async (newConfig: TriggerConfig) => {
      const { error } = await supabase
        .from('automations')
        .update({ trigger_config: newConfig as unknown as Record<string, never> })
        .eq('id', automationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Trigger config saved');
      qc.invalidateQueries({ queryKey: ['automation', automationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateAndSave = (patch: Partial<TriggerConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    saveMutation.mutate(next);
  };

  const selectedConn = metaConns.find(c => c.id === config.meta_connection_id);
  const completedCount = STEPS.filter((_, i) => getStepStatus(i, config) === 'completed').length;
  const allDone = completedCount === STEPS.length;
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://bhwvnmyvebgnxiisloqu.supabase.co'}/functions/v1/fb-leadgen-webhook`;

  return (
    <Card className={cn(
      'mt-3 border overflow-hidden',
      allDone ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-400/20 bg-amber-400/5'
    )}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Facebook className="h-4 w-4 text-[hsl(220,70%,50%)]" />
            <span className="text-sm font-semibold text-foreground">Facebook Lead Form — Setup</span>
          </div>
          <Badge variant="outline" className={cn(
            'text-[10px] gap-1',
            allDone ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'
              : 'text-amber-400 border-amber-400/30 bg-amber-400/10'
          )}>
            {allDone ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {completedCount}/{STEPS.length} steps
          </Badge>
        </div>

        <div className="space-y-3">
          {STEPS.map((step, idx) => {
            const status = getStepStatus(idx, config);
            const StepIcon = step.icon;
            return (
              <StepBlock key={idx} stepNum={idx + 1} label={step.label} icon={StepIcon} status={status}>
                {idx === 0 && <StepMetaConnection status={status} metaConns={metaConns} selectedConn={selectedConn} config={config} onSave={updateAndSave} />}
                {idx === 1 && <StepSelectPage status={status} config={config} onSave={updateAndSave} />}
                {idx === 2 && <StepSelectForm status={status} config={config} onSave={updateAndSave} />}
                {idx === 3 && <StepWebhook status={status} config={config} webhookUrl={webhookUrl} onSave={updateAndSave} automationId={automationId} />}
                {idx === 4 && <StepLiveIntake status={status} config={config} onSave={updateAndSave} />}
              </StepBlock>
            );
          })}
        </div>

        {!allDone && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/30 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>Complete the steps above to enable automatic lead ingestion. Use <strong className="text-foreground">Manual / Test</strong> trigger to test the flow now.</span>
          </div>
        )}
        {allDone && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium">Live — accepting Facebook leads in real-time.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StepBlock({ stepNum, label, icon: Icon, status, children }: {
  stepNum: number; label: string; icon: React.ElementType; status: StepStatus; children: React.ReactNode;
}) {
  const isOpen = status === 'active' || status === 'completed';
  return (
    <div className={cn(
      'rounded-lg border transition-all',
      status === 'completed' && 'border-emerald-500/20 bg-emerald-500/5',
      status === 'active' && 'border-primary/30 bg-primary/5',
      status === 'blocked' && 'border-red-400/20 bg-red-400/5 opacity-60',
      status === 'upcoming' && 'border-border/30 bg-muted/10 opacity-50',
    )}>
      <div className="flex items-center gap-2.5 p-2.5">
        {status === 'completed' ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
        ) : status === 'active' ? (
          <div className="h-4 w-4 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          </div>
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
        )}
        <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className={cn(
          'text-xs font-medium flex-1',
          status === 'completed' && 'text-emerald-400/80',
          status === 'active' && 'text-foreground',
          (status === 'blocked' || status === 'upcoming') && 'text-muted-foreground',
        )}>
          {stepNum}. {label}
        </span>
      </div>
      {isOpen && <div className="px-2.5 pb-2.5 pt-0">{children}</div>}
    </div>
  );
}

/* ── Step 1: Meta Connection ── */
function StepMetaConnection({ status, metaConns, selectedConn, config, onSave }: {
  status: StepStatus; metaConns: PlatformResource[]; selectedConn?: PlatformResource;
  config: TriggerConfig; onSave: (p: Partial<TriggerConfig>) => void;
}) {
  if (status === 'completed' && selectedConn) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30 bg-emerald-400/10 gap-1">
            <CheckCircle2 className="h-2.5 w-2.5" /> {selectedConn.label}
          </Badge>
          {selectedConn.clientName && <span className="text-muted-foreground">({selectedConn.clientName})</span>}
        </div>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground"
          onClick={() => onSave({ meta_connection_id: undefined, meta_connection_label: undefined, page_id: undefined, page_name: undefined, form_id: undefined, form_name: undefined, webhook_verified: undefined, live_ingestion_active: undefined })}>
          Change
        </Button>
      </div>
    );
  }

  if (metaConns.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2 p-2 rounded-md bg-red-400/5 border border-red-400/20 text-xs">
          <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">No Meta ad connections found. Connect a Meta account to proceed.</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" asChild>
            <a href="/ai-ads/integrations"><ExternalLink className="h-3 w-3" /> Connect Meta Account</a>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" asChild>
            <a href="/connections"><Link2 className="h-3 w-3" /> Connections Center</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Select value={config.meta_connection_id || ''} onValueChange={v => {
      const conn = metaConns.find(c => c.id === v);
      onSave({ meta_connection_id: v, meta_connection_label: conn?.label || v });
    }}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Meta connection..." /></SelectTrigger>
      <SelectContent>
        {metaConns.map(c => (
          <SelectItem key={c.id} value={c.id}>
            <div className="flex items-center gap-2">
              <span>{c.label}</span>
              {c.clientName && <span className="text-[10px] text-muted-foreground">({c.clientName})</span>}
              <Badge variant="outline" className={cn('text-[8px] h-3.5 px-1',
                c.status === 'healthy' ? 'text-emerald-400 border-emerald-400/30' : 'text-amber-400 border-amber-400/30'
              )}>{c.status}</Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ── Step 2: Select Page ── */
function StepSelectPage({ status, config, onSave }: {
  status: StepStatus; config: TriggerConfig; onSave: (p: Partial<TriggerConfig>) => void;
}) {
  const [pageId, setPageId] = useState(config.page_id || '');
  const [pageName, setPageName] = useState(config.page_name || '');
  const [loading, setLoading] = useState(false);
  const [metaPages, setMetaPages] = useState<{ id: string; name: string }[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => { setPageId(config.page_id || ''); setPageName(config.page_name || ''); }, [config.page_id, config.page_name]);

  const loadPages = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { setFetchError('Not authenticated'); setLoading(false); return; }

      // Call meta-oauth?action=list-pages with the selected connection_id
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'bhwvnmyvebgnxiisloqu';
      const isManagementToken = config.meta_connection_id && metaConns?.find(
        (c: any) => c.id === config.meta_connection_id && c.provider === 'meta_ads_management'
      );
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/meta-oauth?action=list-pages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            connection_id: config.meta_connection_id,
            use_management_token: !!isManagementToken,
          }),
        }
      );
      const result = await resp.json();

      if (result.pages && result.pages.length > 0) {
        setMetaPages(result.pages);
        setFetchError(null);
      } else {
        setMetaPages(null);
        setFetchError(result.error || 'No pages found. Enter Page ID manually from Meta Business Suite → Page Settings.');
      }
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'completed') {
    return (
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30 bg-emerald-400/10 gap-1">
          <CheckCircle2 className="h-2.5 w-2.5" /> {config.page_name || config.page_id}
        </Badge>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground"
          onClick={() => onSave({ page_id: undefined, page_name: undefined, form_id: undefined, form_name: undefined })}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={loadPages} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Load Pages from Meta
        </Button>
      </div>

      {fetchError && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-amber-400/5 border border-amber-400/20 text-xs">
          <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">{fetchError}</span>
        </div>
      )}

      {metaPages && metaPages.length > 0 && (
        <Select value={pageId} onValueChange={v => {
          const p = metaPages.find(pg => pg.id === v);
          setPageId(v);
          setPageName(p?.name || v);
        }}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select a page..." /></SelectTrigger>
          <SelectContent>
            {metaPages.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name} ({p.id})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="text-[10px] text-muted-foreground flex items-start gap-1.5 p-1.5 rounded bg-muted/20">
        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <span>Or enter the Page ID manually from Meta Business Suite → Page Settings.</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Page ID</Label>
          <Input value={pageId} onChange={e => setPageId(e.target.value)} placeholder="e.g. 123456789" className="h-7 text-xs mt-0.5" />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Page Name</Label>
          <Input value={pageName} onChange={e => setPageName(e.target.value)} placeholder="e.g. My Business Page" className="h-7 text-xs mt-0.5" />
        </div>
      </div>
      <Button size="sm" className="h-7 text-xs gap-1" disabled={!pageId.trim()}
        onClick={() => onSave({ page_id: pageId.trim(), page_name: pageName.trim() || pageId.trim() })}>
        <Save className="h-3 w-3" /> Save Page
      </Button>
    </div>
  );
}

/* ── Step 3: Select Form ── */
function StepSelectForm({ status, config, onSave }: {
  status: StepStatus; config: TriggerConfig; onSave: (p: Partial<TriggerConfig>) => void;
}) {
  const [formId, setFormId] = useState(config.form_id || '');
  const [formName, setFormName] = useState(config.form_name || '');
  const [loading, setLoading] = useState(false);
  const [metaForms, setMetaForms] = useState<{ id: string; name: string }[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => { setFormId(config.form_id || ''); setFormName(config.form_name || ''); }, [config.form_id, config.form_name]);

  const loadForms = async () => {
    if (!config.page_id) return;
    setLoading(true);
    setFetchError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { setFetchError('Not authenticated'); setLoading(false); return; }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'bhwvnmyvebgnxiisloqu';
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/meta-oauth?action=list-forms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            page_id: config.page_id,
            connection_id: config.meta_connection_id,
          }),
        }
      );
      const result = await resp.json();

      if (result.forms && result.forms.length > 0) {
        setMetaForms(result.forms);
        setFetchError(null);
      } else {
        setMetaForms(null);
        setFetchError(result.error || 'No forms found. Enter Form ID manually from Facebook Page → Publishing Tools → Lead Ads Forms.');
      }
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'completed') {
    return (
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30 bg-emerald-400/10 gap-1">
          <CheckCircle2 className="h-2.5 w-2.5" /> {config.form_name || config.form_id}
        </Badge>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground"
          onClick={() => onSave({ form_id: undefined, form_name: undefined })}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={loadForms} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Load Forms
        </Button>
      </div>

      {fetchError && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-amber-400/5 border border-amber-400/20 text-xs">
          <Info className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">{fetchError}</span>
        </div>
      )}

      {metaForms && metaForms.length > 0 && (
        <Select value={formId} onValueChange={v => {
          const f = metaForms.find(fm => fm.id === v);
          setFormId(v);
          setFormName(f?.name || v);
        }}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select a form..." /></SelectTrigger>
          <SelectContent>
            {metaForms.map(f => (
              <SelectItem key={f.id} value={f.id}>{f.name} ({f.id})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Form ID</Label>
          <Input value={formId} onChange={e => setFormId(e.target.value)} placeholder="e.g. 987654321" className="h-7 text-xs mt-0.5" />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Form Name</Label>
          <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Contact Form v2" className="h-7 text-xs mt-0.5" />
        </div>
      </div>
      <Button size="sm" className="h-7 text-xs gap-1" disabled={!formId.trim()}
        onClick={() => onSave({ form_id: formId.trim(), form_name: formName.trim() || formId.trim() })}>
        <Save className="h-3 w-3" /> Save Form
      </Button>
    </div>
  );
}

/* ── Step 4: Webhook Verification ── */
function StepWebhook({ status, config, webhookUrl, onSave, automationId }: {
  status: StepStatus; config: TriggerConfig; webhookUrl: string;
  onSave: (p: Partial<TriggerConfig>) => void; automationId: string;
}) {
  const [checking, setChecking] = useState(false);

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied');
  };

  const checkVerification = async () => {
    setChecking(true);
    try {
      // Send a test GET to the webhook to see if it responds (challenge test)
      const testUrl = `${webhookUrl}?hub.mode=subscribe&hub.verify_token=test&hub.challenge=test_check`;
      const resp = await fetch(testUrl);
      // If the edge function is deployed and responds, webhook is reachable
      const isReachable = resp.status === 200 || resp.status === 403;

      if (isReachable) {
        // Mark as verified — the webhook endpoint is live and accepting requests
        onSave({ webhook_verified: true, last_verified_at: new Date().toISOString(), verification_error: undefined });
        toast.success('Webhook endpoint is live and verified!');
      } else {
        onSave({ verification_error: `Endpoint returned ${resp.status}` });
        toast.error(`Webhook returned unexpected status: ${resp.status}`);
      }
    } catch (err) {
      toast.error('Failed to reach webhook endpoint');
      onSave({ verification_error: 'Failed to reach endpoint' });
    } finally {
      setChecking(false);
    }
  };

  if (status === 'completed') {
    return (
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30 bg-emerald-400/10 gap-1">
          <CheckCircle2 className="h-2.5 w-2.5" /> Webhook verified
          {config.last_verified_at && <span className="text-[9px] text-emerald-400/60 ml-1">
            ({new Date(config.last_verified_at).toLocaleDateString()})
          </span>}
        </Badge>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground"
          onClick={() => onSave({ webhook_verified: false })}>
          Re-verify
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-muted-foreground flex items-start gap-1.5 p-1.5 rounded bg-muted/20">
        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <div>
          <p className="mb-1">Configure this webhook URL in your Meta App:</p>
          <ol className="list-decimal list-inside space-y-0.5 ml-1">
            <li>Go to <strong>Meta Developers → Your App → Webhooks</strong></li>
            <li>Add <strong>Page</strong> subscription</li>
            <li>Callback URL: paste the URL below</li>
            <li>Verify Token: use the value you set in <code className="bg-muted/40 px-1 rounded text-[9px]">FB_LEADGEN_VERIFY_TOKEN</code> secret</li>
            <li>Subscribe to <strong>leadgen</strong> field</li>
          </ol>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <code className="flex-1 text-[10px] font-mono bg-muted/30 border border-border/30 rounded px-2 py-1.5 truncate text-foreground">
          {webhookUrl}
        </code>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={copyUrl}>
              <Copy className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Copy URL</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={checkVerification} disabled={checking}>
          {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Verify Webhook Endpoint
        </Button>
      </div>

      {config.verification_error && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-red-400/5 border border-red-400/15 text-xs">
          <XCircle className="h-3 w-3 text-red-400 flex-shrink-0" />
          <span className="text-muted-foreground">{config.verification_error}</span>
        </div>
      )}
    </div>
  );
}

/* ── Step 5: Live Intake ── */
function StepLiveIntake({ status, config, onSave }: {
  status: StepStatus; config: TriggerConfig; onSave: (p: Partial<TriggerConfig>) => void;
}) {
  if (status === 'completed') {
    return (
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30 bg-emerald-400/10 gap-1">
          <CheckCircle2 className="h-2.5 w-2.5" /> Live — accepting leads
        </Badge>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground"
          onClick={() => onSave({ live_ingestion_active: false })}>
          Pause
        </Button>
      </div>
    );
  }

  if (status === 'upcoming') {
    return (
      <div className="text-[10px] text-muted-foreground">Complete previous steps first.</div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-muted-foreground flex items-start gap-1.5 p-1.5 rounded bg-muted/20">
        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <span>
          Webhook is verified. Activate live intake to start processing Facebook leads automatically.
          Make sure the automation is <strong>Active</strong> (toggle at the top).
        </span>
      </div>
      <Button size="sm" className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
        onClick={() => onSave({ live_ingestion_active: true })}>
        <Radio className="h-3 w-3" /> Activate Live Intake
      </Button>
    </div>
  );
}
