import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrainCircuit, Plus, Loader2, Clock, CheckCircle2, XCircle, Search, Play, AlertTriangle, TrendingUp, Shield, Lightbulb } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGosAuditLog } from '@/hooks/useGosAuditLog';
import { toast } from 'sonner';

interface Session {
  id: string; title: string; status: string; session_type: string; created_at: string; client_id: string; metadata: any;
}
interface AnalysisRun {
  id: string; session_id: string; client_id: string; prompt: string; status: string; analysis_type: string;
  result_summary: string | null; result_data: any; model_used: string | null; created_at: string; completed_at: string | null;
}
interface Client { id: string; name: string; }

const analysisTypes = [
  { value: 'account_audit', label: 'Account Audit' },
  { value: 'campaign_review', label: 'Campaign Review' },
  { value: 'adset_review', label: 'Ad Set Review' },
  { value: 'creative_review', label: 'Creative Review' },
  { value: 'performance_summary', label: 'Performance Summary' },
  { value: 'hypothesis_generation', label: 'Hypothesis Generation' },
];

const statusIcon: Record<string, React.ReactNode> = {
  queued: <Clock className="h-3 w-3" />,
  running: <Loader2 className="h-3 w-3 animate-spin" />,
  completed: <CheckCircle2 className="h-3 w-3" />,
  failed: <XCircle className="h-3 w-3" />,
};
const statusColor: Record<string, string> = {
  queued: 'text-muted-foreground border-muted-foreground/30',
  running: 'text-blue-400 border-blue-400/30',
  completed: 'text-[hsl(var(--success))] border-[hsl(var(--success))]/30',
  failed: 'text-destructive border-destructive/30',
};

