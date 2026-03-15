import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTelegramBots, useSheetResources, usePlatformAdConnections, usePlatformResources } from '@/hooks/usePlatformResources';
import type { PlatformResource } from '@/hooks/usePlatformResources';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  ArrowLeft, Save, Play, Plus, Trash2, ChevronDown,
  CheckCircle2, XCircle, AlertTriangle, Clock, Facebook, MessageSquare,
  FileSpreadsheet, Globe, Bell, Users, Webhook, Database, GitBranch,
  Filter, Zap, Send, X, Info, Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import FbLeadFormSetupWizard from '@/components/automations/FbLeadFormSetupWizard';

/* ── Trigger definitions ── */
const TRIGGER_TYPES = [
  { id: 'fb_lead_form', label: 'Facebook Lead Form', icon: Facebook, color: 'hsl(220,70%,50%)', live: false,
    note: 'Requires Meta webhook ingestion. Connect Meta → configure Page & Form → verify webhook.',
    fields: ['full_name', 'email', 'phone', 'form_name', 'page_name', 'form_answers_text', 'form_answers_json', 'campaign_name', 'ad_name', 'utm_source', 'utm_medium', 'utm_campaign', 'platform', 'created_at'] },
  { id: 'internal_form', label: 'Internal Form', icon: FileSpreadsheet, color: 'hsl(160,70%,40%)', live: true,
    fields: ['full_name', 'email', 'phone', 'message', 'form_id', 'page_url', 'utm_source'] },
  { id: 'gos_form', label: 'GOS Form', icon: Globe, color: 'hsl(270,60%,50%)', live: true,
    fields: ['full_name', 'email', 'phone', 'company', 'answers', 'form_id', 'session_id'] },
  { id: 'crm_lead_created', label: 'CRM Lead Created', icon: Database, color: 'hsl(25,60%,50%)', live: true,
    fields: ['lead_id', 'full_name', 'email', 'phone', 'source', 'status', 'pipeline_id', 'stage_id', 'client_id'] },
  { id: 'crm_lead_updated', label: 'CRM Lead Updated', icon: Database, color: 'hsl(25,60%,50%)', live: true,
    fields: ['lead_id', 'full_name', 'email', 'phone', 'source', 'status', 'old_status', 'pipeline_id', 'stage_id'] },
  { id: 'crm_external_sync', label: 'External CRM Sync', icon: GitBranch, color: 'hsl(200,70%,50%)', live: true,
    fields: ['lead_id', 'full_name', 'email', 'phone', 'external_id', 'provider', 'stage_name'] },
  { id: 'webhook', label: 'Webhook', icon: Webhook, color: 'hsl(340,70%,50%)', live: true,
    fields: ['body', 'headers'] },
  { id: 'manual', label: 'Manual / Test', icon: Play, color: 'hsl(0,0%,50%)', live: true,
    fields: ['test', 'timestamp'] },
] as const;

