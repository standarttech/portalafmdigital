import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Lightbulb, Plus, Loader2, Search, MessageSquare, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGosAuditLog } from '@/hooks/useGosAuditLog';
import { toast } from 'sonner';

interface Thread {
  id: string;
  title: string;
  status: string;
  tags: string[];
  client_id: string;
  created_at: string;
  updated_at: string;
  _messageCount?: number;
}

interface Client { id: string; name: string; }

const statusColors: Record<string, string> = {
  open: 'text-blue-400 border-blue-400/30',
  validated: 'text-[hsl(var(--success))] border-[hsl(var(--success))]/30',
  rejected: 'text-destructive border-destructive/30',
  converted: 'text-[hsl(270,70%,60%)] border-[hsl(270,70%,50%)]/30',
};

export default function AiAdsHypothesesPage() {
  const { user } = useAuth();
  const { logGosAction } = useGosAuditLog();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newClientId, setNewClientId] = useState('');

  const load = async () => {
    const [tRes, cRes] = await Promise.all([
      supabase.from('hypothesis_threads' as any).select('*').order('updated_at', { ascending: false }).limit(100),
      supabase.from('clients').select('id, name').order('name'),
    ]);
    setThreads((tRes.data as any[]) || []);
    setClients(cRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createThread = async () => {
    if (!user || !newTitle.trim() || !newClientId) return;
    const { data, error } = await supabase.from('hypothesis_threads' as any).insert({
      title: newTitle.trim(),
      client_id: newClientId,
      created_by: user.id,
    }).select().single();
    if (error) { toast.error('Failed to create thread'); return; }
    logGosAction('create', 'hypothesis_thread', (data as any).id, newTitle.trim(), { clientId: newClientId });
    setThreads(prev => [data as any, ...prev]);
    setDialogOpen(false);
    setNewTitle('');
    toast.success('Hypothesis thread created');
  };

  const filtered = threads.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-amber-400" />
            Hypotheses
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Brainstorm and validate optimization strategies</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Hypothesis</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Hypothesis Thread</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Title</Label>
                <Input placeholder="e.g. Testing lookalike audiences for Q2" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              </div>
              <div>
                <Label>Client</Label>
                <Select value={newClientId} onValueChange={setNewClientId}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createThread} disabled={!newTitle.trim() || !newClientId} className="w-full">Create Thread</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search threads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="validated">Validated</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Hypotheses Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Start a hypothesis thread to brainstorm campaign strategies, discuss audience targeting ideas, or explore creative approaches with your team.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <Card key={t.id} className="hover:border-primary/20 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <Lightbulb className="h-5 w-5 text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground truncate">{t.title}</p>
                    <Badge variant="outline" className={`text-[10px] ${statusColors[t.status] || ''}`}>{t.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{clientName(t.client_id)}</span>
                    <span>·</span>
                    <span>{new Date(t.updated_at).toLocaleDateString()}</span>
                    {t.tags.length > 0 && t.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[9px]">{tag}</Badge>
                    ))}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
