import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Settings, Search, Webhook, LayoutGrid, Filter, X, Facebook } from 'lucide-react';
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
  const { t } = useLanguage();
  const isAdmin = agencyRole === 'AgencyAdmin';

  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);
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
  const { stages, loading: loadingStages, createStage, updateStage, deleteStage, refetch: refetchStages } = useCrmStages(selectedPipelineId);
  const { leads, loading: loadingLeads, createLead, updateLead, moveLeadToStage, deleteLead, refetch: refetchLeads } = useCrmLeads(selectedPipelineId, selectedClientId);

  const { endpoints, createEndpoint, updateEndpoint } = useCrmWebhookEndpoints(selectedClientId);
  const [selectedWebhookEndpointId, setSelectedWebhookEndpointId] = useState<string | null>(null);
  const { logs: webhookLogs } = useCrmWebhookLogs(selectedWebhookEndpointId);

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

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.full_name.toLowerCase().includes(q) || l.first_name.toLowerCase().includes(q) ||
        l.last_name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) || l.company.toLowerCase().includes(q)
      );
    }
    if (filterSource) result = result.filter(l => l.source === filterSource);
    if (filterAssignee) result = result.filter(l => l.assignee_id === filterAssignee);
    if (filterTag) result = result.filter(l => l.tags?.includes(filterTag));
    return result;
  }, [leads, search, filterSource, filterAssignee, filterTag]);

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
    return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  if (clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <LayoutGrid className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">{t('crm.noClients')}</h2>
          <p className="text-sm text-muted-foreground">{t('crm.noClientsDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Row 1: Title + selects */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-foreground mr-1 sm:mr-2">{t('crm.title')}</h1>
        
        <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-[130px] sm:w-[180px] h-8 sm:h-9 text-xs sm:text-sm"><SelectValue placeholder={t('crm.selectClient')} /></SelectTrigger>
          <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>

        {pipelines.length > 0 && (
          <Select value={selectedPipelineId || ''} onValueChange={setSelectedPipelineId}>
            <SelectTrigger className="w-[130px] sm:w-[180px] h-8 sm:h-9 text-xs sm:text-sm"><SelectValue placeholder={t('crm.selectPipeline')} /></SelectTrigger>
            <SelectContent>{pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      {/* Row 2: Search + action buttons */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <div className="relative flex-1 min-w-[120px] max-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder={t('crm.searchLeads')} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 sm:h-9 w-full text-xs sm:text-sm" />
        </div>

        <Button size="sm" variant={showFilters ? 'secondary' : 'ghost'} className="h-8 sm:h-9 px-2 sm:px-3" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-3.5 w-3.5 sm:mr-1" />
          <span className="hidden sm:inline">{t('crm.filters')}</span>
          {hasActiveFilters && <span className="ml-1 h-2 w-2 rounded-full bg-primary" />}
        </Button>

        <div className="flex-1 hidden sm:block" />

        {selectedPipelineId && (
          <>
            <Button size="sm" className="h-8 sm:h-9 px-2 sm:px-3" onClick={() => setShowCreateLead(true)}>
              <Plus className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">{t('crm.addLead')}</span>
            </Button>
            <Button size="sm" variant="outline" className="h-8 sm:h-9 px-2 sm:px-3" onClick={() => setShowPipelineSettings(true)}>
              <Settings className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">{t('crm.stages')}</span>
            </Button>
            <Button size="sm" variant="outline" className="h-8 sm:h-9 px-2 sm:px-3" onClick={() => setShowWebhookSettings(true)}>
              <Webhook className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">{t('crm.webhooks')}</span>
            </Button>
          </>
        )}
        
        <Button size="sm" variant="outline" className="h-8 sm:h-9 px-2 sm:px-3" onClick={() => setShowCreatePipeline(true)}>
          <Plus className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">{t('crm.pipeline')}</span>
        </Button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/30">
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder={t('crm.allSources')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('crm.allSources')}</SelectItem>
              {uniqueSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder={t('crm.allAssignees')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('crm.allAssignees')}</SelectItem>
              {agencyUsers.map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.display_name || 'Unknown'}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder={t('crm.allTags')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('crm.allTags')}</SelectItem>
              {uniqueTags.map(tg => <SelectItem key={tg} value={tg}>{tg}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setFilterSource(''); setFilterAssignee(''); setFilterTag(''); }}>
              <X className="h-3 w-3 mr-1" />{t('crm.clearFilters')}
            </Button>
          )}
        </div>
      )}

      {!selectedPipelineId ? (
        <div className="flex items-center justify-center flex-1 min-h-[300px]">
          <div className="text-center space-y-3 max-w-sm">
            <LayoutGrid className="h-16 w-16 text-muted-foreground/20 mx-auto" />
            <h2 className="text-lg font-semibold text-foreground">{t('crm.createFirstPipeline')}</h2>
            <p className="text-sm text-muted-foreground">{t('crm.createFirstPipelineDesc')}</p>
            <Button onClick={() => setShowCreatePipeline(true)}>
              <Plus className="h-4 w-4 mr-2" />{t('crm.createPipeline')}
            </Button>
          </div>
        </div>
      ) : loadingStages || loadingLeads ? (
        <div className="flex gap-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[400px] w-[280px] flex-shrink-0" />)}</div>
      ) : (
        <div className="flex-1 min-h-0">
          <CrmKanbanBoard stages={stages} leads={filteredLeads} onMoveLead={moveLeadToStage} onLeadClick={setSelectedLead} agencyUsers={agencyUsers} />
        </div>
      )}

      <CrmLeadDetailPanel
        lead={selectedLead} stages={stages} agencyUsers={agencyUsers}
        open={!!selectedLead} onClose={() => setSelectedLead(null)}
        onUpdate={async (id, updates) => { const ok = await updateLead(id, updates); if (ok) setSelectedLead(prev => prev ? { ...prev, ...updates } : null); return ok; }}
        onDelete={deleteLead}
      />

      {showCreateLead && stages.length > 0 && (
        <CrmCreateLeadDialog open={showCreateLead} onClose={() => setShowCreateLead(false)} stages={stages} onCreate={createLead} />
      )}

      {showPipelineSettings && (
        <CrmPipelineSettings open={showPipelineSettings} onClose={() => setShowPipelineSettings(false)} stages={stages} onCreateStage={createStage} onUpdateStage={updateStage} onDeleteStage={deleteStage} />
      )}

      {showWebhookSettings && (
        <CrmWebhookSettings
          open={showWebhookSettings} onClose={() => setShowWebhookSettings(false)}
          endpoints={endpoints.filter(e => e.pipeline_id === selectedPipelineId)} logs={webhookLogs}
          stages={stages} pipeline={selectedPipeline} onCreateEndpoint={createEndpoint} onUpdateEndpoint={updateEndpoint}
          selectedEndpointId={selectedWebhookEndpointId} onSelectEndpoint={setSelectedWebhookEndpointId}
        />
      )}

      <Dialog open={showCreatePipeline} onOpenChange={setShowCreatePipeline}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('crm.createPipeline')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{t('crm.pipelineName')}</Label>
              <Input placeholder="e.g. Main Leads" value={newPipelineName} onChange={e => setNewPipelineName(e.target.value)} className="text-sm h-9 mt-1" onKeyDown={e => e.key === 'Enter' && handleCreatePipeline()} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCreatePipeline(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleCreatePipeline} disabled={!newPipelineName.trim()}>{t('common.create')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
