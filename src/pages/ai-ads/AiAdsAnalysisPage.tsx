import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrainCircuit, Plus, Loader2, Clock, CheckCircle2, XCircle, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Session {
  id: string;
  title: string;
  status: string;
  session_type: string;
  created_at: string;
  client_id: string;
  metadata: any;
}

interface Client {
  id: string;
  name: string;
}

const statusIcon: Record<string, React.ReactNode> = {
  active: <Clock className="h-3 w-3" />,
  completed: <CheckCircle2 className="h-3 w-3" />,
  failed: <XCircle className="h-3 w-3" />,
};

const statusColor: Record<string, string> = {
  active: 'text-blue-400 border-blue-400/30',
  completed: 'text-[hsl(var(--success))] border-[hsl(var(--success))]/30',
  failed: 'text-destructive border-destructive/30',
};

export default function AiAdsAnalysisPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('ai_campaign_sessions' as any).select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('clients').select('id, name').order('name'),
    ]).then(([sessRes, cliRes]) => {
      setSessions((sessRes.data as any[]) || []);
      setClients(cliRes.data || []);
      setLoading(false);
    });
  }, []);

  const createSession = async () => {
    if (!user || clients.length === 0) return;
    const clientId = selectedClient !== 'all' ? selectedClient : clients[0]?.id;
    if (!clientId) return;
    const { data, error } = await supabase.from('ai_campaign_sessions' as any).insert({
      client_id: clientId,
      title: `Analysis ${new Date().toLocaleDateString()}`,
      created_by: user.id,
      session_type: 'analysis',
    }).select().single();
    if (error) { toast.error('Failed to create session'); return; }
    setSessions(prev => [data as any, ...prev]);
    toast.success('Analysis session created');
  };

  const filtered = sessions.filter(s => {
    if (selectedClient !== 'all' && s.client_id !== selectedClient) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
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
          <p className="text-sm text-muted-foreground mt-1">AI-powered campaign analysis sessions</p>
        </div>
        <Button size="sm" onClick={createSession} className="gap-2" disabled={clients.length === 0}>
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search sessions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BrainCircuit className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Analysis Sessions</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Create your first AI analysis session to get campaign insights, performance analysis, and optimization recommendations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <Card key={s.id} className="hover:border-primary/20 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold truncate">{s.title}</CardTitle>
                  <Badge variant="outline" className={`gap-1 ${statusColor[s.status] || 'text-muted-foreground'}`}>
                    {statusIcon[s.status]} {s.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span className="text-foreground">{clientName(s.client_id)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="secondary" className="text-[10px]">{s.session_type}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-foreground">{new Date(s.created_at).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
