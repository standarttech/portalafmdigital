import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Server, Plus, Loader2, Wifi, WifiOff, Cpu, Globe, Webhook, Palette, CheckCircle2 } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGosAuditLog } from '@/hooks/useGosAuditLog';
import { toast } from 'sonner';

interface Provider {
  id: string; name: string; slug: string; provider_type: string; category: string;
  base_url: string | null; auth_type: string; is_active: boolean; is_default: boolean;
  supports_text: boolean; supports_chat: boolean; supports_structured_output: boolean;
  supports_images: boolean; supports_workflows: boolean; metadata: any; created_at: string;
}

const providerTypeIcons: Record<string, React.ReactNode> = {
  local_llm: <Cpu className="h-4 w-4" />,
  workflow_webhook: <Webhook className="h-4 w-4" />,
  external_api: <Globe className="h-4 w-4" />,
  creative_provider: <Palette className="h-4 w-4" />,
};

const providerTypeLabels: Record<string, string> = {
  local_llm: 'Local LLM', workflow_webhook: 'Workflow / n8n', external_api: 'External API', creative_provider: 'Creative',
};

export default function AiInfraProvidersPage() {
  const { user } = useAuth();
  const { logGosAction } = useGosAuditLog();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({ name: '', slug: '', provider_type: 'local_llm', category: 'reasoning', base_url: '', auth_type: 'none', supports_text: true, supports_chat: true, supports_structured_output: false, supports_images: false, supports_workflows: false });

  const load = useCallback(async () => {
    const { data } = await supabase.from('ai_providers' as any).select('*').order('is_default', { ascending: false }).order('name');
    setProviders((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createProvider = async () => {
    if (!user || !form.name || !form.slug) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('ai_providers' as any).insert({
        ...form, created_by: user.id, metadata: form.provider_type === 'workflow_webhook' ? { expects_json_response: true } : {},
      }).select().single();
      if (error) throw error;
      logGosAction('create', 'ai_provider', (data as any).id, form.name);
      toast.success('Provider created');
      setDialogOpen(false);
      setForm({ name: '', slug: '', provider_type: 'local_llm', category: 'reasoning', base_url: '', auth_type: 'none', supports_text: true, supports_chat: true, supports_structured_output: false, supports_images: false, supports_workflows: false });
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const testProvider = async (providerId: string) => {
    setTesting(providerId);
    try {
      const { data, error } = await supabase.functions.invoke('ai-provider-health', { body: { provider_id: providerId } });
      if (error) throw error;
      if (data?.status === 'healthy') toast.success(`Provider healthy (${data.latency_ms}ms)`);
      else toast.warning(`Provider: ${data?.status} — ${data?.error || 'Unknown'}`);
    } catch (e: any) { toast.error(e.message); } finally { setTesting(null); }
  };

  const toggleActive = async (p: Provider) => {
    await supabase.from('ai_providers' as any).update({ is_active: !p.is_active }).eq('id', p.id);
    logGosAction('update', 'ai_provider', p.id, p.name, { metadata: { toggled: !p.is_active ? 'active' : 'inactive' } });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Server className="h-6 w-6 text-[hsl(200,70%,55%)]" /> AI Providers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage AI provider connections for routing</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Provider</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New AI Provider</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My Local LLM" /></div>
                <div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} placeholder="my-local-llm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={form.provider_type} onValueChange={v => setForm(f => ({ ...f, provider_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local_llm">Local LLM</SelectItem>
                      <SelectItem value="workflow_webhook">Workflow / n8n</SelectItem>
                      <SelectItem value="external_api">External API</SelectItem>
                      <SelectItem value="creative_provider">Creative Provider</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reasoning">Reasoning</SelectItem>
                      <SelectItem value="workflow">Workflow</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="creative">Creative</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Base URL / Webhook URL</Label><Input value={form.base_url} onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))} placeholder="http://localhost:11434/v1" /></div>
              <div><Label>Auth Type</Label>
                <Select value={form.auth_type} onValueChange={v => setForm(f => ({ ...f, auth_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="api_key">API Key Header</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex items-center gap-2 text-xs"><Switch checked={form.supports_text} onCheckedChange={v => setForm(f => ({ ...f, supports_text: v }))} />Text</label>
                <label className="flex items-center gap-2 text-xs"><Switch checked={form.supports_chat} onCheckedChange={v => setForm(f => ({ ...f, supports_chat: v }))} />Chat</label>
                <label className="flex items-center gap-2 text-xs"><Switch checked={form.supports_structured_output} onCheckedChange={v => setForm(f => ({ ...f, supports_structured_output: v }))} />Structured</label>
              </div>
              <Button onClick={createProvider} disabled={!form.name || !form.slug || saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create Provider
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : providers.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Server className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Providers</h3>
          <p className="text-sm text-muted-foreground">Add your first AI provider to start routing tasks.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map(p => (
            <Card key={p.id} className={cn('transition-colors', !p.is_active && 'opacity-60')}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-muted/50">
                      {providerTypeIcons[p.provider_type] || <Server className="h-4 w-4" />}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{p.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{p.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.is_default && <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">Default</Badge>}
                    <Badge variant={p.is_active ? 'default' : 'secondary'} className="text-[10px] gap-1">
                      {p.is_active ? <><Wifi className="h-3 w-3" /> Active</> : <><WifiOff className="h-3 w-3" /> Inactive</>}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-[10px]">{providerTypeLabels[p.provider_type] || p.provider_type}</Badge>
                  <Badge variant="outline" className="text-[10px]">{p.category}</Badge>
                  {p.supports_text && <Badge variant="secondary" className="text-[10px]">Text</Badge>}
                  {p.supports_chat && <Badge variant="secondary" className="text-[10px]">Chat</Badge>}
                  {p.supports_structured_output && <Badge variant="secondary" className="text-[10px]">Structured</Badge>}
                  {p.supports_images && <Badge variant="secondary" className="text-[10px]">Images</Badge>}
                  {p.supports_workflows && <Badge variant="secondary" className="text-[10px]">Workflows</Badge>}
                </div>
                {p.base_url && <p className="text-xs text-muted-foreground truncate font-mono">{p.base_url}</p>}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => testProvider(p.id)} disabled={testing === p.id}>
                    {testing === p.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />} Test
                  </Button>
                  {!p.metadata?.builtin && (
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => toggleActive(p)}>
                      {p.is_active ? 'Disable' : 'Enable'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) { return classes.filter(Boolean).join(' '); }