const ACTION_TYPES = [
  { id: 'send_telegram', label: 'Send Telegram', icon: Send, color: 'hsl(200,80%,50%)',
    outputFields: ['message_id', 'sent'],
    fields: [
      { key: 'bot_profile_id', label: 'Telegram Bot', type: 'bot_select' },
      { key: 'chat_id', label: 'Chat ID', type: 'text' },
      { key: 'message', label: 'Message', type: 'template' },
    ] },
  { id: 'create_crm_lead', label: 'Create CRM Lead', icon: Database, color: 'hsl(25,60%,50%)',
    outputFields: ['lead_id', 'action', 'full_name'],
    fields: [
      { key: 'full_name', label: 'Full Name', type: 'mapping' },
      { key: 'email', label: 'Email', type: 'mapping' },
      { key: 'phone', label: 'Phone', type: 'mapping' },
      { key: 'source', label: 'Source', type: 'mapping' },
      { key: 'utm_source', label: 'UTM Source', type: 'mapping' },
      { key: 'utm_campaign', label: 'UTM Campaign', type: 'mapping' },
      { key: 'pipeline_id', label: 'Pipeline', type: 'pipeline_select' },
      { key: 'dedupe_strategy', label: 'Dedupe Strategy', type: 'select', options: ['create_new', 'update_existing', 'upsert'] },
    ] },
  { id: 'update_crm_lead', label: 'Update CRM Lead', icon: Database, color: 'hsl(25,60%,50%)',
    outputFields: ['lead_id', 'updated'],
    fields: [
      { key: 'lead_id', label: 'Lead ID', type: 'mapping' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'stage_id', label: 'Stage', type: 'text' },
    ] },
  { id: 'add_sheets_row', label: 'Add Google Sheets Row', icon: FileSpreadsheet, color: 'hsl(120,60%,40%)',
    outputFields: ['appended'],
    fields: [
      // FIXED: canonical field is sheet_url (executor accepts both sheet_url and connection_id)
      { key: 'sheet_url', label: 'Sheet', type: 'sheet_select' },
      { key: 'row_data', label: 'Row Data (JSON)', type: 'json' },
    ] },
  { id: 'send_webhook', label: 'Send Webhook', icon: Webhook, color: 'hsl(340,70%,50%)',
    outputFields: ['status', 'response'],
    fields: [
      { key: 'url', label: 'URL', type: 'text' },
      { key: 'method', label: 'Method', type: 'select', options: ['POST', 'PUT', 'PATCH'] },
    ] },
  { id: 'send_notification', label: 'Send Notification', icon: Bell, color: 'hsl(45,80%,50%)',
    outputFields: ['sent_to'],
    fields: [
      { key: 'title', label: 'Title', type: 'template' },
      { key: 'message', label: 'Message', type: 'template' },
    ] },
  { id: 'assign_manager', label: 'Assign Manager', icon: Users, color: 'hsl(280,60%,50%)',
    outputFields: ['lead_id', 'assigned_to', 'assigned'],
    fields: [
      { key: 'lead_id', label: 'Lead ID', type: 'mapping' },
      { key: 'assigned_to', label: 'Manager User ID', type: 'user_select' },
    ] },
  { id: 'tag_lead', label: 'Tag Lead', icon: Zap, color: 'hsl(160,70%,40%)',
    outputFields: ['lead_id', 'tags'],
    fields: [
      { key: 'lead_id', label: 'Lead ID', type: 'mapping' },
      { key: 'tags', label: 'Tags (comma-separated)', type: 'text' },
    ] },
  { id: 'update_lead_status', label: 'Update Lead Status', icon: GitBranch, color: 'hsl(200,70%,50%)',
    outputFields: ['lead_id', 'updated', 'status'],
    fields: [
      { key: 'lead_id', label: 'Lead ID', type: 'mapping' },
      { key: 'status', label: 'Status', type: 'text' },
    ] },
  { id: 'filter', label: 'Filter / Condition', icon: Filter, color: 'hsl(0,0%,60%)',
    outputFields: ['passed'],
    fields: [
      { key: 'field', label: 'Field', type: 'text' },
      { key: 'operator', label: 'Operator', type: 'select', options: ['exists', 'not_exists', 'equals', 'not_equals', 'contains', 'starts_with', 'greater_than', 'less_than'] },
      { key: 'value', label: 'Value', type: 'text' },
    ] },
];

const triggerInfo = (type: string) => TRIGGER_TYPES.find(t => t.id === type) || TRIGGER_TYPES[7];
const actionInfo = (type: string) => ACTION_TYPES.find(a => a.id === type);

const statusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    case 'failed': return <XCircle className="h-4 w-4 text-red-400" />;
    case 'partial': return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    case 'skipped': return <div className="h-4 w-4 text-muted-foreground">—</div>;
    case 'running': return <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

