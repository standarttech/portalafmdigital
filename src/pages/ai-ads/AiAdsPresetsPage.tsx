import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Settings, Plus, Loader2, Zap, CheckCircle2, XCircle, AlertTriangle, Edit, Trash2,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGosAuditLog } from '@/hooks/useGosAuditLog';
import { toast } from 'sonner';

interface Preset {
  id: string; name: string; description: string; rule_condition: any;
  proposed_action_type: string; proposed_priority: string;
  is_active: boolean; created_by: string; created_at: string;
  trigger_count?: number; last_triggered_at?: string | null;
}

const RULE_TYPES = [
  { value: 'no_delivery', label: 'No delivery', fields: ['threshold_hours'] },
  { value: 'spend_no_results', label: 'Spend without results', fields: ['spend_threshold'] },
  { value: 'low_ctr', label: 'Low CTR', fields: ['ctr_threshold', 'min_impressions'] },
  { value: 'winner_detected', label: 'Winner detected', fields: ['ctr_threshold', 'min_leads'] },
  { value: 'platform_rejection', label: 'Platform rejection', fields: [] },
  { value: 'partial_execution', label: 'Partial execution', fields: [] },
  { value: 'strong_winner', label: 'Strong winner', fields: ['ctr_threshold', 'min_leads'] },
  { value: 'high_cpc', label: 'High CPC', fields: ['cpc_threshold', 'min_clicks'] },
];

const ACTION_TYPES = [
  'pause_campaign', 'pause_adset', 'increase_budget', 'decrease_budget',
  'duplicate_winner', 'relaunch_with_changes', 'mark_for_review',
];