export default function AiAdsAnalysisPage() {
  const { user } = useAuth();
  const { logGosAction } = useGosAuditLog();
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedType, setSelectedType] = useState('performance_summary');
  const [prompt, setPrompt] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRun, setSelectedRun] = useState<AnalysisRun | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const [cRes, sRes, rRes] = await Promise.all([
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('ai_campaign_sessions').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('ai_analysis_runs').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setClients(cRes.data || []);
    setSessions((sRes.data as Session[]) || []);
    setRuns((rRes.data as AnalysisRun[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runAnalysis = async () => {
    if (!user || !selectedClient || !prompt.trim()) return;
    setSubmitting(true);
    try {
      // Create or reuse session
      let sessionId: string;
      const existingSession = sessions.find(s => s.client_id === selectedClient && s.status === 'active');
      if (existingSession) {
        sessionId = existingSession.id;
      } else {
        const { data: sess, error: sessErr } = await supabase.from('ai_campaign_sessions').insert({
          client_id: selectedClient,
          title: `Analysis ${new Date().toLocaleDateString()}`,
          created_by: user.id,
          session_type: 'analysis',
        }).select().single();
        if (sessErr) throw sessErr;
        sessionId = sess!.id;
        logGosAction('create', 'ai_campaign_session', sessionId, sess!.title, { clientId: selectedClient });
        setSessions(prev => [sess as Session, ...prev]);
      }

      // Create analysis run
      const { data: run, error: runErr } = await supabase.from('ai_analysis_runs').insert({
        session_id: sessionId,
        client_id: selectedClient,
        created_by: user.id,
        prompt: prompt.trim(),
        analysis_type: selectedType,
        status: 'queued',
      }).select().single();
      if (runErr) throw runErr;
      const newRun = run as AnalysisRun;
      logGosAction('create', 'ai_analysis_run', newRun.id, `${selectedType}: ${prompt.trim().slice(0, 60)}`, { clientId: selectedClient });
      setRuns(prev => [newRun, ...prev]);

      // Trigger the edge function
      const { error: fnErr } = await supabase.functions.invoke('ai-ads-analyze', {
        body: { run_id: newRun.id },
      });

      if (fnErr) {
        toast.error('Analysis request failed: ' + fnErr.message);
      } else {
        toast.success('Analysis started — results will appear shortly');
        // Poll for completion
        setTimeout(async () => {
          const { data: updated } = await supabase.from('ai_analysis_runs').select('*').eq('id', newRun.id).single();
          if (updated) setRuns(prev => prev.map(r => r.id === newRun.id ? updated as AnalysisRun : r));
        }, 5000);
        setTimeout(async () => {
          const { data: updated } = await supabase.from('ai_analysis_runs').select('*').eq('id', newRun.id).single();
          if (updated) setRuns(prev => prev.map(r => r.id === newRun.id ? updated as AnalysisRun : r));
        }, 15000);
      }

      setDialogOpen(false);
      setPrompt('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create analysis run');
    } finally {
      setSubmitting(false);
    }
  };

  const refreshRun = async (runId: string) => {
    const { data } = await supabase.from('ai_analysis_runs').select('*').eq('id', runId).single();
    if (data) setRuns(prev => prev.map(r => r.id === runId ? data as AnalysisRun : r));
  };

  const filteredRuns = runs.filter(r => {
    if (search && !r.prompt.toLowerCase().includes(search.toLowerCase()) && !(r.result_summary || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-violet-400" />
            AI Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered campaign analysis with structured insights</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" disabled={clients.length === 0}>
              <Plus className="h-4 w-4" /> New Analysis
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Run AI Analysis</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Client</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Analysis Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {analysisTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prompt / Task</Label>
                <Textarea
                  placeholder="e.g. Analyze our Meta campaigns from last month. Focus on CPL trends and identify underperforming ad sets..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  rows={4}
                />
              </div>
              <Button onClick={runAnalysis} disabled={!selectedClient || !prompt.trim() || submitting} className="w-full gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {submitting ? 'Starting...' : 'Run Analysis'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search runs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : selectedRun ? (
        <AnalysisRunDetail run={selectedRun} clientName={clientName(selectedRun.client_id)} onBack={() => setSelectedRun(null)} onRefresh={() => refreshRun(selectedRun.id)} />
      ) : filteredRuns.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BrainCircuit className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Analysis Runs</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Create your first AI analysis to get structured campaign insights, risk assessments, and actionable recommendations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRuns.map(r => (
            <Card key={r.id} className="hover:border-primary/20 transition-colors cursor-pointer" onClick={() => setSelectedRun(r)}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${statusColor[r.status] || ''} bg-muted/50`}>
                  {statusIcon[r.status] || <Clock className="h-3 w-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">{r.prompt.slice(0, 80)}{r.prompt.length > 80 ? '...' : ''}</span>
                    <Badge variant="outline" className={`gap-1 text-[10px] ${statusColor[r.status]}`}>{statusIcon[r.status]} {r.status}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{r.analysis_type?.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{clientName(r.client_id)}</span>
                    <span>·</span>
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                    {r.result_summary && <span className="truncate max-w-[300px]">· {r.result_summary.slice(0, 60)}...</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalysisRunDetail({ run, clientName, onBack, onRefresh }: { run: AnalysisRun; clientName: string; onBack: () => void; onRefresh: () => void }) {
  const result = run.result_data as any;
  const hasStructured = result && result.executive_summary;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <div className="flex-1">
          <h2 className="font-semibold text-foreground">{run.analysis_type?.replace(/_/g, ' ')} — {clientName}</h2>
          <p className="text-xs text-muted-foreground">{new Date(run.created_at).toLocaleString()}</p>
        </div>
        <Badge variant="outline" className={`gap-1 ${statusColor[run.status]}`}>{statusIcon[run.status]} {run.status}</Badge>
        {run.status !== 'completed' && (
          <Button variant="outline" size="sm" onClick={onRefresh}>Refresh</Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Prompt</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{run.prompt}</p></CardContent>
      </Card>

      {run.status === 'running' && (
        <Card className="border-blue-400/20 bg-blue-400/5">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-3" />
            <p className="text-sm text-foreground font-medium">Analysis in progress...</p>
            <p className="text-xs text-muted-foreground mt-1">This usually takes 10-30 seconds</p>
          </CardContent>
        </Card>
      )}

      {run.status === 'failed' && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Analysis Failed</p>
              <p className="text-xs text-muted-foreground">{run.result_summary || 'An error occurred during analysis'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {run.status === 'completed' && hasStructured && (
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="findings">Findings ({result.key_findings?.length || 0})</TabsTrigger>
            <TabsTrigger value="risks">Risks ({result.risks?.length || 0})</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities ({result.opportunities?.length || 0})</TabsTrigger>
            <TabsTrigger value="actions">Actions ({result.recommended_actions?.length || 0})</TabsTrigger>
            <TabsTrigger value="tests">Tests ({result.next_tests?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-foreground leading-relaxed">{result.executive_summary}</p>
                {result.notes && <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">{result.notes}</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="findings" className="space-y-2">
            {(result.key_findings || []).map((f: any, i: number) => (
              <Card key={i}>
                <CardContent className="p-3 flex items-start gap-3">
                  <TrendingUp className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{f.title}</span>
                      <Badge variant="secondary" className="text-[10px]">{f.impact} impact</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{f.detail}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="risks" className="space-y-2">
            {(result.risks || []).map((r: any, i: number) => (
              <Card key={i} className={r.severity === 'critical' ? 'border-destructive/30' : ''}>
                <CardContent className="p-3 flex items-start gap-3">
                  <Shield className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{r.title}</span>
                      <Badge variant={r.severity === 'critical' ? 'destructive' : 'secondary'} className="text-[10px]">{r.severity}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{r.detail}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-2">
            {(result.opportunities || []).map((o: any, i: number) => (
              <Card key={i}>
                <CardContent className="p-3 flex items-start gap-3">
                  <Lightbulb className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-foreground">{o.title}</span>
                    <p className="text-xs text-muted-foreground mt-1">{o.detail}</p>
                    <p className="text-xs text-violet-400 mt-1">Potential: {o.potential_impact}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="actions" className="space-y-2">
            {(result.recommended_actions || []).map((a: any, i: number) => (
              <Card key={i}>
                <CardContent className="p-3 flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{a.title}</span>
                      <Badge variant="secondary" className="text-[10px]">{a.priority}</Badge>
                      <Badge variant="outline" className="text-[10px]">{a.recommendation_type?.replace(/_/g, ' ')}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1 italic">Rationale: {a.rationale}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="tests" className="space-y-2">
            {(result.next_tests || []).map((t: any, i: number) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <span className="text-sm font-semibold text-foreground">{t.title}</span>
                  <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {run.status === 'completed' && !hasStructured && run.result_summary && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Result</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{run.result_summary}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
