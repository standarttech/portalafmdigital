import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Plus, Search, Play, Copy, Trash2, Clock, CheckCircle2, XCircle, AlertTriangle,
  Facebook, MessageSquare, FileSpreadsheet, Globe, Bell, Users, Workflow, ArrowRight,
  Filter, ToggleLeft, ToggleRight, Zap, Send, Database, GitBranch, Webhook,
  MoreHorizontal, Eye, History,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

/* ── Trigger & Action definitions ── */
const TRIGGER_TYPES = [
  { id: 'fb_lead_form', label: 'Facebook Lead Form', icon: Facebook, color: 'hsl(220,70%,50%)' },
  { id: 'internal_form', label: 'Internal Form', icon: FileSpreadsheet, color: 'hsl(160,70%,40%)' },
  { id: 'gos_form', label: 'GOS Form', icon: Globe, color: 'hsl(270,60%,50%)' },
  { id: 'crm_lead_created', label: 'CRM Lead Created', icon: Database, color: 'hsl(25,60%,50%)' },
  { id: 'crm_lead_updated', label: 'CRM Lead Updated', icon: Database, color: 'hsl(25,60%,50%)' },
  { id: 'crm_external_sync', label: 'External CRM Sync', icon: GitBranch, color: 'hsl(200,70%,50%)' },
  { id: 'webhook', label: 'Webhook', icon: Webhook, color: 'hsl(340,70%,50%)' },
  { id: 'manual', label: 'Manual / Test', icon: Play, color: 'hsl(0,0%,50%)' },
] as const;

const ACTION_TYPES = [
  { id: 'send_telegram', label: 'Send Telegram', icon: Send },
  { id: 'create_crm_lead', label: 'Create CRM Lead', icon: Database },
  { id: 'update_crm_lead', label: 'Update CRM Lead', icon: Database },
  { id: 'add_sheets_row', label: 'Add Google Sheets Row', icon: FileSpreadsheet },
  { id: 'send_webhook', label: 'Send Webhook', icon: Webhook },
  { id: 'send_notification', label: 'Send Notification', icon: Bell },
  { id: 'assign_manager', label: 'Assign Manager', icon: Users },
  { id: 'tag_lead', label: 'Tag Lead', icon: Zap },
  { id: 'update_lead_status', label: 'Update Lead Status', icon: GitBranch },
  { id: 'filter', label: 'Filter / Condition', icon: Filter },
] as const;

const triggerInfo = (type: string) => TRIGGER_TYPES.find(t => t.id === type) || TRIGGER_TYPES[7];

const statusBadge = (status: string | null) => {
  switch (status) {
    case 'completed': return <Badge variant="outline" className="text-green-400 border-green-400/30 bg-green-400/10 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>;
    case 'failed': return <Badge variant="outline" className="text-red-400 border-red-400/30 bg-red-400/10 text-xs"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    case 'partial': return <Badge variant="outline" className="text-amber-400 border-amber-400/30 bg-amber-400/10 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Partial</Badge>;
    default: return <Badge variant="outline" className="text-muted-foreground border-border text-xs">—</Badge>;
  }
};

