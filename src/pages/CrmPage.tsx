import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Settings, Search, Webhook, LayoutGrid, Filter, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import CrmKanbanBoard from '@/components/crm/CrmKanbanBoard';
import CrmLeadDetailPanel from '@/components/crm/CrmLeadDetailPanel';
import CrmCreateLeadDialog from '@/components/crm/CrmCreateLeadDialog';
import CrmPipelineSettings from '@/components/crm/CrmPipelineSettings';
import CrmWebhookSettings from '@/components/crm/CrmWebhookSettings';
import {
  useCrmPipelines, useCrmStages, useCrmLeads,
  useCrmWebhookEndpoints, useCrmWebhookLogs,
  type CrmLead, type CrmPipeline,
} from '@/hooks/useCrmData';

export default function CrmPage() {
  const { user, agencyRole } = useAuth();
  const isAdmin = agencyRole === 'AgencyAdmin';

  // Clients
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);

  // Agency users for assignee
  const [agencyUsers, setAgencyUsers] = useState<{ user_id: string; display_name: string | null }[]>([]);

  useEffect(() => {
    (async () => {
      setLoadingClients(true);
      const { data } = await supabase.from('clients').select('id, name').eq('status', 'active').order('name');
      if (data) {
        setClients(data);
        if (data.length > 0 && !selectedClientId) setSelectedClientId(data[0].id);
      }
      setLoadingClients(false);
    })();
    (async () => {
      const { data } = await supabase.from('agency_users').select('user_id, display_name');
      if (data) setAgencyUsers(data);
    })();
  }, []);

  // Pipelines
  const { pipelines, loading: loadingPipelines, createPipeline, refetch: refetchPipelines } = useCrmPipelines(selectedClientId);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

  useEffect(() => {
    if (pipelines.length > 0 && !pipelines.find(p => p.id === selectedPipelineId)) {
      setSelectedPipelineId(pipelines[0].id);
    } else if (pipelines.length === 0) {
      setSelectedPipelineId(null);
    }
  }, [pipelines]);

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId) || null;

  // Stages & Leads
  const { stages, loading: loadingStages, createStage, updateStage, deleteStage, refetch: refetchStages } = useCrmStages(selectedPipelineId);
  const { leads, loading: loadingLeads, createLead, updateLead, moveLeadToStage, deleteLead, refetch: refetchLeads } = useCrmLeads(selectedPipelineId, selectedClientId);

  // Webhooks
  const { endpoints, createEndpoint, updateEndpoint } = useCrmWebhookEndpoints(selectedClientId);
  const [selectedWebhookEndpointId, setSelectedWebhookEndpointId] = useState<string | null>(null);
  const { logs: webhookLogs } = useCrmWebhookLogs(selectedWebhookEndpointId);

  // UI state
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState<string>('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [showPipelineSettings, setShowPipelineSettings] = useState(false);
  const [showWebhookSettings, setShowWebhookSettings] = useState(false);
  const [showCreatePipeline, setShowCreatePipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter leads
  const filteredLeads = useMemo(() => {
    let result = leads;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.full_name.toLowerCase().includes(q) ||
        l.first_name.toLowerCase().includes(q) ||
        l.last_name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q)
      );
    }
    if (filterSource) result = result.filter(l => l.source === filterSource);
    if (filterAssignee) result = result.filter(l => l.assignee_id === filterAssignee);
    if (filterTag) result = result.filter(l => l.tags?.includes(filterTag));
    return result;
  }, [leads, search, filterSource, filterAssignee, filterTag]);

  // Unique values for filters
  const uniqueSources = [...new Set(leads.map(l => l.source).filter(Boolean))];
  const uniqueTags = [...new Set(leads.flatMap(l => l.tags || []))];
  const hasActiveFilters = filterSource || filterAssignee || filterTag;

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) return;
    const result = await createPipeline(newPipelineName.trim());
    if (result) {
      setSelectedPipelineId(result.id);
      setShowCreatePipeline(false);
      setNewPipelineName('');
      setTimeout(() => refetchStages(), 300);
    }
  };

  if (loadingClients) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <LayoutGrid className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">No Clients</h2>
          <p className="text-sm text-muted-foreground">Create clients first to use the CRM.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-foreground mr-2">CRM</h1>
        
        {/* Client selector */}
        <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="Select client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Pipeline selector */}
        {pipelines.length > 0 && (
          <Select value={selectedPipelineId || ''} onValueChange={setSelectedPipelineId}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue placeholder="Select pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 w-[200px] text-sm"
          />
        </div>

        <Button size="sm" variant={showFilters ? 'secondary' : 'ghost'} className="h-9" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-3.5 w-3.5 mr-1" />
          Filters
          {hasActiveFilters && <span className="ml-1 h-2 w-2 rounded-full bg-primary" />}
        </Button>

        {selectedPipelineId && (
          <>
            <Button size="sm" className="h-9" onClick={() => setShowCreateLead(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add Lead
            </Button>
            <Button size="sm" variant="outline" className="h-9" onClick={() => setShowPipelineSettings(true)}>
              <Settings className="h-3.5 w-3.5 mr-1" />Stages
            </Button>
            <Button size="sm" variant="outline" className="h-9" onClick={() => setShowWebhookSettings(true)}>
              <Webhook className="h-3.5 w-3.5 mr-1" />Webhooks
            </Button>
          </>
        )}
        
        <Button size="sm" variant="outline" className="h-9" onClick={() => setShowCreatePipeline(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />Pipeline
        </Button>
      </div>

      {/* Filters bar */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/30">
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Sources</SelectItem>
              {uniqueSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Assignee" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Assignees</SelectItem>
              {agencyUsers.map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.display_name || 'Unknown'}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Tag" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Tags</SelectItem>
              {uniqueTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setFilterSource(''); setFilterAssignee(''); setFilterTag(''); }}>
              <X className="h-3 w-3 mr-1" />Clear
            </Button>
          )}
        </div>
      )}

      {/* Kanban or Empty */}
      {!selectedPipelineId ? (
        <div className="flex items-center justify-center flex-1 min-h-[300px]">
          <div className="text-center space-y-3 max-w-sm">
            <LayoutGrid className="h-16 w-16 text-muted-foreground/20 mx-auto" />
            <h2 className="text-lg font-semibold text-foreground">Create Your First Pipeline</h2>
            <p className="text-sm text-muted-foreground">Pipelines help you organize leads into stages. Start by creating one.</p>
            <Button onClick={() => setShowCreatePipeline(true)}>
              <Plus className="h-4 w-4 mr-2" />Create Pipeline
            </Button>
          </div>
        </div>
      ) : loadingStages || loadingLeads ? (
        <div className="flex gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[400px] w-[280px] flex-shrink-0" />)}
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <CrmKanbanBoard
            stages={stages}
            leads={filteredLeads}
            onMoveLead={moveLeadToStage}
            onLeadClick={setSelectedLead}
            agencyUsers={agencyUsers}
          />
        </div>
      )}

      {/* Dialogs */}
      <CrmLeadDetailPanel
        lead={selectedLead}
        stages={stages}
        agencyUsers={agencyUsers}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdate={async (id, updates) => {
          const ok = await updateLead(id, updates);
          if (ok) setSelectedLead(prev => prev ? { ...prev, ...updates } : null);
          return ok;
        }}
        onDelete={deleteLead}
      />

      {showCreateLead && stages.length > 0 && (
        <CrmCreateLeadDialog
          open={showCreateLead}
          onClose={() => setShowCreateLead(false)}
          stages={stages}
          onCreate={createLead}
        />
      )}

      {showPipelineSettings && (
        <CrmPipelineSettings
          open={showPipelineSettings}
          onClose={() => setShowPipelineSettings(false)}
          stages={stages}
          onCreateStage={createStage}
          onUpdateStage={updateStage}
          onDeleteStage={deleteStage}
        />
      )}

      {showWebhookSettings && (
        <CrmWebhookSettings
          open={showWebhookSettings}
          onClose={() => setShowWebhookSettings(false)}
          endpoints={endpoints.filter(e => e.pipeline_id === selectedPipelineId)}
          logs={webhookLogs}
          stages={stages}
          pipeline={selectedPipeline}
          onCreateEndpoint={createEndpoint}
          onUpdateEndpoint={updateEndpoint}
          selectedEndpointId={selectedWebhookEndpointId}
          onSelectEndpoint={setSelectedWebhookEndpointId}
        />
      )}

      {/* Create Pipeline Dialog */}
      <Dialog open={showCreatePipeline} onOpenChange={setShowCreatePipeline}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create Pipeline</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Pipeline Name</Label>
              <Input
                placeholder="e.g. Main Leads"
                value={newPipelineName}
                onChange={e => setNewPipelineName(e.target.value)}
                className="text-sm h-9 mt-1"
                onKeyDown={e => e.key === 'Enter' && handleCreatePipeline()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCreatePipeline(false)}>Cancel</Button>
              <Button onClick={handleCreatePipeline} disabled={!newPipelineName.trim()}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
