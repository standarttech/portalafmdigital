import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Rocket, Loader2, Search, Clock, CheckCircle2, XCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LaunchRequest {
  id: string;
  draft_id: string;
  client_id: string;
  requested_by: string;
  status: string;
  priority: string;
  notes: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface Client { id: string; name: string; }

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending_approval: { icon: <Clock className="h-3 w-3" />, color: 'text-amber-400 border-amber-400/30 bg-amber-400/10', label: 'Pending Approval' },
  approved: { icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-[hsl(var(--success))] border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10', label: 'Approved' },
  rejected: { icon: <XCircle className="h-3 w-3" />, color: 'text-destructive border-destructive/30 bg-destructive/10', label: 'Rejected' },
  executing: { icon: <Loader2 className="h-3 w-3 animate-spin" />, color: 'text-blue-400 border-blue-400/30 bg-blue-400/10', label: 'Executing' },
  completed: { icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-[hsl(270,70%,60%)] border-[hsl(270,70%,50%)]/30 bg-[hsl(270,70%,50%)]/10', label: 'Completed' },
  failed: { icon: <AlertTriangle className="h-3 w-3" />, color: 'text-destructive border-destructive/30 bg-destructive/10', label: 'Failed' },
};

const priorityColors: Record<string, string> = {
  low: 'text-muted-foreground',
  normal: 'text-blue-400',
  high: 'text-amber-400',
  urgent: 'text-destructive',
};

export default function AiAdsExecutionsPage() {
  const [requests, setRequests] = useState<LaunchRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    Promise.all([
      supabase.from('launch_requests' as any).select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('clients').select('id, name').order('name'),
    ]).then(([lRes, cRes]) => {
      setRequests((lRes.data as any[]) || []);
      setClients(cRes.data || []);
      setLoading(false);
    });
  }, []);

  const filtered = requests.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.notes?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Rocket className="h-6 w-6 text-rose-400" />
            Executions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Campaign launch requests and execution monitoring</p>
        </div>
      </div>

      {/* Safety notice */}
      <Card className="border-amber-400/20 bg-amber-400/5">
        <CardContent className="p-4 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Guarded Execution Model</p>
            <p className="text-xs text-muted-foreground">Every campaign launch requires admin approval. No campaigns are published without explicit review.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="executing">Executing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Rocket className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Launch Requests</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Launch requests are created when a campaign draft is submitted for approval. Complete the draft → review → approve workflow to see executions here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const sc = statusConfig[r.status] || statusConfig.pending_approval;
            return (
              <Card key={r.id} className="hover:border-primary/20 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${sc.color}`}>
                    {sc.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">Launch #{r.id.slice(0, 8)}</span>
                      <Badge variant="outline" className={`gap-1 text-[10px] ${sc.color}`}>{sc.label}</Badge>
                      <Badge variant="secondary" className={`text-[10px] ${priorityColors[r.priority]}`}>{r.priority}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Client: {clientName(r.client_id)}</span>
                      <span>·</span>
                      <span>Requested: {new Date(r.created_at).toLocaleString()}</span>
                      {r.approved_at && <><span>·</span><span>Approved: {new Date(r.approved_at).toLocaleString()}</span></>}
                    </div>
                    {r.rejection_reason && (
                      <p className="mt-1 text-xs text-destructive">Reason: {r.rejection_reason}</p>
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