export default function AutomationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newTrigger, setNewTrigger] = useState('manual');

  // Fetch automations
  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('automations' as any).select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['automation-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('automation_templates' as any).select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch clients for filter
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list-auto'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, name').order('name');
      return data || [];
    },
  });

  // Create automation
  const createMutation = useMutation({
    mutationFn: async (params: { name: string; description: string; client_id: string | null; trigger_type: string; steps_config?: any[] }) => {
      const { data, error } = await supabase.from('automations' as any).insert({
        name: params.name,
        description: params.description,
        client_id: params.client_id || null,
        trigger_type: params.trigger_type,
        created_by: user?.id || '',
      }).select().single();
      if (error) throw error;
      // If steps_config provided (from template), create steps
      if (params.steps_config?.length) {
        const steps = params.steps_config.map((s: any, i: number) => ({
          automation_id: (data as any).id,
          step_order: i,
          step_type: s.step_type || 'action',
          action_type: s.action_type,
          config: s.config || {},
          field_mapping: s.field_mapping || {},
          condition_config: s.condition_config || null,
          name: s.name || '',
        }));
        await supabase.from('automation_steps' as any).insert(steps);
      }
      return data;
    },
    onSuccess: (data: any) => {
      toast.success('Automation created');
      qc.invalidateQueries({ queryKey: ['automations'] });
      navigate(`/automations/${data.id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Toggle active
  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('automations' as any).update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });

  // Duplicate
  const dupMutation = useMutation({
    mutationFn: async (autoId: string) => {
      const source = automations.find((a: any) => a.id === autoId);
      if (!source) throw new Error('Not found');
      const { data, error } = await supabase.from('automations' as any).insert({
        name: source.name + ' (Copy)',
        description: source.description,
        client_id: source.client_id,
        trigger_type: source.trigger_type,
        trigger_config: source.trigger_config,
        created_by: user?.id || '',
      }).select().single();
      if (error) throw error;
      // Copy steps
      const { data: steps } = await supabase.from('automation_steps' as any).select('*').eq('automation_id', autoId).order('step_order');
      if (steps?.length) {
        const newSteps = steps.map((s: any) => ({
          automation_id: (data as any).id,
          step_order: s.step_order,
          step_type: s.step_type,
          action_type: s.action_type,
          config: s.config,
          field_mapping: s.field_mapping,
          condition_config: s.condition_config,
          name: s.name,
        }));
        await supabase.from('automation_steps' as any).insert(newSteps);
      }
      return data;
    },
    onSuccess: () => {
      toast.success('Automation duplicated');
      qc.invalidateQueries({ queryKey: ['automations'] });
    },
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('automations' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Automation deleted');
      qc.invalidateQueries({ queryKey: ['automations'] });
    },
  });

  // Test run
  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const resp = await supabase.functions.invoke('automation-execute', {
        body: { automation_id: id, trigger_payload: { test: true, timestamp: new Date().toISOString() }, test_mode: true },
      });
      if (resp.error) throw resp.error;
      return resp.data;
    },
    onSuccess: (data: any) => {
      toast.success(`Test ${data.status}: ${data.steps_completed}/${data.steps_completed + data.steps_failed} steps`);
      qc.invalidateQueries({ queryKey: ['automations'] });
    },
    onError: (e: any) => toast.error(`Test failed: ${e.message}`),
  });

  // Filter automations
  const filtered = useMemo(() => {
    return automations.filter((a: any) => {
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterClient !== 'all' && a.client_id !== filterClient) return false;
      if (filterStatus === 'active' && !a.is_active) return false;
      if (filterStatus === 'inactive' && a.is_active) return false;
      return true;
    });
  }, [automations, search, filterClient, filterStatus]);

  const handleCreateFromTemplate = (t: any) => {
    createMutation.mutate({
      name: t.name,
      description: t.description,
      client_id: null,
      trigger_type: t.trigger_type,
      steps_config: t.steps_config || [],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Workflow className="h-6 w-6 text-primary" /> Automations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build workflows to connect leads, CRM, Telegram, Google Sheets and more.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Automation
        </Button>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Start Templates</h2>
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-2">
              {templates.map((t: any) => {
                const tri = triggerInfo(t.trigger_type);
                const TriIcon = tri.icon;
                return (
                  <Card key={t.id}
                    className="min-w-[240px] max-w-[260px] cursor-pointer border-border/50 hover:border-primary/40 transition-all group bg-card/50 hover:bg-card"
                    onClick={() => handleCreateFromTemplate(t)}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${tri.color}20` }}>
                          <TriIcon className="h-4 w-4" style={{ color: tri.color }} />
                        </div>
                        <span className="text-sm font-semibold text-foreground truncate">{t.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <ArrowRight className="h-3 w-3" />
                        {(t.steps_config?.length || 0)} steps
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search automations..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-card border-border" />
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[180px] bg-card"><SelectValue placeholder="All clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] bg-card"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-card/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Workflow className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No automations yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Create your first workflow to automate lead processing</p>
            <Button onClick={() => setShowCreate(true)} className="mt-4 gap-2" variant="outline">
              <Plus className="h-4 w-4" /> Create Automation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((auto: any) => {
            const tri = triggerInfo(auto.trigger_type);
            const TriIcon = tri.icon;
            const clientName = clients.find(c => c.id === auto.client_id)?.name;
            return (
              <Card key={auto.id}
                className="border-border/40 bg-card hover:border-border transition-colors cursor-pointer group"
                onClick={() => navigate(`/automations/${auto.id}`)}>
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Icon */}
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${tri.color}15` }}>
                    <TriIcon className="h-5 w-5" style={{ color: tri.color }} />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">{auto.name}</span>
                      {auto.is_active ? (
                        <Badge variant="outline" className="text-green-400 border-green-400/30 bg-green-400/10 text-[10px]">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground border-border text-[10px]">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{tri.label}</span>
                      {clientName && <><span>•</span><span>{clientName}</span></>}
                      <span>•</span>
                      <span>{auto.run_count || 0} runs</span>
                    </div>
                  </div>
                  {/* Last run */}
                  <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                    {statusBadge(auto.last_run_status)}
                    {auto.last_run_at && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(auto.last_run_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => toggleMutation.mutate({ id: auto.id, active: !auto.is_active })}>
                          {auto.is_active ? <ToggleRight className="h-4 w-4 text-green-400" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{auto.is_active ? 'Deactivate' : 'Activate'}</TooltipContent>
                    </Tooltip>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/automations/${auto.id}`)}>
                          <Eye className="h-4 w-4 mr-2" /> Open
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => testMutation.mutate(auto.id)}>
                          <Play className="h-4 w-4 mr-2" /> Test Run
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => dupMutation.mutate(auto.id)}>
                          <Copy className="h-4 w-4 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/automations/${auto.id}?tab=runs`)}>
                          <History className="h-4 w-4 mr-2" /> View Logs
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(auto.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Automation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. FB Leads → CRM + Telegram" className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What does this automation do?" className="mt-1" rows={2} />
            </div>
            <div>
              <Label>Client (optional)</Label>
              <Select value={newClient} onValueChange={setNewClient}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Global (all clients)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trigger</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {TRIGGER_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id}
                      onClick={() => setNewTrigger(t.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-all ${
                        newTrigger === t.id
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border/50 bg-card/50 text-muted-foreground hover:border-border hover:bg-card'
                      }`}>
                      <Icon className="h-4 w-4 flex-shrink-0" style={{ color: t.color }} />
                      <span className="truncate text-xs">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button disabled={!newName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate({
                name: newName.trim(),
                description: newDesc.trim(),
                client_id: newClient && newClient !== 'global' ? newClient : null,
                trigger_type: newTrigger,
              })}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
