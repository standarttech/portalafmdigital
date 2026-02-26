import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Webhook } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import CrmWebhookSettings from '@/components/crm/CrmWebhookSettings';
import { useCrmWebhookEndpoints, useCrmWebhookLogs, useCrmPipelines, useCrmStages } from '@/hooks/useCrmData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CrmWebhooksPage() {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);

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

  const { pipelines } = useCrmPipelines(selectedClientId);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

  useEffect(() => {
    if (pipelines.length > 0 && !pipelines.find(p => p.id === selectedPipelineId)) {
      setSelectedPipelineId(pipelines[0].id);
    }
  }, [pipelines]);

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId) || null;
  const { stages } = useCrmStages(selectedPipelineId);
  const { endpoints, createEndpoint, updateEndpoint } = useCrmWebhookEndpoints(selectedClientId);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const { logs } = useCrmWebhookLogs(selectedEndpointId);

  if (loadingClients) return <Skeleton className="h-[400px] w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-foreground">Webhook Settings</h1>
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
      </div>

      {selectedPipelineId ? (
        <CrmWebhookSettings
          open={true}
          onClose={() => {}}
          endpoints={endpoints.filter(e => e.pipeline_id === selectedPipelineId)}
          logs={logs}
          stages={stages}
          pipeline={selectedPipeline}
          onCreateEndpoint={createEndpoint}
          onUpdateEndpoint={updateEndpoint}
          selectedEndpointId={selectedEndpointId}
          onSelectEndpoint={setSelectedEndpointId}
          embedded
        />
      ) : (
        <div className="flex items-center justify-center h-[40vh]">
          <div className="text-center space-y-2">
            <Webhook className="h-12 w-12 text-muted-foreground/20 mx-auto" />
            <p className="text-sm text-muted-foreground">Select a client and pipeline to manage webhooks</p>
          </div>
        </div>
      )}
    </div>
  );
}
