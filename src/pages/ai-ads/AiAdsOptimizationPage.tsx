import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Zap, Loader2, Search, Clock, CheckCircle2, XCircle, ShieldCheck, AlertTriangle,
  Eye, Play, Ban, Pause, TrendingUp, TrendingDown, Copy, FileStack, ArrowLeft,
  BarChart3, Users, Activity,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGosAuditLog } from '@/hooks/useGosAuditLog';
import { toast } from 'sonner';

// ── Types ──

interface OptAction {
  id: string; client_id: string; launch_request_id: string | null;
  recommendation_id: string | null; external_campaign_id: string | null;
  external_adset_id: string | null; external_ad_id: string | null;
  action_type: string; platform: string; proposed_by: string;
  approved_by: string | null; rejected_by: string | null; executed_by: string | null;
  status: string; rationale: string; input_payload: any; normalized_payload: any;
  result_payload: any; error_message: string | null; rejection_reason: string | null;
  executed_at: string | null; created_at: string; updated_at: string;
}

interface ActionLog {
  id: string; action_id: string; step: string; status: string;
  message: string; payload: any; created_by: string | null; created_at: string;
}

interface Client { id: string; name: string; }
interface Recommendation {
  id: string; title: string; description: string; recommendation_type: string;
  priority: string; status: string; client_id: string; metadata: any;
}

// ── Constants ──

const ACTION_TYPES = [
  'pause_campaign', 'pause_adset', 'increase_budget', 'decrease_budget',
  'duplicate_winner', 'relaunch_with_changes', 'mark_for_review',
];

