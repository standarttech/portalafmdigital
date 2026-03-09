import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FlaskConical, Loader2, Trash2, Settings2, Trophy, BarChart3, Eye, Inbox, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { useGosAuditLog } from '@/hooks/useGosAuditLog';

interface VariantStats {
  variantId: string;
  views: number;
  submissions: number;
  convRate: number;
}

interface VariantTrendPoint {
  date: string;
  [key: string]: number | string;
}

function useExperimentStats(experimentId: string | null, variants: any[]) {
  return useQuery({
    queryKey: ['experiment-stats', experimentId, variants.map(v => v.id).join(',')],
    enabled: !!experimentId && variants.length >= 2,
    queryFn: async () => {
      const variantIds = variants.map(v => v.id);
      const { data: events } = await supabase
        .from('gos_analytics_events')
        .select('event_type, variant_id, created_at')
        .in('variant_id', variantIds);

      const stats: Record<string, VariantStats> = {};
      for (const v of variants) {
        stats[v.id] = { variantId: v.id, views: 0, submissions: 0, convRate: 0 };
      }

      // Build trend data: daily views/submissions per variant
      const trendMap: Record<string, Record<string, { views: number; submissions: number }>> = {};

      for (const e of (events || [])) {
        if (!e.variant_id || !stats[e.variant_id]) continue;
        if (e.event_type === 'landing_view' || e.event_type === 'form_view') stats[e.variant_id].views++;
        if (e.event_type === 'form_submit_success') stats[e.variant_id].submissions++;

        // Trend
        const day = e.created_at.slice(0, 10);
        if (!trendMap[day]) trendMap[day] = {};
        if (!trendMap[day][e.variant_id]) trendMap[day][e.variant_id] = { views: 0, submissions: 0 };
        if (e.event_type === 'landing_view' || e.event_type === 'form_view') trendMap[day][e.variant_id].views++;
        if (e.event_type === 'form_submit_success') trendMap[day][e.variant_id].submissions++;
      }
      for (const s of Object.values(stats)) {
        s.convRate = s.views > 0 ? Math.round((s.submissions / s.views) * 100 * 10) / 10 : 0;
      }

      // Convert trend to chart data
      const sortedDays = Object.keys(trendMap).sort();
      const trendData: VariantTrendPoint[] = sortedDays.map(day => {
        const point: VariantTrendPoint = { date: day.slice(5) };
        variants.forEach((v, i) => {
          const label = String.fromCharCode(65 + i);
          const d = trendMap[day]?.[v.id];
          point[`views_${label}`] = d?.views || 0;
          point[`subs_${label}`] = d?.submissions || 0;
          const views = d?.views || 0;
          const subs = d?.submissions || 0;
          point[`conv_${label}`] = views > 0 ? Math.round((subs / views) * 100) : 0;
        });
        return point;
      });

      return { stats, trendData };
    },
    staleTime: 30_000,
  });
}

const VARIANT_COLORS = ['hsl(160,70%,45%)', 'hsl(200,80%,50%)', 'hsl(280,70%,55%)', 'hsl(340,70%,50%)'];

