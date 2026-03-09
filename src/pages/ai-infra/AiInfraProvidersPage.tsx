import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Server, Plus, Loader2, Wifi, WifiOff, Cpu, Globe, Webhook, Palette, CheckCircle2, Settings, Key, KeyRound, Trash2, RotateCcw, AlertTriangle, XCircle, Clock } from 'lucide-react';
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
  default_model: string; last_tested_at: string | null; last_test_status: string; last_test_error: string;
}

interface SecretInfo { id: string; provider_id: string; secret_label: string; secret_ref: string | null; created_at: string; }

const providerTypeIcons: Record<string, React.ReactNode> = {
  local_llm: <Cpu className="h-4 w-4" />,
  workflow_webhook: <Webhook className="h-4 w-4" />,
  external_api: <Globe className="h-4 w-4" />,
  creative_provider: <Palette className="h-4 w-4" />,
};

const providerTypeLabels: Record<string, string> = {
  local_llm: 'Local LLM', workflow_webhook: 'Workflow / n8n', external_api: 'External API', creative_provider: 'Creative',
};

function cn(...classes: (string | boolean | undefined)[]) { return classes.filter(Boolean).join(' '); }

export default function AiInfraProvidersPage() {
  const { user } = useAuth();
  const { logGosAction } = useGosAuditLog();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [secrets, setSecrets] = useState<Record<string, SecretInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailProvider, setDetailProvider] = useState<Provider | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [secretDialogOpen, setSecretDialogOpen] = useState(false);
  const [secretValue, setSecretValue] = useState('');
  const [secretSaving, setSecretSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', slug: '', provider_type: 'external_api', category: 'reasoning',
    base_url: '', auth_type: 'bearer', default_model: '',
    supports_text: true, supports_chat: true, supports_structured_output: false,
    supports_images: false, supports_workflows: false,
  });

  // Edit form mirrors detailProvider
  const [editForm, setEditForm] = useState<Partial<Provider>>({});

  const load = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([
      supabase.from('ai_providers').select('*').order('is_default', { ascending: false }).order('name'),
      supabase.from('ai_provider_secrets').select('*'),
    ]);
    const provList = (pRes.data as any[]) || [];
    setProviders(provList);

    const secretsMap: Record<string, SecretInfo[]> = {};
    for (const s of (sRes.data as any[]) || []) {
      if (!secretsMap[s.provider_id]) secretsMap[s.provider_id] = [];
      secretsMap[s.provider_id].push(s);
    }
    setSecrets(secretsMap);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasSecret = (providerId: string) => {
    const s = secrets[providerId];
    return s && s.length > 0 && s.some(x => x.secret_ref);
  };

  const createProvider = async () => {
    if (!user || !form.name || !form.slug) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('ai_providers').insert({
        name: form.name, slug: form.slug, provider_type: form.provider_type,
        category: form.category, base_url: form.base_url || null, auth_type: form.auth_type,
        default_model: form.default_model, created_by: user.id,
        supports_text: form.supports_text, supports_chat: form.supports_chat,
        supports_structured_output: form.supports_structured_output,
        supports_images: form.supports_images, supports_workflows: form.supports_workflows,
        metadata: form.provider_type === 'workflow_webhook' ? { expects_json_response: true } : {},
      }).select().single();
      if (error) throw error;
      logGosAction('create', 'ai_provider', (data as any).id, form.name);
      toast.success('Provider created');
      setCreateOpen(false);
      setForm({ name: '', slug: '', provider_type: 'external_api', category: 'reasoning', base_url: '', auth_type: 'bearer', default_model: '', supports_text: true, supports_chat: true, supports_structured_output: false, supports_images: false, supports_workflows: false });
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const openDetail = (p: Provider) => {
    setDetailProvider(p);
    setEditForm({ ...p });
  };

  const saveProviderEdits = async () => {
    if (!detailProvider || !editForm.name) return;
    setSaving(true);
    try {
      const updates: any = {
        name: editForm.name, base_url: editForm.base_url || null,
        provider_type: editForm.provider_type, category: editForm.category,
        auth_type: editForm.auth_type, default_model: editForm.default_model || '',
        is_active: editForm.is_active,
        supports_text: editForm.supports_text, supports_chat: editForm.supports_chat,
        supports_structured_output: editForm.supports_structured_output,
        supports_images: editForm.supports_images, supports_workflows: editForm.supports_workflows,
      };
      // Allow slug edit only if not builtin
      if (!detailProvider.metadata?.builtin) {
        updates.slug = editForm.slug;
      }
      const { error } = await supabase.from('ai_providers').update(updates).eq('id', detailProvider.id);
      if (error) throw error;
      logGosAction('update', 'ai_provider', detailProvider.id, editForm.name as string);
      toast.success('Provider updated');
      setDetailProvider(null);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const saveSecret = async () => {
    if (!detailProvider || !secretValue.trim()) return;
    setSecretSaving(true);
    try {
      const { data, error } = await supabase.rpc('store_ai_provider_secret', {
        _provider_id: detailProvider.id,
        _secret_value: secretValue.trim(),
        _secret_label: 'api_key',
      });
      if (error) throw error;
      logGosAction('update', 'ai_provider_secret', detailProvider.id, detailProvider.name, {
        metadata: { action: hasSecret(detailProvider.id) ? 'rotated' : 'set' },
      });
      toast.success(hasSecret(detailProvider.id) ? 'Secret rotated' : 'Secret configured');
      setSecretValue('');
      setSecretDialogOpen(false);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSecretSaving(false); }
  };

  const removeSecret = async () => {
    if (!detailProvider) return;
    setSecretSaving(true);
    try {
      const { error } = await supabase.rpc('delete_ai_provider_secret' as any, {
        _provider_id: detailProvider.id,
        _secret_label: 'api_key',
      });
      if (error) throw error;
      logGosAction('update', 'ai_provider_secret', detailProvider.id, detailProvider.name, {
        metadata: { action: 'removed' },
      });
      toast.success('Secret removed');
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSecretSaving(false); }
  };

  const testProvider = async (providerId: string) => {
    setTesting(providerId);
    try {
      const { data, error } = await supabase.functions.invoke('ai-provider-health', { body: { provider_id: providerId } });
      if (error) throw error;
      if (data?.status === 'healthy') toast.success(`Provider healthy (${data.latency_ms}ms)`);
      else if (data?.status === 'degraded') toast.warning(`Provider degraded: ${data?.error || 'Unknown issue'}`);
      else toast.error(`Provider unhealthy: ${data?.error || 'Connection failed'}`);
      logGosAction('test', 'ai_provider', providerId, providers.find(p => p.id === providerId)?.name, {
        metadata: { status: data?.status, latency_ms: data?.latency_ms },
      });
      load();
    } catch (e: any) { toast.error(e.message); } finally { setTesting(null); }
  };

  const toggleActive = async (p: Provider) => {
    await supabase.from('ai_providers' as any).update({ is_active: !p.is_active }).eq('id', p.id);
    logGosAction('update', 'ai_provider', p.id, p.name, { metadata: { toggled: !p.is_active ? 'active' : 'inactive' } });
    load();
  };

  const getStatusBadge = (p: Provider) => {
    const secretOk = hasSecret(p.id) || p.auth_type === 'none' || p.metadata?.builtin;
    if (!secretOk) return <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30 gap-1"><AlertTriangle className="h-3 w-3" /> Secret missing</Badge>;
    if (!p.last_tested_at) return <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1"><Clock className="h-3 w-3" /> Never tested</Badge>;
    if (p.last_test_status === 'healthy') return <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30 gap-1"><CheckCircle2 className="h-3 w-3" /> Healthy</Badge>;
    if (p.last_test_status === 'degraded') return <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30 gap-1"><AlertTriangle className="h-3 w-3" /> Degraded</Badge>;
    return <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 gap-1"><XCircle className="h-3 w-3" /> Unhealthy</Badge>;
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
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Provider</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New AI Provider</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="OpenRouter" /></div>
                <div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} placeholder="openrouter" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={form.provider_type} onValueChange={v => setForm(f => ({ ...f, provider_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="external_api">External API</SelectItem>
                      <SelectItem value="local_llm">Local LLM</SelectItem>
                      <SelectItem value="workflow_webhook">Workflow / n8n</SelectItem>
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
              <div><Label>Base URL</Label><Input value={form.base_url} onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))} placeholder="https://openrouter.ai/api/v1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Auth Type</Label>
                  <Select value={form.auth_type} onValueChange={v => setForm(f => ({ ...f, auth_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="api_key">API Key Header</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Default Model</Label><Input value={form.default_model} onChange={e => setForm(f => ({ ...f, default_model: e.target.value }))} placeholder="google/gemini-2.5-flash" /></div>
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
            <Card key={p.id} className={cn('transition-colors cursor-pointer hover:border-primary/40', !p.is_active && 'opacity-60')} onClick={() => openDetail(p)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-muted/50">
                      {providerTypeIcons[p.provider_type] || <Server className="h-4 w-4" />}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{p.name}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">{p.slug}</p>
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
                  {p.default_model && <Badge variant="secondary" className="text-[10px] font-mono">{p.default_model}</Badge>}
                </div>
                {p.base_url && <p className="text-xs text-muted-foreground truncate font-mono">{p.base_url}</p>}
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(p)}
                  {(hasSecret(p.id) || p.auth_type === 'none' || p.metadata?.builtin) ? (
                    <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30 gap-1"><Key className="h-3 w-3" /> Configured</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30 gap-1"><KeyRound className="h-3 w-3" /> Not configured</Badge>
                  )}
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => testProvider(p.id)} disabled={testing === p.id}>
                    {testing === p.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />} Test
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => openDetail(p)}>
                    <Settings className="h-3 w-3 mr-1" /> Details
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

      {/* Provider Detail / Edit Dialog */}
      <Dialog open={!!detailProvider} onOpenChange={v => { if (!v) setDetailProvider(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailProvider && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {providerTypeIcons[detailProvider.provider_type] || <Server className="h-5 w-5" />}
                  {detailProvider.name}
                  {detailProvider.is_default && <Badge className="text-[10px]">Default</Badge>}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-2">
                {/* Status Overview */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Secret</p>
                    {(hasSecret(detailProvider.id) || detailProvider.auth_type === 'none' || detailProvider.metadata?.builtin) ? (
                      <p className="text-sm text-emerald-400 flex items-center gap-1"><Key className="h-3.5 w-3.5" /> Configured</p>
                    ) : (
                      <p className="text-sm text-amber-400 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Missing</p>
                    )}
                  </Card>
                  <Card className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Last Test</p>
                    {detailProvider.last_tested_at ? (
                      <p className={cn('text-sm flex items-center gap-1',
                        detailProvider.last_test_status === 'healthy' && 'text-emerald-400',
                        detailProvider.last_test_status === 'degraded' && 'text-amber-400',
                        detailProvider.last_test_status === 'unhealthy' && 'text-destructive',
                      )}>
                        {detailProvider.last_test_status || 'unknown'}
                      </p>
                    ) : <p className="text-sm text-muted-foreground">Never tested</p>}
                  </Card>
                  <Card className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                    <p className={cn('text-sm', detailProvider.is_active ? 'text-emerald-400' : 'text-muted-foreground')}>
                      {detailProvider.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </Card>
                </div>

                {detailProvider.last_test_error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-xs text-destructive font-medium">Last test error</p>
                    <p className="text-xs text-destructive/80 mt-1">{detailProvider.last_test_error}</p>
                  </div>
                )}

                {/* Secret Management */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><KeyRound className="h-4 w-4" /> Secret Management</h3>
                  {detailProvider.metadata?.builtin ? (
                    <p className="text-xs text-muted-foreground">Built-in provider — secret is managed automatically via LOVABLE_API_KEY.</p>
                  ) : detailProvider.auth_type === 'none' ? (
                    <p className="text-xs text-muted-foreground">This provider uses no authentication.</p>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSecretValue(''); setSecretDialogOpen(true); }} className="text-xs gap-1">
                        <Key className="h-3 w-3" /> {hasSecret(detailProvider.id) ? 'Rotate Secret' : 'Set Secret'}
                      </Button>
                      {hasSecret(detailProvider.id) && (
                        <Button size="sm" variant="outline" onClick={removeSecret} disabled={secretSaving} className="text-xs gap-1 text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3" /> Remove Secret
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Edit Fields */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Settings className="h-4 w-4" /> Provider Settings</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Name</Label><Input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
                    <div><Label>Slug {detailProvider.metadata?.builtin ? '(read-only)' : ''}</Label>
                      <Input value={editForm.slug || ''} disabled={!!detailProvider.metadata?.builtin}
                        onChange={e => setEditForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Type</Label>
                      <Select value={editForm.provider_type || 'external_api'} onValueChange={v => setEditForm(f => ({ ...f, provider_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="external_api">External API</SelectItem>
                          <SelectItem value="local_llm">Local LLM</SelectItem>
                          <SelectItem value="workflow_webhook">Workflow / n8n</SelectItem>
                          <SelectItem value="creative_provider">Creative Provider</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Category</Label>
                      <Select value={editForm.category || 'reasoning'} onValueChange={v => setEditForm(f => ({ ...f, category: v }))}>
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
                  <div><Label>Base URL</Label><Input value={editForm.base_url || ''} onChange={e => setEditForm(f => ({ ...f, base_url: e.target.value }))} placeholder="https://openrouter.ai/api/v1" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Auth Type</Label>
                      <Select value={editForm.auth_type || 'bearer'} onValueChange={v => setEditForm(f => ({ ...f, auth_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bearer">Bearer Token</SelectItem>
                          <SelectItem value="api_key">API Key Header</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Default Model</Label><Input value={editForm.default_model || ''} onChange={e => setEditForm(f => ({ ...f, default_model: e.target.value }))} placeholder="e.g. google/gemini-2.5-flash" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 text-xs"><Switch checked={!!editForm.supports_text} onCheckedChange={v => setEditForm(f => ({ ...f, supports_text: v }))} />Text</label>
                    <label className="flex items-center gap-2 text-xs"><Switch checked={!!editForm.supports_chat} onCheckedChange={v => setEditForm(f => ({ ...f, supports_chat: v }))} />Chat</label>
                    <label className="flex items-center gap-2 text-xs"><Switch checked={!!editForm.supports_structured_output} onCheckedChange={v => setEditForm(f => ({ ...f, supports_structured_output: v }))} />Structured</label>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={!!editForm.is_active} onCheckedChange={v => setEditForm(f => ({ ...f, is_active: v }))} />
                    Active
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveProviderEdits} disabled={saving} className="flex-1">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => testProvider(detailProvider.id)} disabled={testing === detailProvider.id}>
                    {testing === detailProvider.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />} Test
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Secret Set/Rotate Dialog */}
      <Dialog open={secretDialogOpen} onOpenChange={setSecretDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {detailProvider && hasSecret(detailProvider.id) ? 'Rotate Secret' : 'Set Secret'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Enter your API key or Bearer token. It will be stored encrypted in the vault and never shown back in plaintext.
            </p>
            <div>
              <Label>Secret Value</Label>
              <Input
                type="password"
                value={secretValue}
                onChange={e => setSecretValue(e.target.value)}
                placeholder="sk-..."
                autoComplete="off"
              />
            </div>
            <Button onClick={saveSecret} disabled={!secretValue.trim() || secretSaving} className="w-full">
              {secretSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
              {detailProvider && hasSecret(detailProvider.id) ? 'Rotate Secret' : 'Save Secret'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
