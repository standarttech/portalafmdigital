import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lightbulb, Plus, Loader2, Search, MessageSquare, ArrowRight, ArrowLeft, Send, FileStack, User, Bot } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGosAuditLog } from '@/hooks/useGosAuditLog';
import { toast } from 'sonner';

interface Thread {
  id: string; title: string; status: string; tags: string[] | null; client_id: string;
  created_at: string; updated_at: string; recommendation_id: string | null;
  ad_account_id: string | null; metadata: any;
}
interface Message {
  id: string; thread_id: string; role: string; content: string; created_by: string | null;
  created_at: string; metadata: any;
}
interface Client { id: string; name: string; }

const statusColors: Record<string, string> = {
  open: 'text-blue-400 border-blue-400/30',
  testing: 'text-amber-400 border-amber-400/30',
  blocked: 'text-destructive border-destructive/30',
  validated: 'text-[hsl(var(--success))] border-[hsl(var(--success))]/30',
  rejected: 'text-destructive/70 border-destructive/20',
  converted: 'text-[hsl(270,70%,60%)] border-[hsl(270,70%,50%)]/30',
};

const allStatuses = ['open', 'testing', 'blocked', 'validated', 'rejected', 'converted'];

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
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);

  const load = useCallback(async () => {
    const [tRes, cRes] = await Promise.all([
      supabase.from('hypothesis_threads' as any).select('*').order('updated_at', { ascending: false }).limit(100),
      supabase.from('clients').select('id, name').order('name'),
    ]);
    setThreads((tRes.data as any[]) || []);
    setClients(cRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createThread = async () => {
    if (!user || !newTitle.trim() || !newClientId) return;
    const { data, error } = await supabase.from('hypothesis_threads' as any).insert({
      title: newTitle.trim(), client_id: newClientId, created_by: user.id,
    }).select().single();
    if (error) { toast.error('Failed to create thread'); return; }
    const t = data as any;
    logGosAction('create', 'hypothesis_thread', t.id, newTitle.trim(), { clientId: newClientId });
    setThreads(prev => [t, ...prev]);
    setDialogOpen(false);
    setNewTitle('');
    toast.success('Hypothesis thread created');
  };

  const updateThreadStatus = async (threadId: string, newStatus: string) => {
    const { error } = await supabase.from('hypothesis_threads' as any).update({ status: newStatus }).eq('id', threadId);
    if (error) { toast.error('Failed to update status'); return; }
    const thread = threads.find(t => t.id === threadId);
    logGosAction('update', 'hypothesis_thread', threadId, thread?.title || '', { clientId: thread?.client_id, metadata: { status: newStatus } });
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, status: newStatus } : t));
    if (selectedThread?.id === threadId) setSelectedThread(prev => prev ? { ...prev, status: newStatus } : null);
    toast.success(`Status updated to ${newStatus}`);
  };

  const convertToDraft = async (thread: Thread) => {
    if (!user) return;
    const campaignName = `${thread.title.slice(0, 80)}`;
    const { data, error } = await supabase.from('campaign_drafts').insert({
      client_id: thread.client_id, created_by: user.id,
      name: campaignName, campaign_name: campaignName,
      draft_type: 'campaign',
      source_type: 'hypothesis', source_entity_id: thread.id,
      hypothesis_id: thread.id,
      ad_account_id: thread.ad_account_id || null,
      notes: `Created from validated hypothesis: ${thread.title}`,
      metadata: { source: 'hypothesis', hypothesis_id: thread.id },
    }).select().single();
    if (error) { toast.error('Failed to create draft'); return; }
    const draftId = (data as any).id;
    // Create starter ad set + ad
    await supabase.from('campaign_draft_items').insert([
      { draft_id: draftId, item_type: 'adset', name: 'Ad Set 1', sort_order: 0, config: { geo: '', age_min: 18, age_max: 65, gender: 'all', interests: '', placements: 'automatic', daily_budget: 0, optimization_goal: '' } },
    ]);
    const { data: adsetData } = await supabase.from('campaign_draft_items').select('id').eq('draft_id', draftId).eq('item_type', 'adset').limit(1).single();
    if (adsetData) {
      await supabase.from('campaign_draft_items').insert({
        draft_id: draftId, item_type: 'ad', name: 'Ad 1', sort_order: 0,
        parent_item_id: (adsetData as any).id,
        config: { primary_text: '', headline: '', cta: 'LEARN_MORE', destination_url: '', creative_ref: '' },
      });
    }
    await updateThreadStatus(thread.id, 'converted');
    logGosAction('create', 'campaign_draft', draftId, campaignName, { clientId: thread.client_id, metadata: { source: 'hypothesis', hypothesisId: thread.id } });
    toast.success('Campaign draft created with starter structure');
  };

  const filtered = threads.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || 'Unknown';

  if (selectedThread) {
    return (
      <ThreadDetail
        thread={selectedThread}
        clientName={clientName(selectedThread.client_id)}
        onBack={() => setSelectedThread(null)}
        onStatusChange={(s) => updateThreadStatus(selectedThread.id, s)}
        onConvertToDraft={() => convertToDraft(selectedThread)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-amber-400" /> Hypotheses
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
              <div><Label>Title</Label><Input placeholder="e.g. Testing lookalike audiences for Q2" value={newTitle} onChange={e => setNewTitle(e.target.value)} /></div>
              <div>
                <Label>Client</Label>
                <Select value={newClientId} onValueChange={setNewClientId}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
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
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {allStatuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Hypotheses Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Start a hypothesis thread to brainstorm campaign strategies, test audience ideas, or explore creative approaches.
          </p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <Card key={t.id} className="hover:border-primary/20 transition-colors cursor-pointer" onClick={() => setSelectedThread(t)}>
              <CardContent className="p-4 flex items-center gap-4">
                <Lightbulb className="h-5 w-5 text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground truncate">{t.title}</p>
                    <Badge variant="outline" className={`text-[10px] capitalize ${statusColors[t.status] || ''}`}>{t.status}</Badge>
                    {t.recommendation_id && <Badge variant="secondary" className="text-[9px]">from rec</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{clientName(t.client_id)}</span>
                    <span>·</span>
                    <span>{new Date(t.updated_at).toLocaleDateString()}</span>
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

function ThreadDetail({ thread, clientName, onBack, onStatusChange, onConvertToDraft }: {
  thread: Thread; clientName: string; onBack: () => void;
  onStatusChange: (s: string) => void; onConvertToDraft: () => void;
}) {
  const { user } = useAuth();
  const { logGosAction } = useGosAuditLog();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.from('hypothesis_messages' as any).select('*').eq('thread_id', thread.id)
      .order('created_at', { ascending: true }).then(({ data }) => {
        setMessages((data as any[]) || []);
        setLoading(false);
      });
  }, [thread.id]);

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return;
    setSending(true);
    const { data, error } = await supabase.from('hypothesis_messages' as any).insert({
      thread_id: thread.id, role: 'user', content: newMessage.trim(), created_by: user.id,
    }).select().single();
    if (error) { toast.error('Failed to send message'); setSending(false); return; }
    logGosAction('create', 'hypothesis_message', (data as any).id, newMessage.trim().slice(0, 60), { metadata: { threadId: thread.id } });
    setMessages(prev => [...prev, data as any]);
    setNewMessage('');
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div className="flex-1">
          <h2 className="font-semibold text-foreground truncate">{thread.title}</h2>
          <p className="text-xs text-muted-foreground">{clientName} · Created {new Date(thread.created_at).toLocaleDateString()}</p>
        </div>
        <Badge variant="outline" className={`capitalize ${statusColors[thread.status]}`}>{thread.status}</Badge>
      </div>

      {/* Status + actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Set status:</span>
        {allStatuses.filter(s => s !== thread.status).map(s => (
          <Button key={s} variant="outline" size="sm" className="text-xs capitalize h-7" onClick={() => onStatusChange(s)}>{s}</Button>
        ))}
        {thread.status === 'validated' && (
          <Button size="sm" className="gap-1 h-7 text-xs" onClick={onConvertToDraft}>
            <FileStack className="h-3 w-3" /> Convert to Draft
          </Button>
        )}
      </div>

      {/* Messages */}
      <Card className="min-h-[300px] flex flex-col">
        <CardContent className="flex-1 p-4 space-y-3 overflow-auto max-h-[500px]">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No messages yet. Start the discussion.</p>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`flex gap-2 ${m.role === 'assistant' ? '' : 'flex-row-reverse'}`}>
                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${m.role === 'assistant' ? 'bg-violet-500/20 text-violet-400' : 'bg-primary/20 text-primary'}`}>
                  {m.role === 'assistant' ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                </div>
                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${m.role === 'assistant' ? 'bg-muted' : 'bg-primary/10'}`}>
                  <p className="text-foreground whitespace-pre-wrap">{m.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
        <div className="border-t border-border p-3 flex gap-2">
          <Textarea
            placeholder="Add a note or observation..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            rows={2}
            className="flex-1 min-h-[60px]"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <Button onClick={sendMessage} disabled={!newMessage.trim() || sending} size="icon" className="shrink-0 self-end">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
