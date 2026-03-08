import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Plus, FormInput, Loader2, Settings2, X, ChevronUp, ChevronDown, Inbox, Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { TranslationKey } from '@/i18n/translations';

const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'url', label: 'URL' },
];

export default function GosFormsPage() {
  const { t } = useLanguage();
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [viewingSubmissions, setViewingSubmissions] = useState<string | null>(null);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);

  useEffect(() => { loadForms(); loadPipelines(); }, []);

  const loadForms = async () => {
    setLoading(true);
    const { data } = await supabase.from('gos_forms').select('*').order('updated_at', { ascending: false });
    setForms(data || []);
    setLoading(false);
  };

  const loadPipelines = async () => {
    const [pRes, sRes] = await Promise.all([
      supabase.from('crm_pipelines').select('id, name, client_id'),
      supabase.from('crm_pipeline_stages').select('id, name, pipeline_id, position').order('position'),
    ]);
    setPipelines(pRes.data || []);
    setPipelineStages(sRes.data || []);
  };

  const createForm = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('gos_forms').insert({
      name: 'New Form',
      created_by: user.id,
      fields: [
        { id: 'name', type: 'text', label: 'Name', required: true, placeholder: 'Your name' },
        { id: 'email', type: 'email', label: 'Email', required: true, placeholder: 'email@example.com' },
        { id: 'phone', type: 'tel', label: 'Phone', required: false, placeholder: '+1 234 567 890' },
      ],
    }).select().single();
    if (error) { toast.error('Failed to create form'); return; }
    setEditing(data);
    loadForms();
  };

  const saveForm = async () => {
    if (!editing) return;
    const { error } = await supabase.from('gos_forms').update({
      name: editing.name,
      description: editing.description,
      fields: editing.fields,
      status: editing.status,
      submit_action: editing.submit_action,
      settings: editing.settings,
    }).eq('id', editing.id);
    if (error) toast.error('Save failed');
    else { toast.success('Form saved'); loadForms(); }
  };

  const deleteForm = async (id: string) => {
    await supabase.from('gos_forms').delete().eq('id', id);
    toast.success('Form deleted');
    loadForms();
  };

  const loadSubmissions = async (formId: string) => {
    setViewingSubmissions(formId);
    const { data } = await supabase.from('gos_form_submissions').select('*').eq('form_id', formId).order('created_at', { ascending: false }).limit(100);
    setSubmissions(data || []);
  };

  const addField = () => {
    if (!editing) return;
    const id = `field_${Date.now()}`;
    setEditing({ ...editing, fields: [...(editing.fields || []), { id, type: 'text', label: 'New Field', required: false, placeholder: '' }] });
  };

  const updateField = (idx: number, key: string, value: any) => {
    if (!editing) return;
    const fields = (editing.fields || []).map((f: any, i: number) => i === idx ? { ...f, [key]: value } : f);
    setEditing({ ...editing, fields });
  };

  const removeField = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, fields: (editing.fields || []).filter((_: any, i: number) => i !== idx) });
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    if (!editing) return;
    const fields = [...(editing.fields || [])];
    const target = idx + dir;
    if (target < 0 || target >= fields.length) return;
    [fields[idx], fields[target]] = [fields[target], fields[idx]];
    setEditing({ ...editing, fields });
  };

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const embedCode = editing ? `<iframe src="${window.location.origin}/embed/form/${editing.id}" width="100%" height="500" frameborder="0"></iframe>` : '';
  const apiEndpoint = editing ? `https://${projectId}.supabase.co/functions/v1/gos-form-submit` : '';

  const statusColor: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    archived: 'bg-destructive/10 text-destructive',
  };

  const selectedPipelineStages = editing?.settings?.crm_pipeline_id
    ? pipelineStages.filter((s: any) => s.pipeline_id === editing.settings.crm_pipeline_id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('gos.formBuilder' as TranslationKey)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('gos.formBuilderDesc' as TranslationKey)}</p>
        </div>
        <Button size="sm" onClick={createForm} className="gap-1.5"><Plus className="h-4 w-4" /> {t('common.create')}</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : forms.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FormInput className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">{t('common.noData')}</p>
            <Button size="sm" variant="outline" onClick={createForm} className="gap-1.5"><Plus className="h-4 w-4" /> {t('common.create')}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {forms.map(form => (
            <Card key={form.id} className="group hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-foreground text-sm truncate flex-1">{form.name}</h3>
                  <Badge className={`text-[10px] ${statusColor[form.status] || statusColor.draft}`}>{form.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{(form.fields || []).length} fields · {form.submit_action}</p>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(form)}><Settings2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => loadSubmissions(form.id)}><Inbox className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteForm(form.id)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Editor Dialog */}
      {editing && (
        <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><FormInput className="h-5 w-5 text-primary" /> Edit Form</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="fields" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="fields">Fields ({(editing.fields || []).length})</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="embed">Embed</TabsTrigger>
              </TabsList>
              <TabsContent value="fields" className="flex-1 overflow-auto space-y-2 p-1">
                {(editing.fields || []).map((field: any, idx: number) => (
                  <Card key={field.id || idx} className="border-border/50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono">{field.type}</Badge>
                          {field.required && <Badge className="text-[10px] bg-destructive/10 text-destructive">Required</Badge>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveField(idx, -1)} disabled={idx === 0}><ChevronUp className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveField(idx, 1)} disabled={idx === (editing.fields || []).length - 1}><ChevronDown className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeField(idx)}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Label" value={field.label || ''} onChange={e => updateField(idx, 'label', e.target.value)} className="text-xs h-8" />
                        <Select value={field.type} onValueChange={v => updateField(idx, 'type', v)}>
                          <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{fieldTypes.map(ft => <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input placeholder="Placeholder" value={field.placeholder || ''} onChange={e => updateField(idx, 'placeholder', e.target.value)} className="text-xs h-8" />
                        <div className="flex items-center gap-2">
                          <Switch checked={!!field.required} onCheckedChange={v => updateField(idx, 'required', v)} />
                          <span className="text-xs text-muted-foreground">Required</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" size="sm" onClick={addField} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Field</Button>
              </TabsContent>

              <TabsContent value="settings" className="flex-1 overflow-auto space-y-3 p-1">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Form Name</label>
                  <Input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={editing.status || 'draft'} onValueChange={v => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">Only published forms accept public submissions.</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Submit Action</label>
                  <Select value={editing.submit_action || 'store'} onValueChange={v => setEditing({ ...editing, submit_action: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="store">Store in DB</SelectItem>
                      <SelectItem value="webhook">Store + Send Webhook</SelectItem>
                      <SelectItem value="crm">Store + Create CRM Lead</SelectItem>
                    </SelectContent>
                  </Select>
                  {editing.submit_action === 'webhook' && (
                    <div className="mt-2">
                      <label className="text-xs font-medium text-muted-foreground">Webhook URL</label>
                      <Input
                        placeholder="https://your-endpoint.com/webhook"
                        value={(editing.settings as any)?.webhook_url || ''}
                        onChange={e => setEditing({ ...editing, settings: { ...(editing.settings || {}), webhook_url: e.target.value } })}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Submission data will be POSTed to this URL.</p>
                    </div>
                  )}
                  {editing.submit_action === 'crm' && (
                    <div className="mt-2 space-y-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Target CRM Pipeline</label>
                        {pipelines.length > 0 ? (
                          <Select
                            value={(editing.settings as any)?.crm_pipeline_id || ''}
                            onValueChange={v => setEditing({ ...editing, settings: { ...(editing.settings || {}), crm_pipeline_id: v, crm_stage_id: '' } })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select pipeline..." /></SelectTrigger>
                            <SelectContent>
                              {pipelines.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
                            <p className="text-[11px] text-amber-400">No CRM pipelines found. Create a pipeline in the CRM module first.</p>
                          </div>
                        )}
                      </div>
                      {selectedPipelineStages.length > 0 && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Initial Stage (optional)</label>
                          <Select
                            value={(editing.settings as any)?.crm_stage_id || ''}
                            onValueChange={v => setEditing({ ...editing, settings: { ...(editing.settings || {}), crm_stage_id: v } })}
                          >
                            <SelectTrigger><SelectValue placeholder="First stage (default)" /></SelectTrigger>
                            <SelectContent>
                              {selectedPipelineStages.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {!(editing.settings as any)?.crm_pipeline_id && (
                        <p className="text-[10px] text-muted-foreground">Select a pipeline to enable CRM lead creation on submission.</p>
                      )}
                    </div>
                  )}
                </div>
                {/* CAPTCHA Setting */}
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-medium text-foreground">CAPTCHA Protection</label>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Require CAPTCHA verification on submit</p>
                    </div>
                    <Switch
                      checked={!!(editing.settings as any)?.captcha_enabled}
                      onCheckedChange={v => setEditing({ ...editing, settings: { ...(editing.settings || {}), captcha_enabled: v } })}
                    />
                  </div>
                  {(editing.settings as any)?.captcha_enabled && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
                      <p className="text-[10px] text-amber-400">⚠ Requires CAPTCHA_PROVIDER + CAPTCHA_SECRET server secrets. Without them this has no effect.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="embed" className="flex-1 overflow-auto p-1">
                <div className="space-y-3">
                  {editing.status !== 'published' && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                      <p className="text-xs text-amber-400">⚠ Form must be published before it can accept public submissions.</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs text-muted-foreground mb-2">Embed code (iframe):</p>
                    <code className="text-xs text-foreground break-all block bg-background p-3 rounded border border-border">{embedCode}</code>
                    <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => { navigator.clipboard.writeText(embedCode); toast.success('Copied!'); }}>
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs text-muted-foreground mb-2">API endpoint (POST):</p>
                    <code className="text-xs text-foreground break-all block bg-background p-3 rounded border border-border">{apiEndpoint}</code>
                    <p className="text-[10px] text-muted-foreground mt-2">Body: {`{"form_id": "${editing.id}", "data": {"name": "...", "email": "..."}, "source": "api"}`}</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter><Button size="sm" onClick={saveForm}>Save Form</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Submissions Dialog */}
      <Dialog open={!!viewingSubmissions} onOpenChange={open => { if (!open) setViewingSubmissions(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Inbox className="h-5 w-5 text-primary" /> Submissions</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto space-y-2">
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No submissions yet</p>
            ) : submissions.map(sub => (
              <Card key={sub.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{new Date(sub.created_at).toLocaleString()}</span>
                    <Badge variant="outline" className="text-[10px]">{sub.source || 'direct'}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries((sub.data as Record<string, unknown>) || {}).map(([key, val]) => (
                      <div key={key}>
                        <span className="text-[10px] text-muted-foreground">{key}:</span>
                        <span className="text-xs text-foreground ml-1">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
