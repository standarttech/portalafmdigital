import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import CrmPipelineSettings from '@/components/crm/CrmPipelineSettings';
import { useCrmPipelines, useCrmStages } from '@/hooks/useCrmData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CrmSettingsPage() {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);
  const [showCreatePipeline, setShowCreatePipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');

  useEffect(() => {
    (async () => {
      setLoadingClients(true);
      const { data } = await supabase.from('clients').select('id, name').eq('status', 'active').order('name');
      if (data) {
        setClients(data);
        if (data.length > 0) setSelectedClientId(data[0].id);
      }
      setLoadingClients(false);
    })();
  }, []);

  const { pipelines, createPipeline, refetch: refetchPipelines } = useCrmPipelines(selectedClientId);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

  useEffect(() => {
    if (pipelines.length > 0 && !pipelines.find(p => p.id === selectedPipelineId)) {
      setSelectedPipelineId(pipelines[0].id);
    }
  }, [pipelines]);

  const { stages, createStage, updateStage, deleteStage, refetch: refetchStages } = useCrmStages(selectedPipelineId);

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

  if (loadingClients) return <Skeleton className="h-[400px] w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">Pipeline Settings</h1>
        <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder="Client" /></SelectTrigger>
          <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        {pipelines.length > 0 && (
          <Select value={selectedPipelineId || ''} onValueChange={setSelectedPipelineId}>
            <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder="Pipeline" /></SelectTrigger>
            <SelectContent>{pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Button size="sm" variant="outline" className="h-9" onClick={() => setShowCreatePipeline(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />New Pipeline
        </Button>
      </div>

      {selectedPipelineId ? (
        <CrmPipelineSettings
          open={true}
          onClose={() => {}}
          stages={stages}
          onCreateStage={createStage}
          onUpdateStage={updateStage}
          onDeleteStage={deleteStage}
          embedded
        />
      ) : (
        <div className="flex items-center justify-center h-[40vh]">
          <div className="text-center space-y-2">
            <Settings className="h-12 w-12 text-muted-foreground/20 mx-auto" />
            <p className="text-sm text-muted-foreground">Select a client and pipeline to manage settings</p>
          </div>
        </div>
      )}

      <Dialog open={showCreatePipeline} onOpenChange={setShowCreatePipeline}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create Pipeline</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Pipeline Name</Label>
              <Input placeholder="e.g. Main Leads" value={newPipelineName} onChange={e => setNewPipelineName(e.target.value)} className="text-sm h-9 mt-1" onKeyDown={e => e.key === 'Enter' && handleCreatePipeline()} />
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