export default function AiAdsPresetsPage() {
  const { user, agencyRole } = useAuth();
  const { logGosAction } = useGosAuditLog();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPreset, setEditPreset] = useState<Preset | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const isAdmin = agencyRole === 'AgencyAdmin';

  const load = useCallback(async () => {
    const { data } = await supabase.from('optimization_presets' as any).select('*').order('created_at');
    setPresets((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (preset: Preset) => {
    if (!isAdmin) return;
    const { error } = await supabase.from('optimization_presets' as any)
      .update({ is_active: !preset.is_active }).eq('id', preset.id);
    if (error) { toast.error('Update failed'); return; }
    logGosAction(preset.is_active ? 'disable_preset' : 'enable_preset', 'optimization_preset', preset.id, preset.name);
    toast.success(`Preset ${preset.is_active ? 'disabled' : 'enabled'}`);
    load();
  };

  const deletePreset = async (id: string) => {
    if (!isAdmin) return;
    const { error } = await supabase.from('optimization_presets' as any).delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
    logGosAction('delete', 'optimization_preset', id, 'Deleted preset');
    toast.success('Preset deleted');
    load();
  };

  const activeCount = presets.filter(p => p.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-cyan-400" /> Optimization Presets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rule-based presets that auto-generate optimization proposals during sync.
            {' '}<Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-400/30">{activeCount} active</Badge>
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Preset
          </Button>
        )}
      </div>

      <Card className="border-blue-400/20">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">How it works:</strong> During each sync cycle, active presets evaluate campaign metrics against their conditions.
            When a condition matches, a new optimization recommendation is automatically proposed — never auto-executed.
            Proposals include evidence explaining why they were triggered.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : presets.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Settings className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Presets</h3>
          <p className="text-sm text-muted-foreground">Create optimization presets to auto-generate proposals during sync.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {presets.map(p => {
            const ruleType = RULE_TYPES.find(r => r.value === p.rule_condition?.type);
            return (
              <Card key={p.id} className={p.is_active ? '' : 'opacity-60'}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="mt-1">
                    {p.is_active ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm text-foreground">{p.name}</span>
                      <Badge variant="secondary" className="text-[9px]">{ruleType?.label || p.rule_condition?.type || 'custom'}</Badge>
                      <Badge variant="outline" className="text-[9px]">→ {p.proposed_action_type.replace(/_/g, ' ')}</Badge>
                      <Badge variant="outline" className={`text-[9px] ${p.proposed_priority === 'high' ? 'text-destructive border-destructive/30' : p.proposed_priority === 'medium' ? 'text-amber-400 border-amber-400/30' : 'text-muted-foreground'}`}>{p.proposed_priority}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {(p.trigger_count ?? 0) > 0 ? (
                        <>
                          <span className="text-[10px] text-muted-foreground">Triggered <strong className="text-foreground">{p.trigger_count}</strong> time{p.trigger_count !== 1 ? 's' : ''}</span>
                          {p.last_triggered_at && (
                            <span className="text-[10px] text-muted-foreground">· Last: {new Date(p.last_triggered_at).toLocaleDateString()}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Never triggered</span>
                      )}
                    </div>
                    {Object.entries(p.rule_condition || {}).filter(([k]) => k !== 'type').length > 0 && (
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {Object.entries(p.rule_condition).filter(([k]) => k !== 'type').map(([k, v]) => (
                          <Badge key={k} variant="outline" className="text-[9px] text-muted-foreground">
                            {k.replace(/_/g, ' ')}: {String(v)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditPreset(p)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePreset(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PresetFormDialog open={createOpen || !!editPreset} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditPreset(null); } }}
        preset={editPreset} userId={user?.id || ''} isAdmin={isAdmin}
        onSaved={() => { load(); setCreateOpen(false); setEditPreset(null); }} />
    </div>
  );
}

function PresetFormDialog({ open, onOpenChange, preset, userId, isAdmin, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; preset: Preset | null;
  userId: string; isAdmin: boolean; onSaved: () => void;
}) {
  const { logGosAction } = useGosAuditLog();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ruleType, setRuleType] = useState('no_delivery');
  const [params, setParams] = useState<Record<string, string>>({});
  const [actionType, setActionType] = useState('mark_for_review');
  const [priority, setPriority] = useState('medium');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preset) {
      setName(preset.name);
      setDescription(preset.description);
      setRuleType(preset.rule_condition?.type || 'no_delivery');
      const p: Record<string, string> = {};
      Object.entries(preset.rule_condition || {}).forEach(([k, v]) => { if (k !== 'type') p[k] = String(v); });
      setParams(p);
      setActionType(preset.proposed_action_type);
      setPriority(preset.proposed_priority);
    } else {
      setName(''); setDescription(''); setRuleType('no_delivery');
      setParams({}); setActionType('mark_for_review'); setPriority('medium');
    }
  }, [preset, open]);

  const selectedRule = RULE_TYPES.find(r => r.value === ruleType);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    const ruleCondition: any = { type: ruleType };
    (selectedRule?.fields || []).forEach(f => { if (params[f]) ruleCondition[f] = parseFloat(params[f]); });
    const payload = {
      name: name.trim(), description: description.trim(),
      rule_condition: ruleCondition, proposed_action_type: actionType,
      proposed_priority: priority,
    };
    try {
      if (preset) {
        const { error } = await supabase.from('optimization_presets' as any).update(payload).eq('id', preset.id);
        if (error) throw error;
        logGosAction('update', 'optimization_preset', preset.id, name.trim());
      } else {
        const { data, error } = await supabase.from('optimization_presets' as any)
          .insert({ ...payload, created_by: userId }).select().single();
        if (error) throw error;
        logGosAction('create', 'optimization_preset', (data as any).id, name.trim());
      }
      toast.success(preset ? 'Preset updated' : 'Preset created');
      onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{preset ? 'Edit' : 'Create'} Optimization Preset</DialogTitle>
        <DialogDescription>Define conditions and proposed actions for auto-generating optimization recommendations.</DialogDescription></DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-auto">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pause low performers" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Human-readable explanation" rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Rule Condition</Label>
            <Select value={ruleType} onValueChange={setRuleType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RULE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {(selectedRule?.fields || []).map(f => (
            <div key={f} className="space-y-2">
              <Label>{f.replace(/_/g, ' ')}</Label>
              <Input type="number" value={params[f] || ''} onChange={e => setParams(p => ({ ...p, [f]: e.target.value }))} placeholder="Threshold value" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Proposed Action</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACTION_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} {preset ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