const LIVE_ACTIONS = ['pause_campaign', 'pause_adset', 'increase_budget', 'decrease_budget'];

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  proposed: { label: 'Proposed', color: 'text-blue-400 border-blue-400/30', icon: <Clock className="h-3 w-3" /> },
  approved: { label: 'Approved', color: 'text-emerald-400 border-emerald-400/30', icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: 'Rejected', color: 'text-destructive border-destructive/30', icon: <XCircle className="h-3 w-3" /> },
  executing: { label: 'Executing', color: 'text-amber-400 border-amber-400/30', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  executed: { label: 'Executed', color: 'text-emerald-400 border-emerald-400/30', icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: 'Failed', color: 'text-destructive border-destructive/30', icon: <XCircle className="h-3 w-3" /> },
  blocked: { label: 'Blocked', color: 'text-amber-400 border-amber-400/30', icon: <Ban className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', color: 'text-muted-foreground border-muted-foreground/30', icon: <XCircle className="h-3 w-3" /> },
};

const typeIcons: Record<string, React.ReactNode> = {
  pause_campaign: <Pause className="h-4 w-4 text-amber-400" />,
  pause_adset: <Pause className="h-4 w-4 text-amber-400" />,
  increase_budget: <TrendingUp className="h-4 w-4 text-emerald-400" />,
  decrease_budget: <TrendingDown className="h-4 w-4 text-destructive" />,
  duplicate_winner: <Copy className="h-4 w-4 text-cyan-400" />,
  relaunch_with_changes: <FileStack className="h-4 w-4 text-blue-400" />,
  mark_for_review: <Eye className="h-4 w-4 text-muted-foreground" />,
};

// ── Main Page ──

export default function AiAdsOptimizationPage() {
  const { user, agencyRole } = useAuth();
  const { logGosAction } = useGosAuditLog();
  const [actions, setActions] = useState<OptAction[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [selectedAction, setSelectedAction] = useState<OptAction | null>(null);
  const [activeTab, setActiveTab] = useState('actions');
  const [proposeOpen, setProposeOpen] = useState(false);

  const isAdmin = agencyRole === 'AgencyAdmin';

  const load = useCallback(async () => {
    const [aRes, cRes, rRes] = await Promise.all([
      supabase.from('optimization_actions' as any).select('*').order('created_at', { ascending: false }).limit(300),
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('ai_recommendations' as any).select('*')
        .in('status', ['new', 'reviewed']).order('created_at', { ascending: false }).limit(100),
    ]);
    setActions((aRes.data as any[]) || []);
    setClients(cRes.data || []);
    setRecs((rRes.data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadLogs = async (actionId: string) => {
    const { data } = await supabase.from('optimization_action_logs' as any)
      .select('*').eq('action_id', actionId).order('created_at', { ascending: true });
    setLogs((data as any[]) || []);
  };

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || 'Unknown';

  // Filtered actions
  const filtered = actions.filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (filterType !== 'all' && a.action_type !== filterType) return false;
    if (filterClient !== 'all' && a.client_id !== filterClient) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!a.rationale.toLowerCase().includes(s) && !a.action_type.includes(s) &&
          !(a.external_campaign_id || '').includes(s) && !clientName(a.client_id).toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const counts: Record<string, number> = {};
  actions.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });

  // ── Approve / Reject / Execute ──
  const approveAction = async (action: OptAction) => {
    if (!user) return;
    const { error } = await supabase.from('optimization_actions' as any)
      .update({ status: 'approved', approved_by: user.id }).eq('id', action.id);
    if (error) { toast.error('Failed to approve'); return; }
    logGosAction('approve', 'optimization_action', action.id, `Approved: ${action.action_type}`, { clientId: action.client_id });
    toast.success('Action approved');
    load();
  };

  const rejectAction = async (action: OptAction, reason: string) => {
    if (!user) return;
    const { error } = await supabase.from('optimization_actions' as any)
      .update({ status: 'rejected', rejected_by: user.id, rejection_reason: reason }).eq('id', action.id);
    if (error) { toast.error('Failed to reject'); return; }
    logGosAction('reject', 'optimization_action', action.id, `Rejected: ${action.action_type}`, { clientId: action.client_id });
    toast.success('Action rejected');
    load();
  };

  const cancelAction = async (action: OptAction) => {
    const { error } = await supabase.from('optimization_actions' as any)
      .update({ status: 'cancelled' }).eq('id', action.id);
    if (error) { toast.error('Failed to cancel'); return; }
    logGosAction('cancel', 'optimization_action', action.id, `Cancelled: ${action.action_type}`, { clientId: action.client_id });
    toast.success('Action cancelled');
    load();
  };

  const executeAction = async (action: OptAction) => {
    if (!isAdmin) { toast.error('Only admins can execute'); return; }
    if (action.status !== 'approved') { toast.error('Action must be approved first'); return; }

    // Non-live actions become drafts
    if (!LIVE_ACTIONS.includes(action.action_type)) {
      toast.info(`"${action.action_type.replace(/_/g, ' ')}" creates a draft instead of live execution`);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('execute-optimization', {
        body: { action_id: action.id },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success(`Action ${data.status}: ${action.action_type.replace(/_/g, ' ')}`);
      load();
    } catch (e: any) {
      toast.error('Execution failed: ' + e.message);
      load();
    }
  };

  // Detail view
  if (selectedAction) {
    return <ActionDetail action={selectedAction} clientName={clientName(selectedAction.client_id)}
      logs={logs} isAdmin={isAdmin}
      onBack={() => { setSelectedAction(null); setLogs([]); }}
      onApprove={() => approveAction(selectedAction)}
      onReject={(r) => rejectAction(selectedAction, r)}
      onExecute={() => executeAction(selectedAction)}
      onCancel={() => cancelAction(selectedAction)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Zap className="h-6 w-6 text-cyan-400" /> Optimization Actions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Propose, approve, and execute campaign optimizations safely</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setProposeOpen(true)}>
          <Zap className="h-4 w-4" /> Propose Action
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {Object.entries(statusConfig).map(([k, v]) => (
          <Card key={k}><CardContent className="p-3 text-center">
            <p className={`text-xl font-bold ${v.color.split(' ')[0]}`}>{counts[k] || 0}</p>
            <p className="text-[10px] text-muted-foreground">{v.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="actions" className="gap-1.5 text-xs"><Zap className="h-3.5 w-3.5" /> All Actions ({filtered.length})</TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5 text-xs"><Clock className="h-3.5 w-3.5" /> Pending Approval ({counts.proposed || 0})</TabsTrigger>
          <TabsTrigger value="client" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> Client Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="actions">
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {ACTION_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="py-16 text-center">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Optimization Actions</h3>
                <p className="text-sm text-muted-foreground">Propose an action from recommendations or create one manually.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {filtered.map(a => <ActionCard key={a.id} action={a} clientName={clientName(a.client_id)}
                  onClick={() => { setSelectedAction(a); loadLogs(a.id); }} />)}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending">
          <PendingApprovals actions={actions.filter(a => a.status === 'proposed')} clientName={clientName}
            isAdmin={isAdmin} onApprove={approveAction} onReject={rejectAction}
            onSelect={(a) => { setSelectedAction(a); loadLogs(a.id); }} />
        </TabsContent>

        <TabsContent value="client">
          <ClientPerformanceView clients={clients} actions={actions} />
        </TabsContent>
      </Tabs>

      {/* Propose Dialog */}
      <ProposeDialog open={proposeOpen} onOpenChange={setProposeOpen} clients={clients}
        recs={recs} userId={user?.id || ''} onCreated={() => { load(); setProposeOpen(false); }} />
    </div>
  );
}

// ── Action Card ──

function ActionCard({ action: a, clientName, onClick }: { action: OptAction; clientName: string; onClick: () => void }) {
  const sc = statusConfig[a.status] || statusConfig.proposed;
  const isLive = LIVE_ACTIONS.includes(a.action_type);

  return (
    <Card className="hover:border-primary/20 transition-colors cursor-pointer" onClick={onClick}>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="mt-0.5">{typeIcons[a.action_type] || <Zap className="h-4 w-4 text-muted-foreground" />}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm text-foreground">{a.action_type.replace(/_/g, ' ')}</span>
            <Badge variant="outline" className={`gap-1 text-[10px] ${sc.color}`}>{sc.icon} {sc.label}</Badge>
            <Badge variant="secondary" className="text-[10px]">{a.platform}</Badge>
            {isLive && <Badge variant="outline" className="text-[9px] text-cyan-400 border-cyan-400/30">live action</Badge>}
            {!isLive && <Badge variant="outline" className="text-[9px] text-muted-foreground border-muted-foreground/30">draft-based</Badge>}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{a.rationale || 'No rationale provided'}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
            <span>{clientName}</span>
            {a.external_campaign_id && <><span>·</span><span className="font-mono text-emerald-400">#{a.external_campaign_id}</span></>}
            <span>·</span>
            <span>{new Date(a.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Pending Approvals ──

function PendingApprovals({ actions, clientName, isAdmin, onApprove, onReject, onSelect }: {
  actions: OptAction[]; clientName: (id: string) => string; isAdmin: boolean;
  onApprove: (a: OptAction) => void; onReject: (a: OptAction, reason: string) => void;
  onSelect: (a: OptAction) => void;
}) {
  const [rejectTarget, setRejectTarget] = useState<OptAction | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (actions.length === 0) {
    return <Card><CardContent className="py-16 text-center">
      <ShieldCheck className="h-12 w-12 mx-auto text-emerald-400/40 mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">No Pending Approvals</h3>
      <p className="text-sm text-muted-foreground">All optimization actions have been reviewed.</p>
    </CardContent></Card>;
  }

  return (
    <div className="space-y-2">
      {actions.map(a => (
        <Card key={a.id} className="border-blue-400/20">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="mt-0.5">{typeIcons[a.action_type] || <Zap className="h-4 w-4" />}</div>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(a)}>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-sm text-foreground">{a.action_type.replace(/_/g, ' ')}</span>
                <Badge variant="secondary" className="text-[10px]">{a.platform}</Badge>
                {LIVE_ACTIONS.includes(a.action_type) && <Badge variant="outline" className="text-[9px] text-cyan-400 border-cyan-400/30">⚡ live</Badge>}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{a.rationale}</p>
              <div className="text-[10px] text-muted-foreground mt-1">
                {clientName(a.client_id)} · Proposed {new Date(a.created_at).toLocaleString()}
              </div>
            </div>
            {isAdmin && (
              <div className="flex flex-col gap-1.5 shrink-0">
                <Button size="sm" variant="outline" className="text-xs h-7 text-emerald-400 border-emerald-400/30" onClick={() => onApprove(a)}>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7 text-destructive border-destructive/30" onClick={() => { setRejectTarget(a); setRejectReason(''); }}>
                  <XCircle className="h-3 w-3 mr-1" /> Reject
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Optimization Action</DialogTitle>
          <DialogDescription>Provide a reason for rejecting this action.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Label>Rejection Reason</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Why is this action being rejected?" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={() => {
              if (rejectTarget) { onReject(rejectTarget, rejectReason); setRejectTarget(null); }
            }}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Action Detail ──

function ActionDetail({ action: a, clientName, logs, isAdmin, onBack, onApprove, onReject, onExecute, onCancel }: {
  action: OptAction; clientName: string; logs: ActionLog[]; isAdmin: boolean;
  onBack: () => void; onApprove: () => void; onReject: (r: string) => void;
  onExecute: () => void; onCancel: () => void;
}) {
  const sc = statusConfig[a.status] || statusConfig.proposed;
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const isLive = LIVE_ACTIONS.includes(a.action_type);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
            {typeIcons[a.action_type]} {a.action_type.replace(/_/g, ' ')}
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{clientName}</span><span>·</span><span>{a.platform}</span>
            <span>·</span><span>Proposed {new Date(a.created_at).toLocaleString()}</span>
          </div>
        </div>
        <Badge variant="outline" className={`gap-1 ${sc.color}`}>{sc.icon} {sc.label}</Badge>
        {isLive && <Badge variant="outline" className="text-[9px] text-cyan-400 border-cyan-400/30">⚡ live action</Badge>}
      </div>

      {/* Rationale */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Rationale</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">{a.rationale || 'No rationale provided'}</p></CardContent>
      </Card>

      {/* Target entities */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Target Entities</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {a.external_campaign_id && <div className="flex items-center gap-2 text-xs"><span className="text-muted-foreground">Campaign:</span><span className="font-mono text-emerald-400">{a.external_campaign_id}</span></div>}
          {a.external_adset_id && <div className="flex items-center gap-2 text-xs"><span className="text-muted-foreground">Ad Set:</span><span className="font-mono text-blue-400">{a.external_adset_id}</span></div>}
          {a.external_ad_id && <div className="flex items-center gap-2 text-xs"><span className="text-muted-foreground">Ad:</span><span className="font-mono text-violet-400">{a.external_ad_id}</span></div>}
          {!a.external_campaign_id && !a.external_adset_id && !a.external_ad_id && <p className="text-xs text-muted-foreground">No external entities linked</p>}
        </CardContent>
      </Card>

      {/* Input / Result payload */}
      {a.input_payload && Object.keys(a.input_payload).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Input Payload</CardTitle></CardHeader>
          <CardContent><pre className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg overflow-auto max-h-40">{JSON.stringify(a.input_payload, null, 2)}</pre></CardContent>
        </Card>
      )}

      {a.status === 'executed' && a.result_payload && Object.keys(a.result_payload).length > 0 && (
        <Card className="border-emerald-400/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-400">Execution Result</CardTitle></CardHeader>
          <CardContent><pre className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg overflow-auto max-h-40">{JSON.stringify(a.result_payload, null, 2)}</pre></CardContent>
        </Card>
      )}

      {a.error_message && (
        <Card className="border-destructive/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">Error</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-destructive">{a.error_message}</p></CardContent>
        </Card>
      )}

      {a.rejection_reason && (
        <Card className="border-destructive/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">Rejection Reason</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{a.rejection_reason}</p></CardContent>
        </Card>
      )}

      {/* Execution Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-blue-400" /> Execution Logs ({logs.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {logs.map(l => (
              <div key={l.id} className="flex items-start gap-2 text-xs p-1.5 rounded hover:bg-muted/20">
                <Badge variant="outline" className={`text-[9px] shrink-0 ${l.status === 'success' ? 'text-emerald-400 border-emerald-400/30' : l.status === 'error' ? 'text-destructive border-destructive/30' : 'text-muted-foreground border-muted-foreground/30'}`}>{l.step}</Badge>
                <span className="text-muted-foreground flex-1">{l.message}</span>
                <span className="text-muted-foreground/60 shrink-0">{new Date(l.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className="border-cyan-400/20">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          {a.status === 'proposed' && isAdmin && (
            <>
              <Button size="sm" variant="outline" className="gap-1.5 text-emerald-400 border-emerald-400/30" onClick={onApprove}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30" onClick={() => setRejectOpen(true)}>
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
            </>
          )}
          {a.status === 'approved' && isAdmin && isLive && (
            <Button size="sm" className="gap-1.5" onClick={onExecute}>
              <Play className="h-3.5 w-3.5" /> Execute Now
            </Button>
          )}
          {a.status === 'approved' && !isLive && (
            <Badge variant="outline" className="text-xs text-muted-foreground">This action type creates a draft — use Campaign Drafts to continue</Badge>
          )}
          {['proposed', 'approved'].includes(a.status) && isAdmin && (
            <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={onCancel}>
              <Ban className="h-3.5 w-3.5" /> Cancel
            </Button>
          )}
          {['executed', 'failed', 'blocked', 'rejected', 'cancelled'].includes(a.status) && (
            <Badge variant="outline" className="text-xs text-muted-foreground">This action is finalized</Badge>
          )}
        </CardContent>
      </Card>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Action</DialogTitle>
          <DialogDescription>Explain why this optimization should not proceed.</DialogDescription></DialogHeader>
          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Rejection reason..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={() => { onReject(rejectReason); setRejectOpen(false); }}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Propose Action Dialog ──

function ProposeDialog({ open, onOpenChange, clients, recs, userId, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; clients: Client[];
  recs: Recommendation[]; userId: string; onCreated: () => void;
}) {
  const { logGosAction } = useGosAuditLog();
  const [actionType, setActionType] = useState('pause_campaign');
  const [clientId, setClientId] = useState('');
  const [recId, setRecId] = useState('none');
  const [rationale, setRationale] = useState('');
  const [extCampaignId, setExtCampaignId] = useState('');
  const [extAdsetId, setExtAdsetId] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredRecs = recs.filter(r => clientId ? r.client_id === clientId : true);

  const handleCreate = async () => {
    if (!clientId || !rationale.trim()) { toast.error('Client and rationale required'); return; }
    setSaving(true);
    try {
      const input: any = {};
      if (['increase_budget', 'decrease_budget'].includes(actionType) && newBudget) {
        input.new_daily_budget = parseFloat(newBudget);
      }

      const { data, error } = await supabase.from('optimization_actions' as any).insert({
        client_id: clientId, action_type: actionType, proposed_by: userId,
        rationale: rationale.trim(),
        recommendation_id: recId !== 'none' ? recId : null,
        external_campaign_id: extCampaignId || null,
        external_adset_id: extAdsetId || null,
        input_payload: Object.keys(input).length > 0 ? input : (recId !== 'none' ? { source: 'recommendation' } : {}),
      }).select().single();
      if (error) throw error;

      // If from recommendation, update rec status
      if (recId !== 'none') {
        await supabase.from('ai_recommendations' as any)
          .update({ status: 'converted_to_draft', acted_on_at: new Date().toISOString() }).eq('id', recId);
      }

      logGosAction('propose', 'optimization_action', (data as any).id, `Proposed: ${actionType}`, { clientId });
      toast.success('Optimization action proposed');
      onCreated();
      // Reset
      setActionType('pause_campaign'); setClientId(''); setRecId('none');
      setRationale(''); setExtCampaignId(''); setExtAdsetId(''); setNewBudget('');
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  // Auto-fill from recommendation
  const handleRecChange = (id: string) => {
    setRecId(id);
    if (id !== 'none') {
      const rec = recs.find(r => r.id === id);
      if (rec) {
        setClientId(rec.client_id);
        setRationale(rec.description);
        if (rec.metadata?.external_campaign_id) setExtCampaignId(rec.metadata.external_campaign_id);
        // Map rec type to action type
        const map: Record<string, string> = {
          pause_loser: 'pause_campaign', increase_budget: 'increase_budget',
          reduce_budget: 'decrease_budget', relaunch_with_changes: 'relaunch_with_changes',
          duplicate_winner: 'duplicate_winner', fix_creative_issue: 'mark_for_review',
          fix_targeting_issue: 'mark_for_review', investigate_rejection: 'mark_for_review',
          no_delivery_check: 'mark_for_review',
        };
        if (map[rec.recommendation_type]) setActionType(map[rec.recommendation_type]);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Propose Optimization Action</DialogTitle>
        <DialogDescription>This action will require admin approval before execution.</DialogDescription></DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-auto">
          <div className="space-y-2">
            <Label>Source Recommendation (optional)</Label>
            <Select value={recId} onValueChange={handleRecChange}>
              <SelectTrigger><SelectValue placeholder="Select recommendation..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Manual action</SelectItem>
                {filteredRecs.map(r => <SelectItem key={r.id} value={r.id}>{r.title.slice(0, 60)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACTION_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>External Campaign ID</Label>
              <Input value={extCampaignId} onChange={e => setExtCampaignId(e.target.value)} placeholder="Meta campaign ID" />
            </div>
            <div className="space-y-2">
              <Label>External Ad Set ID</Label>
              <Input value={extAdsetId} onChange={e => setExtAdsetId(e.target.value)} placeholder="Meta ad set ID" />
            </div>
          </div>
          {['increase_budget', 'decrease_budget'].includes(actionType) && (
            <div className="space-y-2">
              <Label>New Daily Budget ($)</Label>
              <Input type="number" value={newBudget} onChange={e => setNewBudget(e.target.value)} placeholder="e.g. 50" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Rationale *</Label>
            <Textarea value={rationale} onChange={e => setRationale(e.target.value)} placeholder="Why should this optimization be applied?" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !clientId || !rationale.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Propose Action
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Client Performance View ──

function ClientPerformanceView({ clients, actions }: { clients: Client[]; actions: OptAction[] }) {
  // Aggregate per client
  const clientStats = clients.map(c => {
    const ca = actions.filter(a => a.client_id === c.id);
    return {
      ...c,
      total: ca.length,
      executed: ca.filter(a => a.status === 'executed').length,
      failed: ca.filter(a => a.status === 'failed').length,
      pending: ca.filter(a => a.status === 'proposed').length,
      approved: ca.filter(a => a.status === 'approved').length,
    };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  if (clientStats.length === 0) {
    return <Card><CardContent className="py-16 text-center">
      <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">No Client Data</h3>
      <p className="text-sm text-muted-foreground">Optimization actions will appear here per client once created.</p>
    </CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Client-level optimization activity overview. For detailed campaign metrics, see the Intelligence page.</p>
      <div className="space-y-2">
        {clientStats.map(c => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-foreground">{c.name}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.total} optimization actions</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-emerald-400">{c.executed} executed</span>
                  <span className="text-blue-400">{c.approved} approved</span>
                  <span className="text-amber-400">{c.pending} pending</span>
                  {c.failed > 0 && <span className="text-destructive">{c.failed} failed</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
