import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Rocket, Loader2, Search, Clock, CheckCircle2, XCircle, ShieldCheck,
  AlertTriangle, Eye, ArrowLeft, Play, Ban, Copy, FileText, Activity,
  BarChart3, RefreshCw, Zap,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGosAuditLog } from '@/hooks/useGosAuditLog';
import { toast } from 'sonner';

// ── Types ──

interface LaunchRequest {
  id: string; draft_id: string; client_id: string; ad_account_id: string | null;
  requested_by: string; status: string; priority: string; platform: string;
  execution_status: string; normalized_payload: any; error_message: string | null;
  external_campaign_id: string | null; external_ids: any;
  notes: string; approved_by: string | null; approved_at: string | null;
  rejected_by: string | null; rejected_at: string | null; rejection_reason: string | null;
  executed_at: string | null; executed_by: string | null;
  metadata: any; created_at: string; updated_at: string;
}

interface ExecLog {
  id: string; launch_request_id: string; step: string; status: string;
  entity_level: string; message: string; external_entity_id: string | null;
  payload_snapshot: any; error_detail: string | null; response_data: any;
  executed_by: string | null; created_at: string;
}

interface Client { id: string; name: string; }
interface Draft { id: string; campaign_name: string; name: string; objective: string; platform: string; validation_status: string; preview_payload: any; status: string; client_id: string; }

// ── Status configs ──

const lrStatusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending_approval: { icon: <Clock className="h-3 w-3" />, color: 'text-amber-400 border-amber-400/30', label: 'Pending Approval' },
  approved: { icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-emerald-400 border-emerald-400/30', label: 'Approved' },
  rejected: { icon: <XCircle className="h-3 w-3" />, color: 'text-destructive border-destructive/30', label: 'Rejected' },
  executing: { icon: <Loader2 className="h-3 w-3 animate-spin" />, color: 'text-blue-400 border-blue-400/30', label: 'Executing' },
  completed: { icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-emerald-400 border-emerald-400/30', label: 'Completed' },
  failed: { icon: <AlertTriangle className="h-3 w-3" />, color: 'text-destructive border-destructive/30', label: 'Failed' },
};

const execStatusConfig: Record<string, { color: string; label: string }> = {
  not_started: { color: 'text-muted-foreground', label: 'Not Started' },
  preflight_passed: { color: 'text-blue-400', label: 'Preflight OK' },
  execution_started: { color: 'text-blue-400', label: 'Running' },
  execution_partial: { color: 'text-amber-400', label: 'Partial' },
  execution_completed: { color: 'text-emerald-400', label: 'Completed' },
  execution_failed: { color: 'text-destructive', label: 'Failed' },
  execution_blocked: { color: 'text-destructive', label: 'Blocked' },
};

const stepStatusColors: Record<string, string> = {
  started: 'text-blue-400', passed: 'text-emerald-400', completed: 'text-emerald-400',
  failed: 'text-destructive', blocked: 'text-amber-400', partial: 'text-amber-400',
};

// ── Main Page ──

export default function AiAdsExecutionsPage() {
  const { user, effectiveRole } = useAuth();
  const { logGosAction } = useGosAuditLog();
  const [requests, setRequests] = useState<LaunchRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [selected, setSelected] = useState<LaunchRequest | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchRejectionReason, setBatchRejectionReason] = useState('');
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');

  const isAdmin = effectiveRole === 'AgencyAdmin';

  const load = useCallback(async () => {
    const [lRes, cRes] = await Promise.all([
      supabase.from('launch_requests' as any).select('*').order('created_at', { ascending: false }).limit(300),
      supabase.from('clients').select('id, name').order('name'),
    ]);
    setRequests((lRes.data as any[]) || []);
    setClients(cRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || 'Unknown';

  const filtered = requests.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterClient !== 'all' && r.client_id !== filterClient) return false;
    if (filterPlatform !== 'all' && r.platform !== filterPlatform) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!r.id.toLowerCase().includes(s) && !r.notes?.toLowerCase().includes(s) && !clientName(r.client_id).toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'pending_approval').length;
  const failedCount = requests.filter(r => r.status === 'failed').length;
  const partialCount = requests.filter(r => r.execution_status === 'execution_partial').length;
  const completedCount = requests.filter(r => r.status === 'completed').length;
  const approvedNotExecuted = requests.filter(r => r.status === 'approved' && r.execution_status === 'not_started').length;
  const blockedCount = requests.filter(r => r.execution_status === 'execution_blocked').length;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selectAllPending = () => {
    const pendingIds = filtered.filter(r => r.status === 'pending_approval').map(r => r.id);
    setSelectedIds(new Set(pendingIds));
  };

  const batchApprove = async () => {
    if (!user || selectedIds.size === 0) return;
    const toApprove = [...selectedIds].filter(id => requests.find(r => r.id === id)?.status === 'pending_approval');
    if (toApprove.length === 0) { toast.error('No pending requests selected'); return; }
    setBatchProcessing(true);
    let success = 0;
    for (const id of toApprove) {
      const { error } = await supabase.from('launch_requests' as any).update({
        status: 'approved', approved_by: user.id, approved_at: new Date().toISOString(),
      }).eq('id', id);
      if (!error) {
        const lr = requests.find(r => r.id === id);
        if (lr) await supabase.from('campaign_drafts' as any).update({ status: 'approved' }).eq('id', lr.draft_id);
        success++;
      }
    }
    logGosAction('batch_approve', 'launch_request', undefined, `Batch approved ${success} requests`, { metadata: { count: success, ids: toApprove } });
    toast.success(`Approved ${success} of ${toApprove.length} requests`);
    setSelectedIds(new Set());
    setBatchProcessing(false);
    load();
  };

  const batchReject = async () => {
    if (!user || selectedIds.size === 0) return;
    if (!batchRejectionReason.trim()) { toast.error('Rejection reason is required'); return; }
    const toReject = [...selectedIds].filter(id => requests.find(r => r.id === id)?.status === 'pending_approval');
    if (toReject.length === 0) { toast.error('No pending requests selected'); return; }
    setBatchProcessing(true);
    let success = 0;
    for (const id of toReject) {
      const { error } = await supabase.from('launch_requests' as any).update({
        status: 'rejected', rejected_by: user.id, rejected_at: new Date().toISOString(), rejection_reason: batchRejectionReason.trim(),
      }).eq('id', id);
      if (!error) {
        const lr = requests.find(r => r.id === id);
        if (lr) await supabase.from('campaign_drafts' as any).update({ status: 'rejected' }).eq('id', lr.draft_id);
        success++;
      }
    }
    logGosAction('batch_reject', 'launch_request', undefined, `Batch rejected ${success} requests`, { metadata: { count: success, reason: batchRejectionReason.trim() } });
    toast.success(`Rejected ${success} of ${toReject.length} requests`);
    setSelectedIds(new Set());
    setBatchRejectionReason('');
    setBatchProcessing(false);
    load();
  };

  if (selected) {
    return <LaunchRequestDetail lr={selected} clientName={clientName(selected.client_id)} isAdmin={isAdmin}
      clients={clients} onBack={() => { setSelected(null); load(); }} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Rocket className="h-6 w-6 text-rose-400" /> Executions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Campaign launch requests, approvals, execution monitoring, and post-launch ops</p>
      </div>

      <Card className="border-amber-400/20 bg-amber-400/5">
        <CardContent className="p-4 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Guarded Execution Model</p>
            <p className="text-xs text-muted-foreground">Every campaign launch requires admin approval. No campaigns are published without explicit review.</p>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{approvedNotExecuted}</p>
          <p className="text-xs text-muted-foreground">Ready to Execute</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{completedCount}</p>
          <p className="text-xs text-muted-foreground">Launched</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{partialCount}</p>
          <p className="text-xs text-muted-foreground">Partial</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-destructive">{failedCount}</p>
          <p className="text-xs text-muted-foreground">Failed</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-destructive">{blockedCount}</p>
          <p className="text-xs text-muted-foreground">Blocked</p>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="requests" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> All Requests ({requests.length})</TabsTrigger>
          <TabsTrigger value="monitoring" className="gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" /> Post-Launch Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(lrStatusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="meta">Meta</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Batch actions */}
          {isAdmin && selectedIds.size > 0 && (
            <Card className="mb-4 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
                  <Button size="sm" className="gap-1.5" onClick={batchApprove} disabled={batchProcessing}>
                    {batchProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve All
                  </Button>
                  <div className="flex items-center gap-2">
                    <Input value={batchRejectionReason} onChange={e => setBatchRejectionReason(e.target.value)} placeholder="Rejection reason..." className="h-8 w-48 text-xs" maxLength={300} />
                    <Button size="sm" variant="destructive" className="gap-1.5" onClick={batchReject} disabled={batchProcessing || !batchRejectionReason.trim()}>
                      <Ban className="h-3.5 w-3.5" /> Reject All
                    </Button>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isAdmin && pendingCount > 0 && selectedIds.size === 0 && (
            <div className="mb-3">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={selectAllPending}>
                Select all {pendingCount} pending
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-16 text-center">
              <Rocket className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Launch Requests</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">Submit a campaign draft for review to create a launch request.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(r => {
                const sc = lrStatusConfig[r.status] || lrStatusConfig.pending_approval;
                const ec = execStatusConfig[r.execution_status] || execStatusConfig.not_started;
                return (
                  <Card key={r.id} className="hover:border-primary/20 transition-colors">
                    <CardContent className="p-4 flex items-center gap-3">
                      {isAdmin && r.status === 'pending_approval' && (
                        <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} onClick={e => e.stopPropagation()} />
                      )}
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelected(r)}>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-sm text-foreground">Launch #{r.id.slice(0, 8)}</span>
                          <Badge variant="outline" className={`gap-1 text-[10px] ${sc.color}`}>{sc.icon} {sc.label}</Badge>
                          <Badge variant="outline" className={`text-[10px] ${ec.color}`}>{ec.label}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{r.platform}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{clientName(r.client_id)}</span>
                          <span>·</span>
                          <span>{new Date(r.created_at).toLocaleString()}</span>
                          {r.external_campaign_id && <><span>·</span><span className="text-emerald-400 font-mono">#{r.external_campaign_id}</span></>}
                        </div>
                        {r.error_message && <p className="mt-1 text-xs text-destructive truncate">{r.error_message}</p>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Post-Launch Monitoring Tab */}
        <TabsContent value="monitoring">
          <PostLaunchMonitor requests={requests} clientName={clientName} clients={clients} onSelect={setSelected} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Post-Launch Monitor ──

function PostLaunchMonitor({ requests, clientName, clients, onSelect }: {
  requests: LaunchRequest[]; clientName: (id: string) => string; clients: Client[];
  onSelect: (r: LaunchRequest) => void;
}) {
  const launched = requests.filter(r => r.status === 'completed');
  const partial = requests.filter(r => r.execution_status === 'execution_partial');
  const failed = requests.filter(r => r.status === 'failed');
  const blocked = requests.filter(r => r.execution_status === 'execution_blocked');
  const staleReview = requests.filter(r => r.status === 'pending_approval' && new Date(r.created_at) < new Date(Date.now() - 48 * 60 * 60 * 1000));
  const approvedStale = requests.filter(r => r.status === 'approved' && r.execution_status === 'not_started' && new Date(r.approved_at || r.created_at) < new Date(Date.now() - 24 * 60 * 60 * 1000));

  const missingAssets = blocked.filter(r => r.error_message?.includes('page_id') || r.error_message?.includes('token') || r.error_message?.includes('account'));

  return (
    <div className="space-y-6">
      {/* Health summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{launched.length}</p>
          <p className="text-xs text-muted-foreground">Successfully Launched</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{partial.length}</p>
          <p className="text-xs text-muted-foreground">Partial (need attention)</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-destructive">{failed.length + blocked.length}</p>
          <p className="text-xs text-muted-foreground">Failed / Blocked</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{staleReview.length + approvedStale.length}</p>
          <p className="text-xs text-muted-foreground">Stale (48h+ / 24h+)</p>
        </CardContent></Card>
      </div>

      {/* Alerts */}
      {(staleReview.length > 0 || approvedStale.length > 0 || missingAssets.length > 0) && (
        <Card className="border-amber-400/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-400" /> Attention Required</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {staleReview.length > 0 && <p className="text-xs text-muted-foreground">{staleReview.length} request(s) pending review for 48+ hours</p>}
            {approvedStale.length > 0 && <p className="text-xs text-muted-foreground">{approvedStale.length} approved request(s) not executed for 24+ hours</p>}
            {missingAssets.length > 0 && <p className="text-xs text-muted-foreground">{missingAssets.length} execution(s) blocked by missing page/account/token</p>}
          </CardContent>
        </Card>
      )}

      {/* Launched campaigns list */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Launched Campaigns</CardTitle></CardHeader>
        <CardContent>
          {launched.length === 0 ? (
            <div className="py-8 text-center">
              <Rocket className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No campaigns launched yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {launched.slice(0, 20).map(r => {
                const adsetCount = r.external_ids?.adsets ? Object.keys(r.external_ids.adsets).length : 0;
                const adCount = r.external_ids?.ads ? Object.keys(r.external_ids.ads).length : 0;
                const isPartial = r.execution_status === 'execution_partial';
                return (
                  <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer" onClick={() => onSelect(r)}>
                    <div className={`h-2 w-2 rounded-full shrink-0 ${isPartial ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">#{r.id.slice(0, 8)}</span>
                        <span className="text-xs text-muted-foreground">{clientName(r.client_id)}</span>
                        <Badge variant="secondary" className="text-[9px]">{r.platform}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {r.external_campaign_id && <span className="text-emerald-400 font-mono">Campaign: {r.external_campaign_id}</span>}
                        <span>{adsetCount} ad set(s)</span>
                        <span>{adCount} ad(s)</span>
                        {isPartial && <span className="text-amber-400">partial</span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{r.executed_at ? new Date(r.executed_at).toLocaleDateString() : ''}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign health placeholder */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-muted-foreground" /> Campaign Performance</CardTitle></CardHeader>
        <CardContent className="py-8 text-center">
          <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">Live performance sync is not yet connected</p>
          <p className="text-xs text-muted-foreground mt-1">Launch health and entity status are available in the execution detail view.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Launch Request Detail ──

function LaunchRequestDetail({ lr: initialLr, clientName, isAdmin, clients, onBack }: {
  lr: LaunchRequest; clientName: string; isAdmin: boolean; clients: Client[]; onBack: () => void;
}) {
  const { user } = useAuth();
  const { logGosAction } = useGosAuditLog();
  const [lr, setLr] = useState(initialLr);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [logs, setLogs] = useState<ExecLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('campaign_drafts' as any).select('id, campaign_name, name, objective, platform, validation_status, preview_payload, status, client_id').eq('id', lr.draft_id).single(),
      supabase.from('launch_execution_logs' as any).select('*').eq('launch_request_id', lr.id).order('created_at'),
    ]).then(([dRes, lRes]) => {
      setDraft(dRes.data as any);
      setLogs((lRes.data as any[]) || []);
      setLoading(false);
    });
  }, [lr.id, lr.draft_id]);

  const approve = async () => {
    if (!user) return;
    const { error } = await supabase.from('launch_requests' as any).update({
      status: 'approved', approved_by: user.id, approved_at: new Date().toISOString(),
    }).eq('id', lr.id);
    if (error) { toast.error('Failed to approve'); return; }
    await supabase.from('campaign_drafts' as any).update({ status: 'approved' }).eq('id', lr.draft_id);
    logGosAction('approve', 'launch_request', lr.id, `Launch #${lr.id.slice(0, 8)}`, { clientId: lr.client_id });
    setLr(prev => ({ ...prev, status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() }));
    toast.success('Launch request approved');
  };

  const reject = async () => {
    if (!user || !rejectionReason.trim()) { toast.error('Please provide a rejection reason'); return; }
    const { error } = await supabase.from('launch_requests' as any).update({
      status: 'rejected', rejected_by: user.id, rejected_at: new Date().toISOString(),
      rejection_reason: rejectionReason.trim(),
    }).eq('id', lr.id);
    if (error) { toast.error('Failed to reject'); return; }
    await supabase.from('campaign_drafts' as any).update({ status: 'rejected' }).eq('id', lr.draft_id);
    logGosAction('reject', 'launch_request', lr.id, `Launch #${lr.id.slice(0, 8)}`, { clientId: lr.client_id, metadata: { reason: rejectionReason.trim() } });
    setLr(prev => ({ ...prev, status: 'rejected', rejected_by: user.id, rejection_reason: rejectionReason.trim() }));
    toast.success('Launch request rejected');
  };

  const execute = async () => {
    if (!user) return;
    setExecuting(true);
    logGosAction('execute_start', 'launch_request', lr.id, `Launch #${lr.id.slice(0, 8)}`, { clientId: lr.client_id });
    try {
      const { data, error } = await supabase.functions.invoke('campaign-execute', { body: { launch_request_id: lr.id } });
      if (error) throw new Error(error.message || 'Execution failed');
      if (data?.error) throw new Error(data.error);
      logGosAction('execute_complete', 'launch_request', lr.id, `Launch #${lr.id.slice(0, 8)}`, { clientId: lr.client_id, metadata: { execution_status: data.execution_status } });
      const [lrRes, logRes] = await Promise.all([
        supabase.from('launch_requests' as any).select('*').eq('id', lr.id).single(),
        supabase.from('launch_execution_logs' as any).select('*').eq('launch_request_id', lr.id).order('created_at'),
      ]);
      if (lrRes.data) setLr(lrRes.data as any);
      if (logRes.data) setLogs(logRes.data as any[]);
      toast.success(data.summary || 'Execution completed');
    } catch (e: any) {
      logGosAction('execute_fail', 'launch_request', lr.id, `Launch #${lr.id.slice(0, 8)}`, { clientId: lr.client_id, metadata: { error: e.message } });
      toast.error(e.message);
      const [lrRes, logRes] = await Promise.all([
        supabase.from('launch_requests' as any).select('*').eq('id', lr.id).single(),
        supabase.from('launch_execution_logs' as any).select('*').eq('launch_request_id', lr.id).order('created_at'),
      ]);
      if (lrRes.data) setLr(lrRes.data as any);
      if (logRes.data) setLogs(logRes.data as any[]);
    } finally { setExecuting(false); }
  };

  const [creatingReview, setCreatingReview] = useState(false);

  const createOptimizationReview = async () => {
    if (!user || !draft || creatingReview) return;
    setCreatingReview(true);
    try {
      // Check for existing optimization review for this launch request
      const { data: existing } = await supabase.from('ai_campaign_sessions' as any)
        .select('id')
        .eq('client_id', draft.client_id)
        .eq('session_type', 'optimization_review')
        .filter('metadata->>source_launch_request_id', 'eq', lr.id)
        .limit(1);
      if (existing && existing.length > 0) {
        toast.info('Optimization review already exists for this launch');
        setCreatingReview(false);
        return;
      }

      const meta = lr.metadata || {};
      const metrics = meta.last_sync_metrics;
      const metricsStr = metrics
        ? `Spend: $${metrics.spend}, Impressions: ${metrics.impressions}, Clicks: ${metrics.clicks}, CTR: ${metrics.ctr?.toFixed?.(2) || metrics.ctr}%, CPC: $${metrics.cpc?.toFixed?.(2) || metrics.cpc}, Leads: ${metrics.leads}, Purchases: ${metrics.purchases}`
        : 'No performance data synced yet — metrics unavailable.';
      const campaignStatus = meta.campaign_status || 'unknown';

      const prompt = `Post-launch optimization review for campaign "${draft.campaign_name || draft.name}" (${lr.platform}).
External Campaign ID: ${lr.external_campaign_id || 'N/A'}
Execution status: ${lr.execution_status}
Platform campaign status: ${campaignStatus}
Ad sets created: ${lr.external_ids?.adsets ? Object.keys(lr.external_ids.adsets).length : 0}
Ads created: ${lr.external_ids?.ads ? Object.keys(lr.external_ids.ads).length : 0}

Performance metrics (last 7 days):
${metricsStr}

Analyze the campaign performance, identify optimization opportunities, and recommend specific next actions. Consider budget adjustments, targeting changes, creative improvements, and structural modifications.`;

      const { data: sess, error } = await supabase.from('ai_campaign_sessions' as any).insert({
        client_id: draft.client_id,
        title: `Post-Launch Review: ${draft.campaign_name || draft.name}`,
        created_by: user.id,
        session_type: 'optimization_review',
        metadata: {
          source_launch_request_id: lr.id,
          external_campaign_id: lr.external_campaign_id,
          external_ids: lr.external_ids,
          platform: lr.platform,
          performance_metrics: metrics || null,
          campaign_status: campaignStatus,
        },
      }).select().single();
      if (error) throw error;
      const sessionId = (sess as any).id;

      await supabase.from('ai_analysis_runs' as any).insert({
        session_id: sessionId,
        client_id: draft.client_id,
        created_by: user.id,
        prompt,
        analysis_type: 'optimization_review',
        status: 'queued',
      });
      logGosAction('create_optimization_review', 'launch_request', lr.id, `Optimization review for #${lr.id.slice(0, 8)}`, { clientId: draft.client_id, metadata: { sessionId, hasMetrics: !!metrics } });
      toast.success('Optimization review session created — go to AI Analysis to run it');
    } catch (e: any) { toast.error(e.message); } finally { setCreatingReview(false); }
  };

  const sc = lrStatusConfig[lr.status] || lrStatusConfig.pending_approval;
  const ec = execStatusConfig[lr.execution_status] || execStatusConfig.not_started;

  // Entity summary from external_ids
  const extCampaign = lr.external_ids?.campaign;
  const extAdsets = lr.external_ids?.adsets ? Object.entries(lr.external_ids.adsets) : [];
  const extAds = lr.external_ids?.ads ? Object.entries(lr.external_ids.ads) : [];
  const blockedSteps = logs.filter(l => l.status === 'blocked');
  const failedSteps = logs.filter(l => l.status === 'failed');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg text-foreground">Launch #{lr.id.slice(0, 8)}</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{clientName}</span><span>·</span><span>{lr.platform}</span>
            <span>·</span><span>Requested {new Date(lr.created_at).toLocaleString()}</span>
          </div>
        </div>
        <Badge variant="outline" className={`gap-1 ${sc.color}`}>{sc.icon} {sc.label}</Badge>
        <Badge variant="outline" className={`text-[10px] ${ec.color}`}>{ec.label}</Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="entities" className="gap-1.5 text-xs"><Zap className="h-3.5 w-3.5" /> Entities ({extAdsets.length + extAds.length + (extCampaign ? 1 : 0)})</TabsTrigger>
            <TabsTrigger value="payload" className="gap-1.5 text-xs"><Eye className="h-3.5 w-3.5" /> Payload</TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5 text-xs"><Activity className="h-3.5 w-3.5" /> Logs ({logs.length})</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><Label className="text-xs text-muted-foreground">Draft</Label><p className="font-medium text-foreground">{draft?.campaign_name || draft?.name || lr.draft_id.slice(0, 8)}</p></div>
                    <div><Label className="text-xs text-muted-foreground">Platform</Label><p className="font-medium text-foreground capitalize">{lr.platform}</p></div>
                    <div><Label className="text-xs text-muted-foreground">Objective</Label><p className="font-medium text-foreground capitalize">{draft?.objective || '—'}</p></div>
                    <div><Label className="text-xs text-muted-foreground">Validation</Label><p className={`font-medium ${draft?.validation_status === 'valid' ? 'text-emerald-400' : draft?.validation_status === 'invalid' ? 'text-destructive' : 'text-muted-foreground'}`}>{draft?.validation_status || 'unknown'}</p></div>
                    {lr.external_campaign_id && <div className="col-span-2"><Label className="text-xs text-muted-foreground">External Campaign ID</Label><p className="font-medium text-emerald-400 font-mono text-xs">{lr.external_campaign_id}</p></div>}
                    {lr.error_message && <div className="col-span-2"><Label className="text-xs text-muted-foreground">Error</Label><p className="text-sm text-destructive">{lr.error_message}</p></div>}
                    {lr.rejection_reason && <div className="col-span-2"><Label className="text-xs text-muted-foreground">Rejection Reason</Label><p className="text-sm text-destructive">{lr.rejection_reason}</p></div>}
                  </div>
                  {lr.notes && <div><Label className="text-xs text-muted-foreground">Notes</Label><p className="text-sm text-foreground">{lr.notes}</p></div>}
                </CardContent>
              </Card>

              {/* Quick error summary */}
              {(blockedSteps.length > 0 || failedSteps.length > 0) && (
                <Card className="border-destructive/20">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Execution Issues</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    {blockedSteps.map(s => <p key={s.id} className="text-xs text-amber-400">⚠ {s.message}</p>)}
                    {failedSteps.map(s => <p key={s.id} className="text-xs text-destructive">✗ {s.message}</p>)}
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              {isAdmin && lr.status === 'pending_approval' && (
                <Card className="border-amber-400/20">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-400" /> Review Required</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Button size="sm" className="gap-1.5" onClick={approve}><CheckCircle2 className="h-3.5 w-3.5" /> Approve</Button>
                      <Button size="sm" variant="destructive" className="gap-1.5" onClick={reject}><Ban className="h-3.5 w-3.5" /> Reject</Button>
                    </div>
                    <div>
                      <Label className="text-xs">Rejection reason (required for reject)</Label>
                      <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={2} placeholder="Explain why..." maxLength={500} className="text-sm" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {isAdmin && lr.status === 'approved' && lr.execution_status === 'not_started' && (
                <Card className="border-emerald-400/20">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Play className="h-4 w-4 text-emerald-400" /> Ready to Execute</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">All entities will be created in PAUSED state.</p>
                    <Button size="sm" className="gap-1.5" onClick={execute} disabled={executing}>
                      {executing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                      {executing ? 'Executing...' : 'Execute Campaign'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Optimization review */}
              {lr.status === 'completed' && lr.external_campaign_id && (
                <Card className="border-blue-400/20">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><RefreshCw className="h-4 w-4 text-blue-400" /> Post-Launch Actions</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">Create an AI-powered optimization review session for this launched campaign.</p>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={createOptimizationReview} disabled={creatingReview}>
                      {creatingReview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />} Create Optimization Review
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Entities */}
          <TabsContent value="entities">
            <div className="space-y-3">
              {!extCampaign && !extAdsets.length && !extAds.length ? (
                <Card><CardContent className="py-12 text-center">
                  <Zap className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No external entities created yet.</p>
                </CardContent></Card>
              ) : (
                <>
                  {extCampaign && (
                    <Card>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-foreground">Campaign</p>
                          <p className="text-xs font-mono text-emerald-400">{extCampaign}</p>
                        </div>
                        <Badge variant="secondary" className="text-[9px]">PAUSED</Badge>
                      </CardContent>
                    </Card>
                  )}
                  {extAdsets.map(([localId, extId]) => (
                    <Card key={localId}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-foreground">Ad Set</p>
                          <p className="text-xs font-mono text-blue-400">{String(extId)}</p>
                        </div>
                        <Badge variant="secondary" className="text-[9px]">PAUSED</Badge>
                      </CardContent>
                    </Card>
                  ))}
                  {extAds.map(([localId, extId]) => (
                    <Card key={localId}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-violet-400 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-foreground">Ad</p>
                          <p className="text-xs font-mono text-violet-400">{String(extId)}</p>
                        </div>
                        <Badge variant="secondary" className="text-[9px]">PAUSED</Badge>
                      </CardContent>
                    </Card>
                  ))}
                  {blockedSteps.length > 0 && (
                    <Card className="border-amber-400/20">
                      <CardHeader className="pb-2"><CardTitle className="text-xs text-amber-400">Blocked Steps</CardTitle></CardHeader>
                      <CardContent className="space-y-1">
                        {blockedSteps.map(s => (
                          <div key={s.id} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                            <p className="text-xs text-muted-foreground">{s.message}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* Payload */}
          <TabsContent value="payload">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Normalized Payload Snapshot</CardTitle>
                {lr.normalized_payload && Object.keys(lr.normalized_payload).length > 0 && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => { navigator.clipboard.writeText(JSON.stringify(lr.normalized_payload, null, 2)); toast.success('Copied'); }}>
                    <Copy className="h-3 w-3" /> Copy
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {lr.normalized_payload && Object.keys(lr.normalized_payload).length > 0 ? (
                  <pre className="text-xs font-mono text-foreground whitespace-pre-wrap overflow-auto max-h-[600px] bg-muted/30 rounded-lg p-4">
                    {JSON.stringify(lr.normalized_payload, null, 2)}
                  </pre>
                ) : (
                  <div className="py-8 text-center">
                    <Eye className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">No payload snapshot available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs */}
          <TabsContent value="logs">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <Card><CardContent className="py-12 text-center">
                  <Activity className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No execution logs yet.</p>
                </CardContent></Card>
              ) : (
                logs.map(log => (
                  <Card key={log.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                          log.status === 'completed' || log.status === 'passed' ? 'bg-emerald-400' :
                          log.status === 'failed' ? 'bg-destructive' :
                          log.status === 'blocked' || log.status === 'partial' ? 'bg-amber-400' :
                          'bg-blue-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold ${stepStatusColors[log.status] || 'text-foreground'}`}>{log.step}</span>
                            <Badge variant="secondary" className="text-[9px]">{log.entity_level}</Badge>
                            <Badge variant="outline" className={`text-[9px] ${stepStatusColors[log.status] || ''}`}>{log.status}</Badge>
                            {log.external_entity_id && <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-400/30 font-mono">{log.external_entity_id}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{log.message}</p>
                          {log.error_detail && <p className="text-xs text-destructive mt-0.5">{log.error_detail}</p>}
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