export default function GosExperimentsPage() {
  const { logGosAction } = useGosAuditLog();
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [newExp, setNewExp] = useState({ name: '', entity_type: 'landing' });
  const [splitPct, setSplitPct] = useState(50);

  const { data: experimentData } = useExperimentStats(editing?.id, variants);
  const variantStats = experimentData?.stats;
  const trendData = experimentData?.trendData || [];

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
    else { toast.success('Experiment created'); logGosAction('create', 'experiment', undefined, newExp.name); setCreating(false); setNewExp({ name: '', entity_type: 'landing' }); loadData(); }
  };

  const openEditor = async (exp: any) => {
    setEditing(exp);
    const table = exp.entity_type === 'form' ? 'gos_forms' : 'gos_landing_templates';
    const { data } = await supabase.from(table).select('id, name, status').eq('experiment_id', exp.id);
    setVariants(data || []);
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
    logGosAction('status_change', 'experiment', id, undefined, { afterSummary: { status } });
    toast.success(`Experiment ${status}`);
    loadData();
    if (editing?.id === id) setEditing({ ...editing, status });
  };

  const declareWinner = async (winnerId: string) => {
    if (!editing) return;
    await supabase.from('gos_experiments').update({ winner_id: winnerId, status: 'completed' }).eq('id', editing.id);
    logGosAction('declare_winner', 'experiment', editing.id, editing.name, { metadata: { winner_id: winnerId } });
    toast.success('Winner declared!');
    setEditing(null);
    loadData();
  };

  const deleteExperiment = async (id: string) => {
    const exp = experiments.find(e => e.id === id);
    await Promise.all([
      supabase.from('gos_landing_templates').update({ experiment_id: null }).eq('experiment_id', id),
      supabase.from('gos_forms').update({ experiment_id: null }).eq('experiment_id', id),
    ]);
    await supabase.from('gos_experiments').delete().eq('id', id);
    logGosAction('delete', 'experiment', id, exp?.name);
    toast.success('Deleted');
    loadData();
  };

  const statusColor: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    running: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    completed: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  };

  const totalViews = useMemo(() => {
    if (!variantStats) return 0;
    return Object.values(variantStats).reduce((s, v) => s + v.views, 0);
  }, [variantStats]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">A/B Experiments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Test landing pages and forms with traffic splitting</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Experiment</Button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>
      ) : (

      {experiments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FlaskConical className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No experiments yet</p>
            <p className="text-xs text-muted-foreground/70 mb-3">Create A/B tests to compare form and landing variants</p>
            <Button size="sm" variant="outline" onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Create First</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {experiments.map(exp => {
            const split = exp.traffic_split || {};
            const variantCount = Object.keys(split).length;
            return (
              <Card key={exp.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-foreground text-sm truncate flex-1">{exp.name}</h3>
                    <Badge className={`text-[10px] ${statusColor[exp.status] || statusColor.draft}`}>{exp.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {exp.entity_type === 'form' ? 'Form' : 'Landing'} experiment · {variantCount} variants
                  </p>
                  {exp.winner_id && (
                    <div className="flex items-center gap-1 text-xs text-amber-400 mb-2">
                      <Trophy className="h-3 w-3" /> Winner declared
                    </div>
                  )}
                  <div className="flex gap-1.5 mt-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditor(exp)}>
                      <BarChart3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditor(exp)}>
                      <Settings2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteExperiment(exp.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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

      {/* Editor + Analytics Dialog */}
      {editing && (
        <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                {editing.name}
                <Badge className={`text-[10px] ml-2 ${statusColor[editing.status] || statusColor.draft}`}>{editing.status}</Badge>
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="performance" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
                <TabsTrigger value="setup">Setup</TabsTrigger>
              </TabsList>

              {/* Performance Tab */}
              <TabsContent value="performance" className="flex-1 overflow-auto space-y-4 p-1">
                {variants.length >= 2 && variantStats ? (
                  totalViews === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center">
                      <Eye className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No analytics data yet — views are recorded when embeds are loaded</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {variants.map((v, i) => {
                        const stats = variantStats[v.id];
                        if (!stats) return null;
                        const isWinner = editing.winner_id === v.id;
                        const splitVal = (editing.traffic_split || {})[v.id] || 0;
                        return (
                          <Card key={v.id} className={`${isWinner ? 'border-amber-500/40 bg-amber-500/5' : ''}`}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px]" style={{ borderColor: VARIANT_COLORS[i % VARIANT_COLORS.length], color: VARIANT_COLORS[i % VARIANT_COLORS.length] }}>Variant {String.fromCharCode(65 + i)}</Badge>
                                  <span className="text-sm font-medium text-foreground">{v.name}</span>
                                  {v.status !== 'published' && <Badge className="text-[9px] bg-amber-500/10 text-amber-400">unpublished</Badge>}
                                </div>
                                <div className="flex items-center gap-2">
                                  {isWinner && <Trophy className="h-4 w-4 text-amber-400" />}
                                  <span className="text-[10px] text-muted-foreground">{splitVal}% traffic</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                                    <Eye className="h-3 w-3" /><span className="text-[10px]">Views</span>
                                  </div>
                                  <p className="text-lg font-bold text-foreground">{stats.views}</p>
                                </div>
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                                    <Inbox className="h-3 w-3" /><span className="text-[10px]">Submissions</span>
                                  </div>
                                  <p className="text-lg font-bold text-foreground">{stats.submissions}</p>
                                </div>
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                                    <TrendingUp className="h-3 w-3" /><span className="text-[10px]">Conv. Rate</span>
                                  </div>
                                  <p className={`text-lg font-bold ${stats.convRate > 0 ? 'text-emerald-400' : 'text-foreground'}`}>{stats.convRate}%</p>
                                </div>
                              </div>
                              {editing.status === 'running' && !editing.winner_id && (
                                <div className="mt-2 flex justify-end">
                                  <Button variant="ghost" size="sm" className="h-6 text-xs text-amber-400" onClick={() => declareWinner(v.id)}>
                                    <Trophy className="h-3 w-3 mr-1" /> Declare Winner
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <p className="text-xs text-muted-foreground">Link at least 2 variants in the Setup tab to see performance data</p>
                  </div>
                )}
              </TabsContent>

              {/* Trends Tab */}
              <TabsContent value="trends" className="flex-1 overflow-auto space-y-4 p-1">
                {trendData.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No trend data yet — data appears once views are recorded</p>
                  </div>
                ) : (
                  <>
                    {/* Views Trend */}
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="text-xs font-semibold text-foreground mb-3">Views by Variant</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                            {variants.map((_, i) => (
                              <Line key={i} type="monotone" dataKey={`views_${String.fromCharCode(65 + i)}`} stroke={VARIANT_COLORS[i % VARIANT_COLORS.length]} strokeWidth={2} dot={false} name={`Variant ${String.fromCharCode(65 + i)}`} />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Submissions Trend */}
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="text-xs font-semibold text-foreground mb-3">Submissions by Variant</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                            {variants.map((_, i) => (
                              <Line key={i} type="monotone" dataKey={`subs_${String.fromCharCode(65 + i)}`} stroke={VARIANT_COLORS[i % VARIANT_COLORS.length]} strokeWidth={2} dot={false} name={`Variant ${String.fromCharCode(65 + i)}`} />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Conversion Trend */}
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="text-xs font-semibold text-foreground mb-3">Conversion Rate by Variant (%)</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis unit="%" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                            {variants.map((_, i) => (
                              <Line key={i} type="monotone" dataKey={`conv_${String.fromCharCode(65 + i)}`} stroke={VARIANT_COLORS[i % VARIANT_COLORS.length]} strokeWidth={2} dot={false} name={`Variant ${String.fromCharCode(65 + i)}`} />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>

              {/* Setup Tab */}
              <TabsContent value="setup" className="flex-1 overflow-auto space-y-4 p-1">
                {/* Variants List */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Variants ({variants.length})</h3>
                  {variants.length === 0 && <p className="text-xs text-muted-foreground">No variants linked. Link existing {editing.entity_type === 'form' ? 'forms' : 'landing templates'} to this experiment.</p>}
                  {variants.length < 2 && variants.length > 0 && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 mb-2">
                      <p className="text-[11px] text-amber-400">Need at least 2 variants to run an experiment</p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {variants.map((v, i) => (
                      <div key={v.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]" style={{ borderColor: VARIANT_COLORS[i % VARIANT_COLORS.length], color: VARIANT_COLORS[i % VARIANT_COLORS.length] }}>Variant {String.fromCharCode(65 + i)}</Badge>
                          <span className="text-sm text-foreground">{v.name}</span>
                          {v.status !== 'published' && <Badge className="text-[9px] bg-amber-500/10 text-amber-400">unpublished</Badge>}
                        </div>
                        {editing.winner_id === v.id && <Trophy className="h-4 w-4 text-amber-400" />}
                      </div>
                    ))}
                  </div>
                  <LinkVariantInput entityType={editing.entity_type} experimentId={editing.id} onLink={linkVariant} />
                </div>

                {/* Traffic Split */}
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

                {/* Controls */}
                <div className="flex gap-2">
                  {editing.status === 'draft' && variants.length >= 2 && (
                    <Button size="sm" onClick={() => updateStatus(editing.id, 'running')} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">Start Experiment</Button>
                  )}
                  {editing.status === 'running' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(editing.id, 'completed')}>Stop Experiment</Button>
                  )}
                </div>
              </TabsContent>
            </Tabs>
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
