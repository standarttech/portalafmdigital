import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Plus, FlaskConical, Loader2, Trash2, Settings2, Trophy } from 'lucide-react';
import { toast } from 'sonner';

export default function GosExperimentsPage() {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [newExp, setNewExp] = useState({ name: '', entity_type: 'landing' });
  const [splitPct, setSplitPct] = useState(50);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from('gos_experiments').select('*').order('created_at', { ascending: false });
    setExperiments(data || []);
    setLoading(false);
  };

  const createExperiment = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !newExp.name) { toast.error('Name required'); return; }
    const { error } = await supabase.from('gos_experiments').insert({
      name: newExp.name,
      entity_type: newExp.entity_type,
      created_by: user.id,
    });
    if (error) toast.error('Failed');
    else { toast.success('Experiment created'); setCreating(false); setNewExp({ name: '', entity_type: 'landing' }); loadData(); }
  };

  const openEditor = async (exp: any) => {
    setEditing(exp);
    const table = exp.entity_type === 'form' ? 'gos_forms' : 'gos_landing_templates';
    const { data } = await supabase.from(table).select('id, name').eq('experiment_id', exp.id);
    setVariants(data || []);
    // Parse current split
    const split = exp.traffic_split || {};
    const vals = Object.values(split) as number[];
    setSplitPct(vals[0] ?? 50);
  };

  const linkVariant = async (entityId: string) => {
    if (!editing) return;
    const table = editing.entity_type === 'form' ? 'gos_forms' : 'gos_landing_templates';
    await supabase.from(table).update({ experiment_id: editing.id }).eq('id', entityId);
    toast.success('Variant linked');
    openEditor(editing);
  };

  const saveSplit = async () => {
    if (!editing || variants.length < 2) { toast.error('Need at least 2 variants'); return; }
    const split: Record<string, number> = {};
    split[variants[0].id] = splitPct;
    split[variants[1].id] = 100 - splitPct;
    // If more variants, distribute remainder equally
    if (variants.length > 2) {
      const remaining = 100 - splitPct;
      const each = Math.floor(remaining / (variants.length - 1));
      for (let i = 1; i < variants.length; i++) {
        split[variants[i].id] = each;
      }
    }
    await supabase.from('gos_experiments').update({ traffic_split: split }).eq('id', editing.id);
    toast.success('Split saved');
    loadData();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('gos_experiments').update({ status }).eq('id', id);
    toast.success(`Experiment ${status}`);
    loadData();
    if (editing?.id === id) setEditing({ ...editing, status });
  };

  const declareWinner = async (winnerId: string) => {
    if (!editing) return;
    await supabase.from('gos_experiments').update({ winner_id: winnerId, status: 'completed' }).eq('id', editing.id);
    toast.success('Winner declared!');
    setEditing(null);
    loadData();
  };

  const deleteExperiment = async (id: string) => {
    // Unlink variants first
    await Promise.all([
      supabase.from('gos_landing_templates').update({ experiment_id: null }).eq('experiment_id', id),
      supabase.from('gos_forms').update({ experiment_id: null }).eq('experiment_id', id),
    ]);
    await supabase.from('gos_experiments').delete().eq('id', id);
    toast.success('Deleted');
    loadData();
  };

  const statusColor: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    running: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    completed: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">A/B Experiments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Test landing pages and forms with traffic splitting</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Experiment</Button>
      </div>

      {experiments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FlaskConical className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No experiments yet</p>
            <Button size="sm" variant="outline" onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Create First</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {experiments.map(exp => (
            <Card key={exp.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-foreground text-sm truncate flex-1">{exp.name}</h3>
                  <Badge className={`text-[10px] ${statusColor[exp.status] || statusColor.draft}`}>{exp.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{exp.entity_type === 'form' ? 'Form' : 'Landing'} experiment</p>
                {exp.winner_id && (
                  <div className="flex items-center gap-1 text-xs text-amber-400 mb-2">
                    <Trophy className="h-3 w-3" /> Winner declared
                  </div>
                )}
                <div className="flex gap-1.5 mt-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditor(exp)}><Settings2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteExperiment(exp.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New A/B Experiment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs font-medium text-muted-foreground">Name</label><Input value={newExp.name} onChange={e => setNewExp({ ...newExp, name: e.target.value })} placeholder="e.g. Hero CTA test" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Type</label>
              <Select value={newExp.entity_type} onValueChange={v => setNewExp({ ...newExp, entity_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="landing">Landing Template</SelectItem>
                  <SelectItem value="form">Form</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button size="sm" onClick={createExperiment}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor Dialog */}
      {editing && (
        <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Experiment: {editing.name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Variants ({variants.length})</h3>
                {variants.length === 0 && <p className="text-xs text-muted-foreground">No variants linked. Link existing {editing.entity_type === 'form' ? 'forms' : 'landing templates'} to this experiment.</p>}
                <div className="space-y-1.5">
                  {variants.map((v, i) => (
                    <div key={v.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">Variant {String.fromCharCode(65 + i)}</Badge>
                        <span className="text-sm text-foreground">{v.name}</span>
                      </div>
                      {editing.winner_id === v.id && <Trophy className="h-4 w-4 text-amber-400" />}
                      {editing.status === 'running' && !editing.winner_id && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-amber-400" onClick={() => declareWinner(v.id)}>
                          <Trophy className="h-3 w-3 mr-1" /> Declare Winner
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <LinkVariantInput entityType={editing.entity_type} experimentId={editing.id} onLink={linkVariant} />
              </div>

              {variants.length >= 2 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Traffic Split</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16">A: {splitPct}%</span>
                    <Slider value={[splitPct]} onValueChange={v => setSplitPct(v[0])} min={10} max={90} step={5} className="flex-1" />
                    <span className="text-xs text-muted-foreground w-16">B: {100 - splitPct}%</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={saveSplit} className="mt-2">Save Split</Button>
                </div>
              )}

              <div className="flex gap-2">
                {editing.status === 'draft' && variants.length >= 2 && (
                  <Button size="sm" onClick={() => updateStatus(editing.id, 'running')} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">Start Experiment</Button>
                )}
                {editing.status === 'running' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(editing.id, 'completed')}>Stop Experiment</Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function LinkVariantInput({ entityType, experimentId, onLink }: { entityType: string; experimentId: string; onLink: (id: string) => void }) {
  const [available, setAvailable] = useState<any[]>([]);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    const table = entityType === 'form' ? 'gos_forms' : 'gos_landing_templates';
    supabase.from(table).select('id, name').is('experiment_id', null).then(({ data }) => setAvailable(data || []));
  }, [entityType, experimentId]);

  if (available.length === 0) return <p className="text-[10px] text-muted-foreground mt-2">No unlinked {entityType === 'form' ? 'forms' : 'templates'} available</p>;

  return (
    <div className="flex gap-2 mt-2">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="text-xs flex-1"><SelectValue placeholder={`Add ${entityType}...`} /></SelectTrigger>
        <SelectContent>{available.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
      </Select>
      <Button size="sm" variant="outline" disabled={!selected} onClick={() => { onLink(selected); setSelected(''); }}>Link</Button>
    </div>
  );
}
