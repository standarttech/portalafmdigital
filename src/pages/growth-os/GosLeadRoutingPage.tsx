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
import { Plus, GitBranch, Loader2, Activity, ArrowRight, Settings2, Trash2, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useGosAuditLog } from '@/hooks/useGosAuditLog';
import type { TranslationKey } from '@/i18n/translations';

const operators = ['equals', 'not_equals', 'contains', 'starts_with', 'greater_than', 'less_than'];
const conditionFields = ['source', 'utm_source', 'utm_medium', 'utm_campaign', 'country', 'form_id', 'value'];
const actionTypes = [
  { value: 'assign_user', label: 'Assign to User', supported: true, note: 'Assigns CRM lead to user' },
  { value: 'assign_pipeline', label: 'Route to Pipeline', supported: true, note: 'Moves CRM lead to pipeline' },
  { value: 'tag', label: 'Add Tag', supported: true, note: 'Tags CRM lead' },
  { value: 'webhook', label: 'Trigger Webhook', supported: true, note: 'POSTs data to URL (SSRF protected)' },
  { value: 'notify', label: 'Send Notification', supported: true, note: 'Email to admins or Telegram message' },
];

export default function GosLeadRoutingPage() {
  const { logGosAction } = useGosAuditLog();
  const { t } = useLanguage();
  const [rules, setRules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [agencyUsers, setAgencyUsers] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [rulesRes, logsRes, usersRes, pipelinesRes] = await Promise.all([
      supabase.from('gos_routing_rules').select('*').order('priority', { ascending: true }),
      supabase.from('gos_routing_log').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('agency_users').select('user_id, display_name, agency_role'),
      supabase.from('crm_pipelines').select('id, name, client_id'),
    ]);
    setRules(rulesRes.data || []);
    setLogs(logsRes.data || []);
    setAgencyUsers(usersRes.data || []);
    setPipelines(pipelinesRes.data || []);
    setLoading(false);
  };

  const toggleRule = async (id: string, is_active: boolean) => {
    await supabase.from('gos_routing_rules').update({ is_active: !is_active }).eq('id', id);
    loadData();
  };

  const createRule = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('gos_routing_rules').insert({
      name: 'New Routing Rule',
      created_by: user.id,
      priority: rules.length,
      conditions: [{ field: 'source', operator: 'equals', value: '' }],
      action_type: 'tag',
      action_config: {},
    }).select().single();
    if (error) { toast.error('Failed to create rule'); return; }
    logGosAction('create', 'routing_rule', data?.id, 'New Routing Rule');
    setEditingRule(data);
    loadData();
  };

  const saveRule = async () => {
    if (!editingRule) return;
    const { error } = await supabase.from('gos_routing_rules').update({
      name: editingRule.name, description: editingRule.description,
      conditions: editingRule.conditions, action_type: editingRule.action_type,
      action_config: editingRule.action_config, priority: editingRule.priority,
      is_active: editingRule.is_active,
    }).eq('id', editingRule.id);
    if (error) toast.error('Save failed');
    else { toast.success('Rule saved'); logGosAction('update', 'routing_rule', editingRule.id, editingRule.name); setEditingRule(null); loadData(); }
  };

  const deleteRule = async (id: string) => {
    await supabase.from('gos_routing_rules').delete().eq('id', id);
    toast.success('Rule deleted');
    loadData();
  };

  const addCondition = () => {
    if (!editingRule) return;
    setEditingRule({ ...editingRule, conditions: [...(editingRule.conditions || []), { field: 'source', operator: 'equals', value: '' }] });
  };

  const updateCondition = (idx: number, key: string, value: string) => {
    if (!editingRule) return;
    const conditions = (editingRule.conditions || []).map((c: any, i: number) => i === idx ? { ...c, [key]: value } : c);
    setEditingRule({ ...editingRule, conditions });
  };

  const removeCondition = (idx: number) => {
    if (!editingRule) return;
    setEditingRule({ ...editingRule, conditions: (editingRule.conditions || []).filter((_: any, i: number) => i !== idx) });
  };

  const updateActionConfig = (key: string, value: string) => {
    if (!editingRule) return;
    setEditingRule({ ...editingRule, action_config: { ...(editingRule.action_config || {}), [key]: value } });
  };

  const actionInfo = actionTypes.find(a => a.value === editingRule?.action_type);

  const getLogStatusIcon = (actionTaken: string) => {
    if (actionTaken?.includes(':executed')) return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
    if (actionTaken?.includes(':failed') || actionTaken?.includes('error')) return <AlertTriangle className="h-3 w-3 text-destructive" />;
    return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('gos.leadRouting' as TranslationKey)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('gos.leadRoutingDesc' as TranslationKey)}</p>
        </div>
        <Button size="sm" onClick={createRule} className="gap-1.5"><Plus className="h-4 w-4" /> New Rule</Button>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="log">Routing Log ({logs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4">
          {rules.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <GitBranch className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No routing rules yet</p>
                <Button size="sm" variant="outline" onClick={createRule} className="gap-1.5"><Plus className="h-4 w-4" /> Create First Rule</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rules.map((rule, i) => (
                <Card key={rule.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                    <span className="text-xs font-mono text-muted-foreground w-6 text-center">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground text-sm truncate">{rule.name}</h3>
                        <Badge variant="outline" className="text-[10px]">
                          {actionTypes.find(a => a.value === rule.action_type)?.label || rule.action_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(rule.conditions || []).length} condition(s) <ArrowRight className="h-3 w-3 inline mx-1" /> {rule.action_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingRule(rule)}><Settings2 className="h-3.5 w-3.5" /></Button>
                      <Switch checked={rule.is_active} onCheckedChange={() => toggleRule(rule.id, rule.is_active)} />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRule(rule.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No routing events yet.</p>
          ) : (
            <div className="space-y-1">
              {logs.map(log => (
                <Card key={log.id}>
                  <CardContent className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {getLogStatusIcon(log.action_taken)}
                      <span className="text-foreground font-medium">{log.lead_source || 'Unknown'}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-foreground">{log.routed_to || '—'}</span>
                      {log.action_taken && <Badge variant="outline" className="text-[10px]">{log.action_taken}</Badge>}
                    </div>
                    <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Rule Editor */}
      {editingRule && (
        <Dialog open={!!editingRule} onOpenChange={open => { if (!open) setEditingRule(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader><DialogTitle>Edit Routing Rule</DialogTitle></DialogHeader>
            <div className="flex-1 overflow-auto space-y-4 p-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Rule Name</label>
                  <Input value={editingRule.name || ''} onChange={e => setEditingRule({ ...editingRule, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <Input type="number" value={editingRule.priority ?? 0} onChange={e => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Input value={editingRule.description || ''} onChange={e => setEditingRule({ ...editingRule, description: e.target.value })} placeholder="Optional description" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Conditions (match ALL)</h3>
                <div className="space-y-2">
                  {(editingRule.conditions || []).map((cond: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Select value={cond.field || 'source'} onValueChange={v => updateCondition(idx, 'field', v)}>
                        <SelectTrigger className="text-xs h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>{conditionFields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={cond.operator || 'equals'} onValueChange={v => updateCondition(idx, 'operator', v)}>
                        <SelectTrigger className="text-xs h-8 w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>{operators.map(o => <SelectItem key={o} value={o}>{o.replace('_', ' ')}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input placeholder="Value" value={cond.value || ''} onChange={e => updateCondition(idx, 'value', e.target.value)} className="text-xs h-8 flex-1" />
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive flex-shrink-0" onClick={() => removeCondition(idx)}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addCondition} className="text-xs h-7"><Plus className="h-3 w-3 mr-1" /> Add Condition</Button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Action</h3>
                <Select value={editingRule.action_type || 'tag'} onValueChange={v => setEditingRule({ ...editingRule, action_type: v, action_config: {} })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{actionTypes.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}</SelectContent>
                </Select>

                {actionInfo && (
                  <p className="text-[10px] text-muted-foreground mt-1">{actionInfo.note}</p>
                )}

                <div className="mt-3 space-y-2">
                  {editingRule.action_type === 'assign_user' && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Assign to User</label>
                      {agencyUsers.length > 0 ? (
                        <Select value={(editingRule.action_config || {}).user_id || ''} onValueChange={v => updateActionConfig('user_id', v)}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Select user..." /></SelectTrigger>
                          <SelectContent>
                            {agencyUsers.map(u => (
                              <SelectItem key={u.user_id} value={u.user_id}>{u.display_name || u.user_id} ({u.agency_role})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input placeholder="User ID" value={(editingRule.action_config || {}).user_id || ''} onChange={e => updateActionConfig('user_id', e.target.value)} className="text-xs" />
                      )}
                    </div>
                  )}
                  {editingRule.action_type === 'assign_pipeline' && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Pipeline</label>
                      {pipelines.length > 0 ? (
                        <Select value={(editingRule.action_config || {}).pipeline_id || ''} onValueChange={v => updateActionConfig('pipeline_id', v)}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Select pipeline..." /></SelectTrigger>
                          <SelectContent>{pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Input placeholder="Pipeline ID" value={(editingRule.action_config || {}).pipeline_id || ''} onChange={e => updateActionConfig('pipeline_id', e.target.value)} className="text-xs" />
                      )}
                    </div>
                  )}
                  {editingRule.action_type === 'tag' && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Tag Name</label>
                      <Input placeholder="e.g. hot-lead, organic" value={(editingRule.action_config || {}).tag || ''} onChange={e => updateActionConfig('tag', e.target.value)} className="text-xs" />
                    </div>
                  )}
                  {editingRule.action_type === 'webhook' && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Webhook URL</label>
                      <Input placeholder="https://..." value={(editingRule.action_config || {}).url || ''} onChange={e => updateActionConfig('url', e.target.value)} className="text-xs" />
                      <p className="text-[10px] text-muted-foreground mt-1">SSRF-protected: private IPs and internal hosts are blocked.</p>
                    </div>
                  )}
                  {editingRule.action_type === 'notify' && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Notification Channel</label>
                        <Select value={(editingRule.action_config || {}).channel || ''} onValueChange={v => updateActionConfig('channel', v)}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="Select channel..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email (to admins)</SelectItem>
                            <SelectItem value="telegram">Telegram</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {(editingRule.action_config || {}).channel === 'telegram' && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Telegram Chat ID</label>
                          <Input placeholder="e.g. -1001234567890" value={(editingRule.action_config || {}).telegram_chat_id || ''} onChange={e => updateActionConfig('telegram_chat_id', e.target.value)} className="text-xs" />
                          <p className="text-[10px] text-muted-foreground mt-1">Uses the platform's system Telegram bot.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter><Button size="sm" onClick={saveRule}>Save Rule</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
