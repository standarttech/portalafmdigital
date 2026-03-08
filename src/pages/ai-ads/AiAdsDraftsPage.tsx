import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileStack, Plus, Loader2, Search, Rocket, Clock, CheckCircle2, XCircle, Edit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Draft {
  id: string;
  name: string;
  draft_type: string;
  status: string;
  platform: string;
  client_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  notes: string;
}

interface Client { id: string; name: string; }

const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  draft: { icon: <Edit className="h-3 w-3" />, color: 'text-muted-foreground border-muted-foreground/30' },
  ready: { icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-blue-400 border-blue-400/30' },
  submitted: { icon: <Rocket className="h-3 w-3" />, color: 'text-amber-400 border-amber-400/30' },
  approved: { icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-[hsl(var(--success))] border-[hsl(var(--success))]/30' },
  rejected: { icon: <XCircle className="h-3 w-3" />, color: 'text-destructive border-destructive/30' },
  launched: { icon: <Rocket className="h-3 w-3" />, color: 'text-[hsl(270,70%,60%)] border-[hsl(270,70%,50%)]/30' },
};

export default function AiAdsDraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    Promise.all([
      supabase.from('campaign_drafts' as any).select('*').order('updated_at', { ascending: false }).limit(100),
      supabase.from('clients').select('id, name').order('name'),
    ]).then(([dRes, cRes]) => {
      setDrafts((dRes.data as any[]) || []);
      setClients(cRes.data || []);
      setLoading(false);
    });
  }, []);

  const filtered = drafts.filter(d => {
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <FileStack className="h-6 w-6 text-emerald-400" />
            Campaign Drafts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Build, review, and prepare campaigns for launch</p>
        </div>
        <Button size="sm" disabled className="gap-2">
          <Plus className="h-4 w-4" />
          New Draft
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search drafts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="launched">Launched</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileStack className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Campaign Drafts</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Campaign drafts are created from AI recommendations or hypothesis threads.
              Start an AI analysis session to generate your first campaign draft.
            </p>
            {/* Workflow hint */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">AI Analysis</Badge>
              <span>→</span>
              <Badge variant="secondary">Recommendation</Badge>
              <span>→</span>
              <Badge variant="secondary">Draft</Badge>
              <span>→</span>
              <Badge variant="secondary">Approval</Badge>
              <span>→</span>
              <Badge variant="secondary">Launch</Badge>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => {
            const sc = statusConfig[d.status] || statusConfig.draft;
            return (
              <Card key={d.id} className="hover:border-primary/20 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold truncate">{d.name}</CardTitle>
                    <Badge variant="outline" className={`gap-1 ${sc.color}`}>
                      {sc.icon} {d.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client</span>
                    <span className="text-foreground">{clientName(d.client_id)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform</span>
                    <Badge variant="secondary" className="text-[10px]">{d.platform}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="text-foreground capitalize">{d.draft_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Updated</span>
                    <span className="text-foreground">{new Date(d.updated_at).toLocaleString()}</span>
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
