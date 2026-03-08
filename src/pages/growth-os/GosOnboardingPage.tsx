import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Plus, ClipboardCheck, Loader2, PlayCircle, X, ChevronUp, ChevronDown, Settings2, Trash2, ExternalLink, Copy, Link2, Ban, Clock, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import type { TranslationKey } from '@/i18n/translations';

const stepFieldTypes = ['text', 'email', 'tel', 'url', 'select', 'file', 'checkbox'];

const TTL_OPTIONS = [
  { value: '1', label: '1 day' },
  { value: '3', label: '3 days' },
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
];

export default function GosOnboardingPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [flows, setFlows] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFlow, setEditingFlow] = useState<any | null>(null);
  const [viewingSession, setViewingSession] = useState<any | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [startingSession, setStartingSession] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedFlow, setSelectedFlow] = useState('');
  const [managingTokens, setManagingTokens] = useState<string | null>(null);
  const [sessionTokens, setSessionTokens] = useState<any[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  // Revoke confirmation state
  const [revokeConfirm, setRevokeConfirm] = useState<{ open: boolean; tokenId: string; tokenSnippet: string }>({ open: false, tokenId: '', tokenSnippet: '' });
  // Branding toggle state
  const [showBranding, setShowBranding] = useState(true);

  useEffect(() => { loadData(); loadBrandingSetting(); }, []);

  const loadBrandingSetting = async () => {
    const { data } = await supabase.from('platform_settings').select('value').eq('key', 'gos_show_branding').maybeSingle();
    if (data?.value !== undefined && data?.value !== null) {
      const val = data.value;
      setShowBranding(typeof val === 'object' && val !== null ? (val as any).enabled !== false : val !== false);
    }
  };

  const toggleBranding = async (enabled: boolean) => {
    setShowBranding(enabled);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('platform_settings').upsert(
      { key: 'gos_show_branding', value: { enabled } as any, updated_by: user?.id },
      { onConflict: 'key' }
    );
    toast.success(enabled ? 'Branding enabled' : 'Branding hidden');
  };

  const loadData = async () => {
    setLoading(true);
    const [flowsRes, sessionsRes, clientsRes] = await Promise.all([
      supabase.from('gos_onboarding_flows').select('*').order('created_at', { ascending: false }),
      supabase.from('gos_onboarding_sessions').select('*, clients(name), gos_onboarding_flows(name, steps)').order('updated_at', { ascending: false }).limit(50),
      supabase.from('clients').select('id, name').order('name'),
    ]);
    setFlows(flowsRes.data || []);
    setSessions(sessionsRes.data || []);
    setClients(clientsRes.data || []);
    setLoading(false);
  };

  const createFlow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('gos_onboarding_flows').insert({
      name: 'New Onboarding Flow',
      created_by: user.id,
      steps: [
        { id: 'info', title: 'Business Info', description: 'Basic company information', fields: [
          { key: 'company_name', label: 'Company Name', type: 'text', required: true },
          { key: 'website', label: 'Website', type: 'url', required: false },
          { key: 'niche', label: 'Business Niche', type: 'text', required: true },
        ]},
        { id: 'goals', title: 'Goals & KPIs', description: 'Target metrics', fields: [
          { key: 'monthly_budget', label: 'Monthly Budget', type: 'text', required: true },
          { key: 'target_cpl', label: 'Target CPL', type: 'text', required: false },
          { key: 'target_leads', label: 'Monthly Lead Target', type: 'text', required: false },
        ]},
        { id: 'platforms', title: 'Ad Platforms', description: 'Platform access setup', fields: [
          { key: 'meta_access', label: 'Meta Ads Access', type: 'checkbox', required: false },
          { key: 'google_access', label: 'Google Ads Access', type: 'checkbox', required: false },
        ]},
        { id: 'assets', title: 'Brand Assets', description: 'Upload brand materials', fields: [
          { key: 'logo', label: 'Logo URL', type: 'url', required: false },
          { key: 'brand_guidelines', label: 'Brand Guidelines URL', type: 'url', required: false },
        ]},
      ],
    }).select().single();
    if (error) { toast.error('Failed to create flow'); return; }
    setEditingFlow(data);
    loadData();
  };

  const saveFlow = async () => {
    if (!editingFlow) return;
    const { error } = await supabase.from('gos_onboarding_flows').update({
      name: editingFlow.name,
      description: editingFlow.description,
      steps: editingFlow.steps,
      is_default: editingFlow.is_default,
    }).eq('id', editingFlow.id);
    if (error) toast.error('Save failed');
    else { toast.success('Flow saved'); loadData(); }
  };

  const deleteFlow = async (id: string) => {
    await supabase.from('gos_onboarding_flows').delete().eq('id', id);
    toast.success('Flow deleted');
    loadData();
  };

  const startSession = async () => {
    if (!selectedClient || !selectedFlow) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('gos_onboarding_sessions').insert({
      client_id: selectedClient,
      flow_id: selectedFlow,
      started_by: user.id,
      current_step: 0,
      data: {},
      status: 'in_progress',
    }).select('id').single();
    if (error) { toast.error('Failed to start session'); return; }
    toast.success('Onboarding session started');
    setStartingSession(false);
    setSelectedClient('');
    setSelectedFlow('');
    if (data) navigate(`/growth-os/onboarding/${data.id}`);
  };

  // --- Token management ---
  const loadTokens = async (sessionId: string) => {
    setManagingTokens(sessionId);
    setTokensLoading(true);
    const { data } = await supabase
      .from('gos_onboarding_tokens')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    setSessionTokens(data || []);
    setTokensLoading(false);
  };

  const generateToken = async (sessionId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const sess = sessions.find(s => s.id === sessionId);
    const clientName = (sess as any)?.clients?.name || '';
    const ttlDays = parseInt(linkTtlDays, 10) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    const { data: token, error } = await supabase
      .from('gos_onboarding_tokens')
      .insert({
        session_id: sessionId,
        created_by: user.id,
        client_label: clientName,
        expires_at: expiresAt.toISOString(),
      })
      .select('token')
      .single();
    if (error) { toast.error('Failed to generate link'); return; }
    if (token) {
      const link = `${window.location.origin}/embed/onboarding/${token.token}`;
      navigator.clipboard.writeText(link);
      toast.success(`Link generated (expires in ${ttlDays} days) and copied!`);
    }
    loadTokens(sessionId);
  };

  const confirmRevoke = (tok: any) => {
    setRevokeConfirm({ open: true, tokenId: tok.id, tokenSnippet: tok.token?.slice(0, 12) || '' });
  };

  const executeRevoke = async () => {
    const { error } = await supabase
      .from('gos_onboarding_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', revokeConfirm.tokenId);
    setRevokeConfirm({ open: false, tokenId: '', tokenSnippet: '' });
    if (error) { toast.error('Failed to revoke'); return; }
    toast.success('Link revoked');
    if (managingTokens) loadTokens(managingTokens);
  };

  const copyTokenLink = (tokenValue: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/embed/onboarding/${tokenValue}`);
    toast.success('Link copied!');
  };

  const getTokenStatus = (token: any): { label: string; color: string; icon: React.ReactNode } => {
    if (token.revoked_at) return { label: 'Revoked', color: 'bg-destructive/10 text-destructive', icon: <Ban className="h-3 w-3" /> };
    if (new Date(token.expires_at) < new Date()) return { label: 'Expired', color: 'bg-muted text-muted-foreground', icon: <Clock className="h-3 w-3" /> };
    return { label: 'Active', color: 'bg-emerald-500/10 text-emerald-400', icon: <CheckCircle2 className="h-3 w-3" /> };
  };

  // Step editor helpers
  const addStep = () => {
    if (!editingFlow) return;
    const steps = [...(editingFlow.steps || []), {
      id: `step_${Date.now()}`,
      title: 'New Step',
      description: '',
      fields: [{ key: 'field_1', label: 'Field', type: 'text', required: false }],
    }];
    setEditingFlow({ ...editingFlow, steps });
  };

  const updateStep = (idx: number, key: string, value: any) => {
    if (!editingFlow) return;
    const steps = (editingFlow.steps || []).map((s: any, i: number) => i === idx ? { ...s, [key]: value } : s);
    setEditingFlow({ ...editingFlow, steps });
  };

  const removeStep = (idx: number) => {
    if (!editingFlow) return;
    setEditingFlow({ ...editingFlow, steps: (editingFlow.steps || []).filter((_: any, i: number) => i !== idx) });
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    if (!editingFlow) return;
    const steps = [...(editingFlow.steps || [])];
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    [steps[idx], steps[target]] = [steps[target], steps[idx]];
    setEditingFlow({ ...editingFlow, steps });
  };

  const addFieldToStep = (stepIdx: number) => {
    if (!editingFlow) return;
    const steps = [...(editingFlow.steps || [])];
    steps[stepIdx] = { ...steps[stepIdx], fields: [...(steps[stepIdx].fields || []), { key: `field_${Date.now()}`, label: 'New Field', type: 'text', required: false }] };
    setEditingFlow({ ...editingFlow, steps });
  };

  const updateStepField = (stepIdx: number, fieldIdx: number, key: string, value: any) => {
    if (!editingFlow) return;
    const steps = [...(editingFlow.steps || [])];
    const fields = [...(steps[stepIdx].fields || [])];
    fields[fieldIdx] = { ...fields[fieldIdx], [key]: value };
    steps[stepIdx] = { ...steps[stepIdx], fields };
    setEditingFlow({ ...editingFlow, steps });
  };

  const removeStepField = (stepIdx: number, fieldIdx: number) => {
    if (!editingFlow) return;
    const steps = [...(editingFlow.steps || [])];
    steps[stepIdx] = { ...steps[stepIdx], fields: steps[stepIdx].fields.filter((_: any, i: number) => i !== fieldIdx) };
    setEditingFlow({ ...editingFlow, steps });
  };

  const sessionStatusColor: Record<string, string> = {
    in_progress: 'bg-blue-500/10 text-blue-400',
    completed: 'bg-emerald-500/10 text-emerald-400',
    abandoned: 'bg-muted text-muted-foreground',
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('gos.onboarding' as TranslationKey)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('gos.onboardingDesc' as TranslationKey)}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setStartingSession(true)} className="gap-1.5">
            <PlayCircle className="h-4 w-4" /> Start Session
          </Button>
          <Button size="sm" onClick={createFlow} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Flow
          </Button>
        </div>
      </div>

      <Tabs defaultValue="flows">
        <TabsList>
          <TabsTrigger value="flows">Flows ({flows.length})</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({sessions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="flows" className="mt-4">
          {flows.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No onboarding flows yet</p>
                <Button size="sm" variant="outline" onClick={createFlow} className="gap-1.5"><Plus className="h-4 w-4" /> Create First Flow</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {flows.map(flow => (
                <Card key={flow.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-foreground text-sm">{flow.name}</h3>
                      <div className="flex items-center gap-1.5">
                        {flow.is_default && <Badge className="text-[10px] bg-primary/10 text-primary">Default</Badge>}
                      </div>
                    </div>
                    {flow.description && <p className="text-xs text-muted-foreground mb-2">{flow.description}</p>}
                    <p className="text-xs text-muted-foreground mb-3">{(flow.steps || []).length} steps</p>
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingFlow(flow)}><Settings2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteFlow(flow.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No active onboarding sessions</p>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => {
                const flowData = (s as any).gos_onboarding_flows;
                const flowSteps = flowData?.steps || [];
                const totalSteps = Array.isArray(flowSteps) ? flowSteps.length : 0;
                const progress = s.status === 'completed' ? 100 : totalSteps > 0 ? (s.current_step / totalSteps) * 100 : 0;
                return (
                  <Card key={s.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">{(s as any).clients?.name || 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground">
                            {s.status === 'completed' ? `${totalSteps}/${totalSteps}` : `${s.current_step + 1}/${totalSteps}`}
                          </span>
                          {flowData?.name && <span className="text-xs text-muted-foreground/70 truncate">· {flowData.name}</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`text-[10px] ${sessionStatusColor[s.status] || ''}`}>{s.status}</Badge>
                          {s.status === 'in_progress' && (
                            <>
                              <Button variant="outline" size="sm" className="h-6 text-xs gap-1" onClick={() => navigate(`/growth-os/onboarding/${s.id}`)}>
                                <ExternalLink className="h-3 w-3" /> Continue
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => loadTokens(s.id)}>
                                <Link2 className="h-3 w-3" /> Links
                              </Button>
                            </>
                          )}
                          {s.status === 'completed' && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setViewingSession(s)}>
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                      <Progress value={Math.min(progress, 100)} className="h-1.5" />
                      {s.completed_at && (
                        <p className="text-[10px] text-muted-foreground mt-1">Completed {new Date(s.completed_at).toLocaleDateString()}</p>
                      )}
                      {!s.completed_at && s.updated_at && (
                        <p className="text-[10px] text-muted-foreground mt-1">Last updated {new Date(s.updated_at).toLocaleDateString()}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Token Management Dialog */}
      <Dialog open={!!managingTokens} onOpenChange={open => { if (!open) setManagingTokens(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-primary" /> Client Access Links</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* TTL selector */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <label className="text-xs font-medium text-foreground">Link expiration</label>
              <RadioGroup value={linkTtlDays} onValueChange={setLinkTtlDays} className="flex flex-wrap gap-2">
                {TTL_OPTIONS.map(opt => (
                  <div key={opt.value} className="flex items-center gap-1.5">
                    <RadioGroupItem value={opt.value} id={`ttl-${opt.value}`} />
                    <Label htmlFor={`ttl-${opt.value}`} className="text-xs cursor-pointer">{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Button size="sm" onClick={() => managingTokens && generateToken(managingTokens)} className="gap-1.5 w-full">
              <Plus className="h-4 w-4" /> Generate New Link ({TTL_OPTIONS.find(o => o.value === linkTtlDays)?.label || '7 days'})
            </Button>

            {tokensLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : sessionTokens.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No links generated yet</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-auto">
                {sessionTokens.map(tok => {
                  const status = getTokenStatus(tok);
                  return (
                    <div key={tok.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <Badge className={`text-[10px] gap-1 ${status.color}`}>
                          {status.icon} {status.label}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {status.label === 'Active' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyTokenLink(tok.token)}>
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => confirmRevoke(tok)}>
                                <Ban className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>Created: {new Date(tok.created_at).toLocaleDateString()}</span>
                        <span>Expires: {new Date(tok.expires_at).toLocaleDateString()}</span>
                        {tok.revoked_at && <span className="text-destructive">Revoked: {new Date(tok.revoked_at).toLocaleDateString()}</span>}
                      </div>
                      {status.label === 'Active' && (
                        <p className="text-[10px] text-muted-foreground/60 mt-1 truncate font-mono">
                          .../{tok.token.slice(0, 12)}...
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <ConfirmDialog
        open={revokeConfirm.open}
        onOpenChange={open => { if (!open) setRevokeConfirm({ open: false, tokenId: '', tokenSnippet: '' }); }}
        title="Revoke Access Link"
        description={`This will permanently disable the link ending in "...${revokeConfirm.tokenSnippet}...". The client will no longer be able to access onboarding through this link. This action cannot be undone.`}
        confirmLabel="Revoke Link"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={executeRevoke}
      />

      {/* Flow Editor */}
      {editingFlow && (
        <Dialog open={!!editingFlow} onOpenChange={open => { if (!open) setEditingFlow(null); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Onboarding Flow</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto space-y-4 p-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Flow Name</label>
                  <Input value={editingFlow.name || ''} onChange={e => setEditingFlow({ ...editingFlow, name: e.target.value })} />
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={!!editingFlow.is_default} onCheckedChange={v => setEditingFlow({ ...editingFlow, is_default: v })} />
                    <span className="text-xs text-muted-foreground">Default flow</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Steps</h3>
                {(editingFlow.steps || []).map((step: any, idx: number) => (
                  <Card key={step.id || idx} className="border-border/50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">Step {idx + 1}</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveStep(idx, -1)} disabled={idx === 0}><ChevronUp className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveStep(idx, 1)} disabled={idx === (editingFlow.steps || []).length - 1}><ChevronDown className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeStep(idx)}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <Input placeholder="Step title" value={step.title || ''} onChange={e => updateStep(idx, 'title', e.target.value)} className="text-xs h-8" />
                        <Input placeholder="Description" value={step.description || ''} onChange={e => updateStep(idx, 'description', e.target.value)} className="text-xs h-8" />
                      </div>
                      <div className="space-y-1.5 pl-3 border-l-2 border-border/50">
                        {(step.fields || []).map((field: any, fIdx: number) => (
                          <div key={fIdx} className="flex gap-2 items-center">
                            <Input placeholder="Label" value={field.label || ''} onChange={e => updateStepField(idx, fIdx, 'label', e.target.value)} className="text-xs h-7 flex-1" />
                            <Select value={field.type || 'text'} onValueChange={v => updateStepField(idx, fIdx, 'type', v)}>
                              <SelectTrigger className="text-xs h-7 w-24"><SelectValue /></SelectTrigger>
                              <SelectContent>{stepFieldTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive flex-shrink-0" onClick={() => removeStepField(idx, fIdx)}><X className="h-3 w-3" /></Button>
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => addFieldToStep(idx)} className="text-xs h-6"><Plus className="h-3 w-3 mr-1" /> Field</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" size="sm" onClick={addStep} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Step</Button>
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={saveFlow}>Save Flow</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Start Session Dialog */}
      <Dialog open={startingSession} onOpenChange={setStartingSession}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Start Onboarding Session</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Client</label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Flow</label>
              <Select value={selectedFlow} onValueChange={setSelectedFlow}>
                <SelectTrigger><SelectValue placeholder="Select flow..." /></SelectTrigger>
                <SelectContent>{flows.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={startSession} disabled={!selectedClient || !selectedFlow}>Start</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Detail */}
      <Dialog open={!!viewingSession} onOpenChange={open => { if (!open) setViewingSession(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Onboarding Session</DialogTitle></DialogHeader>
          {viewingSession && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Client:</span>
                <span className="text-foreground font-medium">{(viewingSession as any).clients?.name || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge className={`text-[10px] ${sessionStatusColor[viewingSession.status] || ''}`}>{viewingSession.status}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Step:</span>
                <span className="text-foreground">{viewingSession.current_step + 1}</span>
              </div>
              {viewingSession.completed_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="text-foreground">{new Date(viewingSession.completed_at).toLocaleString()}</span>
                </div>
              )}
              {viewingSession.data && typeof viewingSession.data === 'object' && Object.keys(viewingSession.data).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Collected Data:</p>
                  <div className="bg-muted rounded-lg p-3 space-y-1">
                    {Object.entries(viewingSession.data as Record<string, unknown>).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{k}:</span>
                        <span className="text-foreground">{typeof v === 'object' ? (v as any)?.name || JSON.stringify(v) : String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                {viewingSession.status === 'in_progress' && (
                  <Button className="flex-1" onClick={() => { setViewingSession(null); navigate(`/growth-os/onboarding/${viewingSession.id}`); }}>
                    <ExternalLink className="h-4 w-4 mr-2" /> Continue Onboarding
                  </Button>
                )}
                <Button variant="outline" className="flex-1" onClick={() => { setViewingSession(null); loadTokens(viewingSession.id); }}>
                  <Link2 className="h-4 w-4 mr-2" /> Manage Links
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
