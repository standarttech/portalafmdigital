import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollText, Loader2, Search, Info, AlertTriangle, XCircle } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Log {
  id: string; task_id: string; step_type: string; message: string; level: string;
  provider_id: string | null; created_at: string;
}

const levelIcons: Record<string, React.ReactNode> = {
  info: <Info className="h-3 w-3 text-blue-400" />,
  warn: <AlertTriangle className="h-3 w-3 text-amber-400" />,
  error: <XCircle className="h-3 w-3 text-destructive" />,
};

export default function AiInfraLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  const load = useCallback(async () => {
    const { data } = await supabase.from('ai_task_logs').select('*').order('created_at', { ascending: false }).limit(500);
    setLogs((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = logs.filter(l => {
    if (levelFilter !== 'all' && l.level !== levelFilter) return false;
    if (search && !l.message.toLowerCase().includes(search.toLowerCase()) && !l.step_type.includes(search)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-[hsl(200,70%,55%)]" /> AI Task Logs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Step-by-step execution logs across all AI tasks</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); load(); }}>Refresh</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <ScrollText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Logs</h3>
          <p className="text-sm text-muted-foreground">Logs will appear here when AI tasks are executed through the router.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-1">
          {filtered.map(l => (
            <div key={l.id} className="flex items-start gap-3 px-4 py-2 rounded-md hover:bg-muted/30 text-sm">
              <span className="mt-0.5">{levelIcons[l.level] || levelIcons.info}</span>
              <span className="text-xs text-muted-foreground w-40 flex-shrink-0 font-mono">{new Date(l.created_at).toLocaleString()}</span>
              <Badge variant="outline" className="text-[10px] flex-shrink-0">{l.step_type}</Badge>
              <span className="text-foreground flex-1">{l.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