function buildAvailableVars(triggerFields: readonly string[], steps: any[], currentStepOrder: number) {
  const vars: { label: string; value: string; group: string }[] = [];
  triggerFields.forEach(f => vars.push({ label: f, value: `trigger.${f}`, group: 'Trigger' }));
  for (const s of steps) {
    if (s.step_order >= currentStepOrder) break;
    const act = actionInfo(s.action_type);
    const outputs = act?.outputFields || [];
    const stepKey = `step_${s.step_order}`;
    outputs.forEach(o => vars.push({ label: `${s.name || act?.label}.${o}`, value: `${stepKey}.${o}`, group: `Step #${s.step_order}` }));
  }
  const prevStep = steps.filter((s: any) => s.step_order < currentStepOrder).pop();
  if (prevStep) {
    const prevAct = actionInfo(prevStep.action_type);
    (prevAct?.outputFields || []).forEach(o =>
      vars.push({ label: `last.${o}`, value: `last.${o}`, group: 'Previous Step (last)' })
    );
  }
  return vars;
}

export default function AutomationEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'flow');
  const [editingStep, setEditingStep] = useState<any>(null);
  const [showAddStep, setShowAddStep] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testPayload, setTestPayload] = useState('{\n  "full_name": "Test User",\n  "email": "test@example.com",\n  "phone": "+1234567890",\n  "utm_source": "facebook",\n  "campaign_name": "Test Campaign"\n}');
  const [autoName, setAutoName] = useState('');
  const [autoDesc, setAutoDesc] = useState('');
  const [autoActive, setAutoActive] = useState(false);

  const { data: automation, isLoading } = useQuery({
    queryKey: ['automation', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('automations').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: steps = [] } = useQuery({
    queryKey: ['automation-steps', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('automation_steps').select('*').eq('automation_id', id!).order('step_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: runs = [] } = useQuery({
    queryKey: ['automation-runs', id],
    queryFn: async () => {
      const { data } = await supabase.from('automation_runs').select('*').eq('automation_id', id!).order('created_at', { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!id && activeTab === 'runs',
  });

  // Shared resource hooks — single source of truth
  const clientId = automation?.client_id ?? undefined;
  const { data: botResources = [] } = useTelegramBots(clientId);
  const { data: sheetResources = [] } = useSheetResources(clientId);
  const { data: metaConnections = [] } = usePlatformAdConnections(clientId);
  // Also load platform_api resources (meta_ads_management has more permissions for pages/forms)
  const { data: platformApiResources = [] } = usePlatformResources({ type: 'platform_api' });

  const { data: agencyUsers = [] } = useQuery({
    queryKey: ['agency-users-auto'],
    queryFn: async () => {
      const { data } = await supabase.from('agency_users').select('user_id, display_name, agency_role');
      return data || [];
    },
  });

  useEffect(() => {
    if (automation) {
      setAutoName(automation.name);
      setAutoDesc(automation.description || '');
      setAutoActive(automation.is_active ?? false);
    }
  }, [automation]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('automations').update({
        name: autoName, description: autoDesc, is_active: autoActive,
      }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['automation', id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const addStepMutation = useMutation({
    mutationFn: async (actionType: string) => {
      const act = actionInfo(actionType);
      const isCondition = actionType === 'filter';
      const { error } = await supabase.from('automation_steps').insert({
        automation_id: id!,
        step_order: steps.length,
        step_type: isCondition ? 'condition' : 'action',
        action_type: actionType,
        name: act?.label || actionType,
        config: {},
        field_mapping: {},
        condition_config: isCondition ? { field: '', operator: 'exists', value: '' } : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setShowAddStep(false);
      qc.invalidateQueries({ queryKey: ['automation-steps', id] });
      toast.success('Step added');
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: async (step: any) => {
      const { id: stepId, created_at, updated_at, ...rest } = step;
      const { error } = await supabase.from('automation_steps').update(rest).eq('id', stepId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-steps', id] });
      toast.success('Step updated');
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase.from('automation_steps').delete().eq('id', stepId);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingStep(null);
      qc.invalidateQueries({ queryKey: ['automation-steps', id] });
      toast.success('Step removed');
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      let payload = {};
      try { payload = JSON.parse(testPayload); } catch { throw new Error('Invalid JSON payload'); }
      const resp = await supabase.functions.invoke('automation-execute', {
        body: { automation_id: id, trigger_payload: payload, test_mode: true },
      });
      if (resp.error) throw resp.error;
      return resp.data;
    },
    onSuccess: (data: any) => {
      toast.success(`Test ${data.status}: ${data.steps_completed}/${data.steps_completed + data.steps_failed} steps`);
      qc.invalidateQueries({ queryKey: ['automation-runs', id] });
      qc.invalidateQueries({ queryKey: ['automation', id] });
      setActiveTab('runs');
    },
    onError: (e: any) => toast.error(`Test failed: ${e.message}`),
  });

  const triggerDef = automation ? triggerInfo(automation.trigger_type) : TRIGGER_TYPES[7];
  const TriggerIcon = triggerDef.icon;
  const triggerFields = triggerDef.fields || [];
  // Merge client-scoped ad connections + global meta_ads_management API key (has page/form access)
  const metaConns = [
    ...platformApiResources.filter(r => r.provider === 'meta_ads_management' && r.isActive && r.hasSecret),
    ...metaConnections.filter(r => r.provider === 'meta' || r.provider === 'facebook'),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!automation) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
        <p>Automation not found</p>
        <Button variant="outline" onClick={() => navigate('/automations')} className="mt-4">Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate('/automations')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input value={autoName} onChange={e => setAutoName(e.target.value)}
          className="flex-1 min-w-[200px] max-w-md bg-card border-border font-semibold" />
        <div className="flex items-center gap-2">
          <Label htmlFor="auto-active" className="text-xs text-muted-foreground">Active</Label>
          <Switch id="auto-active" checked={autoActive} onCheckedChange={setAutoActive} />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowTestPanel(true)}>
          <Play className="h-3.5 w-3.5" /> Test
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="flow">Flow</TabsTrigger>
          <TabsTrigger value="runs">Runs ({runs.length})</TabsTrigger>
        </TabsList>

        {/* ── Flow Tab ── */}
        <TabsContent value="flow" className="mt-4">
          <div className="flex gap-6">
            <div className="flex-1 space-y-0">
              {/* Trigger Card */}
              <Card className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${triggerDef.color}20` }}>
                      <TriggerIcon className="h-5 w-5" style={{ color: triggerDef.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trigger</div>
                      <div className="font-medium text-foreground">{triggerDef.label}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!triggerDef.live && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30 bg-amber-400/10 gap-1">
                              <AlertTriangle className="h-3 w-3" /> Not Live
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            {'note' in triggerDef ? triggerDef.note : 'This trigger is not yet connected to a live data source.'}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {triggerDef.live && (
                        <Badge variant="outline" className="text-[10px] text-green-400 border-green-400/30 bg-green-400/10">Live</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{triggerFields.length} fields</Badge>
                    </div>
                  </div>

                  {/* FB Lead Form — Guided Setup Wizard */}
                  {automation.trigger_type === 'fb_lead_form' && (
                    <FbLeadFormSetupWizard
                      automationId={automation.id}
                      metaConns={metaConns}
                      triggerConfig={automation.trigger_config as Record<string, any> | null}
                    />
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-center py-1"><div className="w-0.5 h-6 bg-border" /></div>

              {/* Steps */}
              {steps.map((step: any, idx: number) => {
                const act = actionInfo(step.action_type);
                const ActIcon = act?.icon || Zap;
                const isSelected = editingStep?.id === step.id;
                return (
                  <div key={step.id}>
                    <Card className={cn(
                      'border transition-all cursor-pointer',
                      isSelected ? 'border-primary bg-primary/5' : 'border-border/60 bg-card hover:border-border',
                      !step.is_active && 'opacity-50'
                    )} onClick={() => setEditingStep(step)}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${act?.color || 'hsl(0,0%,50%)'}15` }}>
                          <ActIcon className="h-4 w-4" style={{ color: act?.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">{step.name || act?.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {Object.keys(step.field_mapping || {}).length} mapped fields
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Badge variant="outline" className="text-[10px]">#{idx + 1}</Badge>
                          {!step.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Off</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                    <div className="flex justify-center py-1"><div className="w-0.5 h-6 bg-border" /></div>
                  </div>
                );
              })}

              <button onClick={() => setShowAddStep(true)}
                className="w-full border-2 border-dashed border-border/50 rounded-xl p-4 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all text-sm font-medium">
                <Plus className="h-4 w-4" /> Add Step
              </button>
            </div>

            {/* Step Config Panel */}
            {editingStep && (
              <StepConfigPanel
                step={editingStep}
                triggerFields={triggerFields}
                allSteps={steps}
                botResources={botResources}
                sheetResources={sheetResources}
                agencyUsers={agencyUsers}
                automationClientId={automation.client_id}
                onUpdate={(updated: any) => updateStepMutation.mutate(updated)}
                onDelete={() => deleteStepMutation.mutate(editingStep.id)}
                onClose={() => setEditingStep(null)}
              />
            )}
          </div>
        </TabsContent>

        {/* ── Runs Tab ── */}
        <TabsContent value="runs" className="mt-4 space-y-3">
          {runs.length === 0 ? (
            <Card className="border-dashed border-border/60 bg-card/30">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>No runs yet. Test your automation to see execution logs.</p>
              </CardContent>
            </Card>
          ) : (
            runs.map((run: any) => <RunCard key={run.id} run={run} />)
          )}
        </TabsContent>
      </Tabs>

      {/* Add Step Dialog */}
      <Dialog open={showAddStep} onOpenChange={setShowAddStep}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Step</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {ACTION_TYPES.map(a => {
              const Icon = a.icon;
              return (
                <button key={a.id} onClick={() => addStepMutation.mutate(a.id)}
                  className="flex items-center gap-2.5 p-3 rounded-lg border border-border/50 bg-card/50 hover:border-primary/40 hover:bg-card text-left transition-all">
                  <Icon className="h-4 w-4 flex-shrink-0" style={{ color: a.color }} />
                  <span className="text-sm font-medium text-foreground">{a.label}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Panel Dialog */}
      <Dialog open={showTestPanel} onOpenChange={setShowTestPanel}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Test Run</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Trigger Payload (JSON)</Label>
              <Textarea value={testPayload} onChange={e => setTestPayload(e.target.value)}
                className="mt-1 font-mono text-xs" rows={10} />
            </div>
            <div className="text-xs text-muted-foreground">
              Available trigger fields: {triggerFields.join(', ')}
            </div>
            <div className="p-2 rounded-lg bg-muted/20 border border-border/30 text-xs text-muted-foreground flex items-start gap-2">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                Use <code className="text-primary">{'{{trigger.field_name}}'}</code> in step mappings.
                Reference previous step outputs with <code className="text-primary">{'{{step_0.lead_id}}'}</code> or <code className="text-primary">{'{{last.lead_id}}'}</code>.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestPanel(false)}>Cancel</Button>
            <Button onClick={() => { testMutation.mutate(); setShowTestPanel(false); }}
              disabled={testMutation.isPending} className="gap-1.5">
              <Play className="h-3.5 w-3.5" /> Run Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Step Config Panel ── */
function StepConfigPanel({ step, triggerFields, allSteps, botResources, sheetResources, agencyUsers, automationClientId, onUpdate, onDelete, onClose }: {
  step: any; triggerFields: readonly string[]; allSteps: any[];
  botResources: PlatformResource[]; sheetResources: PlatformResource[];
  agencyUsers: any[]; automationClientId?: string | null;
  onUpdate: (s: any) => void; onDelete: () => void; onClose: () => void;
}) {
  const [localStep, setLocalStep] = useState(step);
  const act = actionInfo(step.action_type);
  const isCondition = step.action_type === 'filter';

  const availableVars = useMemo(
    () => buildAvailableVars(triggerFields, allSteps, step.step_order),
    [triggerFields, allSteps, step.step_order]
  );

  useEffect(() => { setLocalStep(step); }, [step]);

  const updateField = (key: string, value: any) => {
    setLocalStep((s: any) => ({ ...s, [key]: value }));
  };
  const updateConfig = (key: string, value: any) => {
    setLocalStep((s: any) => ({ ...s, config: { ...(s.config || {}), [key]: value } }));
  };
  const updateMapping = (key: string, value: string) => {
    setLocalStep((s: any) => ({ ...s, field_mapping: { ...(s.field_mapping || {}), [key]: value } }));
  };
  const updateCondition = (key: string, value: any) => {
    setLocalStep((s: any) => ({ ...s, condition_config: { ...(s.condition_config || {}), [key]: value } }));
  };

  return (
    <Card className="w-[380px] flex-shrink-0 border-border bg-card sticky top-4">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">Configure Step</CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <ScrollArea className="max-h-[calc(100vh-280px)]">
          <div className="space-y-4 pr-2">
            <div>
              <Label className="text-xs">Step Name</Label>
              <Input value={localStep.name || ''} onChange={e => updateField('name', e.target.value)}
                className="mt-1 text-sm" placeholder={act?.label} />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Active</Label>
              <Switch checked={localStep.is_active} onCheckedChange={v => updateField('is_active', v)} />
            </div>

            {isCondition && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                <Label className="text-xs font-semibold">Condition</Label>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Field</Label>
                  <Select value={localStep.condition_config?.field || ''} onValueChange={v => updateCondition('field', v)}>
                    <SelectTrigger className="mt-0.5 text-xs h-8"><SelectValue placeholder="Select field" /></SelectTrigger>
                    <SelectContent>
                      {availableVars.map(v => <SelectItem key={v.value} value={v.value}>{v.value}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Operator</Label>
                  <Select value={localStep.condition_config?.operator || 'exists'} onValueChange={v => updateCondition('operator', v)}>
                    <SelectTrigger className="mt-0.5 text-xs h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['exists', 'not_exists', 'equals', 'not_equals', 'contains', 'starts_with', 'greater_than', 'less_than'].map(op =>
                        <SelectItem key={op} value={op}>{op.replace(/_/g, ' ')}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {!['exists', 'not_exists'].includes(localStep.condition_config?.operator || '') && (
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Value</Label>
                    <Input value={localStep.condition_config?.value || ''} onChange={e => updateCondition('value', e.target.value)}
                      className="mt-0.5 text-xs h-8" />
                  </div>
                )}
              </div>
            )}

            {/* Action fields */}
            {!isCondition && act?.fields && (
              <div className="space-y-3">
                <Label className="text-xs font-semibold">Settings</Label>
                {act.fields.map((f: any) => (
                  <div key={f.key}>
                    <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                    {f.type === 'mapping' ? (
                      <div className="space-y-1 mt-0.5">
                        <Select value={localStep.field_mapping?.[f.key]?.replace(/^\{\{|\}\}$/g, '') || ''} onValueChange={v => updateMapping(f.key, `{{${v}}}`)}>
                          <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Select variable" /></SelectTrigger>
                          <SelectContent>
                            {availableVars.map(v => (
                              <SelectItem key={v.value} value={v.value}>
                                <span className="font-mono text-[11px]">{v.value}</span>
                                <span className="text-muted-foreground ml-2 text-[10px]">({v.group})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input value={localStep.field_mapping?.[f.key] || ''} onChange={e => updateMapping(f.key, e.target.value)}
                          className="text-xs h-8 font-mono" placeholder="{{trigger.field}} or fixed value" />
                      </div>
                    ) : f.type === 'template' ? (
                      <div className="space-y-1 mt-0.5">
                        <Textarea
                          value={localStep.field_mapping?.[f.key] || localStep.config?.[f.key] || ''}
                          onChange={e => updateMapping(f.key, e.target.value)}
                          className="text-xs font-mono" rows={3}
                          placeholder={`Use {{trigger.field_name}} or {{step_0.lead_id}}`}
                        />
                        <div className="flex flex-wrap gap-1">
                          {availableVars.slice(0, 8).map(v => (
                            <button key={v.value} type="button"
                              className="text-[9px] px-1.5 py-0.5 rounded bg-muted/40 border border-border/30 text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors font-mono"
                              onClick={() => {
                                const current = localStep.field_mapping?.[f.key] || localStep.config?.[f.key] || '';
                                updateMapping(f.key, current + `{{${v.value}}}`);
                              }}>
                              {v.value}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : f.type === 'bot_select' ? (
                      <div className="space-y-1">
                        <Select value={localStep.config?.[f.key] || ''} onValueChange={v => updateConfig(f.key, v)}>
                          <SelectTrigger className="mt-0.5 text-xs h-8"><SelectValue placeholder="Select bot" /></SelectTrigger>
                          <SelectContent>
                            {botResources.map(b => (
                              <SelectItem key={b.id} value={b.id}>
                                <div className="flex items-center gap-2">
                                  <span>{b.label}</span>
                                  {b.clientName && <span className="text-[9px] text-muted-foreground">({b.clientName})</span>}
                                  {b.status !== 'healthy' && (
                                    <Badge variant="outline" className="text-[8px] h-3.5 px-1">{b.status}</Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {botResources.length === 0 && (
                          <div className="flex items-center gap-2 p-2 rounded-md bg-amber-400/5 border border-amber-400/20">
                            <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0" />
                            <span className="text-[10px] text-amber-400">
                              No bots available.{' '}
                              <a href="/crm/integrations" className="underline hover:text-amber-300">Connect a bot</a>
                              {' or '}
                              <a href="/connections" className="underline hover:text-amber-300">Connections Center</a>.
                            </span>
                          </div>
                        )}
                      </div>
                    ) : f.type === 'sheet_select' ? (
                      <div className="space-y-1">
                        <Select value={localStep.config?.[f.key] || ''} onValueChange={v => updateConfig(f.key, v)}>
                          <SelectTrigger className="mt-0.5 text-xs h-8"><SelectValue placeholder="Select sheet" /></SelectTrigger>
                          <SelectContent>
                            {sheetResources.map(s => (
                              <SelectItem key={s.id} value={String(s.meta?.url || '')}>
                                <div className="flex items-center gap-2">
                                  <span>{s.label}</span>
                                  <Badge variant="outline" className="text-[8px] h-3.5 px-1">{s.provider}</Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {sheetResources.length === 0 && (
                          <div className="flex items-center gap-2 p-2 rounded-md bg-amber-400/5 border border-amber-400/20">
                            <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0" />
                            <span className="text-[10px] text-amber-400">
                              No sheets configured.{' '}
                              <a href="/clients" className="underline hover:text-amber-300">Add sheet URLs in Client settings</a>.
                            </span>
                          </div>
                        )}
                      </div>
                    ) : f.type === 'user_select' ? (
                      <Select value={localStep.config?.[f.key] || ''} onValueChange={v => updateConfig(f.key, v)}>
                        <SelectTrigger className="mt-0.5 text-xs h-8"><SelectValue placeholder="Select user" /></SelectTrigger>
                        <SelectContent>
                          {agencyUsers.map((u: any) => (
                            <SelectItem key={u.user_id} value={u.user_id}>
                              {u.display_name || u.user_id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : f.type === 'select' ? (
                      <Select value={localStep.config?.[f.key] || f.options?.[0] || ''} onValueChange={v => updateConfig(f.key, v)}>
                        <SelectTrigger className="mt-0.5 text-xs h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {f.options?.map((o: string) => <SelectItem key={o} value={o}>{o.replace(/_/g, ' ')}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : f.type === 'json' ? (
                      <Textarea
                        value={typeof localStep.config?.[f.key] === 'object' ? JSON.stringify(localStep.config?.[f.key], null, 2) : (localStep.config?.[f.key] || '')}
                        onChange={e => {
                          try { updateConfig(f.key, JSON.parse(e.target.value)); } catch { updateConfig(f.key, e.target.value); }
                        }}
                        className="mt-0.5 text-xs font-mono" rows={4}
                      />
                    ) : (
                      <Input value={localStep.config?.[f.key] || localStep.field_mapping?.[f.key] || ''} onChange={e => {
                        if (f.type === 'text' && f.key !== 'url' && f.key !== 'method') {
                          updateMapping(f.key, e.target.value);
                        } else {
                          updateConfig(f.key, e.target.value);
                        }
                      }} className="mt-0.5 text-xs h-8" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Field Mapping Preview */}
            {Object.keys(localStep.field_mapping || {}).length > 0 && (
              <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Field Mapping</Label>
                <div className="mt-2 space-y-1">
                  {Object.entries(localStep.field_mapping || {}).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="text-muted-foreground/50">←</span>
                      <span className="font-mono text-primary text-[11px]">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Variables */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className="h-3 w-3" />
                Available Variables ({availableVars.length})
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 p-2 rounded-lg bg-muted/10 border border-border/20 space-y-0.5">
                  {availableVars.map(v => (
                    <div key={v.value} className="flex items-center gap-2 text-[10px]">
                      <code className="text-primary font-mono">{`{{${v.value}}}`}</code>
                      <span className="text-muted-foreground">{v.group}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        <div className="flex justify-between pt-2 border-t border-border/30">
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
          </Button>
          <Button size="sm" onClick={() => onUpdate(localStep)} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> Apply
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Run Card ── */
function RunCard({ run }: { run: any }) {
  const [expanded, setExpanded] = useState(false);
  const { data: runSteps = [] } = useQuery({
    queryKey: ['run-steps', run.id],
    queryFn: async () => {
      const { data } = await supabase.from('automation_run_steps').select('*').eq('run_id', run.id).order('step_order');
      return data || [];
    },
    enabled: expanded,
  });

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card className="border-border/40 bg-card">
        <CollapsibleTrigger asChild>
          <CardContent className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/20 transition-colors">
            {statusIcon(run.status)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground capitalize">{run.status}</span>
                {run.is_test && <Badge variant="outline" className="text-[10px]">Test</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">
                {run.steps_completed}/{run.steps_total} steps • {run.duration_ms ? `${run.duration_ms}ms` : '—'}
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{new Date(run.created_at).toLocaleString()}</span>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-1.5 border-t border-border/30 pt-2">
            {runSteps.map((rs: any) => (
              <div key={rs.id} className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/10">
                {statusIcon(rs.status)}
                <span className="font-medium text-foreground">{rs.step_name || rs.action_type}</span>
                {rs.duration_ms != null && <span className="text-muted-foreground">{rs.duration_ms}ms</span>}
                {rs.error_message && (
                  <span className="text-red-400 ml-auto truncate max-w-[200px]" title={rs.error_message}>
                    {rs.error_message}
                  </span>
                )}
              </div>
            ))}
            <details className="mt-2">
              <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">Trigger Payload</summary>
              <pre className="text-[10px] text-muted-foreground mt-1 p-2 rounded bg-muted/20 overflow-auto max-h-32">
                {JSON.stringify(run.trigger_payload, null, 2)}
              </pre>
            </details>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
