import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Loader2, Search, FileStack, Lightbulb, XCircle, CheckCircle2, Eye, AlertTriangle } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGosAuditLog } from '@/hooks/useGosAuditLog';
import { toast } from 'sonner';

interface Recommendation {
  id: string; title: string; description: string; recommendation_type: string;
  priority: string; status: string; client_id: string; session_id: string | null;
  analysis_run_id: string | null; metadata: any; created_at: string; acted_on_at: string | null;
}
interface Client { id: string; name: string; }

const priorityColors: Record<string, string> = {
  high: 'text-destructive border-destructive/30',
  medium: 'text-amber-400 border-amber-400/30',
  low: 'text-muted-foreground border-muted-foreground/30',
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  new: { label: 'New', color: 'text-blue-400 border-blue-400/30', icon: <AlertTriangle className="h-3 w-3" /> },
  reviewed: { label: 'Reviewed', color: 'text-amber-400 border-amber-400/30', icon: <Eye className="h-3 w-3" /> },
  converted_to_draft: { label: 'Converted', color: 'text-[hsl(var(--success))] border-[hsl(var(--success))]/30', icon: <FileStack className="h-3 w-3" /> },
  converted_to_hypothesis: { label: 'Hypothesis', color: 'text-[hsl(270,70%,60%)] border-[hsl(270,70%,50%)]/30', icon: <Lightbulb className="h-3 w-3" /> },
  dismissed: { label: 'Dismissed', color: 'text-muted-foreground border-muted-foreground/30', icon: <XCircle className="h-3 w-3" /> },
};

const recTypes = [
  'restructure_campaign', 'test_new_angle', 'kill_underperformer', 'duplicate_winner',
  'adjust_budget', 'change_audience', 'improve_creative', 'improve_landing', 'launch_new_test',
];

export default function AiAdsRecommendationsPage() {
  const { user } = useAuth();
  const { logGosAction } = useGosAuditLog();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const load = useCallback(async () => {
    const [rRes, cRes] = await Promise.all([
      supabase.from('ai_recommendations' as any).select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('clients').select('id, name').order('name'),
    ]);
    setRecs((rRes.data as any[]) || []);
    setClients(cRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (rec: Recommendation, newStatus: string) => {
    const { error } = await supabase.from('ai_recommendations' as any)
      .update({ status: newStatus, acted_on_at: new Date().toISOString() }).eq('id', rec.id);
    if (error) { toast.error('Failed to update'); return; }
    logGosAction(newStatus === 'dismissed' ? 'dismiss' : 'update', 'ai_recommendation', rec.id, rec.title, { clientId: rec.client_id, metadata: { status: newStatus } });
    setRecs(prev => prev.map(r => r.id === rec.id ? { ...r, status: newStatus, acted_on_at: new Date().toISOString() } : r));
    toast.success(`Recommendation ${newStatus.replace(/_/g, ' ')}`);
  };

  const convertToDraft = async (rec: Recommendation) => {
    if (!user) return;
    const { data, error } = await supabase.from('campaign_drafts' as any).insert({
      client_id: rec.client_id, created_by: user.id,
      name: `Draft: ${rec.title}`, draft_type: rec.recommendation_type,
      recommendation_id: rec.id, session_id: rec.session_id,
      notes: rec.description,
      metadata: { source: 'recommendation', recommendation_id: rec.id, recommendation_type: rec.recommendation_type },
    }).select().single();
    if (error) { toast.error('Failed to create draft'); return; }
    await updateStatus(rec, 'converted_to_draft');
    logGosAction('create', 'campaign_draft', (data as any).id, `Draft: ${rec.title}`, { clientId: rec.client_id, metadata: { source: 'recommendation', recommendationId: rec.id } });
    toast.success('Campaign draft created');
  };

  const convertToHypothesis = async (rec: Recommendation) => {
    if (!user) return;
    const { data, error } = await supabase.from('hypothesis_threads' as any).insert({
      client_id: rec.client_id, created_by: user.id,
      title: `Hypothesis: ${rec.title}`, recommendation_id: rec.id,
      metadata: { source: 'recommendation', recommendation_type: rec.recommendation_type },
    }).select().single();
    if (error) { toast.error('Failed to create hypothesis'); return; }
    // Add initial message with recommendation context
    await supabase.from('hypothesis_messages' as any).insert({
      thread_id: (data as any).id, role: 'assistant',
      content: `**Recommendation:** ${rec.title}\n\n${rec.description}\n\n**Type:** ${rec.recommendation_type.replace(/_/g, ' ')}\n**Priority:** ${rec.priority}`,
    });
    await updateStatus(rec, 'converted_to_hypothesis');
    logGosAction('create', 'hypothesis_thread', (data as any).id, `Hypothesis: ${rec.title}`, { clientId: rec.client_id, metadata: { source: 'recommendation', recommendationId: rec.id } });
    toast.success('Hypothesis thread created');
  };

  const filtered = recs.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterPriority !== 'all' && r.priority !== filterPriority) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-cyan-400" /> Recommendations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">AI-generated actionable recommendations from analysis runs</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Recommendations</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Run an AI analysis to automatically generate actionable recommendations for your campaigns.
          </p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const sc = statusConfig[r.status] || statusConfig.new;
            return (
              <Card key={r.id} className="hover:border-primary/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm text-foreground">{r.title}</span>
                        <Badge variant="outline" className={`gap-1 text-[10px] ${sc.color}`}>{sc.icon} {sc.label}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${priorityColors[r.priority]}`}>{r.priority}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{r.recommendation_type.replace(/_/g, ' ')}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span>{clientName(r.client_id)}</span>
                        <span>·</span>
                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {(r.status === 'new' || r.status === 'reviewed') && (
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {r.status === 'new' && (
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => updateStatus(r, 'reviewed')}>
                            <Eye className="h-3 w-3 mr-1" /> Review
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => convertToDraft(r)}>
                          <FileStack className="h-3 w-3 mr-1" /> To Draft
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => convertToHypothesis(r)}>
                          <Lightbulb className="h-3 w-3 mr-1" /> To Hypothesis
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground" onClick={() => updateStatus(r, 'dismissed')}>
                          <XCircle className="h-3 w-3 mr-1" /> Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
