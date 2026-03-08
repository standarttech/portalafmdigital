import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListTodo, Loader2, Clock, CheckCircle2, XCircle, ArrowRight, RotateCcw, Search } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Task {
  id: string; task_type: string; client_id: string | null; requested_by: string;
  source_module: string; source_entity_type: string | null; status: string;
  attempt_count: number; started_at: string | null; completed_at: string | null;
  failed_at: string | null; error_message: string | null; created_at: string;
  output_payload: any; metadata: any;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  queued: { icon: <Clock className="h-3 w-3" />, color: 'text-muted-foreground border-muted-foreground/30' },
  routing: { icon: <ArrowRight className="h-3 w-3" />, color: 'text-blue-400 border-blue-400/30' },
  running: { icon: <Loader2 className="h-3 w-3 animate-spin" />, color: 'text-blue-400 border-blue-400/30' },
  completed: { icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-emerald-400 border-emerald-400/30' },
  failed: { icon: <XCircle className="h-3 w-3" />, color: 'text-destructive border-destructive/30' },
  fallback_running: { icon: <RotateCcw className="h-3 w-3 animate-spin" />, color: 'text-amber-400 border-amber-400/30' },
  cancelled: { icon: <XCircle className="h-3 w-3" />, color: 'text-muted-foreground border-muted-foreground/30' },
};

export default function AiInfraTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    const { data } = await supabase.from('ai_tasks' as any).select('*').order('created_at', { ascending: false }).limit(200);
    setTasks((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tasks.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search && !t.task_type.includes(search) && !t.source_module.includes(search)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <ListTodo className="h-6 w-6 text-[hsl(200,70%,55%)]" /> AI Tasks
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Task queue and execution journal</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="fallback_running">Fallback</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); load(); }}>Refresh</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Tasks</h3>
          <p className="text-sm text-muted-foreground">Tasks will appear here when AI analysis or other AI operations run through the router.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => {
            const sc = statusConfig[t.status] || statusConfig.queued;
            return (
              <Card key={t.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-muted/50 ${sc.color}`}>
                    {sc.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm font-semibold text-foreground">{t.task_type}</code>
                      <Badge variant="outline" className={`text-[10px] gap-1 ${sc.color}`}>{sc.icon} {t.status}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{t.source_module}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{new Date(t.created_at).toLocaleString()}</span>
                      <span>· Attempts: {t.attempt_count}</span>
                      {t.error_message && <span className="text-destructive truncate max-w-[200px]">· {t.error_message}</span>}
                    </div>
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
