import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Plus, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { CrmWebhookEndpoint, CrmWebhookLog, CrmStage, CrmPipeline } from '@/hooks/useCrmData';

interface Props {
  open: boolean;
  onClose: () => void;
  endpoints: CrmWebhookEndpoint[];
  logs: CrmWebhookLog[];
  stages: CrmStage[];
  pipeline: CrmPipeline | null;
  onCreateEndpoint: (ep: Partial<CrmWebhookEndpoint>) => Promise<void>;
  onUpdateEndpoint: (id: string, updates: Partial<CrmWebhookEndpoint>) => Promise<void>;
  selectedEndpointId: string | null;
  onSelectEndpoint: (id: string | null) => void;
  embedded?: boolean;
}

export default function CrmWebhookSettings({ 
  open, onClose, endpoints, logs, stages, pipeline,
  onCreateEndpoint, onUpdateEndpoint, selectedEndpointId, onSelectEndpoint, embedded 
}: Props) {
  const [newName, setNewName] = useState('');
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || '';

  const handleCreate = async () => {
    if (!pipeline || !newName.trim()) return;
    await onCreateEndpoint({
      pipeline_id: pipeline.id,
      name: newName.trim(),
      source_label: newName.trim().toLowerCase().replace(/\s/g, '_'),
      default_stage_id: stages[0]?.id,
    });
    setNewName('');
  };

  const getWebhookUrl = (slug: string) => {
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-webhook/${slug}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Webhook URL copied to clipboard' });
  };

  const content = (
        <Tabs defaultValue="endpoints" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="endpoints" className="text-xs">Endpoints ({endpoints.length})</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="endpoints" className="space-y-3 p-1 mt-0">
              {endpoints.map(ep => (
                <div key={ep.id} className="p-3 rounded-lg bg-muted/20 border border-border/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{ep.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={ep.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {ep.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Switch
                        checked={ep.is_active}
                        onCheckedChange={v => onUpdateEndpoint(ep.id, { is_active: v })}
                        className="scale-75"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input value={getWebhookUrl(ep.endpoint_slug)} readOnly className="text-[10px] h-7 font-mono" />
                    <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={() => copyToClipboard(getWebhookUrl(ep.endpoint_slug))}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>Secret: <code className="bg-muted px-1 rounded">{ep.secret_key.substring(0, 8)}...</code></span>
                    <Button size="sm" variant="ghost" className="h-5 text-[10px] p-1" onClick={() => copyToClipboard(ep.secret_key)}>
                      <Copy className="h-2.5 w-2.5" />
                    </Button>
                    <span className="ml-2">Source: {ep.source_label}</span>
                  </div>
                  <Button 
                    size="sm" variant="ghost" className="text-xs h-6"
                    onClick={() => onSelectEndpoint(selectedEndpointId === ep.id ? null : ep.id)}
                  >
                    View Logs
                  </Button>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Input
                  placeholder="Webhook name (e.g. Meta Leads)"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="text-sm h-9 flex-1"
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
                <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
                  <Plus className="h-3 w-3 mr-1" />Add
                </Button>
              </div>

              {endpoints.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No webhook endpoints yet. Create one to start receiving leads.
                </div>
              )}
            </TabsContent>

            <TabsContent value="logs" className="p-1 mt-0">
              <div className="space-y-1">
                {logs.map(log => (
                  <div key={log.id} className="flex items-center gap-2 p-2 rounded bg-muted/10 text-xs">
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-[10px]">{log.status}</Badge>
                    <span className="text-muted-foreground flex-1 truncate">{log.response_message || 'Processed'}</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(log.created_at), 'dd MMM HH:mm')}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-center py-8 text-sm text-muted-foreground">No webhook logs yet</p>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
  );

  if (embedded) return <div>{content}</div>;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Webhook Settings</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
